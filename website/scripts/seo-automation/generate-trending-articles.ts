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

import './load-env.ts';
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

function parseCount(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

const MAX_ARTICLES_PER_RUN = parseCount(process.env.MAX_ARTICLES || process.env.SEO_MAX_ARTICLES, 3);
const MIN_ARTICLES_PER_RUN = parseCount(process.env.MIN_ARTICLES || process.env.SEO_MIN_ARTICLES, 0);
const EFFECTIVE_MAX_ARTICLES = Math.max(MAX_ARTICLES_PER_RUN, MIN_ARTICLES_PER_RUN);
const OFFLINE_MODE = process.env.OFFLINE_ARTICLE_GENERATION === 'true';
const USE_CASES_ONLY = process.env.SEO_USE_CASES_ONLY === 'true';
const INCLUDE_USE_CASES = process.env.SEO_INCLUDE_USE_CASES !== 'false';
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
  scenario?: string;
  steps?: string[];
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
      suggestedAngle: suggestAngle(data.items),
    });
  }

  return trends.sort((a, b) => b.count - a.count);
}

function suggestAngle(items: CollectedItem[]): string {
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
    // === 品牌动态类 ===
    'brand': {
      title: "Openclaw Weekly: What's New in Self-Hosted AI Assistants",
      category: 'News',
      keywords: ['openclaw', 'moltbot', 'clawdbot', 'self-hosted ai', 'ai assistant news'],
    },

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
    'use-case-support': {
      title: 'Openclaw Use Case: Support Triage + FAQ',
      category: 'Tutorial',
      keywords: ['customer support', 'ticket triage', 'faq automation', 'helpdesk', 'support workflow'],
    },
    'use-case-sales': {
      title: 'Openclaw Use Case: Sales Lead Qualification',
      category: 'Tutorial',
      keywords: ['sales ops', 'lead qualification', 'crm notes', 'pipeline hygiene', 'sales automation'],
    },
    'use-case-devops': {
      title: 'Openclaw Use Case: DevOps Incident Summaries',
      category: 'Tutorial',
      keywords: ['incident response', 'runbook', 'on-call', 'alert triage', 'devops automation'],
    },
    'use-case-marketing': {
      title: 'Openclaw Use Case: Marketing Research Briefs',
      category: 'Tutorial',
      keywords: ['marketing automation', 'research briefs', 'content outlines', 'content workflow', 'brand research'],
    },
    'use-case-productivity': {
      title: 'Openclaw Use Case: Meeting Notes to Tasks',
      category: 'Tutorial',
      keywords: ['meeting notes', 'task extraction', 'follow-ups', 'personal productivity', 'executive assistant'],
    },
    'use-case-hr': {
      title: 'Openclaw Use Case: HR Onboarding Assistant',
      category: 'Tutorial',
      keywords: ['hr onboarding', 'employee questions', 'policy assistant', 'internal handbook', 'people ops'],
    },
    'use-case-finance': {
      title: 'Openclaw Use Case: Invoice Triage',
      category: 'Tutorial',
      keywords: ['finance ops', 'invoice processing', 'expense review', 'ap workflow', 'approvals'],
    },
    'use-case-it': {
      title: 'Openclaw Use Case: IT Helpdesk Automation',
      category: 'Tutorial',
      keywords: ['it helpdesk', 'ticketing', 'device setup', 'access requests', 'internal support'],
    },
    'use-case-ecommerce': {
      title: 'Openclaw Use Case: Order Support',
      category: 'Tutorial',
      keywords: ['ecommerce support', 'order status', 'returns', 'shipping updates', 'customer queries'],
    },
    'use-case-ops': {
      title: 'Openclaw Use Case: Ops Daily Reporting',
      category: 'Tutorial',
      keywords: ['operations', 'daily report', 'kpi summary', 'sop updates', 'team sync'],
    },
    'ai-small-business': {
      title: 'Openclaw for Small Business: Affordable AI Automation',
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

  return ideas;
}

function buildFallbackIdeas(
  existingSlugs: Set<string>,
  generatedSlugs: string[],
  currentIdeas: ArticleIdea[],
  recentItems: CollectedItem[]
): ArticleIdea[] {
  const fallbackIdeas: Array<Omit<ArticleIdea, 'slug' | 'sourceItems'>> = [
    {
      title: "Openclaw Weekly: Security and Secrets Management Roundup",
      category: 'News',
      keywords: ['openclaw', 'secrets management', 'api keys', 'security', 'self-hosted ai'],
      angle: 'news-update',
    },
    {
      title: 'Openclaw on VPS in 2026: A Fast Start Guide',
      category: 'Tutorial',
      keywords: ['openclaw', 'vps', 'deployment', 'ubuntu 22.04', 'self-hosted ai'],
      angle: 'practical-tutorial',
    },
    {
      title: 'Openclaw Telegram Bot Hardening Checklist',
      category: 'Best Practices',
      keywords: ['openclaw', 'telegram bot', 'security', 'best practices', 'bot hardening'],
      angle: 'best-practices',
    },
    {
      title: 'Openclaw Memory Architecture: How Persistent Context Actually Works',
      category: 'Advanced',
      keywords: ['openclaw', 'memory', 'context', 'architecture', 'ai assistant'],
      angle: 'advanced-deep-dive',
    },
    {
      title: 'Openclaw vs Cloud AI Assistants: Privacy, Cost, and Control',
      category: 'Comparison',
      keywords: ['openclaw', 'privacy', 'cost', 'self-hosted vs cloud', 'ai assistant'],
      angle: 'comparison',
    },
    {
      title: 'Openclaw Automation Playbooks: 7 Workflows That Save Hours',
      category: 'Guide',
      keywords: ['openclaw', 'automation', 'workflows', 'productivity', 'ai assistant'],
      angle: 'comprehensive-guide',
    },
    {
      title: 'Openclaw Local LLM Mode with Ollama: Step-by-Step',
      category: 'Tutorial',
      keywords: ['openclaw', 'ollama', 'local llm', 'offline', 'privacy'],
      angle: 'practical-tutorial',
    },
    {
      title: 'Openclaw Gateway Security: Reverse Proxy and Auth Best Practices',
      category: 'Best Practices',
      keywords: ['openclaw', 'gateway security', 'reverse proxy', 'auth', 'self-hosted ai'],
      angle: 'best-practices',
    },
    {
      title: 'Openclaw Deployment on Mac Mini: 24/7 Setup and Power Tips',
      category: 'Tutorial',
      keywords: ['openclaw', 'mac mini', 'deployment', '24/7', 'self-hosted ai'],
      angle: 'practical-tutorial',
    },
    {
      title: 'Openclaw Discord + Slack Multi-Channel Setup',
      category: 'Guide',
      keywords: ['openclaw', 'discord', 'slack', 'messaging', 'multi-platform'],
      angle: 'comprehensive-guide',
    },
    {
      title: 'Openclaw Incident Response: What to Do When Keys Leak',
      category: 'Best Practices',
      keywords: ['openclaw', 'incident response', 'api keys', 'security', 'self-hosted ai'],
      angle: 'best-practices',
    },
    {
      title: 'Openclaw Enterprise Rollout: Team Scaling and Governance',
      category: 'Guide',
      keywords: ['openclaw', 'enterprise', 'scaling', 'governance', 'ai assistant'],
      angle: 'comprehensive-guide',
    },
  ];

  const allExisting = new Set([
    ...existingSlugs,
    ...generatedSlugs,
    ...currentIdeas.map((idea) => idea.slug),
  ]);

  const fallbackSourceItems = recentItems.slice(0, 5);
  const ideas: ArticleIdea[] = [];

  for (const fallback of fallbackIdeas) {
    const slug = fallback.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    if (allExisting.has(slug)) continue;

    ideas.push({
      slug,
      title: fallback.title,
      category: fallback.category,
      keywords: fallback.keywords,
      angle: fallback.angle,
      sourceItems: fallbackSourceItems,
    });
  }

  return ideas;
}

function buildUseCaseIdeas(
  existingSlugs: Set<string>,
  generatedSlugs: string[],
  currentIdeas: ArticleIdea[],
  recentItems: CollectedItem[]
): ArticleIdea[] {
  const useCaseIdeas: Array<Omit<ArticleIdea, 'slug' | 'sourceItems'>> = [
    {
      title: 'Openclaw Use Case: Support Triage + FAQ',
      category: 'Tutorial',
      keywords: ['customer support', 'ticket triage', 'faq automation', 'helpdesk', 'support workflow'],
      angle: 'practical-tutorial',
      scenario: 'A SaaS support team handles 40-80 tickets per day across Slack and email. They want Openclaw to tag priority, draft FAQ replies, and send a daily summary of unresolved issues.',
      steps: [
        'Install Openclaw and complete onboarding (`clawdbot onboard`).',
        'Connect the support channel and restrict access to the support team.',
        'Add FAQ, refund, and policy docs to the Openclaw memory folder.',
        'Define a triage checklist (priority, category, owner) and test with sample tickets.',
        'Schedule a daily digest message with top issues and suggested replies.',
      ],
    },
    {
      title: 'Openclaw Use Case: Sales Lead Qualification',
      category: 'Tutorial',
      keywords: ['sales ops', 'lead qualification', 'crm notes', 'pipeline hygiene', 'sales automation'],
      angle: 'practical-tutorial',
      scenario: 'Inbound lead forms arrive in a shared Slack channel. Sales wants Openclaw to qualify leads, summarize intent, and sync notes into the CRM.',
      steps: [
        'Install Openclaw and connect the sales Slack channel.',
        'Post lead form payloads into Slack via webhook or email-to-Slack.',
        'Create a qualification checklist (company size, use case, timeline, budget).',
        'Configure a webhook/skill to call your CRM API with the summary fields.',
        'Validate with test leads, then switch the workflow to live traffic.',
      ],
    },
    {
      title: 'Openclaw Use Case: DevOps Incident Summaries',
      category: 'Tutorial',
      keywords: ['incident response', 'runbook', 'on-call', 'alert triage', 'devops automation'],
      angle: 'practical-tutorial',
      scenario: 'On-call engineers receive noisy alerts. They want Openclaw to summarize incidents, surface the right runbook, and capture a post-incident summary.',
      steps: [
        'Install Openclaw and connect the #incidents channel.',
        'Route alerts from PagerDuty or Grafana to the incident channel.',
        'Store runbooks and SOPs in the Openclaw memory folder.',
        'Define a message template that triggers an incident summary.',
        'Generate a post-incident summary with action items and owners.',
      ],
    },
    {
      title: 'Openclaw Use Case: Marketing Research Briefs',
      category: 'Tutorial',
      keywords: ['marketing automation', 'research briefs', 'content outlines', 'content workflow', 'brand research'],
      angle: 'practical-tutorial',
      scenario: 'A marketing team ships weekly content and needs faster research. Openclaw should compile sources, extract angles, and produce draft outlines.',
      steps: [
        'Install Openclaw and add a trusted source list to the workspace.',
        'Create a brief template with target audience, angle, and CTA.',
        'Run a weekly prompt to compile sources and summarize findings.',
        'Generate a draft outline with headings and key points.',
        'Review and refine before handing off to writers.',
      ],
    },
    {
      title: 'Openclaw Use Case: Meeting Notes to Tasks',
      category: 'Tutorial',
      keywords: ['meeting notes', 'task extraction', 'follow-ups', 'personal productivity', 'executive assistant'],
      angle: 'practical-tutorial',
      scenario: 'A founder wants meeting notes turned into tasks, follow-ups, and a weekly summary without manual copy/paste.',
      steps: [
        'Install Openclaw and connect Telegram for quick note capture.',
        'Use a meeting-notes template and send notes right after calls.',
        'Ask Openclaw to extract tasks, owners, and due dates.',
        'Generate follow-up drafts for stakeholders.',
        'Compile a weekly summary of completed and pending items.',
      ],
    },
    {
      title: 'Openclaw Use Case: HR Onboarding Assistant',
      category: 'Tutorial',
      keywords: ['hr onboarding', 'employee questions', 'policy assistant', 'internal handbook', 'people ops'],
      angle: 'practical-tutorial',
      scenario: 'HR receives repetitive onboarding questions. Openclaw should answer from the handbook and capture new hire checklists.',
      steps: [
        'Install Openclaw and connect an HR channel.',
        'Upload the employee handbook and onboarding checklist to memory.',
        'Create a welcome prompt with key policies and escalation rules.',
        'Test with 5 common onboarding questions.',
        'Set a weekly report for unanswered or escalated issues.',
      ],
    },
    {
      title: 'Openclaw Use Case: Recruiting Resume Triage',
      category: 'Tutorial',
      keywords: ['recruiting', 'resume screening', 'candidate summary', 'hiring', 'talent ops'],
      angle: 'practical-tutorial',
      scenario: 'Recruiters need faster resume screening. Openclaw should summarize candidate fit and highlight red flags.',
      steps: [
        'Install Openclaw and connect a recruiting channel.',
        'Drop resumes or summaries into the workspace memory folder.',
        'Define a scorecard (skills, experience, role fit).',
        'Ask Openclaw to produce a 5-bullet summary per candidate.',
        'Route top candidates to a review queue.',
      ],
    },
    {
      title: 'Openclaw Use Case: Invoice Triage',
      category: 'Tutorial',
      keywords: ['finance ops', 'invoice processing', 'expense review', 'ap workflow', 'approvals'],
      angle: 'practical-tutorial',
      scenario: 'Finance receives invoices and expenses via email. Openclaw should extract key fields and flag anomalies.',
      steps: [
        'Install Openclaw and connect the finance intake channel.',
        'Add invoice and expense policy docs to memory.',
        'Define required fields (vendor, amount, PO, due date).',
        'Ask Openclaw to extract fields and flag policy violations.',
        'Send a daily summary of pending approvals.',
      ],
    },
    {
      title: 'Openclaw Use Case: IT Helpdesk Automation',
      category: 'Tutorial',
      keywords: ['it helpdesk', 'ticketing', 'device setup', 'access requests', 'internal support'],
      angle: 'practical-tutorial',
      scenario: 'IT receives repetitive access requests. Openclaw should triage requests and auto-reply with SOPs.',
      steps: [
        'Install Openclaw and connect the IT support channel.',
        'Upload SOPs for access requests and device setup.',
        'Define a triage template (priority, system, requester).',
        'Auto-reply with SOP links and escalation steps.',
        'Summarize unresolved tickets daily.',
      ],
    },
    {
      title: 'Openclaw Use Case: E-commerce Order Support',
      category: 'Tutorial',
      keywords: ['ecommerce support', 'order status', 'returns', 'shipping updates', 'customer queries'],
      angle: 'practical-tutorial',
      scenario: 'An e-commerce team handles order status questions all day. Openclaw should answer from shipping policies and order data.',
      steps: [
        'Install Openclaw and connect the support channel.',
        'Add shipping/return policies to the memory folder.',
        'Define a lookup workflow for order status updates.',
        'Draft replies for common shipping delays.',
        'Provide a daily report on refund requests.',
      ],
    },
    {
      title: 'Openclaw Use Case: Ops Daily Reporting',
      category: 'Tutorial',
      keywords: ['operations', 'daily report', 'kpi summary', 'sop updates', 'team sync'],
      angle: 'practical-tutorial',
      scenario: 'Ops leads need a daily summary of KPIs, blockers, and escalations across teams.',
      steps: [
        'Install Openclaw and connect the ops channel.',
        'Define KPI sources and a standard daily report format.',
        'Aggregate updates from Slack/Telegram check-ins.',
        'Ask Openclaw to produce a summary with blockers and owners.',
        'Send the report at a fixed time each day.',
      ],
    },
    {
      title: 'Openclaw Use Case: Project Status Summaries',
      category: 'Tutorial',
      keywords: ['project management', 'status updates', 'team coordination', 'milestones', 'weekly sync'],
      angle: 'practical-tutorial',
      scenario: 'Project leads need weekly status updates across multiple teams. Openclaw should summarize progress and risks.',
      steps: [
        'Install Openclaw and connect a project status channel.',
        'Capture weekly updates via a simple prompt template.',
        'Store milestone docs in the memory folder.',
        'Ask Openclaw to summarize progress and highlight risks.',
        'Share the summary with stakeholders before the weekly sync.',
      ],
    },
  ];

  const allExisting = new Set([
    ...existingSlugs,
    ...generatedSlugs,
    ...currentIdeas.map((idea) => idea.slug),
  ]);
  const fallbackSourceItems = recentItems.slice(0, 5);
  const ideas: ArticleIdea[] = [];

  for (const idea of useCaseIdeas) {
    const slug = idea.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    if (allExisting.has(slug)) continue;

    ideas.push({
      ...idea,
      slug,
      sourceItems: fallbackSourceItems,
    });
  }

  return ideas;
}

function interleaveIdeas(primary: ArticleIdea[], secondary: ArticleIdea[], maxItems: number): ArticleIdea[] {
  const merged: ArticleIdea[] = [];
  let i = 0;
  let j = 0;

  while (merged.length < maxItems && (i < primary.length || j < secondary.length)) {
    if (i < primary.length) {
      merged.push(primary[i]);
      i += 1;
    }
    if (merged.length >= maxItems) break;
    if (j < secondary.length) {
      merged.push(secondary[j]);
      j += 1;
    }
  }

  return merged;
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
**Title Constraint:** Keep the title exactly as provided (<= 60 characters)

${idea.scenario ? `## USE CASE REQUIREMENTS

**Scenario:** ${idea.scenario}

**Required Steps:**
${(idea.steps || []).map((step, index) => `${index + 1}. ${step}`).join('\n')}
` : ''}

## REQUIRED STRUCTURE

1. Hook introduction that addresses the trending topic
2. Overview of how Moltbot solves the problem
3. Step-by-step practical guidance (if Tutorial/Guide)
4. Comparison table (if Comparison category)
5. Code examples with verified commands
6. Security considerations
7. Conclusion with next steps
${idea.scenario ? '8. Use case scenario section with concrete context\n9. Step-by-step implementation section matching the required steps' : ''}

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

  const architectureOverview = `
## Architecture Overview

Moltbot keeps your data local by splitting responsibilities across four components. This separation makes it easier to secure, scale, and reason about how the system behaves.

### ${kb.architecture.gateway.name}
${kb.architecture.gateway.description}
- Role: ${kb.architecture.gateway.role}
- Default port: ${kb.architecture.gateway.port}

### ${kb.architecture.agent.name}
${kb.architecture.agent.description}
Supported models include:
${kb.architecture.agent.supportedModels.slice(0, 5).map((m) => `- ${m}`).join('\n')}

### ${kb.architecture.skills.name}
${kb.architecture.skills.description}
Popular skill ideas:
${kb.architecture.skills.examples.slice(0, 6).map((s) => `- ${s}`).join('\n')}

### ${kb.architecture.memory.name}
${kb.architecture.memory.description}
Key capabilities:
${kb.architecture.memory.features.slice(0, 5).map((f) => `- ${f}`).join('\n')}
`;

  const configurationChecklist = `
## Configuration Checklist

Key files and locations:
- ${kb.configuration.configFile} (main config)
- ${kb.configuration.envFile} (environment variables)
- ${kb.configuration.soulFile} (assistant personality)
- ${kb.configuration.workspaceDir} (workspace and memory)

Important environment variables:
${kb.configuration.envVars.map((v) => `- \`${v}\``).join('\n')}

