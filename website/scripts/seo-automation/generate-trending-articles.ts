/**
 * Generate Trending Articles
 * Analyzes collected knowledge base data and generates new articles
 * based on trending topics and content gaps
 *
 * Supports multiple AI providers:
 * - AICODECAT (OpenAI-compatible) - preferred
 * - Google Gemini - fallback
 * - Offline templates - last resort
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLAWDBOT_KNOWLEDGE, WRITING_STYLE } from '../clawdbot-knowledge-base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI Provider Configuration
const AICODECAT_API_URL = process.env.AICODECAT_API_URL;
const AICODECAT_API_KEY = process.env.AICODECAT_API_KEY;
const AICODECAT_MODEL = process.env.AICODECAT_MODEL || 'gemini-3-flash-preview';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const MAX_ARTICLES_PER_RUN = parseInt(process.env.MAX_ARTICLES || '3', 10);
const OFFLINE_MODE = process.env.OFFLINE_ARTICLE_GENERATION === 'true';
let forceOffline = OFFLINE_MODE;

// Determine which AI provider to use
const useAicodecat = AICODECAT_API_URL && AICODECAT_API_KEY;
const AI_PROVIDER = useAicodecat ? 'aicodecat' : (genAI ? 'gemini' : 'offline');

async function callAicodecatAPI(prompt: string): Promise<string> {
  // Use Anthropic-style /v1/messages endpoint
  const response = await fetch(`${AICODECAT_API_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AICODECAT_API_KEY}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AICODECAT_MODEL,
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AICODECAT API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  // Anthropic format: content is an array with text objects
  const content = data.content?.[0]?.text || '';
  return content;
}

interface CollectedItem {
  id: string;
  title: string;
  url: string;
  source: string;
  contentType?: string;
  summary?: string;
  publishedAt: string;
  collectedAt: string;
  relevanceScore: number;
  topics: string[];
}

interface KnowledgeBase {
  lastUpdated: string;
  items: CollectedItem[];
}

interface TrendingTopic {
  topic: string;
  count: number;
  recentItems: CollectedItem[];
  suggestedAngle: string;
}

interface ArticleIdea {
  slug: string;
  title: string;
  category: 'Tutorial' | 'Guide' | 'Comparison' | 'Best Practices' | 'News' | 'Advanced';
  keywords: string[];
  angle: string;
  sourceItems: CollectedItem[];
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'knowledge-base');
const ARTICLES_DIR = path.join(__dirname, '..', '..', 'src', 'content', 'articles');
const GENERATED_LOG = path.join(DATA_DIR, 'generated-articles.json');

async function loadKnowledgeBase(): Promise<KnowledgeBase> {
  const filePath = path.join(DATA_DIR, 'collected-articles.json');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { lastUpdated: '', items: [] };
  }
}

async function loadExistingArticles(): Promise<Set<string>> {
  const slugs = new Set<string>();
  try {
    const files = await fs.readdir(ARTICLES_DIR);
    for (const file of files) {
      if (file.endsWith('.mdx')) {
        slugs.add(file.replace('.mdx', ''));
      }
    }
  } catch {
    // Directory might not exist
  }
  return slugs;
}

async function loadGeneratedLog(): Promise<string[]> {
  try {
    const content = await fs.readFile(GENERATED_LOG, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveGeneratedLog(slugs: string[]): Promise<void> {
  await fs.writeFile(GENERATED_LOG, JSON.stringify(slugs, null, 2));
}

function analyzeTrendingTopics(items: CollectedItem[]): TrendingTopic[] {
  const topicCounts = new Map<string, { count: number; items: CollectedItem[] }>();

  // Count topics and collect related items
  for (const item of items) {
    for (const topic of item.topics) {
      const existing = topicCounts.get(topic) || { count: 0, items: [] };
      existing.count++;
      if (existing.items.length < 5) {
        existing.items.push(item);
      }
      topicCounts.set(topic, existing);
    }
  }

  // Convert to array and sort by count
  const trends: TrendingTopic[] = [];
  for (const [topic, data] of topicCounts) {
    trends.push({
      topic,
      count: data.count,
      recentItems: data.items,
      suggestedAngle: suggestAngle(topic, data.items),
    });
  }

  return trends.sort((a, b) => b.count - a.count);
}

function suggestAngle(topic: string, items: CollectedItem[]): string {
  const titles = items.map((i) => i.title.toLowerCase()).join(' ');

  // Determine angle based on common patterns
  if (titles.includes('how to') || titles.includes('tutorial')) {
    return 'practical-tutorial';
  }
  if (titles.includes('vs') || titles.includes('compare') || titles.includes('alternative')) {
    return 'comparison';
  }
  if (titles.includes('best') || titles.includes('top') || titles.includes('guide')) {
    return 'best-practices';
  }
  if (titles.includes('new') || titles.includes('announce') || titles.includes('release')) {
    return 'news-update';
  }
  if (titles.includes('advanced') || titles.includes('deep') || titles.includes('architecture')) {
    return 'advanced-deep-dive';
  }

  return 'comprehensive-guide';
}

function generateArticleIdeas(
  trends: TrendingTopic[],
  existingSlugs: Set<string>,
  generatedSlugs: string[]
): ArticleIdea[] {
  const ideas: ArticleIdea[] = [];
  const allExisting = new Set([...existingSlugs, ...generatedSlugs]);

  const topicToArticle: Record<string, { title: string; category: ArticleIdea['category']; keywords: string[] }> = {
    // === 操作指南类 ===
    'agents': {
      title: 'Building AI Agents with Moltbot: Complete Guide',
      category: 'Advanced',
      keywords: ['ai agents', 'moltbot agents', 'autonomous ai', 'agent workflows', 'multi-agent'],
    },
    'rag': {
      title: 'RAG Implementation in Moltbot: Retrieval-Augmented Generation Guide',
      category: 'Advanced',
      keywords: ['rag', 'retrieval augmented generation', 'moltbot rag', 'knowledge base', 'embeddings'],
    },
    'automation': {
      title: 'AI Automation Workflows with Moltbot: Practical Examples',
      category: 'Tutorial',
      keywords: ['ai automation', 'workflow automation', 'moltbot automation', 'task automation'],
    },
    'integration': {
      title: 'Integrating Moltbot with Your Existing Tools and APIs',
      category: 'Tutorial',
      keywords: ['moltbot integration', 'api integration', 'webhook', 'tool integration'],
    },
    'local-llm': {
      title: 'Running Local LLMs with Moltbot: Ollama and Open Source Models',
      category: 'Tutorial',
      keywords: ['local llm', 'ollama', 'open source llm', 'moltbot local models', 'private ai'],
    },
    'deployment': {
      title: 'Deploying Moltbot: Docker, Kubernetes, and Cloud Options',
      category: 'Tutorial',
      keywords: ['moltbot deployment', 'docker', 'kubernetes', 'cloud deployment'],
    },
    'tutorials': {
      title: 'Getting Started with Moltbot: Beginner-Friendly Tutorial',
      category: 'Tutorial',
      keywords: ['moltbot tutorial', 'beginner guide', 'getting started', 'first steps'],
    },

    // === 对比分析类 ===
    'llm-providers': {
      title: 'Comparing LLM Providers for Moltbot: Claude, GPT-4, and More',
      category: 'Comparison',
      keywords: ['llm providers', 'claude vs gpt', 'moltbot providers', 'ai models comparison'],
    },
    'frameworks': {
      title: 'Moltbot vs LangChain vs LlamaIndex: Framework Comparison',
      category: 'Comparison',
      keywords: ['langchain', 'llamaindex', 'ai frameworks', 'moltbot comparison'],
    },
    'open-source': {
      title: 'Open Source AI Assistants: Why Moltbot Leads the Pack',
      category: 'Comparison',
      keywords: ['open source ai', 'moltbot open source', 'free ai assistant', 'community'],
    },

    // === 指南类 ===
    'self-hosting': {
      title: 'Self-Hosting AI Assistants: Why Moltbot is the Best Choice',
      category: 'Guide',
      keywords: ['self-hosted ai', 'private ai', 'moltbot self-hosting', 'data privacy', 'local ai'],
    },
    'messaging': {
      title: 'Multi-Platform Messaging with Moltbot: Telegram, Discord, Slack',
      category: 'Guide',
      keywords: ['messaging platforms', 'telegram bot', 'discord bot', 'slack bot', 'moltbot messaging'],
    },
    'workflows': {
      title: 'Building Intelligent Workflows with Moltbot AI',
      category: 'Guide',
      keywords: ['ai workflows', 'intelligent automation', 'moltbot workflows', 'process automation'],
    },
    'assistants': {
      title: 'Creating Personal AI Assistants with Moltbot',
      category: 'Guide',
      keywords: ['personal assistant', 'ai assistant', 'moltbot assistant', 'custom assistant'],
    },

    // === 高级技术类 ===
    'ai-techniques': {
      title: 'Advanced AI Techniques in Moltbot: Embeddings, Fine-tuning, and More',
      category: 'Advanced',
      keywords: ['embeddings', 'fine-tuning', 'ai techniques', 'moltbot advanced'],
    },

    // === AI 自动化趋势与洞察类（新增） ===
    'ai-trends': {
      title: 'AI Automation Trends in 2026: What Moltbot Users Should Know',
      category: 'News',
      keywords: ['ai trends 2026', 'automation trends', 'ai industry', 'future of ai', 'moltbot insights'],
    },
    'ai-productivity': {
      title: 'How AI Automation is Transforming Personal Productivity',
      category: 'Guide',
      keywords: ['ai productivity', 'personal automation', 'ai assistant productivity', 'work smarter'],
    },
    'ai-enterprise': {
      title: 'Enterprise AI Automation: Self-Hosted Solutions vs Cloud Services',
      category: 'Comparison',
      keywords: ['enterprise ai', 'self-hosted vs cloud', 'ai security', 'corporate ai', 'data sovereignty'],
    },
    'ai-privacy': {
      title: 'The Privacy Advantage: Why Self-Hosted AI Matters More Than Ever',
      category: 'Guide',
      keywords: ['ai privacy', 'data privacy', 'self-hosted privacy', 'ai data protection', 'gdpr ai'],
    },
    'ai-cost': {
      title: 'AI Automation ROI: Calculating the True Cost of LLM APIs vs Self-Hosting',
      category: 'Comparison',
      keywords: ['ai cost', 'llm pricing', 'self-hosted cost', 'ai roi', 'automation savings'],
    },
    'ai-future': {
      title: 'The Future of Personal AI: From Chatbots to Autonomous Agents',
      category: 'News',
      keywords: ['future of ai', 'ai evolution', 'autonomous agents', 'ai assistants future', 'ai predictions'],
    },
    'ai-mistakes': {
      title: '10 Common Mistakes When Setting Up AI Automation (And How to Avoid Them)',
      category: 'Best Practices',
      keywords: ['ai mistakes', 'automation pitfalls', 'ai best practices', 'common errors', 'ai tips'],
    },
    'ai-security': {
      title: 'AI Security Best Practices: Protecting Your Self-Hosted Assistant',
      category: 'Best Practices',
      keywords: ['ai security', 'llm security', 'self-hosted security', 'ai vulnerabilities', 'secure ai'],
    },
    'ai-use-cases': {
      title: 'Real-World AI Automation: 15 Use Cases That Actually Work',
      category: 'Guide',
      keywords: ['ai use cases', 'automation examples', 'practical ai', 'ai applications', 'real world ai'],
    },
    'ai-small-business': {
      title: 'AI Automation for Small Business: Getting Started Without Breaking the Bank',
      category: 'Guide',
      keywords: ['small business ai', 'affordable ai', 'ai for startups', 'budget automation', 'sme ai'],
    },
    'ai-developer': {
      title: 'AI-Powered Development: How Developers Use Moltbot to Code Faster',
      category: 'Guide',
      keywords: ['ai coding', 'developer productivity', 'ai pair programming', 'code automation', 'dev tools'],
    },
    'ai-prompts': {
      title: 'Mastering AI Prompts: Advanced Techniques for Better Automation Results',
      category: 'Advanced',
      keywords: ['prompt engineering', 'ai prompts', 'better prompts', 'prompt techniques', 'llm prompts'],
    },
    'ai-memory': {
      title: 'AI Memory Systems: How Moltbot Remembers Context Across Conversations',
      category: 'Advanced',
      keywords: ['ai memory', 'context management', 'conversation history', 'persistent memory', 'ai context'],
    },
    'ai-multi-agent': {
      title: 'Multi-Agent AI Systems: Coordinating Multiple Bots for Complex Tasks',
      category: 'Advanced',
      keywords: ['multi-agent', 'ai coordination', 'agent orchestration', 'distributed ai', 'agent swarm'],
    },
    'ai-voice': {
      title: 'Voice-Enabled AI Assistants: Adding Speech to Your Moltbot Setup',
      category: 'Tutorial',
      keywords: ['voice ai', 'speech recognition', 'text to speech', 'voice assistant', 'voice automation'],
    },
    'ai-ethics': {
      title: 'Responsible AI Automation: Ethics and Best Practices for Personal Assistants',
      category: 'Best Practices',
      keywords: ['ai ethics', 'responsible ai', 'ai guidelines', 'ethical automation', 'ai responsibility'],
    },
    'ai-monitoring': {
      title: 'Monitoring Your AI: Logging, Debugging, and Performance Tracking',
      category: 'Tutorial',
      keywords: ['ai monitoring', 'llm debugging', 'ai logging', 'performance tracking', 'ai observability'],
    },
    'ai-scaling': {
      title: 'Scaling AI Automation: From Personal Use to Team Deployment',
      category: 'Guide',
      keywords: ['ai scaling', 'team ai', 'ai deployment', 'enterprise scaling', 'ai growth'],
    },
  };

  for (const trend of trends.slice(0, 15)) {
    const mapping = topicToArticle[trend.topic];
    if (!mapping) continue;

    const slug = mapping.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    // Skip if already exists or recently generated
    if (allExisting.has(slug)) continue;

    ideas.push({
      slug,
      title: mapping.title,
      category: mapping.category,
      keywords: mapping.keywords,
      angle: trend.suggestedAngle,
      sourceItems: trend.recentItems,
    });
  }

  return ideas.slice(0, MAX_ARTICLES_PER_RUN);
}

function escapeYaml(value: string): string {
  return value.replace(/"/g, '\\"');
}

function buildArticlePrompt(idea: ArticleIdea): string {
  const kb = CLAWDBOT_KNOWLEDGE;
  const style = WRITING_STYLE;

  const sourceContext = idea.sourceItems
    .map((item) => `- "${item.title}" (${item.source}): ${item.summary || 'No summary'}`)
    .join('\n');

  return `You are an expert technical writer creating a high-quality, SEO-optimized article about Moltbot (also known as Clawdbot/Openclaw).

## CONTEXT: TRENDING TOPICS

This article is inspired by current industry trends. Here are recent relevant articles from the web:

${sourceContext}

Use these as inspiration for what's trending, but write original content focused on Moltbot.

## VERIFIED PRODUCT INFORMATION

- Name: ${kb.product.name} (also known as Moltbot, Clawdbot, Openclaw)
- Type: ${kb.product.type}
- Description: ${kb.product.description}
- GitHub: ${kb.product.github}
- Documentation: ${kb.product.docs}

### Key Features
- Self-hosted AI gateway - your data stays private
- Multi-platform messaging: Telegram, Discord, Slack, WhatsApp
- Works with Claude, GPT-4, and local LLMs via Ollama
- File-based memory persistence
- Extensible skills and plugins

### Installation (VERIFIED COMMANDS)
- Quick install: \`${kb.installation.quickInstall.command}\`
- Onboarding: \`${kb.installation.onboarding.command}\`
- Health check: \`${kb.installation.health.command}\`
- Gateway: \`${kb.installation.gateway.command}\`

### Security Best Practices
${kb.security.bestPractices.slice(0, 5).map((p) => `- ${p}`).join('\n')}

## ARTICLE SPECIFICATIONS

**Title:** ${idea.title}
**Category:** ${idea.category}
**Keywords:** ${idea.keywords.join(', ')}
**Angle:** ${idea.angle}
**Slug:** ${idea.slug}

## REQUIRED STRUCTURE

1. Hook introduction that addresses the trending topic
2. Overview of how Moltbot solves the problem
3. Step-by-step practical guidance (if Tutorial/Guide)
4. Comparison table (if Comparison category)
5. Code examples with verified commands
6. Security considerations
7. Conclusion with next steps

## WRITING STYLE

${style.tone.guidelines.map((g) => `- ${g}`).join('\n')}

## OUTPUT FORMAT

Write in MDX format with this exact frontmatter:

---
title: "${idea.title}"
description: "120-160 character description here"
pubDate: ${new Date().toISOString().split('T')[0]}
modifiedDate: ${new Date().toISOString().split('T')[0]}
category: "${idea.category}"
tags: ${JSON.stringify(idea.keywords.slice(0, 5))}
keywords: ${JSON.stringify([...idea.keywords, 'openclaw', 'moltbot', 'clawdbot'])}
readingTime: 10
featured: false
author: "Moltbot Team"
image: "/images/articles/${idea.slug}.jpg"
imageAlt: "${idea.title}"
articleType: "${idea.category === 'Tutorial' ? 'HowTo' : 'TechArticle'}"
difficulty: "${idea.category === 'Advanced' ? 'advanced' : idea.category === 'Tutorial' ? 'beginner' : 'intermediate'}"
sources:
  - "https://docs.molt.bot/"
  - "https://github.com/moltbot/moltbot"
---

## CONTENT REQUIREMENTS

1. **1500-2000 words** (8-12 minute read)
2. **SEO Optimized**: Use keywords naturally, especially in headings
3. **Practical**: Include real code examples and commands
4. **Accurate**: Only use verified commands from the knowledge base
5. **Engaging**: Start with a hook that addresses why this topic matters now
6. **Brand Keywords**: Mention Openclaw, Moltbot, and Clawdbot at least once each

## CTA INTEGRATION

Include these 3 CTA placements:

\`\`\`mdx
import HostingCTA from '../../components/CTA/HostingCTA.astro';

<HostingCTA context="setup" />  {/* After introduction */}
<HostingCTA context="inline" /> {/* Mid-article */}
<HostingCTA context="conclusion" /> {/* In conclusion */}
\`\`\`

## FREE SERVICE MENTION

Include a section mentioning: "We offer a free Moltbot installation service. Get started at [Contact](/contact)."

Now write the complete, trending-focused article:`;
}

