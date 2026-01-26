import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  console.error('Please set it in your .env file or environment');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

interface ArticleMetadata {
  title: string;
  description: string;
  category: 'Tutorial' | 'Guide' | 'Comparison' | 'Best Practices' | 'News' | 'Advanced';
  keywords: string[];
  readingTime: number;
  featured: boolean;
}

interface ArticleTopic {
  slug: string;
  title: string;
  category: ArticleMetadata['category'];
  keywords: string[];
  featured: boolean;
}

// Define 100 article topics
const articleTopics: ArticleTopic[] = [
  // Setup & Installation (25)
  { slug: 'setup-clawdbot-beginners', title: 'How to Setup Clawdbot for Beginners', category: 'Tutorial', keywords: ['clawdbot', 'setup', 'installation', 'beginner'], featured: true },
  { slug: 'install-clawdbot-mac', title: 'Installing Clawdbot on macOS', category: 'Tutorial', keywords: ['clawdbot', 'mac', 'macos', 'installation'], featured: false },
  { slug: 'install-clawdbot-linux', title: 'Installing Clawdbot on Linux', category: 'Tutorial', keywords: ['clawdbot', 'linux', 'ubuntu', 'installation'], featured: false },
  { slug: 'install-clawdbot-windows', title: 'Installing Clawdbot on Windows', category: 'Tutorial', keywords: ['clawdbot', 'windows', 'installation'], featured: false },
  { slug: 'clawdbot-docker-setup', title: 'Running Clawdbot with Docker', category: 'Tutorial', keywords: ['clawdbot', 'docker', 'container', 'deployment'], featured: false },
  { slug: 'clawdbot-mac-mini-setup', title: 'Setting Up Clawdbot on Mac Mini', category: 'Tutorial', keywords: ['clawdbot', 'mac mini', 'setup', '24/7'], featured: true },
  { slug: 'clawdbot-vps-deployment', title: 'Deploying Clawdbot on a VPS', category: 'Tutorial', keywords: ['clawdbot', 'vps', 'hosting', 'deployment'], featured: false },
  { slug: 'clawdbot-raspberry-pi', title: 'Running Clawdbot on Raspberry Pi', category: 'Tutorial', keywords: ['clawdbot', 'raspberry pi', 'arm', 'setup'], featured: false },
  { slug: 'clawdbot-api-key-setup', title: 'Configuring API Keys for Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'api key', 'anthropic', 'configuration'], featured: false },
  { slug: 'clawdbot-environment-variables', title: 'Managing Environment Variables in Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'environment', 'config', 'variables'], featured: false },
  { slug: 'clawdbot-first-run', title: 'Your First Run with Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'getting started', 'first run', 'tutorial'], featured: false },
  { slug: 'clawdbot-update-guide', title: 'How to Update Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'update', 'upgrade', 'version'], featured: false },
  { slug: 'clawdbot-troubleshooting-install', title: 'Troubleshooting Clawdbot Installation', category: 'Guide', keywords: ['clawdbot', 'troubleshooting', 'errors', 'installation'], featured: false },
  { slug: 'clawdbot-system-requirements', title: 'Clawdbot System Requirements', category: 'Guide', keywords: ['clawdbot', 'requirements', 'hardware', 'system'], featured: false },
  { slug: 'clawdbot-network-setup', title: 'Network Configuration for Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'network', 'firewall', 'ports'], featured: false },
  { slug: 'clawdbot-ssl-setup', title: 'Setting Up SSL for Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'ssl', 'https', 'security'], featured: false },
  { slug: 'clawdbot-reverse-proxy', title: 'Using Nginx as Reverse Proxy for Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'nginx', 'reverse proxy', 'deployment'], featured: false },
  { slug: 'clawdbot-systemd-service', title: 'Running Clawdbot as a Systemd Service', category: 'Tutorial', keywords: ['clawdbot', 'systemd', 'service', 'linux'], featured: false },
  { slug: 'clawdbot-pm2-setup', title: 'Managing Clawdbot with PM2', category: 'Tutorial', keywords: ['clawdbot', 'pm2', 'process manager', 'nodejs'], featured: false },
  { slug: 'clawdbot-backup-restore', title: 'Backing Up and Restoring Clawdbot', category: 'Guide', keywords: ['clawdbot', 'backup', 'restore', 'data'], featured: false },
  { slug: 'clawdbot-multi-instance', title: 'Running Multiple Clawdbot Instances', category: 'Advanced', keywords: ['clawdbot', 'multiple', 'instances', 'scaling'], featured: false },
  { slug: 'clawdbot-cloud-deployment', title: 'Deploying Clawdbot to Cloud Platforms', category: 'Tutorial', keywords: ['clawdbot', 'cloud', 'aws', 'gcp'], featured: false },
  { slug: 'clawdbot-kubernetes', title: 'Running Clawdbot on Kubernetes', category: 'Advanced', keywords: ['clawdbot', 'kubernetes', 'k8s', 'orchestration'], featured: false },
  { slug: 'clawdbot-monitoring-setup', title: 'Setting Up Monitoring for Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'monitoring', 'observability', 'logs'], featured: false },
  { slug: 'clawdbot-performance-tuning', title: 'Performance Tuning for Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'performance', 'optimization', 'tuning'], featured: false },

  // Use Cases (20)
  { slug: 'clawdbot-email-management', title: 'Managing Emails with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'email', 'gmail', 'automation'], featured: true },
  { slug: 'clawdbot-calendar-assistant', title: 'Using Clawdbot as a Calendar Assistant', category: 'Guide', keywords: ['clawdbot', 'calendar', 'scheduling', 'meetings'], featured: false },
  { slug: 'clawdbot-coding-assistant', title: 'Clawdbot as Your Coding Assistant', category: 'Guide', keywords: ['clawdbot', 'coding', 'programming', 'development'], featured: true },
  { slug: 'clawdbot-task-automation', title: 'Automating Tasks with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'automation', 'tasks', 'workflow'], featured: false },
  { slug: 'clawdbot-research-assistant', title: 'Using Clawdbot for Research', category: 'Guide', keywords: ['clawdbot', 'research', 'information', 'analysis'], featured: false },
  { slug: 'clawdbot-content-creation', title: 'Content Creation with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'content', 'writing', 'blog'], featured: false },
  { slug: 'clawdbot-data-analysis', title: 'Data Analysis with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'data', 'analysis', 'insights'], featured: false },
  { slug: 'clawdbot-customer-support', title: 'Clawdbot for Customer Support', category: 'Guide', keywords: ['clawdbot', 'customer support', 'helpdesk', 'tickets'], featured: false },
  { slug: 'clawdbot-documentation', title: 'Generating Documentation with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'documentation', 'docs', 'technical writing'], featured: false },
  { slug: 'clawdbot-code-review', title: 'Code Review with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'code review', 'quality', 'best practices'], featured: false },
  { slug: 'clawdbot-testing-automation', title: 'Test Automation with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'testing', 'qa', 'automation'], featured: false },
  { slug: 'clawdbot-devops-workflows', title: 'DevOps Workflows with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'devops', 'ci/cd', 'deployment'], featured: false },
  { slug: 'clawdbot-project-management', title: 'Project Management with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'project management', 'planning', 'tracking'], featured: false },
  { slug: 'clawdbot-meeting-notes', title: 'Taking Meeting Notes with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'meetings', 'notes', 'transcription'], featured: false },
  { slug: 'clawdbot-slack-integration', title: 'Integrating Clawdbot with Slack', category: 'Tutorial', keywords: ['clawdbot', 'slack', 'integration', 'chat'], featured: false },
  { slug: 'clawdbot-discord-bot', title: 'Using Clawdbot as a Discord Bot', category: 'Tutorial', keywords: ['clawdbot', 'discord', 'bot', 'community'], featured: false },
  { slug: 'clawdbot-github-integration', title: 'GitHub Integration with Clawdbot', category: 'Tutorial', keywords: ['clawdbot', 'github', 'git', 'version control'], featured: false },
  { slug: 'clawdbot-jira-automation', title: 'Automating Jira with Clawdbot', category: 'Guide', keywords: ['clawdbot', 'jira', 'tickets', 'automation'], featured: false },
  { slug: 'clawdbot-notion-integration', title: 'Clawdbot and Notion Integration', category: 'Tutorial', keywords: ['clawdbot', 'notion', 'notes', 'knowledge base'], featured: false },
  { slug: 'clawdbot-personal-assistant', title: 'Clawdbot as Your Personal Assistant', category: 'Guide', keywords: ['clawdbot', 'personal assistant', 'productivity', 'daily tasks'], featured: false },

  // Best Practices (15)
  { slug: 'clawdbot-security-best-practices', title: 'Security Best Practices for Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'security', 'best practices', 'safety'], featured: true },
  { slug: 'clawdbot-prompt-engineering', title: 'Prompt Engineering for Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'prompts', 'engineering', 'optimization'], featured: false },
  { slug: 'clawdbot-workflow-optimization', title: 'Optimizing Workflows with Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'workflow', 'optimization', 'efficiency'], featured: false },
  { slug: 'clawdbot-cost-optimization', title: 'Reducing Costs with Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'cost', 'optimization', 'api usage'], featured: false },
  { slug: 'clawdbot-data-privacy', title: 'Data Privacy with Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'privacy', 'data protection', 'gdpr'], featured: false },
  { slug: 'clawdbot-error-handling', title: 'Error Handling in Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'errors', 'handling', 'debugging'], featured: false },
  { slug: 'clawdbot-logging-practices', title: 'Logging Best Practices for Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'logging', 'monitoring', 'debugging'], featured: false },
  { slug: 'clawdbot-rate-limiting', title: 'Managing Rate Limits in Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'rate limiting', 'api', 'throttling'], featured: false },
  { slug: 'clawdbot-context-management', title: 'Context Management in Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'context', 'memory', 'conversation'], featured: false },
  { slug: 'clawdbot-response-quality', title: 'Improving Response Quality in Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'quality', 'responses', 'accuracy'], featured: false },
  { slug: 'clawdbot-scalability', title: 'Scaling Clawdbot for Production', category: 'Best Practices', keywords: ['clawdbot', 'scalability', 'production', 'enterprise'], featured: false },
  { slug: 'clawdbot-maintenance', title: 'Maintaining Your Clawdbot Instance', category: 'Best Practices', keywords: ['clawdbot', 'maintenance', 'updates', 'health'], featured: false },
  { slug: 'clawdbot-team-collaboration', title: 'Team Collaboration with Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'team', 'collaboration', 'sharing'], featured: false },
  { slug: 'clawdbot-version-control', title: 'Version Control for Clawdbot Configs', category: 'Best Practices', keywords: ['clawdbot', 'version control', 'git', 'configuration'], featured: false },
  { slug: 'clawdbot-testing-strategies', title: 'Testing Strategies for Clawdbot', category: 'Best Practices', keywords: ['clawdbot', 'testing', 'qa', 'validation'], featured: false },

  // Comparisons (15)
  { slug: 'clawdbot-vs-chatgpt', title: 'Clawdbot vs ChatGPT: Which is Better?', category: 'Comparison', keywords: ['clawdbot', 'chatgpt', 'comparison', 'ai assistant'], featured: true },
  { slug: 'clawdbot-vs-github-copilot', title: 'Clawdbot vs GitHub Copilot', category: 'Comparison', keywords: ['clawdbot', 'github copilot', 'coding', 'comparison'], featured: false },
  { slug: 'clawdbot-vs-cursor', title: 'Clawdbot vs Cursor IDE', category: 'Comparison', keywords: ['clawdbot', 'cursor', 'ide', 'development'], featured: false },
  { slug: 'clawdbot-vs-claude-desktop', title: 'Clawdbot vs Claude Desktop App', category: 'Comparison', keywords: ['clawdbot', 'claude', 'desktop', 'comparison'], featured: false },
  { slug: 'clawdbot-vs-openai-assistants', title: 'Clawdbot vs OpenAI Assistants API', category: 'Comparison', keywords: ['clawdbot', 'openai', 'assistants', 'api'], featured: false },
  { slug: 'clawdbot-vs-langchain', title: 'Clawdbot vs LangChain', category: 'Comparison', keywords: ['clawdbot', 'langchain', 'framework', 'llm'], featured: false },
  { slug: 'clawdbot-vs-autogpt', title: 'Clawdbot vs AutoGPT', category: 'Comparison', keywords: ['clawdbot', 'autogpt', 'autonomous', 'ai'], featured: false },
  { slug: 'clawdbot-vs-zapier', title: 'Clawdbot vs Zapier for Automation', category: 'Comparison', keywords: ['clawdbot', 'zapier', 'automation', 'workflows'], featured: false },
  { slug: 'clawdbot-vs-make', title: 'Clawdbot vs Make (Integromat)', category: 'Comparison', keywords: ['clawdbot', 'make', 'integromat', 'automation'], featured: false },
  { slug: 'clawdbot-vs-n8n', title: 'Clawdbot vs n8n', category: 'Comparison', keywords: ['clawdbot', 'n8n', 'workflow', 'automation'], featured: false },
  { slug: 'clawdbot-vs-rasa', title: 'Clawdbot vs Rasa', category: 'Comparison', keywords: ['clawdbot', 'rasa', 'chatbot', 'nlp'], featured: false },
  { slug: 'clawdbot-vs-botpress', title: 'Clawdbot vs Botpress', category: 'Comparison', keywords: ['clawdbot', 'botpress', 'chatbot', 'platform'], featured: false },
  { slug: 'clawdbot-vs-dialogflow', title: 'Clawdbot vs Dialogflow', category: 'Comparison', keywords: ['clawdbot', 'dialogflow', 'google', 'chatbot'], featured: false },
  { slug: 'clawdbot-vs-amazon-lex', title: 'Clawdbot vs Amazon Lex', category: 'Comparison', keywords: ['clawdbot', 'amazon lex', 'aws', 'chatbot'], featured: false },
  { slug: 'clawdbot-vs-microsoft-copilot', title: 'Clawdbot vs Microsoft Copilot', category: 'Comparison', keywords: ['clawdbot', 'microsoft copilot', 'office', 'productivity'], featured: false },

  // Advanced Topics (15)
  { slug: 'clawdbot-custom-skills', title: 'Creating Custom Skills for Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'custom skills', 'plugins', 'extensions'], featured: true },
  { slug: 'clawdbot-api-integration', title: 'Advanced API Integration with Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'api', 'integration', 'webhooks'], featured: false },
  { slug: 'clawdbot-self-hosting', title: 'Self-Hosting Clawdbot: Complete Guide', category: 'Advanced', keywords: ['clawdbot', 'self-hosting', 'deployment', 'infrastructure'], featured: false },
  { slug: 'clawdbot-function-calling', title: 'Function Calling in Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'function calling', 'tools', 'api'], featured: false },
  { slug: 'clawdbot-streaming-responses', title: 'Implementing Streaming in Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'streaming', 'real-time', 'responses'], featured: false },
  { slug: 'clawdbot-embeddings', title: 'Using Embeddings with Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'embeddings', 'vector', 'semantic search'], featured: false },
  { slug: 'clawdbot-rag-implementation', title: 'RAG Implementation in Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'rag', 'retrieval', 'knowledge base'], featured: false },
  { slug: 'clawdbot-fine-tuning', title: 'Fine-Tuning Clawdbot for Your Use Case', category: 'Advanced', keywords: ['clawdbot', 'fine-tuning', 'customization', 'training'], featured: false },
  { slug: 'clawdbot-multi-agent', title: 'Multi-Agent Systems with Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'multi-agent', 'orchestration', 'coordination'], featured: false },
  { slug: 'clawdbot-memory-systems', title: 'Building Memory Systems for Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'memory', 'persistence', 'context'], featured: false },
  { slug: 'clawdbot-plugin-development', title: 'Developing Plugins for Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'plugins', 'development', 'extensions'], featured: false },
  { slug: 'clawdbot-webhook-handlers', title: 'Creating Webhook Handlers for Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'webhooks', 'handlers', 'events'], featured: false },
  { slug: 'clawdbot-database-integration', title: 'Database Integration with Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'database', 'sql', 'data'], featured: false },
  { slug: 'clawdbot-authentication', title: 'Implementing Authentication in Clawdbot', category: 'Advanced', keywords: ['clawdbot', 'authentication', 'oauth', 'security'], featured: false },
  { slug: 'clawdbot-load-balancing', title: 'Load Balancing Clawdbot Instances', category: 'Advanced', keywords: ['clawdbot', 'load balancing', 'scaling', 'high availability'], featured: false },

  // News & Updates (10)
  { slug: 'clawdbot-2024-roadmap', title: 'Clawdbot 2024 Roadmap', category: 'News', keywords: ['clawdbot', 'roadmap', '2024', 'features'], featured: false },
  { slug: 'clawdbot-latest-features', title: 'Latest Features in Clawdbot', category: 'News', keywords: ['clawdbot', 'features', 'updates', 'new'], featured: false },
  { slug: 'clawdbot-community-highlights', title: 'Clawdbot Community Highlights', category: 'News', keywords: ['clawdbot', 'community', 'showcase', 'projects'], featured: false },
  { slug: 'clawdbot-success-stories', title: 'Success Stories with Clawdbot', category: 'News', keywords: ['clawdbot', 'success', 'case studies', 'testimonials'], featured: false },
  { slug: 'clawdbot-performance-improvements', title: 'Performance Improvements in Clawdbot', category: 'News', keywords: ['clawdbot', 'performance', 'speed', 'optimization'], featured: false },
  { slug: 'clawdbot-security-updates', title: 'Security Updates for Clawdbot', category: 'News', keywords: ['clawdbot', 'security', 'updates', 'patches'], featured: false },
  { slug: 'clawdbot-integration-updates', title: 'New Integrations for Clawdbot', category: 'News', keywords: ['clawdbot', 'integrations', 'new', 'partnerships'], featured: false },
  { slug: 'clawdbot-enterprise-features', title: 'Enterprise Features in Clawdbot', category: 'News', keywords: ['clawdbot', 'enterprise', 'business', 'features'], featured: false },
  { slug: 'clawdbot-open-source-contributions', title: 'Contributing to Clawdbot Open Source', category: 'News', keywords: ['clawdbot', 'open source', 'contributions', 'community'], featured: false },
  { slug: 'clawdbot-future-vision', title: 'The Future of Clawdbot', category: 'News', keywords: ['clawdbot', 'future', 'vision', 'ai'], featured: false },
];

async function generateArticle(topic: ArticleTopic): Promise<string> {
  console.log(`Generating article: ${topic.title}...`);

  const prompt = `You are a technical writer creating SEO-optimized content about Clawdbot, an open-source AI assistant.

Write a comprehensive article with the following specifications:

**Title:** ${topic.title}
**Category:** ${topic.category}
**Target Keywords:** ${topic.keywords.join(', ')}

**Requirements:**
1. Write in MDX format with proper frontmatter
2. Title should be exactly 50-60 characters
3. Description should be 120-160 characters
4. Include 3 strategic placements for the HostingCTA component:
   - After introduction (context="setup")
   - Mid-article during technical content (context="inline")
   - In conclusion (context="conclusion")
5. Use proper heading hierarchy (H2, H3)
6. Include code examples where relevant
7. Natural keyword integration (no keyword stuffing)
8. Reading time should be 8-12 minutes (1500-2000 words)
9. Include practical, actionable advice
10. Write ENTIRELY IN ENGLISH
11. Use the following frontmatter structure:

---
title: "Article Title Here"
description: "Description here (120-160 chars)"
pubDate: ${new Date().toISOString().split('T')[0]}
category: "${topic.category}"
tags: ${JSON.stringify(topic.keywords.slice(0, 5))}
keywords: ${JSON.stringify(topic.keywords)}
readingTime: 10
featured: ${topic.featured}
---

**Content Guidelines:**
- Write as if Clawdbot is a real, established open-source AI assistant
- Focus on practical, hands-on guidance
- Include troubleshooting tips
- Reference "official documentation" and "community resources" naturally
- Mention hosting requirements where relevant (for CTA integration)
- Use markdown formatting: code blocks, lists, bold, italic
- Include a table of contents if article is long
- ALL CONTENT MUST BE IN ENGLISH

**CTA Integration Examples:**
\`\`\`mdx
import HostingCTA from '../../components/CTA/HostingCTA.astro';

<HostingCTA context="setup" />
\`\`\`

Write the complete article now:`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error(`Error generating article for ${topic.slug}:`, error);
    throw error;
  }
}

async function saveArticle(slug: string, content: string): Promise<void> {
  const articlesDir = path.join(process.cwd(), 'src', 'content', 'articles');
  const filePath = path.join(articlesDir, `${slug}.mdx`);

  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`✓ Saved: ${slug}.mdx`);
}

async function generateAllArticles() {
  console.log(`Starting generation of ${articleTopics.length} articles...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const topic of articleTopics) {
    try {
      const content = await generateArticle(topic);
      await saveArticle(topic.slug, content);
      successCount++;

      // Rate limiting: wait 2 seconds between requests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`✗ Failed: ${topic.slug}`);
      errorCount++;
    }
  }

  console.log(`\n=== Generation Complete ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total: ${articleTopics.length}`);
}

// Run the generator
if (!process.env.GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  console.error('Please set it in your .env file or export it:');
  console.error('  export GEMINI_API_KEY=your-api-key');
  process.exit(1);
}

generateAllArticles().catch(console.error);
