/**
 * Data Collector - Fetches relevant content from various sources
 * Runs daily via GitHub Actions
 */

import './load-env.ts';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FETCH_TIMEOUT = 15000;
const MAX_RETRIES = 2;

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (retries > 0 && !(error instanceof Error && error.name === 'AbortError')) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

interface CollectedItem {
  id: string;
  title: string;
  url: string;
  source: string;
  contentType?: 'news' | 'article' | 'case-study' | 'feedback' | 'community';
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

const BRAND_KEYWORDS = [
  'openclaw',
  'moltbot',
  'clawdbot',
  'clawd-bot',
  'openclaw.build',
  'moltbot.art',
  'openclaw build',
  'moltbot art',
];

const RELEVANT_KEYWORDS = [
  ...BRAND_KEYWORDS,
  'ai assistant', 'chatbot', 'claude', 'gpt', 'llm',
  'automation', 'telegram bot', 'discord bot', 'slack bot',
  'self-hosted', 'open source ai', 'open source assistant', 'personal assistant',
  'rag', 'embeddings', 'langchain', 'ai agent',
  'workflow', 'case study', 'use case', 'user story',
  'customer story', 'success story', 'testimonial',
];

const RSS_SOURCES = [
  // Dev.to feeds (reliable)
  {
    id: 'devto-ai',
    name: 'Dev.to: #ai',
    category: 'article' as const,
    url: 'https://dev.to/feed/tag/ai',
  },
  {
    id: 'devto-chatbot',
    name: 'Dev.to: #chatbot',
    category: 'article' as const,
    url: 'https://dev.to/feed/tag/chatbot',
  },
  {
    id: 'devto-selfhosted',
    name: 'Dev.to: #selfhosted',
    category: 'article' as const,
    url: 'https://dev.to/feed/tag/selfhosted',
  },
  {
    id: 'devto-llm',
    name: 'Dev.to: #llm',
    category: 'article' as const,
    url: 'https://dev.to/feed/tag/llm',
  },
  {
    id: 'devto-openai',
    name: 'Dev.to: #openai',
    category: 'article' as const,
    url: 'https://dev.to/feed/tag/openai',
  },
  // Hashnode feeds (reliable developer platform)
  {
    id: 'hashnode-ai',
    name: 'Hashnode: AI',
    category: 'article' as const,
    url: 'https://hashnode.com/n/ai/rss',
  },
  {
    id: 'hashnode-llm',
    name: 'Hashnode: LLM',
    category: 'article' as const,
    url: 'https://hashnode.com/n/llm/rss',
  },
  {
    id: 'hashnode-chatgpt',
    name: 'Hashnode: ChatGPT',
    category: 'article' as const,
    url: 'https://hashnode.com/n/chatgpt/rss',
  },
  // Echo JS (JavaScript/Node.js news)
  {
    id: 'echojs',
    name: 'Echo JS',
    category: 'news' as const,
    url: 'https://www.echojs.com/rss',
  },
  // Product Hunt (AI category)
  {
    id: 'producthunt-ai',
    name: 'Product Hunt: AI',
    category: 'news' as const,
    url: 'https://www.producthunt.com/feed?category=artificial-intelligence',
  },
  // Lobsters (tech news, very reliable)
  {
    id: 'lobsters',
    name: 'Lobsters',
    category: 'news' as const,
    url: 'https://lobste.rs/rss',
  },
  {
    id: 'lobsters-ai',
    name: 'Lobsters: AI',
    category: 'news' as const,
    url: 'https://lobste.rs/t/ai.rss',
  },
  // Indie Hackers (community stories)
  {
    id: 'indiehackers',
    name: 'Indie Hackers',
    category: 'community' as const,
    url: 'https://www.indiehackers.com/feed.xml',
  },
  // The Pragmatic Engineer (tech insights)
  {
    id: 'pragmatic-engineer',
    name: 'Pragmatic Engineer',
    category: 'article' as const,
    url: 'https://newsletter.pragmaticengineer.com/feed',
  },
  // Simon Willison's blog (AI/LLM expert)
  {
    id: 'simonwillison',
    name: 'Simon Willison',
    category: 'article' as const,
    url: 'https://simonwillison.net/atom/everything/',
  },
  // LangChain blog (AI agent tooling)
  {
    id: 'langchain-blog',
    name: 'LangChain Blog',
    category: 'article' as const,
    url: 'https://blog.langchain.dev/rss/',
  },
  // LlamaIndex blog (RAG/agent framework)
  {
    id: 'llamaindex-blog',
    name: 'LlamaIndex Blog',
    category: 'article' as const,
    url: 'https://www.llamaindex.ai/blog/rss.xml',
  },
  // Mistral AI blog (LLM provider)
  {
    id: 'mistral-blog',
    name: 'Mistral AI Blog',
    category: 'news' as const,
    url: 'https://mistral.ai/news/rss/',
  },
  // OpenAI blog (LLM provider)
  {
    id: 'openai-blog',
    name: 'OpenAI Blog',
    category: 'news' as const,
    url: 'https://openai.com/blog/rss.xml',
  },
  // Anthropic news/blog (LLM provider)
  {
    id: 'anthropic-news',
    name: 'Anthropic News',
    category: 'news' as const,
    url: 'https://www.anthropic.com/news/rss.xml',
  },
  // Microsoft AI Blog
  {
    id: 'microsoft-ai-blog',
    name: 'Microsoft AI Blog',
    category: 'news' as const,
    url: 'https://blogs.microsoft.com/ai/feed/',
  },
  // AWS Machine Learning Blog
  {
    id: 'aws-ml-blog',
    name: 'AWS Machine Learning Blog',
    category: 'news' as const,
    url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
  },
  // Google AI Blog
  {
    id: 'google-ai-blog',
    name: 'Google AI Blog',
    category: 'news' as const,
    url: 'https://ai.googleblog.com/feeds/posts/default?alt=rss',
  },
  // Hugging Face Blog
  {
    id: 'huggingface-blog',
    name: 'Hugging Face Blog',
    category: 'article' as const,
    url: 'https://huggingface.co/blog/feed.xml',
  },
  // Weights & Biases Blog
  {
    id: 'wandb-blog',
    name: 'Weights & Biases Blog',
    category: 'article' as const,
    url: 'https://wandb.ai/site/rss.xml',
  },
  // n8n Blog (workflow automation)
  {
    id: 'n8n-blog',
    name: 'n8n Blog',
    category: 'article' as const,
    url: 'https://n8n.io/blog/rss.xml',
  },
  // Zapier Blog (automation)
  {
    id: 'zapier-blog',
    name: 'Zapier Blog',
    category: 'article' as const,
    url: 'https://zapier.com/blog/rss.xml',
  },
  // Indie Hackers (startups + automation)
  {
    id: 'indiehackers-products',
    name: 'Indie Hackers: Products',
    category: 'community' as const,
    url: 'https://www.indiehackers.com/products.rss',
  },
  // Hacker Noon AI
  {
    id: 'hackernoon-ai',
    name: 'Hacker Noon: AI',
    category: 'article' as const,
    url: 'https://hackernoon.com/tagged/artificial-intelligence/feed',
  },
  // Google News (may timeout, kept for completeness)
  {
    id: 'google-news-ai-assistant',
    name: 'Google News: AI assistant',
    category: 'news' as const,
    url: 'https://news.google.com/rss/search?q=ai%20assistant%20self-hosted%20OR%20chatbot&hl=en-US&gl=US&ceid=US:en',
  },
  // GitHub Topics (may timeout)
  {
    id: 'github-ai-automation',
    name: 'GitHub Topics: AI automation',
    category: 'community' as const,
    url: 'https://github.com/topics/ai-automation.atom',
  },
];

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'knowledge-base');
const RSS_ITEM_LIMIT = 20;
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
});

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadKnowledgeBase(): Promise<KnowledgeBase> {
  const filePath = path.join(DATA_DIR, 'collected-articles.json');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { lastUpdated: '', items: [] };
  }
}

