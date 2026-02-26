import './load-env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type Frontmatter = {
  title?: string;
  keywords?: string[];
  tags?: string[];
  image?: string;
};

type PexelsPhoto = {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original?: string;
    large2x?: string;
    large?: string;
    medium?: string;
  };
};

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'images', 'articles');
const ARTICLES_DIR = path.join(process.cwd(), 'src', 'content', 'articles');
const DATA_DIR = path.join(process.cwd(), 'data', 'knowledge-base');
const ATTRIBUTION_PATH = path.join(DATA_DIR, 'image-sources.json');

const TARGET_WIDTH = 1600;
const TARGET_HEIGHT = 1067;

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const FORCE_REFRESH = process.env.PEXELS_FORCE_REFRESH === 'true';
const MAX_IMAGES = Number(process.env.PEXELS_MAX_IMAGES || '0');
const QUERY_SUFFIX = (process.env.PEXELS_QUERY_SUFFIX || 'technology workspace').trim();
const PICSUM_ENABLED = process.env.PICSUM_ENABLED !== 'false';
const MAX_QUERY_WORDS = Number(process.env.PEXELS_MAX_QUERY_WORDS || '6');
const MAX_QUERY_CHARS = Number(process.env.PEXELS_MAX_QUERY_CHARS || '80');

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'with', 'without', 'to', 'of', 'in', 'on', 'at', 'by', 'from',
  'into', 'vs', 'vs.', 'how', 'what', 'why', 'when', 'where', 'your', 'you', 'we', 'our', 'their',
  'guide', 'tutorial', 'best', 'top', 'new', 'getting', 'started', 'complete', 'ultimate', 'tips',
  'setup', 'step', 'steps', 'now', 'more', 'most', 'use', 'using', 'from', 'over',
]);

const BANNED_QUERY_TOKENS = new Set([
  'ai', 'assistant', 'assistants', 'automation', 'automations', 'bot', 'bots', 'chatbot', 'chatbots',
  'llm', 'llms', 'gpt', 'gpt-4', 'gpt4', 'claude', 'openclaw', 'moltbot', 'clawdbot',
  'openclawd', 'openclawbot', 'self', 'hosted', 'selfhosted',
]);

function parseFrontmatter(content: string): Frontmatter | null {
  if (!content.startsWith('---')) return null;
  const parts = content.split('---', 3);
  if (parts.length < 3) return null;
  const lines = parts[1].split('\n');
  const data: Frontmatter = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (!value) continue;

    if (value.startsWith('[') && value.endsWith(']')) {
      const normalized = value.replace(/'/g, '"');
      try {
        const arr = JSON.parse(normalized);
        if (Array.isArray(arr)) {
          if (key === 'keywords') data.keywords = arr;
          if (key === 'tags') data.tags = arr;
        }
      } catch {
        // ignore parsing errors for arrays
      }
    } else {
      value = value.replace(/^["']|["']$/g, '');
      if (key === 'title') data.title = value;
      if (key === 'image') data.image = value;
    }
  }

  return data;
}

function buildQuery(frontmatter: Frontmatter, slug: string): string {
  const keywords = frontmatter.keywords?.filter(Boolean) || frontmatter.tags?.filter(Boolean) || [];
  const base = frontmatter.title || slug.replace(/-/g, ' ');
  const rawText = `${base} ${keywords.join(' ')} ${slug}`.trim();
  const suffixTokens = extractTokens(QUERY_SUFFIX);
  const primaryTokens = extractTokens(rawText);

  const maxBaseTokens = Math.max(1, MAX_QUERY_WORDS - suffixTokens.length);
  let queryTokens = [...primaryTokens.slice(0, maxBaseTokens), ...suffixTokens];

  if (queryTokens.length > MAX_QUERY_WORDS) {
    queryTokens = queryTokens.slice(0, MAX_QUERY_WORDS);
  }

  let query = queryTokens.join(' ');
  while (query.length > MAX_QUERY_CHARS && queryTokens.length > 1) {
    queryTokens.pop();
    query = queryTokens.join(' ');
  }

  return query.trim();
}

function buildFallbackQuery(): string {
  const safePool = extractTokens('technology workspace office computer desk server');
  const suffixTokens = extractTokens(QUERY_SUFFIX);
  let queryTokens = [...safePool, ...suffixTokens];
  queryTokens = Array.from(new Set(queryTokens));
  queryTokens = queryTokens.slice(0, MAX_QUERY_WORDS);

  let query = queryTokens.join(' ');
  while (query.length > MAX_QUERY_CHARS && queryTokens.length > 1) {
    queryTokens.pop();
    query = queryTokens.join(' ');
  }

  return query.trim();
}

function extractTokens(input: string): string[] {
  if (!input) return [];
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  const tokens = normalized.split(' ');
  const results: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (token.length < 3) continue;
    if (STOPWORDS.has(token)) continue;
    if (BANNED_QUERY_TOKENS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    results.push(token);
  }

  return results;
}

async function fetchPexelsPhoto(query: string): Promise<PexelsPhoto | null> {
  if (!PEXELS_API_KEY) return null;
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '5');
  url.searchParams.set('orientation', 'landscape');

  const res = await fetch(url, {
    headers: { Authorization: PEXELS_API_KEY },
  });

  if (!res.ok) {
    console.log(`   ⚠️ Pexels search failed (${res.status})`);
    return null;
  }

  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  const photos = data.photos || [];
  if (!photos.length) return null;

  const pick = photos[Math.floor(Math.random() * photos.length)];
  return pick;
}

async function downloadAndResize(photo: PexelsPhoto, outPath: string): Promise<void> {
  const src = photo.src.large2x || photo.src.large || photo.src.medium || photo.src.original;
  if (!src) throw new Error('No image source found in Pexels photo');

  const res = await fetch(src);
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());

  await sharp(buf)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90 })
    .toFile(outPath);
}

