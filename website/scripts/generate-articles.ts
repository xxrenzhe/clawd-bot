import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { CLAWDBOT_KNOWLEDGE, WRITING_STYLE, ARTICLE_TEMPLATES, VERIFIED_COMMANDS } from './clawdbot-knowledge-base.js';

const apiKey = process.env.GEMINI_API_KEY;
const offlineEnv = process.env.OFFLINE_ARTICLE_GENERATION === 'true';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
let forceOffline = offlineEnv;

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

const CATEGORY_TITLE_SUFFIXES: Record<ArticleMetadata['category'], string[]> = {
  Tutorial: ['Step-by-Step Guide', 'Quick Start Guide'],
  Guide: ['Practical Guide', 'Complete Guide'],
  Comparison: ['Comparison Guide', 'Complete Comparison'],
  'Best Practices': ['Best Practices Guide', 'Field Guide'],
  News: ['News Update', 'Update Guide'],
  Advanced: ['Advanced Guide', 'Deep Dive'],
};

function normalizeTitle(baseTitle: string, category: ArticleMetadata['category']): string {
  let title = baseTitle.trim().replace(/\s+/g, ' ');
  if (!/clawdbot/i.test(title)) {
    title = `Clawdbot ${title}`;
  }

  if (title.length < 30) {
    title = `${title} ${CATEGORY_TITLE_SUFFIXES[category][0]}`;
  }

  if (title.length < 40) {
    const candidate = `${title} ${CATEGORY_TITLE_SUFFIXES[category][1]}`;
    if (candidate.length <= 60) {
      title = candidate;
    }
  }

  if (title.length > 60) {
    title = title.replace(/\s*:\s*.*$/, '').replace(/\s*\([^)]*\)\s*/g, '').trim();
  }

  if (title.length > 60) {
    const trimmed = title.slice(0, 60);
    title = trimmed.replace(/\s+\S*$/, '').trim();
  }

  const powerWords = ['guide', 'tutorial', 'how', 'best', 'complete', 'ultimate', 'step', 'easy', 'quick', 'free'];
  const hasPowerWord = powerWords.some((word) => title.toLowerCase().includes(word));
  if (!hasPowerWord) {
    const candidate = `${title} Guide`;
    if (candidate.length <= 60) {
      title = candidate;
    }
  }

  return title;
}

function trimToLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  return truncated.replace(/\s+\S*$/, '').trim();
}