async function saveKnowledgeBase(kb: KnowledgeBase): Promise<void> {
  const filePath = path.join(DATA_DIR, 'collected-articles.json');
  await fs.writeFile(filePath, JSON.stringify(kb, null, 2));
}

function calculateRelevance(title: string, content?: string): number {
  const text = `${title} ${content || ''}`.toLowerCase();
  let score = 0;

  for (const keyword of RELEVANT_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 10;
    }
  }

  // Bonus for specific high-value terms
  if (BRAND_KEYWORDS.some((keyword) => text.includes(keyword))) score += 25;
  if (text.includes('self-hosted')) score += 15;
  if (text.includes('telegram') || text.includes('discord')) score += 10;
  if (text.includes('tutorial') || text.includes('guide')) score += 5;
  if (text.includes('open source') && text.includes('assistant')) score += 10;

  return Math.min(100, score);
}

function extractTopics(title: string, content?: string): string[] {
  const text = `${title} ${content || ''}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string> = {
    // 品牌词
    'openclaw': 'brand',
    'moltbot': 'brand',
    'clawdbot': 'brand',
    'clawd-bot': 'brand',

    // 消息平台
    'telegram': 'messaging',
    'discord': 'messaging',
    'slack': 'messaging',
    'whatsapp': 'messaging',

    // 部署
    'docker': 'deployment',
    'kubernetes': 'deployment',
    'k8s': 'deployment',

    // 自托管
    'self-hosted': 'self-hosting',
    'selfhosted': 'self-hosting',

    // RAG
    'rag': 'rag',
    'retrieval': 'rag',

    // AI 技术
    'embeddings': 'ai-techniques',
    'vector': 'ai-techniques',
    'fine-tune': 'ai-techniques',
    'fine tune': 'ai-techniques',
    'prompt engineering': 'ai-prompts',
    'prompting': 'ai-prompts',

    // 框架
    'langchain': 'frameworks',
    'llamaindex': 'frameworks',
    'haystack': 'frameworks',

    // 自动化
    'automation': 'automation',
    'n8n': 'automation',
    'zapier': 'automation',

    // 集成
    'api': 'integration',
    'webhook': 'integration',

    // 案例与工作流
    'case study': 'case-study',
    'use case': 'ai-use-cases',
    'workflow': 'workflows',

    // Agent
    'agent': 'agents',
    'multi-agent': 'ai-multi-agent',
    'agentic': 'agents',

    // 助手
    'copilot': 'assistants',
    'assistant': 'assistants',

    // LLM 提供商
    'claude': 'llm-providers',
    'gpt-4': 'llm-providers',
    'gpt4': 'llm-providers',
    'openai': 'llm-providers',
    'anthropic': 'llm-providers',

    // 本地 LLM
    'ollama': 'local-llm',
    'llama': 'local-llm',
    'mistral': 'local-llm',

    // 开源
    'open source': 'open-source',

    // 教程
    'tutorial': 'tutorials',
    'guide': 'tutorials',
    'how to': 'tutorials',

    // === 新增：AI 自动化趋势话题 ===

    // AI 趋势与洞察
    'trend': 'ai-trends',
    'future': 'ai-future',
    'prediction': 'ai-future',
    '2026': 'ai-trends',
    '2025': 'ai-trends',

    // 生产力
    'productivity': 'ai-productivity',
    'efficient': 'ai-productivity',

    // 企业
    'enterprise': 'ai-enterprise',
    'corporate': 'ai-enterprise',
    'business': 'ai-small-business',
    'small business': 'ai-small-business',
    'startup': 'ai-small-business',

    // 隐私与安全
    'privacy': 'ai-privacy',
    'data protection': 'ai-privacy',
    'gdpr': 'ai-privacy',
    'security': 'ai-security',
    'vulnerability': 'ai-security',
    'secure': 'ai-security',

    // 成本
    'cost': 'ai-cost',
    'pricing': 'ai-cost',
    'roi': 'ai-cost',
    'budget': 'ai-cost',

    // 错误与最佳实践
    'mistake': 'ai-mistakes',
    'pitfall': 'ai-mistakes',
    'best practice': 'ai-security',
    'common error': 'ai-mistakes',

    // 开发者
    'developer': 'ai-developer',
    'coding': 'ai-developer',
    'programming': 'ai-developer',
    'pair programming': 'ai-developer',

    // 记忆与上下文
    'memory': 'ai-memory',
    'context': 'ai-memory',
    'conversation history': 'ai-memory',

    // 语音
    'voice': 'ai-voice',
    'speech': 'ai-voice',
    'text to speech': 'ai-voice',
    'tts': 'ai-voice',

    // 伦理
    'ethics': 'ai-ethics',
    'responsible ai': 'ai-ethics',
    'ethical': 'ai-ethics',

    // 监控
    'monitoring': 'ai-monitoring',
    'logging': 'ai-monitoring',
    'debugging': 'ai-monitoring',
    'observability': 'ai-monitoring',

    // 扩展
    'scaling': 'ai-scaling',
    'scale': 'ai-scaling',
    'team': 'ai-scaling',
  };

  for (const [keyword, topic] of Object.entries(topicMap)) {
    if (text.includes(keyword) && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  return topics;
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    const inner = (value as Record<string, unknown>).value;
    return typeof inner === 'string' ? inner.trim() : '';
  }
  return '';
}

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'ref',
  'ref_src',
  'source',
  'mkt_tok',
]);

function normalizeItemUrl(value: string): string {
  try {
    const parsed = new URL(value);
    const params = new URLSearchParams(parsed.search);
    for (const key of Array.from(params.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        params.delete(key);
      }
    }
    parsed.search = params.toString();
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return value;
  }
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function resolveEntryLink(entry: Record<string, unknown>): string {
  const linkValue = entry.link;
  if (typeof linkValue === 'string') return linkValue;
  if (Array.isArray(linkValue)) {
    const first = linkValue[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'href' in first) {
      const href = (first as Record<string, unknown>).href;
      return typeof href === 'string' ? href : '';
    }
  }
  if (linkValue && typeof linkValue === 'object' && 'href' in linkValue) {
    const href = (linkValue as Record<string, unknown>).href;
    return typeof href === 'string' ? href : '';
  }
  return '';
}

function resolvePublishedAt(entry: Record<string, unknown>): string {
  const dateValue = entry.pubDate || entry.published || entry.updated || entry['dc:date'];
  if (typeof dateValue === 'string') return dateValue;
  if (dateValue && typeof dateValue === 'object' && 'value' in dateValue) {
    const inner = (dateValue as Record<string, unknown>).value;
    if (typeof inner === 'string') return inner;
  }
  return new Date().toISOString();
}

function hashIdentifier(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 12);
}

function extractFeedEntries(parsed: Record<string, unknown>): Record<string, unknown>[] {
  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  const rssItems = toArray(channel?.item as Record<string, unknown> | Record<string, unknown>[] | undefined);
  if (rssItems.length > 0) return rssItems;

  const feed = parsed.feed as Record<string, unknown> | undefined;
  const atomEntries = toArray(feed?.entry as Record<string, unknown> | Record<string, unknown>[] | undefined);
  if (atomEntries.length > 0) return atomEntries;

  const rdf = parsed['rdf:RDF'] as Record<string, unknown> | undefined;
  const rdfItems = toArray(rdf?.item as Record<string, unknown> | Record<string, unknown>[] | undefined);
  if (rdfItems.length > 0) return rdfItems;

  return [];
}

async function fetchRSSSources(): Promise<CollectedItem[]> {
  console.log('Fetching from RSS sources...');
  const items: CollectedItem[] = [];
  const results: { source: string; count: number; error?: string }[] = [];

  const fetchPromises = RSS_SOURCES.map(async (source) => {
    try {
      const response = await fetchWithRetry(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Collector/1.0)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
      });

      if (!response.ok) {
        results.push({ source: source.name, count: 0, error: `HTTP ${response.status}` });
        return [];
      }

      const xml = await response.text();
      const parsed = xmlParser.parse(xml) as Record<string, unknown>;
      const entries = extractFeedEntries(parsed).slice(0, RSS_ITEM_LIMIT);
      const sourceItems: CollectedItem[] = [];

      for (const entry of entries) {
        const title = normalizeText(entry.title);
        if (!title) continue;

        const link = normalizeItemUrl(resolveEntryLink(entry));
        if (!link) continue;

        const description = normalizeText(entry.summary || entry.description || entry['content:encoded'] || entry.content);
        const publishedAt = resolvePublishedAt(entry);
        const relevance = calculateRelevance(title, description);

        if (relevance < 20) continue;

        const stableIdSource = normalizeText(entry.guid || entry.id) || `${title}:${link}:${publishedAt}`;
        const id = `rss-${source.id}-${hashIdentifier(stableIdSource)}`;

        sourceItems.push({
          id,
          title,
          url: link,
          source: source.id,
          contentType: source.category,
          summary: description ? description.substring(0, 300) : undefined,
          publishedAt: publishedAt || new Date().toISOString(),
          collectedAt: new Date().toISOString(),
          relevanceScore: relevance,
          topics: extractTopics(title, description),
        });
      }

      results.push({ source: source.name, count: sourceItems.length });
      return sourceItems;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.push({ source: source.name, count: 0, error: errorMsg.substring(0, 50) });
      return [];
    }
  });

  const allResults = await Promise.all(fetchPromises);
  for (const sourceItems of allResults) {
    items.push(...sourceItems);
  }

  // Log RSS fetch summary
  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);
  console.log(`  RSS: ${successful.length}/${results.length} sources succeeded, ${items.length} items`);
  if (failed.length > 0) {
    console.log(`  Failed sources: ${failed.map(f => f.source.split(':')[0]).join(', ')}`);
  }

  return items;
}

async function fetchHackerNews(): Promise<CollectedItem[]> {
  console.log('Fetching from Hacker News...');
  const items: CollectedItem[] = [];

  try {
    const searchTerms = ['ai assistant', 'chatbot', 'self-hosted ai', 'llm agent', 'rag'];

    for (const term of searchTerms) {
      try {
        const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term)}&tags=story&hitsPerPage=15`;
        const response = await fetchWithRetry(url);

        if (!response.ok) continue;

        const data = await response.json();

        for (const hit of data.hits || []) {
          const relevance = calculateRelevance(hit.title, hit.story_text);

          if (relevance >= 20) {
            items.push({
              id: `hn-${hit.objectID}`,
              title: hit.title,
              url: normalizeItemUrl(hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`),
              source: 'hackernews',
              contentType: 'news',
              summary: hit.story_text?.substring(0, 300),
              publishedAt: hit.created_at,
              collectedAt: new Date().toISOString(),
              relevanceScore: relevance,
              topics: extractTopics(hit.title, hit.story_text),
            });
          }
        }
      } catch {
        // Continue with other search terms
      }
    }
    console.log(`  HN: ${items.length} items`);
  } catch (error) {
    console.error('Error fetching from HN:', error instanceof Error ? error.message : error);
  }

  return items;
}

async function fetchDevTo(): Promise<CollectedItem[]> {
  console.log('Fetching from Dev.to...');
  const items: CollectedItem[] = [];

  try {
    const tags = ['ai', 'chatbot', 'automation', 'selfhosted', 'llm', 'openai', 'langchain'];

    for (const tag of tags) {
      try {
        const url = `https://dev.to/api/articles?tag=${tag}&per_page=15`;
        const response = await fetchWithRetry(url);

        if (!response.ok) continue;

        const articles = await response.json();

        for (const article of articles) {
          const relevance = calculateRelevance(article.title, article.description);

          if (relevance >= 20) {
            items.push({
              id: `devto-${article.id}`,
              title: article.title,
              url: normalizeItemUrl(article.url),
              source: 'devto',
              contentType: 'article',
              summary: article.description,
              publishedAt: article.published_at,
              collectedAt: new Date().toISOString(),
              relevanceScore: relevance,
              topics: extractTopics(article.title, article.description),
            });
          }
        }
      } catch {
        // Continue with other tags
      }
    }
    console.log(`  Dev.to: ${items.length} items`);
  } catch (error) {
    console.error('Error fetching from Dev.to:', error instanceof Error ? error.message : error);
  }

  return items;
}

async function fetchReddit(): Promise<CollectedItem[]> {
  console.log('Fetching from Reddit...');
  const items: CollectedItem[] = [];

  try {
    const subreddits = ['selfhosted', 'ChatGPT', 'LocalLLaMA', 'artificial'];

    for (const subreddit of subreddits) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=20`;
        const response = await fetchWithRetry(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEO-Collector/1.0)',
          },
        });

        if (!response.ok) continue;

        const data = await response.json();

        for (const post of data.data?.children || []) {
          const postData = post.data;
          const relevance = calculateRelevance(postData.title, postData.selftext);

          if (relevance >= 20 && !postData.over_18) {
            items.push({
              id: `reddit-${postData.id}`,
              title: postData.title,
              url: normalizeItemUrl(`https://reddit.com${postData.permalink}`),
              source: 'reddit',
              contentType: 'feedback',
              summary: postData.selftext?.substring(0, 300),
              publishedAt: new Date(postData.created_utc * 1000).toISOString(),
              collectedAt: new Date().toISOString(),
              relevanceScore: relevance,
              topics: extractTopics(postData.title, postData.selftext),
            });
          }
        }
      } catch {
        // Continue with other subreddits
      }
    }
    console.log(`  Reddit: ${items.length} items`);
  } catch (error) {
    console.error('Error fetching from Reddit:', error instanceof Error ? error.message : error);
  }

  return items;
}

