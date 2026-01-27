import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { setTimeout as delay } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEBSITE_ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(WEBSITE_ROOT, 'src/content/articles');
const IMAGES_DIR = path.join(WEBSITE_ROOT, 'public/images/articles');
const SOURCES_PATH = path.join(IMAGES_DIR, 'SOURCES.json');
const LOGO_PATH = path.join(WEBSITE_ROOT, 'public/logo.jpg');

const UNSPLASH_SEARCH_URL = 'https://unsplash.com/napi/search/photos';
const USER_AGENT = 'clawd-bot-image-fetcher/1.0 (https://clawd.bot/)';
const REQUEST_DELAY_MS = 300;
const FETCH_TIMEOUT_MS = 15000;
const MAX_SEARCH_RESULTS = 30;

const SLUG_QUERY_OVERRIDES = {
  'clawdbot-api-key-setup': ['keys'],
  'clawdbot-api-integration': ['api integration'],
  'clawdbot-cloud-deployment': ['cloud computing'],
  'clawdbot-database-integration': ['database server'],
  'clawdbot-email-management': ['mailbox'],
  'clawdbot-embeddings': ['neural network visualization'],
  'clawdbot-environment-variables': ['code editor'],
  'clawdbot-kubernetes': ['server cluster'],
  'clawdbot-load-balancing': ['network cables'],
  'clawdbot-logging-practices': ['logbook'],
  'clawdbot-monitoring-setup': ['control room'],
  'clawdbot-multi-agent': ['team collaboration'],
  'clawdbot-multi-instance': ['server cluster'],
  'clawdbot-pm2-setup': ['terminal code'],
  'clawdbot-raspberry-pi': ['raspberry pi board'],
  'clawdbot-response-quality': ['quality check'],
  'clawdbot-reverse-proxy': ['network cables'],
  'clawdbot-self-hosting': ['home server'],
  'clawdbot-streaming-responses': ['data stream'],
  'clawdbot-system-requirements': ['server hardware'],
  'clawdbot-systemd-service': ['server rack'],
  'clawdbot-vps-deployment': ['data center'],
  'clawdbot-webhook-handlers': ['network cables'],
  'clawdbot-workflow-optimization': ['flowchart'],
  'clawdbot-mac-mini-setup': ['mac mini'],
  'install-clawdbot-linux': ['linux terminal'],
  'install-clawdbot-mac': ['macbook laptop'],
  'install-clawdbot-windows': ['windows laptop'],
  'default-og': ['server rack data center', 'laptop workspace programming']
};

const STOPWORDS = new Set([
  'clawdbot', 'clawd', 'bot', 'ai', 'assistant', 'guide', 'deep', 'dive', 'overview', 'tutorial',
  'advanced', 'beginner', 'beginner\'s', 'how', 'to', 'and',
  'for', 'the', 'a', 'an', 'your', 'best', 'practices', 'tips', 'checklist', 'complete', 'ultimate',
  'step', 'steps'
]);