function generateOfflineArticle(idea: ArticleIdea): string {
  const kb = CLAWDBOT_KNOWLEDGE;
  const today = new Date().toISOString().split('T')[0];

  const frontmatter = `---
title: "${idea.title}"
description: "Learn ${idea.title.toLowerCase()} with Moltbot. Step-by-step guide covering setup, best practices, and real-world examples for ${idea.keywords[0]}."
pubDate: ${today}
modifiedDate: ${today}
category: "${idea.category}"
tags: ${JSON.stringify(idea.keywords.slice(0, 5))}
keywords: ${JSON.stringify([...idea.keywords, 'openclaw', 'moltbot', 'clawdbot'])}
readingTime: 10
featured: false
author: "Moltbot Team"
image: "/images/articles/${idea.slug}.jpg"
imageAlt: "${idea.title}"
articleType: "${idea.category === 'Tutorial' ? 'HowTo' : 'TechArticle'}"
difficulty: "${idea.category === 'Advanced' ? 'advanced' : idea.category === 'Tutorial' ? 'beginner' : 'intermediate'}"
sources:
  - "https://docs.molt.bot/"
  - "https://github.com/moltbot/moltbot"
---`;

  const trendingSources = idea.sourceItems
    .slice(0, 3)
    .map((item) => `- [${item.title}](${item.url})`)
    .join('\n');

  const body = `
import HostingCTA from '../../components/CTA/HostingCTA.astro';

# ${idea.title}

![${idea.title}](/images/articles/${idea.slug}.jpg)

## Introduction

${idea.category === 'Comparison'
  ? `Choosing the right AI tool can be challenging. In this comprehensive comparison, we explore how Moltbot (also known as Openclaw and Clawdbot) compares to other solutions in the ${idea.keywords[0]} space.`
  : `${idea.keywords[0].charAt(0).toUpperCase() + idea.keywords[0].slice(1)} is becoming increasingly important in modern AI workflows. Moltbot (also known as Openclaw and Clawdbot) provides a self-hosted solution that puts you in control of your data while leveraging powerful AI capabilities.`
}

This guide is inspired by current industry trends and will help you understand how to leverage Moltbot for ${idea.keywords.slice(0, 2).join(' and ')}.

<HostingCTA context="setup" />

## What You'll Learn

- How to set up Moltbot for ${idea.keywords[0]}
- Best practices for ${idea.category.toLowerCase()} implementation
- Real-world examples and use cases
- Security considerations and recommendations

## Why Moltbot?

Moltbot is a ${kb.product.type} that offers:

- **Self-hosted**: Your data stays on your infrastructure
- **Multi-platform**: Works with Telegram, Discord, Slack, and WhatsApp
- **Flexible**: Supports Claude, GPT-4, and local LLMs via Ollama
- **Extensible**: Custom skills and plugins for any workflow

## Getting Started

### Prerequisites

| Requirement | Details |
|------------|---------|
| Node.js | ${kb.requirements.nodejs.recommended}+ |
| OS | ${kb.requirements.os.supported.join(', ')} |
| Memory | ${kb.requirements.memory} |
| Storage | ${kb.requirements.storage} |

### Installation

\`\`\`bash
# Quick install
${kb.installation.quickInstall.command}

# Run onboarding wizard
${kb.installation.onboarding.command}

# Verify installation
${kb.installation.health.command}
\`\`\`

${idea.category === 'Tutorial' ? `
## Step-by-Step Guide

### Step 1: Configure Your Environment

After installation, configure your API keys and preferences:

\`\`\`bash
# Start the gateway
${kb.installation.gateway.command}

# Run diagnostics
${kb.installation.doctor.command}
\`\`\`

### Step 2: Set Up ${idea.keywords[0].charAt(0).toUpperCase() + idea.keywords[0].slice(1)}

Configure Moltbot for your specific use case. The configuration file is located at \`${kb.configuration.configFile}\`.

### Step 3: Test Your Setup

Send a test message through your preferred channel (Telegram, Discord, etc.) to verify everything is working correctly.
` : ''}