async function fetchLobsters(): Promise<CollectedItem[]> {
  console.log('Fetching from Lobsters...');
  const items: CollectedItem[] = [];

  try {
    const response = await fetchWithRetry('https://lobste.rs/hottest.json');

    if (response.ok) {
      const stories = await response.json();

      for (const story of stories.slice(0, 30)) {
        const relevance = calculateRelevance(story.title, story.description || '');

        if (relevance >= 15) {
          items.push({
            id: `lobsters-${story.short_id}`,
            title: story.title,
            url: normalizeItemUrl(story.url || story.comments_url),
            source: 'lobsters',
            contentType: 'news',
            summary: story.description?.substring(0, 300),
            publishedAt: story.created_at,
            collectedAt: new Date().toISOString(),
            relevanceScore: relevance,
            topics: extractTopics(story.title, story.description || ''),
          });
        }
      }
    }
    console.log(`  Lobsters: ${items.length} items`);
  } catch (error) {
    console.error('Error fetching from Lobsters:', error instanceof Error ? error.message : error);
  }

  return items;
}

async function deduplicateItems(
  existing: CollectedItem[],
  newItems: CollectedItem[]
): Promise<CollectedItem[]> {
  const existingIds = new Set(existing.map(item => item.id));
  const existingUrls = new Set(existing.map(item => normalizeItemUrl(item.url)));

  return newItems.filter(item =>
    !existingIds.has(item.id) && !existingUrls.has(normalizeItemUrl(item.url))
  );
}