High-impact configuration options:
${Object.entries(kb.configuration.configOptions).map(([key, desc]) => `- \`${key}\`: ${desc}`).join('\n')}

Example minimal configuration:

\`\`\`json
{
  "gateway": {
    "bind": "loopback",
    "auth": {
      "password": "CHANGE_ME"
    }
  },
  "llm": {
    "provider": "anthropic",
    "apiKey": "ANTHROPIC_API_KEY"
  },
  "channels": {
    "telegram": {
      "botToken": "TELEGRAM_BOT_TOKEN"
    }
  }
}
\`\`\`
`;

  const modelSelection = `
## Model Selection and Cost Control

${kb.apiConfiguration.anthropic.name} is the recommended default because it balances quality and reliability for agent workflows.
Recommended models:
${kb.apiConfiguration.anthropic.models.map((model) => `- ${model.name} (${model.id}): ${model.use}`).join('\n')}

Other supported options:
- ${kb.apiConfiguration.openai.name}: ${kb.apiConfiguration.openai.models.join(', ')} (\`${kb.apiConfiguration.openai.envVar}\`)
- ${kb.apiConfiguration.local.name}: ${kb.apiConfiguration.local.description}. ${kb.apiConfiguration.local.setup}
`;

  const channelQuickstart = `
## Messaging Channel Quickstart

### ${kb.channels.telegram.name} (${kb.channels.telegram.difficulty})
${kb.channels.telegram.steps.slice(0, 5).map((s) => `- ${s}`).join('\n')}
Env var: \`${kb.channels.telegram.envVar}\`

### ${kb.channels.discord.name} (${kb.channels.discord.difficulty})
${kb.channels.discord.steps.slice(0, 5).map((s) => `- ${s}`).join('\n')}
Env var: \`${kb.channels.discord.envVar}\`

### ${kb.channels.whatsapp.name} (${kb.channels.whatsapp.difficulty})
${kb.channels.whatsapp.steps.slice(0, 4).map((s) => `- ${s}`).join('\n')}
Note: ${kb.channels.whatsapp.note}

### ${kb.channels.slack.name} (${kb.channels.slack.difficulty})
${kb.channels.slack.steps.slice(0, 4).map((s) => `- ${s}`).join('\n')}
`;

  const deploymentOptions = `
## Deployment Options

| Option | Best For | Pros | Cons |
| --- | --- | --- | --- |
| ${kb.deployment.local.name} | ${kb.deployment.local.description} | ${kb.deployment.local.pros.join(', ')} | ${kb.deployment.local.cons.join(', ')} |
| ${kb.deployment.macMini.name} | ${kb.deployment.macMini.description} | ${kb.deployment.macMini.pros.join(', ')} | ${kb.deployment.macMini.cons.join(', ')} |
| ${kb.deployment.raspberryPi.name} | ${kb.deployment.raspberryPi.description} | ${kb.deployment.raspberryPi.pros.join(', ')} | ${kb.deployment.raspberryPi.cons.join(', ')} |
| ${kb.deployment.vps.name} | ${kb.deployment.vps.description} | ${kb.deployment.vps.pros.join(', ')} | ${kb.deployment.vps.cons.join(', ')} |
`;

  const remoteAccess = `
## Remote Access (Safe Defaults)

${kb.remoteAccess.recommendation}

- ${kb.remoteAccess.tailscale.name}: ${kb.remoteAccess.tailscale.description}
- ${kb.remoteAccess.cloudflare.name}: ${kb.remoteAccess.cloudflare.description}
`;

  const maintenanceGuide = `
## Maintenance & Updates

\`\`\`bash
${kb.installation.status.command}
${kb.installation.doctor.command}
${kb.installation.update.command}
\`\`\`

If you run the gateway as a daemon, use the status and doctor commands regularly to catch configuration or permission issues early.
`;

  const faqSection = `
## Quick FAQ

**Q: ${kb.troubleshooting.gatewayNotStarting.issue}?**  
A: ${kb.troubleshooting.gatewayNotStarting.solution}

**Q: ${kb.troubleshooting.botTokenInvalid.issue}?**  
A: ${kb.troubleshooting.botTokenInvalid.solution}

**Q: ${kb.troubleshooting.serviceNotPersisting.issue}?**  
A: ${kb.troubleshooting.serviceNotPersisting.solution}

**Q: ${kb.troubleshooting.outOfMemory.issue}?**  
A: ${kb.troubleshooting.outOfMemory.solution}
`;

  const useCaseSection = idea.scenario ? `
## Use Case Scenario

${idea.scenario}

${idea.steps && idea.steps.length > 0 ? `### Step-by-Step Implementation
${idea.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
` : ''}
` : '';

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

${useCaseSection}

## Why Moltbot?

Moltbot is a ${kb.product.type} that offers:

- **Self-hosted**: Your data stays on your infrastructure
- **Multi-platform**: Works with Telegram, Discord, Slack, and WhatsApp
- **Flexible**: Supports Claude, GPT-4, and local LLMs via Ollama
- **Extensible**: Custom skills and plugins for any workflow

${architectureOverview}

## Getting Started

### Prerequisites

| Requirement | Details |
|------------|---------|
| Node.js | ${kb.requirements.nodejs.recommended} |
| OS | ${kb.requirements.os.supported.join(', ')} |
| Memory | ${kb.requirements.memory} |
| Storage | ${kb.requirements.storage} |

### Installation

> Security note: The quick install uses \`curl | bash\`. Review the script before running in production.
> Alternative: \`${kb.installation.quickInstall.alternative}\`

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

${configurationChecklist}

${modelSelection}

${channelQuickstart}

${deploymentOptions}

<HostingCTA context="inline" />

## Security Best Practices

When working with ${idea.keywords[0]}, always follow these security guidelines:

${kb.security.bestPractices.slice(0, 7).map((p) => `- ${p}`).join('\n')}

### Key Risks

${kb.security.risks.map((r) => `- ${r}`).join('\n')}

### Operational Recommendations

${kb.security.recommendations.slice(0, 5).map((r) => `- ${r}`).join('\n')}

${remoteAccess}

## Trending Resources

This article was inspired by current industry trends:

${trendingSources}

## Common Use Cases

Moltbot excels in these scenarios:

${kb.useCases.slice(0, 8).map((u) => `- ${u}`).join('\n')}

${maintenanceGuide}

${faqSection}

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

function normalizeGeneratedArticle(raw: string): string {
  let text = raw.trim();

  if (text.startsWith('```mdx')) {
    text = text.replace(/^```mdx\n/, '').replace(/\n```$/, '');
  }
  if (text.startsWith('```markdown')) {
    text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
  }
  if (text.startsWith('```')) {
    text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  const frontmatterIndex = text.indexOf('---\n');
  if (frontmatterIndex > 0) {
    text = text.slice(frontmatterIndex).trim();
  }

  return text;
}