${idea.category === 'Comparison' ? `
## Feature Comparison

| Feature | Moltbot | Alternatives |
|---------|---------|--------------|
| Self-hosted | ✅ Full control | Varies |
| Data privacy | ✅ 100% local | Often cloud-based |
| Multi-platform | ✅ 4+ platforms | Limited |
| Open source | ✅ MIT License | Often proprietary |
| Local LLM support | ✅ Ollama | Rare |

## When to Choose Moltbot

Choose Moltbot when you need:
- Complete control over your data
- Self-hosted infrastructure
- Multi-platform messaging support
- Flexibility with LLM providers
` : ''}

<HostingCTA context="inline" />

## Security Best Practices

When working with ${idea.keywords[0]}, always follow these security guidelines:

${kb.security.bestPractices.slice(0, 5).map((p) => `- ${p}`).join('\n')}

## Trending Resources

This article was inspired by current industry trends:

${trendingSources}

## Common Use Cases

Moltbot excels in these scenarios:

${kb.useCases.slice(0, 5).map((u) => `- ${u}`).join('\n')}

## Troubleshooting

| Issue | Solution |
|-------|----------|
| ${kb.troubleshooting.nodeVersion.issue} | ${kb.troubleshooting.nodeVersion.solution} |
| ${kb.troubleshooting.gatewayNotStarting.issue} | ${kb.troubleshooting.gatewayNotStarting.solution} |
| ${kb.troubleshooting.permissionDenied.issue} | ${kb.troubleshooting.permissionDenied.solution} |