function buildPicsumUrl(seed: string): string {
  const safeSeed = encodeURIComponent(seed);
  return `https://picsum.photos/seed/${safeSeed}/${TARGET_WIDTH}/${TARGET_HEIGHT}`;
}

async function downloadPicsumImage(seed: string, outPath: string): Promise<string> {
  const url = buildPicsumUrl(seed);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Picsum download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());

  await sharp(buf)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90 })
    .toFile(outPath);

  return url;
}

async function loadAttribution(): Promise<Record<string, unknown>> {
  try {
    const content = await fs.readFile(ATTRIBUTION_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveAttribution(data: Record<string, unknown>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ATTRIBUTION_PATH, JSON.stringify(data, null, 2));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (!PEXELS_API_KEY && !PICSUM_ENABLED) {
    console.log('⚠️ PEXELS_API_KEY is not set and Picsum fallback is disabled. Skipping image fetching.');
    return;
  }
  if (!PEXELS_API_KEY && PICSUM_ENABLED) {
    console.log('⚠️ PEXELS_API_KEY is not set. Using Picsum fallback only.');
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const files = await fs.readdir(ARTICLES_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

  let processed = 0;
  const attribution = await loadAttribution();

  console.log(`🖼️  Fetching images for ${mdxFiles.length} articles...`);

  for (const file of mdxFiles) {
    if (MAX_IMAGES > 0 && processed >= MAX_IMAGES) break;

    const slug = path.basename(file, '.mdx');
    const articlePath = path.join(ARTICLES_DIR, file);
    const content = await fs.readFile(articlePath, 'utf-8');
    const frontmatter = parseFrontmatter(content) || {};

    const imagePath = frontmatter.image
      ? path.join(process.cwd(), 'public', frontmatter.image.replace(/^\/+/, ''))
      : path.join(PUBLIC_DIR, `${slug}.jpg`);

    try {
      await fs.access(imagePath);
      if (!FORCE_REFRESH) {
        continue;
      }
    } catch {
      // missing file, continue
    }

    const query = buildQuery(frontmatter, slug);
    console.log(`\n📸 ${slug}`);
    console.log(`   Query: ${query}`);

    let photo = await fetchPexelsPhoto(query);
    if (!photo) {
      console.log('   ⚠️ No results, using fallback query.');
      photo = await fetchPexelsPhoto(buildFallbackQuery());
    }

    if (!photo) {
      console.log('   ❌ No photos found, skipping.');
      if (!PICSUM_ENABLED) {
        continue;
      }
      console.log('   ⚠️ Pexels unavailable. Using Picsum fallback.');
      try {
        const imageUrl = await downloadPicsumImage(slug, imagePath);
        attribution[slug] = {
          source: 'picsum',
          imageUrl,
          seed: slug,
          query,
          fetchedAt: new Date().toISOString(),
        };
        processed += 1;
        console.log('   ✅ Image saved (Picsum)');
        await sleep(200);
        continue;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Picsum fallback failed: ${message}`);
        continue;
      }
    }

    await downloadAndResize(photo, imagePath);
    attribution[slug] = {
      source: 'pexels',
      photoId: photo.id,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      photoUrl: photo.url,
      imageUrl: photo.src.original || photo.src.large2x || photo.src.large || photo.src.medium,
      query,
      fetchedAt: new Date().toISOString(),
    };

    processed += 1;
    console.log('   ✅ Image saved');
    await sleep(400);
  }

  await saveAttribution(attribution);
  console.log(`\n✅ Image fetching complete. Updated: ${processed}`);
}

main().catch((err) => {
  console.error('❌ Image fetching failed:', err);
  process.exitCode = 1;
});