function escapeYaml(value: string): string {
  return value.replace(/"/g, '\\"');
}

function uniqueList(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach((item) => {
    const cleaned = item.trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(cleaned);
  });
  return result;
}

function buildKeywords(topic: ArticleTopic): string[] {
  const slugKeyword = topic.slug.replace(/-/g, ' ');
  const extras = [
    'clawdbot',
    'self-hosted ai',
    'ai assistant',
    'automation',
    'productivity',
    'ai workflow',
  ];
  return uniqueList([...topic.keywords, slugKeyword, ...extras]).slice(0, 10);
}

function buildDescription(title: string, keywords: string[]): string {
  const minLength = 120;
  const maxLength = 160;
  let description = `Learn ${title} with verified steps, security tips, and real commands for Clawdbot. Includes setup checks, troubleshooting, and next steps. See official docs and GitHub sources.`;
  if (description.length > maxLength) {
    description = trimToLength(description, maxLength);
  }
  if (description.length < minLength) {
    description = `${description} Practical setup guidance included.`;
    if (description.length > maxLength) {
      description = trimToLength(description, maxLength);
    }
  }
  return description;
}

function getRelatedSlugs(topic: ArticleTopic, topics: ArticleTopic[], count: number): string[] {
  const slugs = topics.map((t) => t.slug);
  const startIndex = slugs.indexOf(topic.slug);
  const related: string[] = [];
  for (let i = 1; related.length < count; i++) {
    const slug = slugs[(startIndex + i) % slugs.length];
    if (slug !== topic.slug) {
      related.push(slug);
    }
  }
  return related;
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mapArticleType(category: ArticleMetadata['category']): string {
  if (category === 'Tutorial') return 'HowTo';
  if (category === 'News') return 'NewsArticle';
  return 'TechArticle';
}

function mapDifficulty(category: ArticleMetadata['category']): string {
  if (category === 'Advanced') return 'advanced';
  if (category === 'Tutorial') return 'beginner';
  return 'intermediate';
}

function getComparisonTarget(title: string): string {
  const match = title.match(/Clawdbot vs ([^:]+)(:|$)/i);
  return match ? match[1].trim() : 'Other Tools';
}

function buildCategorySections(topic: ArticleTopic, title: string, comparisonTarget: string): string[] {
  const kb = CLAWDBOT_KNOWLEDGE;
  const lines: string[] = [];

  if (topic.category === 'Guide') {
    lines.push('## Overview');
    lines.push(`This guide explains ${title} using verified Clawdbot commands and safe defaults. It focuses on repeatable workflows that work across macOS, Linux, and Windows via WSL2.`);
    lines.push('');
    lines.push('## Key Concepts');
    lines.push(`- Gateway: ${kb.architecture.gateway.description}`);
    lines.push(`- Agent: ${kb.architecture.agent.description}`);
    lines.push(`- Skills: ${kb.architecture.skills.description}`);
    lines.push(`- Memory: ${kb.architecture.memory.description}`);
    lines.push('');
    lines.push('## Getting Started');
    lines.push(`Start by confirming Node.js ${kb.requirements.nodejs.recommended}+ and running ${kb.installation.onboarding.command}. This creates a baseline configuration you can refine later.`);
    lines.push('');
    lines.push('## Best Practices');
    lines.push('Follow these practices to keep your setup reliable and secure:');
    kb.security.bestPractices.slice(0, 5).forEach((practice) => {
      lines.push(`- ${practice}`);
    });
    lines.push('');
    lines.push('## Common Pitfalls');
    lines.push(`- ${kb.troubleshooting.nodeVersion.issue}: ${kb.troubleshooting.nodeVersion.solution}.`);
    lines.push(`- ${kb.troubleshooting.permissionDenied.issue}: ${kb.troubleshooting.permissionDenied.solution}.`);
    lines.push(`- ${kb.troubleshooting.gatewayNotStarting.issue}: ${kb.troubleshooting.gatewayNotStarting.solution}.`);
    lines.push('');
  }

  if (topic.category === 'Comparison') {
    lines.push('## Overview');
    lines.push(`This comparison outlines where Clawdbot fits against ${comparisonTarget}. It focuses on deployment model, control, and workflow integration instead of vendor marketing claims.`);
    lines.push('');
    lines.push('## Feature Comparison');
    lines.push(`| Criteria | Clawdbot | ${comparisonTarget} |`);
    lines.push('| --- | --- | --- |');
    lines.push('| Deployment | Self-hosted gateway you control | Check official docs |');
    lines.push('| Messaging channels | Telegram, WhatsApp, Discord, Slack | Check official docs |');
    lines.push('| Memory | File-based persistence | Check official docs |');
    lines.push('| Security controls | Loopback binding, gateway auth | Check official docs |');
    lines.push('| Cost control | Run on your own hardware | Check official docs |');
    lines.push('');
    lines.push('## Clawdbot Strengths');
    lines.push(`Clawdbot emphasizes self-hosting, transparent configuration, and messaging-first workflows. The Gateway on port ${kb.architecture.gateway.port} and the onboarding wizard make it practical for always-on assistants.`);
    lines.push('');
    lines.push(`## ${comparisonTarget} Strengths`);
    lines.push(`${comparisonTarget} can be a strong choice depending on its hosting model, pricing, and integrations. Review its official documentation and security posture before committing.`);
    lines.push('');
    lines.push('## When to Choose Each');
    lines.push(`Choose Clawdbot if you want full control, local data storage, and the ability to run on your own hardware. Consider ${comparisonTarget} if you prefer a managed service or an existing ecosystem.`);
    lines.push('');
    lines.push('## Verdict');
    lines.push(`Clawdbot is the better fit when ownership and self-hosting are primary requirements. ${comparisonTarget} may be the better fit when you want a turnkey service and do not need full local control.`);
    lines.push('');
  }

  if (topic.category === 'Best Practices') {
    lines.push('## Why This Matters');
    lines.push('Clawdbot can access files, execute commands, and connect to messaging platforms. Small security mistakes can expose credentials or allow unwanted access, so best practices are not optional.');
    lines.push('');
    lines.push('## The Practices');
    lines.push('Start with these verified practices from the Clawdbot security guidance:');
    kb.security.bestPractices.slice(0, 7).forEach((practice) => {
      lines.push(`- ${practice}`);
    });
    lines.push('');
    lines.push('## Implementation Examples');
    lines.push('Use these configuration examples as a starting point:');
    lines.push('```yaml');
    lines.push('gateway:');
    lines.push('  bind: loopback');
    lines.push('  auth:');
    lines.push('    password: "change-me"');
    lines.push('```');
    lines.push('');
    lines.push('## Common Mistakes');
    kb.security.risks.slice(0, 5).forEach((risk) => {
      lines.push(`- ${risk}`);
    });
    lines.push('');
    lines.push('## Summary');
    lines.push('Apply these practices before connecting personal accounts, and review the security checklist whenever you change providers or add new channels.');
    lines.push('');
  }

  if (topic.category === 'Advanced') {
    lines.push('## Architecture Overview');
    lines.push('Clawdbot is organized around a Gateway, an Agent, Skills, and Memory. The Gateway handles message routing and tool execution, while the Agent manages reasoning and model selection.');
    lines.push('');
    lines.push('## Implementation');
    lines.push('For advanced deployments, run the onboarding wizard with daemon installation and configure the gateway binding for loopback access.');
    lines.push('```bash');
    lines.push(kb.installation.onboarding.withDaemon);
    lines.push(kb.installation.gateway.command);
    lines.push('```');
    lines.push('');
    lines.push('## Testing');
    lines.push('Use these commands to validate configuration and security before going live:');
    lines.push('```bash');
    lines.push(kb.installation.health.command);
    lines.push(kb.installation.doctor.command);
    lines.push('```');
    lines.push('');
    lines.push('## Production Considerations');
    lines.push(`${kb.remoteAccess.recommendation}. Consider Tailscale or Cloudflare Tunnel instead of opening ports.`);
    lines.push('');
  }

  if (topic.category === 'News') {
    lines.push('## Summary');
    lines.push(`This update-oriented article explains how to track changes relevant to ${title}. Use the official docs and GitHub releases as the source of truth so your deployment stays aligned.`);
    lines.push('');
    lines.push("## What's New");
    lines.push('For the latest features, review the release notes and documentation. Focus on installation flow, gateway stability, messaging channels, and security guidance.');
    lines.push('');
    lines.push('## Impact');
    lines.push('Updates typically affect setup commands, configuration defaults, and security recommendations. Validate each change against your environment before rolling it into production.');
    lines.push('');
    lines.push('## How to Get Started');
    lines.push('When an update is available, use the verified update command and restart the gateway:');
    lines.push('```bash');
    lines.push(kb.installation.update.command);
    lines.push('```');
    lines.push('');
    lines.push("## What's Next");
    lines.push('Follow the documentation and GitHub repository for announcements, and plan a regular review cadence so you do not miss critical fixes.');
    lines.push('');
  }

  return lines;
}

function buildOfflineBody(
  topic: ArticleTopic,
  title: string,
  related: string[],
  image: string,
  imageAlt: string
): string {
  const kb = CLAWDBOT_KNOWLEDGE;
  const comparisonTarget = getComparisonTarget(topic.title);
  const categorySections = buildCategorySections(topic, title, comparisonTarget);

  const introParagraph = [
    `${kb.product.name} is an ${kb.product.type} that acts as an AI Gateway and connects messaging apps to LLM APIs like Claude.`,
    `This article covers ${title} with verified commands, safe defaults, and clear steps you can follow on your own hardware.`,
    'API stands for application programming interface, and the Clawdbot CLI (command line interface) is how you run setup commands from your terminal.',
  ].join(' ');

  const prereqList = [
    `Node.js ${kb.requirements.nodejs.recommended}+ (${kb.requirements.nodejs.checkCommand})`,
    `Supported OS: ${kb.requirements.os.supported.join(', ')}`,
    `Memory: ${kb.requirements.memory}`,
    `Storage: ${kb.requirements.storage}`,
  ];

  const troubleshootingList = [
    `${kb.troubleshooting.nodeVersion.issue}: ${kb.troubleshooting.nodeVersion.solution}.`,
    `${kb.troubleshooting.permissionDenied.issue}: ${kb.troubleshooting.permissionDenied.solution}.`,
    `${kb.troubleshooting.gatewayNotStarting.issue}: ${kb.troubleshooting.gatewayNotStarting.solution}.`,
    `${kb.troubleshooting.botTokenInvalid.issue}: ${kb.troubleshooting.botTokenInvalid.solution}.`,
  ];

  const lines: string[] = [];
  lines.push("import HostingCTA from '../../components/CTA/HostingCTA.astro';");
  lines.push('');
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`![${imageAlt}](${image})`);
  lines.push('');
  lines.push('## Introduction');
  lines.push(introParagraph);
  lines.push('');
  lines.push('<HostingCTA context="setup" />');
  lines.push('');
  lines.push("## What You'll Learn");
  lines.push('- Install Clawdbot using verified commands and confirm the gateway is healthy.');
  lines.push('- Configure API keys and secure access without exposing the gateway port.');
  lines.push('- Connect messaging channels such as Telegram and Discord.');
  lines.push('- Apply best practices and troubleshoot common issues.');
  lines.push('');

  if (categorySections.length > 0) {
    lines.push(...categorySections);
  }

  lines.push('## Prerequisites');
  prereqList.forEach((item) => lines.push(`- ${item}`));
  lines.push('Install Node.js from [nodejs.org](https://nodejs.org) if needed, then confirm your version before continuing.');
  lines.push('');
  lines.push('## Step 1: Install and Verify Clawdbot');
  lines.push('Use the official installer or the npm alternative. For example, the installer script is the fastest option when you are starting fresh.');
  lines.push('> Warning: Piping a script to bash can be risky. Review the script first and never expose the gateway port to the public internet.');
  lines.push('```bash');
  lines.push(kb.installation.quickInstall.command);
  lines.push(kb.installation.onboarding.command);
  lines.push(kb.installation.health.command);
  lines.push('```');
  lines.push('Step 1: Run the installer and confirm Node.js 22+ is available.');
  lines.push('Step 2: Use the onboarding wizard to configure your providers.');
  lines.push('Step 3: Run the health check to verify the gateway.');
  lines.push('');
  lines.push('## Step 2: Configure Secure Access');
  lines.push('Keep API keys secret, avoid committing them to git, and store them in environment variables or secure config files. JSON stands for JavaScript Object Notation, and you can store configuration there when needed.');
  lines.push('```bash');
  lines.push('export ANTHROPIC_API_KEY="your-key-here"');
  lines.push('export DISCORD_BOT_TOKEN="your-token-here"');
  lines.push(kb.installation.doctor.command);
  lines.push('```');
  lines.push('If you are using a reverse proxy, configure gateway.auth.password and gateway.trustedProxies for safety.');
  lines.push('');
  lines.push('## Step 3: Connect Messaging Channels');
  lines.push('Telegram is the easiest starting point, and Discord is a popular next step. Follow the verified setup steps and keep bot tokens private.');
  lines.push('```bash');
  lines.push('clawdbot configure --section channels.telegram');
  lines.push('clawdbot configure --section channels.discord');
  lines.push('```');
  lines.push('Once channels are connected, test a simple message to ensure routing works end to end.');
  lines.push('');
  lines.push('<HostingCTA context="inline" />');
  lines.push('');
  lines.push('## Verification');
  lines.push('Start the gateway and confirm the local dashboard is reachable on the default port.');
  lines.push('```bash');
  lines.push(kb.installation.gateway.command);
  lines.push('clawdbot gateway status');
  lines.push('```');
  lines.push('If the dashboard does not load, check the port and validate your API keys.');
  lines.push('');
  lines.push('## Troubleshooting');
  troubleshootingList.forEach((item) => lines.push(`- ${item}`));
  lines.push('If issues persist, run the doctor command again and review the official docs.');
  lines.push('');
  lines.push('## Security Notes');
  lines.push('Clawdbot can have deep system access, so treat it like an admin tool.');
  lines.push(`- ${kb.security.bestPractices[0]}`);
  lines.push(`- ${kb.security.bestPractices[2]}`);
  lines.push(`- ${kb.security.bestPractices[5]}`);
  lines.push('Never share API keys or expose the gateway port to the public internet.');
  lines.push('');
  lines.push('## Additional Notes');
  lines.push('Clawdbot runs well on a modern laptop, a Mac Mini for 24/7 operation, a Raspberry Pi for low power, or a small VPS for remote access. Choose the footprint that matches your uptime, latency, and privacy needs.');
  lines.push('');
  lines.push('## Use Cases');
  kb.useCases.forEach((useCase) => lines.push(`- ${useCase}`));
  lines.push('');
  lines.push('## Deployment Options');
  lines.push(`- ${kb.deployment.local.name}: ${kb.deployment.local.description}. Pros: ${kb.deployment.local.pros.join(', ')}. Cons: ${kb.deployment.local.cons.join(', ')}.`);
  lines.push(`- ${kb.deployment.macMini.name}: ${kb.deployment.macMini.description}. Pros: ${kb.deployment.macMini.pros.join(', ')}. Cons: ${kb.deployment.macMini.cons.join(', ')}.`);
  lines.push(`- ${kb.deployment.raspberryPi.name}: ${kb.deployment.raspberryPi.description}. Pros: ${kb.deployment.raspberryPi.pros.join(', ')}. Cons: ${kb.deployment.raspberryPi.cons.join(', ')}.`);
  lines.push(`- ${kb.deployment.vps.name}: ${kb.deployment.vps.description}. Pros: ${kb.deployment.vps.pros.join(', ')}. Cons: ${kb.deployment.vps.cons.join(', ')}.`);
  lines.push(`- ${kb.deployment.docker.name}: ${kb.deployment.docker.description}. Pros: ${kb.deployment.docker.pros.join(', ')}. Cons: ${kb.deployment.docker.cons.join(', ')}.`);
  lines.push('');
  lines.push('## Configuration Checklist');
  lines.push(`- Confirm Node.js ${kb.requirements.nodejs.recommended}+ and verify with "${kb.requirements.nodejs.checkCommand}".`);
  lines.push(`- Run "${kb.installation.onboarding.command}" and store configuration in ${kb.configuration.configFile}.`);
  lines.push('- Set API keys in environment variables or a secure secret manager.');
  lines.push('- Bind the gateway to loopback and set a strong dashboard password.');
  lines.push(`- Run "${kb.installation.doctor.command}" and fix any reported issues.`);
  lines.push('');
  lines.push('## Channel Setup Highlights');
  lines.push('Telegram essentials:');
  kb.channels.telegram.steps.slice(0, 4).forEach((step) => lines.push(`- ${step}`));
  lines.push('Discord essentials:');
  kb.channels.discord.steps.slice(0, 4).forEach((step) => lines.push(`- ${step}`));
  lines.push('');
  lines.push('## Security Checklist');
  kb.security.bestPractices.forEach((practice) => lines.push(`- ${practice}`));
  kb.security.recommendations.forEach((rec) => lines.push(`- ${rec}`));
  lines.push('Never expose the gateway port to the public internet.');
  lines.push('');
  lines.push('## Related Articles');
  related.forEach((slug) => {
    lines.push(`- [${slugToTitle(slug)}](/articles/${slug})`);
  });
  lines.push('');
  lines.push('## Next Steps');
  lines.push('First, review the configuration and lock down access controls.');
  lines.push('Next, connect one messaging channel and validate end-to-end routing.');
  lines.push('Finally, automate a small workflow and monitor logs for stability.');
  lines.push('');
  lines.push('## 免费安装服务');
  lines.push('我们提供免费的 Clawdbot 安装服务，包含环境检查、基础配置与首次运行指导。欢迎通过 [联系页面](/contact) 与我们预约。');
  lines.push('');
  lines.push('## Conclusion');
  lines.push('You now have a verified path to install, configure, and secure Clawdbot. See the [official documentation](https://docs.clawd.bot/) and the [GitHub repository](https://github.com/clawdbot/clawdbot) for updates and deeper guidance.');
  lines.push('');
  lines.push('<HostingCTA context="conclusion" />');

  let body = lines.join('\n');
  if (countWords(body) < 1500) {
    const extraLines = [
      '## Extended Notes',
      'Clawdbot rewards careful iteration. Start with a minimal configuration, validate the gateway, and expand features one change at a time. This reduces risk and makes troubleshooting faster.',
      '',
      'Operationally, plan for log review, backups, and update windows. For example, schedule a weekly check of gateway status and a monthly review of API key hygiene.',
      '',
      'If you are deploying for a team, document the onboarding flow and store configuration in version control without secrets. Keep a backup of clawdbot.json so you can restore quickly.',
      '',
      'Operational checklist:',
      '- Verify the gateway is bound to loopback.',
      '- Confirm dashboard authentication is enabled.',
      '- Review messaging allow-lists and bot tokens.',
      '- Run clawdbot doctor after any major change.',
    ];
    const extra = extraLines.join('\n');
    while (countWords(body) < 1500) {
      body = `${body}\n\n${extra}`;
    }
  }

  return body;
}

function generateOfflineArticle(topic: ArticleTopic, topics: ArticleTopic[]): string {
  const today = new Date().toISOString().split('T')[0];
  const title = normalizeTitle(topic.title, topic.category);
  const keywords = buildKeywords(topic);
  const description = buildDescription(title, keywords);
  const related = getRelatedSlugs(topic, topics, 3);
  const image = `/images/articles/${topic.slug}.jpg`;
  const imageAlt = title;
  const body = buildOfflineBody(topic, title, related, image, imageAlt);
  const readingTime = clampNumber(Math.round(countWords(body) / 180), 5, 15);

  const frontmatter = [
    '---',
    `title: "${escapeYaml(title)}"`,
    `description: "${escapeYaml(description)}"`,
    `pubDate: ${today}`,
    `modifiedDate: ${today}`,
    `category: "${topic.category}"`,
    `tags: ${JSON.stringify(keywords.slice(0, 5))}`,
    `keywords: ${JSON.stringify(keywords)}`,
    `readingTime: ${readingTime}`,
    `featured: ${topic.featured}`,
    'author: "Clawdbot Team"',
    `image: "${image}"`,
    `imageAlt: "${escapeYaml(imageAlt)}"`,
    `articleType: "${mapArticleType(topic.category)}"`,
    `difficulty: "${mapDifficulty(topic.category)}"`,
    'sources:',
    '  - "https://docs.clawd.bot/"',
    '  - "https://github.com/clawdbot/clawdbot"',
    'relatedArticles:',
    ...related.map((slug) => `  - "${slug}"`),
    '---',
    '',
  ].join('\n');

  return `${frontmatter}${body}\n`;
}

/**
 * Build a comprehensive, fact-based prompt using the knowledge base
 */
function buildArticlePrompt(topic: ArticleTopic): string {
  const kb = CLAWDBOT_KNOWLEDGE;
  const style = WRITING_STYLE;

  // Get category-specific template
  const categoryKey = topic.category.toLowerCase().replace(' ', '-') as keyof typeof ARTICLE_TEMPLATES;
  const template = ARTICLE_TEMPLATES[categoryKey] || ARTICLE_TEMPLATES.guide;

  // Determine which knowledge sections are relevant to this topic
  const relevantKnowledge = getRelevantKnowledge(topic);

  return `You are an expert technical writer creating a high-quality, factually accurate article about Clawdbot.

## CRITICAL: USE ONLY VERIFIED INFORMATION

You MUST use ONLY the following verified information. DO NOT invent features, commands, or capabilities not listed here.

### Product Information (VERIFIED)
- Name: ${kb.product.name}
- Type: ${kb.product.type}
- Description: ${kb.product.description}
- GitHub: ${kb.product.github}
- Documentation: ${kb.product.docs}

### System Requirements (VERIFIED)
- Node.js: ${kb.requirements.nodejs.minimum}+ (check with: ${kb.requirements.nodejs.checkCommand})
- Supported OS: ${kb.requirements.os.supported.join(', ')}
- NOT Supported: ${kb.requirements.os.notSupported.join(', ')}
- Memory: ${kb.requirements.memory}
- Storage: ${kb.requirements.storage}
- Hardware options: ${kb.requirements.hardware.join(', ')}

### Installation Commands (VERIFIED - USE EXACTLY AS SHOWN)
- Quick install: \`${kb.installation.quickInstall.command}\`
- Alternative: \`${kb.installation.quickInstall.alternative}\`
- Onboarding: \`${kb.installation.onboarding.command}\`
- With daemon: \`${kb.installation.onboarding.withDaemon}\`
- Start gateway: \`${kb.installation.gateway.command}\`
- Dashboard URL: ${kb.installation.gateway.dashboard}
- Health check: \`${kb.installation.health.command}\`
- Doctor: \`${kb.installation.doctor.command}\`

### Architecture (VERIFIED)
${JSON.stringify(kb.architecture, null, 2)}

### Messaging Channels Setup (VERIFIED)
${JSON.stringify(kb.channels, null, 2)}

### Security (VERIFIED - MUST INCLUDE WARNINGS)
Risks: ${kb.security.risks.join('; ')}
Best Practices: ${kb.security.bestPractices.join('; ')}

${relevantKnowledge}

---

## ARTICLE SPECIFICATIONS

**Title:** ${topic.title}
**Category:** ${topic.category}
**Target Keywords:** ${topic.keywords.join(', ')}
**Slug:** ${topic.slug}

## REQUIRED STRUCTURE

${template.requiredSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## WRITING STYLE REQUIREMENTS

### Hook/Introduction
${style.hook.examples.map(e => `- "${e}"`).join('\n')}

### Tone
${style.tone.guidelines.map(g => `- ${g}`).join('\n')}

### Code Blocks
${style.codeBlocks.requirements.map(r => `- ${r}`).join('\n')}

### Warnings (MUST INCLUDE)
${style.warnings.mustInclude.map(w => `- ${w}`).join('\n')}

## OUTPUT FORMAT

Write in MDX format with this exact frontmatter:

---
title: "Article Title Here (50-60 chars)"
description: "Description here (120-160 chars)"
pubDate: ${new Date().toISOString().split('T')[0]}
modifiedDate: ${new Date().toISOString().split('T')[0]}
category: "${topic.category}"
tags: ${JSON.stringify(topic.keywords.slice(0, 5))}
keywords: ${JSON.stringify(topic.keywords)}
readingTime: 10
featured: ${topic.featured}
author: "Clawdbot Team"
image: "/images/articles/${topic.slug}.jpg"
imageAlt: "${topic.title}"
articleType: "${topic.category === 'Tutorial' ? 'HowTo' : 'TechArticle'}"
difficulty: "${topic.category === 'Advanced' ? 'advanced' : topic.category === 'Tutorial' ? 'beginner' : 'intermediate'}"
sources:
  - "https://docs.clawd.bot/"
  - "https://github.com/clawdbot/clawdbot"
---

## CONTENT RULES

1. **ACCURACY**: Only use commands and features from the verified information above
2. **NO HALLUCINATIONS**: If you don't have verified information about something, say "refer to the official documentation" instead of making it up
3. **INCLUDE SOURCES**: Reference official documentation naturally in the text
4. **SECURITY WARNINGS**: Always warn about security implications of full system access
5. **REAL COMMANDS**: Use the exact commands from the knowledge base, not invented ones
6. **VERSION SPECIFICITY**: Include Node.js 22+ requirement where relevant
7. **HONEST LIMITATIONS**: Acknowledge when something requires advanced knowledge or has risks
8. **SERVICE CTA**: Include a section that mentions "提供免费的 Clawdbot 安装服务" with a link to /contact

## CTA INTEGRATION

Include these 3 CTA placements:

\`\`\`mdx
import HostingCTA from '../../components/CTA/HostingCTA.astro';

<HostingCTA context="setup" />  {/* After introduction */}
<HostingCTA context="inline" /> {/* Mid-article */}
<HostingCTA context="conclusion" /> {/* In conclusion */}
\`\`\`

## LENGTH

Target 1500-2000 words (8-12 minute read).

Now write the complete, factually accurate article:`;
}

/**
 * Get knowledge sections relevant to the specific topic
 */
function getRelevantKnowledge(topic: ArticleTopic): string {
  const kb = CLAWDBOT_KNOWLEDGE;
  const sections: string[] = [];

  // Add topic-specific knowledge
  if (topic.slug.includes('telegram')) {
    sections.push(`### Telegram Setup (VERIFIED)\n${JSON.stringify(kb.channels.telegram, null, 2)}`);
  }
  if (topic.slug.includes('discord')) {
    sections.push(`### Discord Setup (VERIFIED)\n${JSON.stringify(kb.channels.discord, null, 2)}`);
  }
  if (topic.slug.includes('whatsapp')) {
    sections.push(`### WhatsApp Setup (VERIFIED)\n${JSON.stringify(kb.channels.whatsapp, null, 2)}`);
  }
  if (topic.slug.includes('security') || topic.category === 'Best Practices') {
    sections.push(`### Security Recommendations (VERIFIED)\n${JSON.stringify(kb.security, null, 2)}`);
  }
  if (topic.slug.includes('vps') || topic.slug.includes('cloud') || topic.slug.includes('deploy')) {
    sections.push(`### Deployment Options (VERIFIED)\n${JSON.stringify(kb.deployment, null, 2)}`);
  }
  if (topic.slug.includes('troubleshoot') || topic.slug.includes('error')) {
    sections.push(`### Troubleshooting (VERIFIED)\n${JSON.stringify(kb.troubleshooting, null, 2)}`);
  }
  if (topic.slug.includes('config') || topic.slug.includes('environment')) {
    sections.push(`### Configuration (VERIFIED)\n${JSON.stringify(kb.configuration, null, 2)}`);
  }

  // Always include use cases for context
  sections.push(`### Common Use Cases (VERIFIED)\n${kb.useCases.map(u => `- ${u}`).join('\n')}`);

  return sections.join('\n\n');
}

/**
 * Validate generated content for accuracy
 */
function validateGeneratedContent(content: string, topic: ArticleTopic): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const kb = CLAWDBOT_KNOWLEDGE;

  // Check for hallucination indicators
  const hallucintionPatterns = [
    /as of my (knowledge cutoff|last update)/i,
    /I don't have access to/i,
    /I cannot verify/i,
    /this may not be accurate/i,
    /please verify/i,
    /\[TODO\]/i,
    /\[PLACEHOLDER\]/i,
    /\[INSERT.*?\]/i,
  ];

  hallucintionPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      issues.push(`Hallucination indicator found: ${pattern.source}`);
    }
  });

  // Check for invented commands (commands that aren't in our knowledge base)
  const commandPatterns = /```bash\n([\s\S]*?)```/g;
  let match;
  while ((match = commandPatterns.exec(content)) !== null) {
    const commands = match[1];
    // Check if clawdbot commands are valid
    if (commands.includes('clawdbot')) {
      const clawdbotCmds = commands.match(/clawdbot\s+(\w+)/g);
      if (clawdbotCmds) {
        clawdbotCmds.forEach(cmd => {
          const subCmd = cmd.split(/\s+/)[1];
          if (subCmd && !VERIFIED_COMMANDS.clawdbot.includes(subCmd)) {
            issues.push(`Potentially invented command: ${cmd}`);
          }
        });
      }
    }
  }

  // Check for required elements based on category
  if (topic.category === 'Tutorial') {
    if (!content.includes('## Prerequisites') && !content.includes('## What You')) {
      issues.push('Tutorial missing Prerequisites section');
    }
    if (!/Step \d|## Step/i.test(content)) {
      issues.push('Tutorial missing numbered steps');
    }
  }

  // Check for security warnings in sensitive topics
  const securityTopics = ['security', 'api-key', 'authentication', 'self-hosting'];
  if (securityTopics.some(t => topic.slug.includes(t))) {
    const hasSecurityWarning = /⚠️|warning|caution|security risk|be careful/i.test(content);
    if (!hasSecurityWarning) {
      issues.push('Security-related topic missing security warnings');
    }
  }

  // Check for frontmatter
  if (!content.startsWith('---')) {
    issues.push('Missing frontmatter');
  }

  // Check for CTA components
  const ctaCount = (content.match(/<HostingCTA/g) || []).length;
  if (ctaCount < 2) {
    issues.push(`Only ${ctaCount} CTA components (expected 2-3)`);
  }

  if (!content.includes('提供免费的 Clawdbot 安装服务')) {
    issues.push('Missing free installation service mention');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

async function generateArticle(topic: ArticleTopic, topics: ArticleTopic[]): Promise<string> {
  if (forceOffline || !genAI) {
    console.log(`\n📝 Generating article (offline): ${topic.title}...`);
    return generateOfflineArticle(topic, topics);
  }

  console.log(`\n📝 Generating article: ${topic.title}...`);

  const prompt = buildArticlePrompt(topic);

  try {
    const model = genAI.getGenerativeModel({ model: geminiModel });
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

    // Validate the generated content
    const validation = validateGeneratedContent(text, topic);
    if (!validation.valid) {
      console.log(`  ⚠️  Validation issues found:`);
      validation.issues.forEach(issue => console.log(`     - ${issue}`));
    } else {
      console.log(`  ✅ Content validation passed`);
    }

    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/fetch failed|ENOTFOUND|ECONN|ETIMEDOUT/i.test(message)) {
      if (!forceOffline) {
        console.warn('  ⚠️  Gemini fetch failed. Switching to offline generation.');
      }
      forceOffline = true;
      return generateOfflineArticle(topic, topics);
    }
    console.error(`Error generating article for ${topic.slug}:`, error);
    throw error;
  }
}