## Free Installation Service

We offer a free Moltbot installation service. Our team will help you set up and configure Moltbot for your specific use case. [Contact us](/contact) to get started.

## Conclusion

${idea.category === 'Comparison'
  ? `Moltbot offers a compelling alternative for those who prioritize data privacy, self-hosting, and flexibility. While other solutions may excel in specific areas, Moltbot's comprehensive feature set makes it an excellent choice for ${idea.keywords[0]}.`
  : `You now have a solid foundation for ${idea.keywords[0]} with Moltbot. Start with a simple configuration, test thoroughly, and expand as your needs grow.`
}

For more information, check out the [official documentation](${kb.product.docs}) and [GitHub repository](${kb.product.github}).

<HostingCTA context="conclusion" />
`;

  return frontmatter + body;
}

async function generateArticle(idea: ArticleIdea): Promise<string | null> {
  console.log(`\n📝 Generating: ${idea.title}`);
  console.log(`   Category: ${idea.category} | Angle: ${idea.angle}`);
  console.log(`   Based on ${idea.sourceItems.length} trending sources`);
  console.log(`   Provider: ${AI_PROVIDER}`);

  // Use offline mode if forced
  if (forceOffline) {
    console.log(`   📋 Using offline template generation`);
    return generateOfflineArticle(idea);
  }

  const prompt = buildArticlePrompt(idea);

  // Try AICODECAT first (OpenAI-compatible API)
  if (useAicodecat) {
    try {
      console.log(`   🤖 Using AICODECAT API (${AICODECAT_MODEL})`);
      let text = await callAicodecatAPI(prompt);

      // Clean up markdown code blocks if present
      if (text.startsWith('```mdx')) {
        text = text.replace(/^```mdx\n/, '').replace(/\n```$/, '');
      }
      if (text.startsWith('```markdown')) {
        text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
      }
      if (text.startsWith('```')) {
        text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      console.log(`   ✅ Generated successfully via AICODECAT`);
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`   ⚠️ AICODECAT error: ${message.substring(0, 100)}`);
      // Fall through to try Gemini or offline
    }
  }

  // Try Gemini as fallback
  if (genAI) {
    try {
      console.log(`   🤖 Using Gemini API (${GEMINI_MODEL})`);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text();

      // Clean up markdown code blocks if present
      if (text.startsWith('```mdx')) {
        text = text.replace(/^```mdx\n/, '').replace(/\n```$/, '');
      }
      if (text.startsWith('```markdown')) {
        text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
      }

      console.log(`   ✅ Generated successfully via Gemini`);
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`   ⚠️ Gemini error: ${message.substring(0, 80)}`);
    }
  }

  // Fallback to offline generation
  console.log(`   📋 Falling back to offline template generation`);
  forceOffline = true;
  return generateOfflineArticle(idea);
}

