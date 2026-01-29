/**
 * Data Collector - Fetches relevant content from various sources
 * Runs daily via GitHub Actions
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CollectedItem {
  id: string;
  title: string;
  url: string;
  source: string;
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

const RELEVANT_KEYWORDS = [
  'ai assistant', 'chatbot', 'claude', 'gpt', 'llm',
  'automation', 'telegram bot', 'discord bot', 'slack bot',
  'self-hosted', 'open source ai', 'personal assistant',
  'rag', 'embeddings', 'langchain', 'ai agent',
];

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'knowledge-base');

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
  if (text.includes('self-hosted')) score += 15;
  if (text.includes('telegram') || text.includes('discord')) score += 10;
  if (text.includes('tutorial') || text.includes('guide')) score += 5;

  return Math.min(100, score);
}

function extractTopics(title: string, content?: string): string[] {
  const text = `${title} ${content || ''}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string> = {
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
  };

  for (const [keyword, topic] of Object.entries(topicMap)) {
    if (text.includes(keyword) && !topics.includes(topic)) {
      topics.push(topic);
    }
  }

  return topics;
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
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            source: 'hackernews',
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
            url: article.url,
            source: 'devto',
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
            url: `https://reddit.com${postData.permalink}`,
            source: 'reddit',
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
  const existingUrls = new Set(existing.map(item => item.url));

  return newItems.filter(item =>
    !existingIds.has(item.id) && !existingUrls.has(item.url)
  );
}

async function collectAll(): Promise<void> {
  console.log('Starting daily data collection...');
  console.log('Date:', new Date().toISOString());

  await ensureDataDir();

  const kb = await loadKnowledgeBase();

  // Fetch from all sources
  const [hnItems, devtoItems, redditItems] = await Promise.all([
    fetchHackerNews(),
    fetchDevTo(),
    fetchReddit(),
  ]);

  const allNewItems = [...hnItems, ...devtoItems, ...redditItems];
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
  const summary = {
    date: new Date().toISOString().split('T')[0],
    newItems: uniqueItems.length,
    totalItems: kb.items.length,
    bySource: {
      hackernews: kb.items.filter(i => i.source === 'hackernews').length,
      devto: kb.items.filter(i => i.source === 'devto').length,
      reddit: kb.items.filter(i => i.source === 'reddit').length,
    },
    topTopics: getTopTopics(kb.items),
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

// Run
collectAll().catch(console.error);