const TOKEN_MAP = new Map([
  ['roadmap', 'road map'],
  ['raspberry', 'Raspberry Pi computer'],
  ['pi', 'Raspberry Pi board'],
  ['docker', 'shipping containers port'],
  ['kubernetes', 'data center server racks'],
  ['road', 'road map'],
  ['community', 'conference audience'],
  ['highlights', 'conference audience'],
  ['content', 'camera'],
  ['context', 'sticky notes board'],
  ['cost', 'calculator'],
  ['custom', 'workbench tools'],
  ['customer', 'customer support headset'],
  ['analysis', 'data analytics dashboard'],
  ['key', 'keys'],
  ['ssl', 'cybersecurity padlock'],
  ['security', 'cybersecurity lock'],
  ['reverse', 'server rack network cables'],
  ['proxy', 'server rack network cables'],
  ['load', 'server rack network cables'],
  ['balancing', 'server rack network cables'],
  ['network', 'network switch cables'],
  ['database', 'server rack hard drives'],
  ['logging', 'logbook'],
  ['monitoring', 'monitoring dashboard'],
  ['email', 'email inbox laptop'],
  ['calendar', 'calendar'],
  ['meeting', 'meeting notes notebook'],
  ['notion', 'notes notebook desk'],
  ['jira', 'kanban board'],
  ['project', 'kanban board'],
  ['task', 'checklist clipboard'],
  ['automation', 'industrial automation'],
  ['support', 'customer support office'],
  ['documentation', 'technical documentation book'],
  ['training', 'classroom training'],
  ['research', 'researcher laptop'],
  ['github', 'code repository laptop'],
  ['discord', 'team chat office'],
  ['slack', 'team chat office'],
  ['devops', 'server room'],
  ['coding', 'code editor'],
  ['amazon', 'smart speaker'],
  ['lex', 'voice assistant device'],
  ['autogpt', 'robot automation'],
  ['botpress', 'chatbot interface'],
  ['chatgpt', 'chatbot interface'],
  ['claude', 'chatbot interface'],
  ['cursor', 'code editor'],
  ['dialogflow', 'chatbot interface'],
  ['copilot', 'code editor'],
  ['langchain', 'chain link abstract'],
  ['make', 'workflow automation'],
  ['n8n', 'workflow automation'],
  ['openai', 'chatbot interface'],
  ['rasa', 'chatbot interface'],
  ['zapier', 'workflow automation'],
  ['mac', 'macbook laptop'],
  ['windows', 'windows laptop'],
  ['linux', 'linux terminal'],
  ['vps', 'server rack'],
  ['cloud', 'data center'],
  ['scalability', 'data center servers'],
  ['backup', 'external hard drive'],
  ['restore', 'external hard drive'],
  ['compliance', 'security lock'],
  ['privacy', 'privacy lock'],
  ['memory', 'server memory modules'],
  ['embeddings', 'neural network'],
  ['enterprise', 'office building'],
  ['environment', 'terminal window'],
  ['error', 'warning sign'],
  ['tuning', 'audio mixer'],
  ['fine', 'audio mixer'],
  ['first', 'starting line'],
  ['run', 'running track start'],
  ['function', 'telephone handset'],
  ['calling', 'call center headset'],
  ['future', 'futuristic city'],
  ['vision', 'futuristic city'],
  ['integration', 'network cables'],
  ['update', 'software update'],
  ['updates', 'software update'],
  ['latest', 'newspaper headline'],
  ['news', 'newspaper headline'],
  ['maintenance', 'maintenance tools'],
  ['open', 'open source code'],
  ['source', 'open source code'],
  ['contributions', 'open source code'],
  ['performance', 'speedometer'],
  ['plugin', 'puzzle pieces'],
  ['prompt', 'keyboard typing'],
  ['rate', 'speed limit sign'],
  ['limiting', 'speed limit sign'],
  ['response', 'quality check'],
  ['quality', 'quality check'],
  ['hosting', 'home server'],
  ['streaming', 'data stream'],
  ['success', 'trophy award'],
  ['requirements', 'server rack'],
  ['systemd', 'server rack'],
  ['team', 'team meeting'],
  ['collaboration', 'team meeting'],
  ['troubleshooting', 'repair tools'],
  ['install', 'laptop setup'],
  ['beginners', 'beginner guide notebook'],
  ['deployment', 'server rack'],
  ['workflow', 'flowchart diagram'],
  ['optimization', 'performance dashboard'],
  ['rag', 'library shelves'],
  ['code', 'code editor screen'],
  ['testing', 'software testing'],
  ['version', 'version control repository'],
  ['auth', 'security token'],
  ['authentication', 'security token'],
  ['api', 'server rack network cables'],
  ['webhook', 'network cables'],
  ['webhooks', 'network cables']
]);

const GENERIC_FALLBACKS = [
  'server rack data center',
  'laptop workspace programming',
  'team collaboration office'
];

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function sanitizeText(value = '') {
  return decodeHtmlEntities(stripHtml(value));
}

function toAsciiJson(value) {
  const json = JSON.stringify(value, null, 2);
  return json.replace(/[\u0080-\u10FFFF]/g, (char) => {
    const codePoint = char.codePointAt(0);
    if (!codePoint) {
      return '';
    }
    if (codePoint <= 0xffff) {
      return `\\u${codePoint.toString(16).padStart(4, '0')}`;
    }
    const offset = codePoint - 0x10000;
    const high = 0xd800 + (offset >> 10);
    const low = 0xdc00 + (offset & 0x3ff);
    return `\\u${high.toString(16).padStart(4, '0')}\\u${low.toString(16).padStart(4, '0')}`;
  });
}

