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
  const keywordPhrase = keywords.slice(0, 3).join(' ');
  const base = frontmatter.title || slug.replace(/-/g, ' ');
  const query = `${base} ${keywordPhrase} ${QUERY_SUFFIX}`.trim().replace(/\s+/g, ' ');
  return query;
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
  if (!PEXELS_API_KEY) {
    console.log('⚠️ PEXELS_API_KEY is not set. Skipping image fetching.');
    return;
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
      photo = await fetchPexelsPhoto(`technology office ${QUERY_SUFFIX}`.trim());
    }

    if (!photo) {
      console.log('   ❌ No photos found, skipping.');
      continue;
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
