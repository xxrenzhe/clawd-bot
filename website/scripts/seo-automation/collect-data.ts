/**
 * Data Collector - Fetches relevant content from various sources
 * Runs daily via GitHub Actions
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  {
    id: 'google-news-ai-assistant',
    name: 'Google News: AI assistant',
    category: 'news' as const,
    url: 'https://news.google.com/rss/search?q=ai%20assistant%20self-hosted%20OR%20chatbot&hl=en-US&gl=US&ceid=US:en',
  },
  {
    id: 'google-news-automation',
    name: 'Google News: AI automation',
    category: 'news' as const,
    url: 'https://news.google.com/rss/search?q=ai%20automation%20OR%20ai%20agent%20OR%20rag&hl=en-US&gl=US&ceid=US:en',
  },
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
    id: 'medium-ai',
    name: 'Medium: AI',
    category: 'article' as const,
    url: 'https://medium.com/feed/tag/ai',
  },
  {
    id: 'medium-chatbot',
    name: 'Medium: Chatbot',
    category: 'article' as const,
    url: 'https://medium.com/feed/tag/chatbot',
  },
  {
    id: 'medium-case-study',
    name: 'Medium: Case Study',
    category: 'case-study' as const,
    url: 'https://medium.com/feed/tag/case-study',
  },
  {
    id: 'github-ai-automation',
    name: 'GitHub Topics: AI automation',
    category: 'community' as const,
    url: 'https://github.com/topics/ai-automation.atom',
  },
  {
    id: 'github-chatbot',
    name: 'GitHub Topics: Chatbot',
    category: 'community' as const,
    url: 'https://github.com/topics/chatbot.atom',
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
    'openclaw': 'brand',
    'moltbot': 'brand',
    'clawdbot': 'brand',
    'clawd-bot': 'brand',
    'telegram': 'messaging',
    'discord': 'messaging',
    'slack': 'messaging',
    'docker': 'deployment',
    'kubernetes': 'deployment',
    'self-hosted': 'self-hosting',
    'rag': 'rag',
    'embeddings': 'ai-techniques',
    'langchain': 'frameworks',
    'automation': 'automation',
    'api': 'integration',
    'case study': 'case-study',
    'use case': 'use-cases',
    'workflow': 'workflows',
    'agent': 'agents',
    'copilot': 'assistants',
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

  for (const source of RSS_SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'SEO-Collector/1.0',
          'Accept': 'application/rss+xml, application/atom+xml, text/xml',
        },
      });

      if (!response.ok) continue;

      const xml = await response.text();
      const parsed = xmlParser.parse(xml) as Record<string, unknown>;
      const entries = extractFeedEntries(parsed).slice(0, RSS_ITEM_LIMIT);

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

        items.push({
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
    } catch (error) {
      console.error(`Error fetching RSS source ${source.name}:`, error);
    }
  }

  return items;
}

async function fetchHackerNews(): Promise<CollectedItem[]> {
  console.log('Fetching from Hacker News...');
  const items: CollectedItem[] = [];

  try {
    // Search for relevant stories
    const searchTerms = ['ai assistant', 'chatbot', 'self-hosted ai'];

    for (const term of searchTerms) {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term)}&tags=story&hitsPerPage=10`;
      const response = await fetch(url);

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
    }
  } catch (error) {
    console.error('Error fetching from HN:', error);
  }

  return items;
}

async function fetchDevTo(): Promise<CollectedItem[]> {
  console.log('Fetching from Dev.to...');
  const items: CollectedItem[] = [];

  try {
    const tags = ['ai', 'chatbot', 'automation', 'selfhosted'];

    for (const tag of tags) {
      const url = `https://dev.to/api/articles?tag=${tag}&per_page=10`;
      const response = await fetch(url);

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
    }
  } catch (error) {
    console.error('Error fetching from Dev.to:', error);
  }

  return items;
}

async function fetchReddit(): Promise<CollectedItem[]> {
  console.log('Fetching from Reddit...');
  const items: CollectedItem[] = [];

  try {
    const subreddits = ['selfhosted', 'ChatGPT', 'LocalLLaMA', 'artificial'];

    for (const subreddit of subreddits) {
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=20`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SEO-Collector/1.0',
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
    }
  } catch (error) {
    console.error('Error fetching from Reddit:', error);
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

  // Fetch from all sources
  const [hnItems, devtoItems, redditItems, rssItems] = await Promise.all([
    fetchHackerNews(),
    fetchDevTo(),
    fetchReddit(),
    fetchRSSSources(),
  ]);

  const allNewItems = [...hnItems, ...devtoItems, ...redditItems, ...rssItems];
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