function isValidArticle(content: string): boolean {
  if (!content.startsWith('---\n')) return false;
  if (!/title:\s*["']/.test(content)) return false;
  if (!/pubDate:\s*\d{4}-\d{2}-\d{2}/.test(content)) return false;
  if (!/import HostingCTA/.test(content)) return false;
  if (!/<HostingCTA\s+context="setup"\s*\/>/.test(content)) return false;
  if (!/<HostingCTA\s+context="inline"\s*\/>/.test(content)) return false;
  if (!/<HostingCTA\s+context="conclusion"\s*\/>/.test(content)) return false;
  return true;
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
      text = normalizeGeneratedArticle(text);
      if (!isValidArticle(text)) {
        throw new Error('Invalid article format from AICODECAT');
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
      let text = normalizeGeneratedArticle(response.text());
      if (!isValidArticle(text)) {
        throw new Error('Invalid article format from Gemini');
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
  console.log(`║  Max Articles: ${String(EFFECTIVE_MAX_ARTICLES).padEnd(43)}║`);
  if (MIN_ARTICLES_PER_RUN > 0) {
    console.log(`║  Min Articles: ${String(MIN_ARTICLES_PER_RUN).padEnd(43)}║`);
  }
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

  let ideas: ArticleIdea[] = [];

  if (USE_CASES_ONLY) {
    console.log('\n🧩 Use-case-only mode enabled (SEO_USE_CASES_ONLY=true)');
    ideas = buildUseCaseIdeas(existingSlugs, generatedSlugs, [], kb.items);
  } else {
    // Analyze trends
    const trends = analyzeTrendingTopics(kb.items);
    console.log(`\n📈 Top Trending Topics:`);
    trends.slice(0, 10).forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.topic}: ${t.count} mentions (${t.suggestedAngle})`);
    });

    // Generate article ideas
    ideas = generateArticleIdeas(trends, existingSlugs, generatedSlugs);

    if (INCLUDE_USE_CASES) {
      const useCaseIdeas = buildUseCaseIdeas(existingSlugs, generatedSlugs, ideas, kb.items);
      if (useCaseIdeas.length > 0) {
        ideas = interleaveIdeas(ideas, useCaseIdeas, EFFECTIVE_MAX_ARTICLES);
      }
    }

    if (MIN_ARTICLES_PER_RUN > 0 && ideas.length < MIN_ARTICLES_PER_RUN) {
      if (INCLUDE_USE_CASES) {
        const useCaseIdeas = buildUseCaseIdeas(existingSlugs, generatedSlugs, ideas, kb.items);
        for (const idea of useCaseIdeas) {
          if (ideas.length >= EFFECTIVE_MAX_ARTICLES) break;
          ideas.push(idea);
        }
      }
      const fallbackIdeas = buildFallbackIdeas(existingSlugs, generatedSlugs, ideas, kb.items);
      for (const idea of fallbackIdeas) {
        if (ideas.length >= EFFECTIVE_MAX_ARTICLES) break;
        ideas.push(idea);
      }
    }
  }

  ideas = ideas.slice(0, EFFECTIVE_MAX_ARTICLES);
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