async function saveArticle(slug: string, content: string): Promise<void> {
  const articlesDir = path.join(process.cwd(), 'src', 'content', 'articles');

  // Ensure directory exists
  await fs.mkdir(articlesDir, { recursive: true });

  const filePath = path.join(articlesDir, `${slug}.mdx`);
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`  💾 Saved: ${slug}.mdx`);
}

async function generateAllArticles() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        CLAWDBOT ARTICLE GENERATOR (Knowledge-Based)        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  const modelLabel = (forceOffline || !genAI) ? 'offline-template' : geminiModel;
  console.log(`║  Model: ${modelLabel.padEnd(49)}║`);
  console.log(`║  Articles: ${String(articleTopics.length).padEnd(47)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let successCount = 0;
  let errorCount = 0;
  const validationIssues: { slug: string; issues: string[] }[] = [];

  for (let i = 0; i < articleTopics.length; i++) {
    const topic = articleTopics[i];
    console.log(`[${i + 1}/${articleTopics.length}] ${topic.title}`);

    try {
      const content = await generateArticle(topic, articleTopics);

      // Final validation before saving
      const validation = validateGeneratedContent(content, topic);
      if (!validation.valid) {
        validationIssues.push({ slug: topic.slug, issues: validation.issues });
      }

      await saveArticle(topic.slug, content);
      successCount++;

      // Rate limiting: wait 2 seconds between requests
      if (i < articleTopics.length - 1 && !forceOffline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`  ❌ Failed: ${topic.slug}`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    GENERATION COMPLETE                     ║');
  console.log('╠═══════════════════════════════════════════��════════════════╣');
  console.log(`║  ✅ Success: ${String(successCount).padEnd(46)}║`);
  console.log(`║  ❌ Errors:  ${String(errorCount).padEnd(46)}║`);
  console.log(`║  ⚠️  Validation Issues: ${String(validationIssues.length).padEnd(35)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (validationIssues.length > 0) {
    console.log('\n⚠️  Articles with validation issues:');
    validationIssues.forEach(({ slug, issues }) => {
      console.log(`  - ${slug}:`);
      issues.forEach(issue => console.log(`      • ${issue}`));
    });
  }
}

// Run the generator
if (!apiKey && !offlineEnv) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  console.error('Please set it in your .env file or export it, or use OFFLINE_ARTICLE_GENERATION=true:');
  console.error('  export GEMINI_API_KEY=your-api-key');
  process.exit(1);
}

generateAllArticles().catch(console.error);
