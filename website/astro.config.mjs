// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EnumChangefreq } from 'sitemap';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';
import { rehypeExternalLinks } from './src/plugins/rehype-external-links.ts';
import { rehypeResponsiveImages } from './src/plugins/rehype-responsive-images.ts';
import { remarkStripFirstHeading } from './src/plugins/remark-strip-first-heading.ts';

const SITE_URL = 'https://clawd-bot.app';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, 'src', 'content', 'articles');
const PAGES_DIR = path.join(__dirname, 'src', 'pages');

/** @param {string} url */
const normalizeUrl = (url) => {
  if (url === `${SITE_URL}/`) {
    return SITE_URL;
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

/** @param {string} content @param {string} key */
const parseFrontmatterDate = (content, key) => {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) {
    return null;
  }
  const raw = match[1].trim().replace(/^['"]|['"]$/g, '');
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildArticleLastmodMap = () => {
  /** @type {Map<string, Date>} */
  const map = new Map();
  let latest = null;
  if (!fs.existsSync(ARTICLES_DIR)) {
    return { map, latest };
  }
  const files = fs.readdirSync(ARTICLES_DIR).filter((file) => file.endsWith('.mdx'));
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '');
    const content = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
    const modifiedDate = parseFrontmatterDate(content, 'modifiedDate');
    const pubDate = parseFrontmatterDate(content, 'pubDate');
    const lastmod = modifiedDate || pubDate;
    if (!lastmod) {
      continue;
    }
    const url = normalizeUrl(new URL(`/articles/${slug}`, SITE_URL).href);
    map.set(url, lastmod);
    if (!latest || lastmod > latest) {
      latest = lastmod;
    }
  }
  return { map, latest };
};

const buildPageLastmodMap = () => {
  /** @type {Map<string, Date>} */
  const map = new Map();
  if (!fs.existsSync(PAGES_DIR)) {
    return map;
  }

  /** @param {string} dir */
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !/\.(astro|mdx)$/.test(entry.name)) {
        continue;
      }
      const relativePath = path.relative(PAGES_DIR, fullPath);
      if (relativePath.includes('[')) {
        continue;
      }
      const withoutExt = relativePath.replace(/\.(astro|mdx)$/, '');
      const segments = withoutExt.split(path.sep).filter(Boolean);
      if (segments[segments.length - 1] === 'index') {
        segments.pop();
      }
      const route = `/${segments.join('/')}`;
      const url = route === '/' ? SITE_URL : normalizeUrl(new URL(route, SITE_URL).href);
      const stats = fs.statSync(fullPath);
      map.set(url, stats.mtime);
    }
  };

  walk(PAGES_DIR);
  return map;
};

const { map: articleLastmodMap, latest: latestArticleDate } = buildArticleLastmodMap();
const pageLastmodMap = buildPageLastmodMap();

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  integrations: [
    tailwind({
      configFile: './tailwind.config.cjs',
      applyBaseStyles: false,
    }),
    mdx({
      rehypePlugins: [
        [rehypeResponsiveImages, { publicDir: path.join(__dirname, 'public'), eagerCount: 1 }],
        rehypeExternalLinks,
      ],
      remarkPlugins: [remarkStripFirstHeading],
    }),
    sitemap({
      filter: (page) => (
        !page.includes('/api/')
        && !page.includes('/admin/')
        && page !== '/404'
        && page !== '/404/'
        && page !== '/robots.txt'
        && page !== '/rss.xml'
      ),
      changefreq: EnumChangefreq.WEEKLY,
      priority: 0.7,
      serialize: (item) => {
        const url = normalizeUrl(item.url);
        item.url = url;
        if (articleLastmodMap.has(url)) {
          item.lastmod = articleLastmodMap.get(url)?.toISOString();
        } else if (url === `${SITE_URL}/articles` && latestArticleDate) {
          item.lastmod = latestArticleDate.toISOString();
        } else if (url === SITE_URL && latestArticleDate) {
          item.lastmod = latestArticleDate.toISOString();
        } else if (pageLastmodMap.has(url)) {
          item.lastmod = pageLastmodMap.get(url)?.toISOString();
        }

        // Higher priority for important pages
        if (url === SITE_URL) {
          item.priority = 1.0;
          item.changefreq = EnumChangefreq.DAILY;
        } else if (url.includes('/articles/')) {
          item.priority = 0.8;
          item.changefreq = EnumChangefreq.WEEKLY;
        } else if (url === `${SITE_URL}/articles`) {
          item.priority = 0.85;
          item.changefreq = EnumChangefreq.DAILY;
        } else if (url.includes('/getting-started') || url.includes('/features')) {
          item.priority = 0.9;
          item.changefreq = EnumChangefreq.WEEKLY;
        } else if (url.includes('/hosting')) {
          item.priority = 0.85;
          item.changefreq = EnumChangefreq.WEEKLY;
        } else if (url.includes('/moltbot-clawdbot')) {
          item.priority = 0.85;
          item.changefreq = EnumChangefreq.WEEKLY;
        } else if (url.includes('/contact')) {
          item.priority = 0.6;
          item.changefreq = EnumChangefreq.MONTHLY;
        } else if (url.includes('/about')) {
          item.priority = 0.6;
          item.changefreq = EnumChangefreq.MONTHLY;
        } else if (url.includes('/privacy') || url.includes('/terms')) {
          item.priority = 0.3;
          item.changefreq = EnumChangefreq.YEARLY;
        }
        return item;
      },
    }),
    compress({
      CSS: false,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: true,
    }),
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