function tokenize(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/-/g, ''))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function buildQueries({ title, tags, slug }) {
  const titleTokens = tokenize(title).slice(0, 5);
  const tagTokens = (tags || []).flatMap((tag) => tokenize(tag)).slice(0, 5);
  const slugTokens = tokenize(slug.replace(/-/g, ' ')).slice(0, 5);

  const tokenPool = [...new Set([...titleTokens, ...tagTokens, ...slugTokens])];
  const queries = [];

  if (SLUG_QUERY_OVERRIDES[slug]) {
    for (const override of SLUG_QUERY_OVERRIDES[slug]) {
      queries.push({ query: override, priority: 'override' });
    }
  }

  if (slug.includes('-vs-')) {
    queries.push({ query: 'artificial intelligence assistant', priority: 'auto' });
    queries.push({ query: 'robot technology', priority: 'auto' });
  }

  for (const token of tokenPool) {
    const mapped = TOKEN_MAP.get(token);
    if (mapped) {
      queries.push({ query: mapped, priority: 'auto' });
    }
  }

  if (titleTokens.length) {
    queries.push({ query: titleTokens.join(' '), priority: 'auto' });
  }

  if (tagTokens.length && tagTokens.join(' ') !== titleTokens.join(' ')) {
    queries.push({ query: tagTokens.join(' '), priority: 'auto' });
  }

  for (const fallback of GENERIC_FALLBACKS) {
    queries.push({ query: fallback, priority: 'fallback' });
  }

  const unique = new Map();
  for (const item of queries) {
    if (!item?.query) {
      continue;
    }
    if (!unique.has(item.query)) {
      unique.set(item.query, item);
    }
  }
  return [...unique.values()];
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        ...(options.headers || {})
      }
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      await delay(400 + attempt * 300);
    }
  }
  throw lastError;
}

async function searchUnsplash(query) {
  const params = new URLSearchParams({
    query,
    per_page: String(MAX_SEARCH_RESULTS)
  });
  const url = `${UNSPLASH_SEARCH_URL}?${params.toString()}`;
  const data = await fetchJson(url);
  return (data.results || []).filter((photo) => !photo.premium && !photo.plus);
}

function scorePhoto(photo, tokens) {
  const haystack = [
    photo.alt_description,
    photo.slug
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;
  let matches = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2;
      matches += 1;
    }
  }

  if ((photo.width || 0) >= 2000) {
    score += 1;
  }

  if (/(logo|icon|illustration|diagram|vector|symbol|screenshot)/i.test(photo.slug || '')) {
    score -= 3;
  }

  return { score, matches };
}

function buildDownloadUrl(photo) {
  const raw = photo.urls?.raw || photo.urls?.full || photo.urls?.regular;
  if (!raw) {
    return '';
  }
  const url = new URL(raw);
  url.searchParams.set('fm', 'jpg');
  url.searchParams.set('fit', 'max');
  url.searchParams.set('w', '1600');
  return url.toString();
}

function buildAttribution(photo, query, slug, downloadUrl) {
  return {
    slug,
    query,
    title: sanitizeText(photo.alt_description || photo.description || photo.slug || slug),
    sourcePage: photo.links?.html || '',
    imageUrl: downloadUrl,
    originalUrl: photo.urls?.raw || photo.urls?.full || photo.urls?.regular || '',
    license: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
    author: sanitizeText(photo.user?.name || ''),
    authorUrl: photo.user?.links?.html || '',
    unsplashId: photo.id || '',
    width: photo.width || null,
    height: photo.height || null,
    retrievedAt: new Date().toISOString()
  };
}

async function downloadImage(url, destination) {
  const response = await fetchWithTimeout(url, {}, 20000);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);
}