async function collectAll(): Promise<void> {
  console.log('Starting daily data collection...');
  console.log('Date:', new Date().toISOString());

  await ensureDataDir();

  const kb = await loadKnowledgeBase();

  // Fetch from all sources in parallel
  const [hnItems, devtoItems, redditItems, lobstersItems, rssItems] = await Promise.all([
    fetchHackerNews(),
    fetchDevTo(),
    fetchReddit(),
    fetchLobsters(),
    fetchRSSSources(),
  ]);

  const allNewItems = [...hnItems, ...devtoItems, ...redditItems, ...lobstersItems, ...rssItems];
  console.log(`Fetched ${allNewItems.length} items from all sources`);

  // Deduplicate
  const uniqueItems = await deduplicateItems(kb.items, allNewItems);
  console.log(`${uniqueItems.length} new unique items`);

  // Add to knowledge base
  kb.items = [...uniqueItems, ...kb.items];

  // Keep only items from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  kb.items = kb.items.filter(item =>
    new Date(item.collectedAt) > thirtyDaysAgo
  );

  // Sort by relevance and date
  kb.items.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Limit to 500 items max
  kb.items = kb.items.slice(0, 500);

  kb.lastUpdated = new Date().toISOString();

  await saveKnowledgeBase(kb);

  console.log(`Knowledge base updated. Total items: ${kb.items.length}`);

  // Generate summary
  const bySource: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const item of kb.items) {
    bySource[item.source] = (bySource[item.source] || 0) + 1;
    const category = item.contentType || 'uncategorized';
    byCategory[category] = (byCategory[category] || 0) + 1;
  }

  const summary = {
    date: new Date().toISOString().split('T')[0],
    newItems: uniqueItems.length,
    totalItems: kb.items.length,
    bySource,
    byCategory,
    topTopics: getTopTopics(kb.items),
    brandMentions: countBrandMentions(kb.items),
  };

  console.log('\nCollection Summary:');
  console.log(JSON.stringify(summary, null, 2));

  // Save summary
  const summaryPath = path.join(DATA_DIR, 'collection-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

function getTopTopics(items: CollectedItem[]): Record<string, number> {
  const topicCounts: Record<string, number> = {};

  for (const item of items) {
    for (const topic of item.topics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  // Sort and return top 10
  return Object.fromEntries(
    Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  );
}

function countBrandMentions(items: CollectedItem[]): number {
  return items.filter((item) => {
    const text = `${item.title} ${item.summary || ''}`.toLowerCase();
    return BRAND_KEYWORDS.some((keyword) => text.includes(keyword));
  }).length;
}

// Run
collectAll().catch(console.error);