async function saveArticle(slug: string, content: string): Promise<void> {
  await fs.mkdir(ARTICLES_DIR, { recursive: true });
  const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`   💾 Saved: ${slug}.mdx`);
}

async function generateTrendingArticles(): Promise<void> {
  const modelInfo = useAicodecat ? `AICODECAT (${AICODECAT_MODEL})` : (genAI ? `Gemini (${GEMINI_MODEL})` : 'Offline');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       TRENDING ARTICLE GENERATOR (SEO Automation)          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Date: ${new Date().toISOString().split('T')[0].padEnd(51)}║`);
  console.log(`║  Provider: ${modelInfo.padEnd(47)}║`);
  console.log(`║  Max Articles: ${String(MAX_ARTICLES_PER_RUN).padEnd(43)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Load data
  const kb = await loadKnowledgeBase();
  console.log(`📚 Knowledge base: ${kb.items.length} items`);

  if (kb.items.length === 0) {
    console.log('⚠️ No items in knowledge base. Run seo:collect first.');
    return;
  }

  const existingSlugs = await loadExistingArticles();
  console.log(`📄 Existing articles: ${existingSlugs.size}`);

  const generatedSlugs = await loadGeneratedLog();
  console.log(`🔄 Previously generated: ${generatedSlugs.length}`);

  // Analyze trends
  const trends = analyzeTrendingTopics(kb.items);
  console.log(`\n📈 Top Trending Topics:`);
  trends.slice(0, 10).forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.topic}: ${t.count} mentions (${t.suggestedAngle})`);
  });

  // Generate article ideas
  const ideas = generateArticleIdeas(trends, existingSlugs, generatedSlugs);
  console.log(`\n💡 Article Ideas Generated: ${ideas.length}`);

  if (ideas.length === 0) {
    console.log('ℹ️ No new article ideas. All trending topics are already covered.');
    return;
  }

  // Generate articles
  let successCount = 0;
  const newSlugs: string[] = [];

  for (const idea of ideas) {
    const content = await generateArticle(idea);
    if (content) {
      await saveArticle(idea.slug, content);
      newSlugs.push(idea.slug);
      successCount++;

      // Rate limiting
      if (ideas.indexOf(idea) < ideas.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  // Update generated log
  await saveGeneratedLog([...generatedSlugs, ...newSlugs]);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    GENERATION COMPLETE                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Articles Generated: ${String(successCount).padEnd(35)}║`);
  console.log(`║  📝 New Slugs:                                             ║`);
  newSlugs.forEach((slug) => {
    console.log(`║     - ${slug.padEnd(51)}║`);
  });
  console.log('╚════════════════════════════════════════════════════════════╝');
}

// Run
if (!useAicodecat && !GEMINI_API_KEY) {
  console.warn('Warning: No AI API configured. Using offline template generation.');
  console.warn('Set AICODECAT_API_URL + AICODECAT_API_KEY or GEMINI_API_KEY for AI generation.');
}

generateTrendingArticles().catch(console.error);