async function fileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fsSync.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function loadSources() {
  try {
    const raw = await fs.readFile(SOURCES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

async function saveSources(sources) {
  const sorted = Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(SOURCES_PATH, toAsciiJson(sorted));
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function pickCandidate(queries, tokens, usedIds, avoidDuplicates) {
  let bestCandidate = null;
  for (const { query, priority } of queries) {
    const queryTokens = tokenize(query);
    const scoringTokens = queryTokens.length ? queryTokens : tokens;
    const photos = await searchUnsplash(query);
    await delay(REQUEST_DELAY_MS);
    const scored = photos
      .map((photo) => ({
        photo,
        ...scorePhoto(photo, scoringTokens)
      }))
      .sort((a, b) => b.score - a.score);
    if (!scored.length) {
      continue;
    }
    const filtered = avoidDuplicates
      ? scored.filter((item) => !usedIds.has(item.photo.id))
      : scored;
    const candidates = filtered.length ? filtered : scored;
    const top = candidates[0];
    const effectiveMatches = priority === 'override' && top.matches === 0 ? 1 : top.matches;
    if (
      !bestCandidate ||
      effectiveMatches > bestCandidate.matches ||
      (effectiveMatches === bestCandidate.matches && top.score > bestCandidate.score)
    ) {
      bestCandidate = { photo: top.photo, query, score: top.score, matches: effectiveMatches };
    }
    if (scoringTokens.length && (top.matches > 0 || priority === 'override')) {
      return { photo: top.photo, query };
    }
  }
  if (bestCandidate) {
    return { photo: bestCandidate.photo, query: bestCandidate.query };
  }
  return null;
}

async function main() {
  await ensureDir(IMAGES_DIR);

  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const offsetArg = args.find((arg) => arg.startsWith('--offset='));
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  const force = args.includes('--force');
  const includeDefault = args.includes('--include-default');
  const avoidDuplicates = !args.includes('--allow-duplicates');
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
  const offset = offsetArg ? Number(offsetArg.split('=')[1]) : 0;

  const files = (await fs.readdir(ARTICLES_DIR)).filter((file) => file.endsWith('.mdx'));
  const slugs = files.map((file) => file.replace(/\.mdx$/, '')).sort();
  const onlySlugs = onlyArg
    ? onlyArg
        .split('=')[1]
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean)
    : [];
  const targetSlugs = onlySlugs.length
    ? [...new Set(onlySlugs)]
    : slugs.slice(offset, Number.isFinite(limit) ? offset + limit : undefined);
  if (includeDefault && !targetSlugs.includes('default-og')) {
    targetSlugs.push('default-og');
  }

  const sources = await loadSources();
  const logoHash = await fileHash(LOGO_PATH);
  const usedIds = new Set();
  if (avoidDuplicates) {
    for (const [slug, entry] of Object.entries(sources)) {
      if (!entry.unsplashId) {
        continue;
      }
      if (!targetSlugs.includes(slug) || !force) {
        usedIds.add(entry.unsplashId);
      }
    }
  }

  let processed = 0;
  for (const slug of targetSlugs) {
    processed += 1;
    const imagePath = path.join(IMAGES_DIR, `${slug}.jpg`);
    let title = slug;
    let tags = [];
    if (slug !== 'default-og') {
      const articlePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
      const content = await fs.readFile(articlePath, 'utf8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
      const meta = {};

      for (const line of frontmatter.split(/\r?\n/)) {
        if (!line.includes(':')) {
          continue;
        }
        const [rawKey, ...rest] = line.split(':');
        const key = rawKey.trim();
        let value = rest.join(':').trim();
        if (!value) {
          continue;
        }
        if (value.startsWith('[')) {
          try {
            meta[key] = JSON.parse(value);
          } catch (error) {
            // ignore parse failures
          }
        } else {
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          meta[key] = value;
        }
      }

      title = meta.title || slug;
      tags = Array.isArray(meta.tags) ? meta.tags : [];
    } else {
      title = 'Clawdbot default open graph image';
      tags = ['clawdbot', 'default', 'og'];
    }

    let needsDownload = true;
    if (!force && fsSync.existsSync(imagePath) && sources[slug]) {
      const currentHash = await fileHash(imagePath);
      if (currentHash !== logoHash) {
        needsDownload = false;
      }
    }

    if (!needsDownload) {
      console.log(`[skip] ${slug} already has a non-placeholder image`);
      continue;
    }

    const queries = buildQueries({ title, tags, slug });
    const tokens = [...new Set([...tokenize(title), ...tokenize(slug)])];

    try {
      console.log(`[${processed}/${targetSlugs.length}] Searching for ${slug}...`);
      const result = await pickCandidate(queries, tokens, usedIds, avoidDuplicates);
      if (!result) {
        console.warn(`[warn] No candidate found for ${slug}`);
        continue;
      }

      const { photo, query } = result;
      const downloadUrl = buildDownloadUrl(photo);
      if (!downloadUrl) {
        console.warn(`[warn] Missing download URL for ${slug}`);
        continue;
      }

      await downloadImage(downloadUrl, imagePath);
      sources[slug] = buildAttribution(photo, query, slug, downloadUrl);
      if (avoidDuplicates && photo.id) {
        usedIds.add(photo.id);
      }
      await saveSources(sources);
      console.log(`[ok] ${slug} -> ${photo.slug}`);
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      console.warn(`[error] ${slug} failed: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
