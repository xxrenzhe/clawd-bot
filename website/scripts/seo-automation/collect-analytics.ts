/**
 * Analytics Collector - Pulls daily analytics into a normalized format
 * Supports Plausible API (recommended) or local JSON exports.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PageStats {
  path: string;
  title: string;
  pv: number;
  uv: number;
  avgDuration: number;
  bounceRate: number;
  scrollDepth: number;
  ctaClicks: number;
}

interface EventStats {
  name: string;
  count: number;
  pages: string[];
}

interface AnalyticsData {
  date: string;
  pages: PageStats[];
  events: EventStats[];
}

interface PageTitleMap {
  [slug: string]: string;
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ANALYTICS_DIR = path.join(DATA_DIR, 'analytics');
const ANALYTICS_RAW_DIR = path.join(DATA_DIR, 'analytics', 'raw');
const CONTENT_DIR = path.join(__dirname, '..', '..', 'src', 'content', 'articles');

const PLAUSIBLE_API_BASE = process.env.PLAUSIBLE_API_BASE || 'https://plausible.io/api/v1';
const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY;
const PLAUSIBLE_SITE_ID = process.env.PLAUSIBLE_SITE_ID || process.env.PUBLIC_PLAUSIBLE_DOMAIN;

const CTA_EVENT_NAMES = ['hosting-cta-click', 'Hosting CTA Click', 'cta_click'];
const SCROLL_EVENT_NAMES = ['scroll_depth', 'Scroll Depth', 'scroll-depth'];

function normalizePath(value: string): string {
  if (!value) return '';
  let pathValue = value.trim();
  if (!pathValue) return '';

  if (/^https?:\/\//i.test(pathValue)) {
    try {
      const url = new URL(pathValue);
      pathValue = url.pathname || '/';
    } catch {
      // Ignore invalid URLs and continue with raw value.
    }
  }

  pathValue = pathValue.split('?')[0].split('#')[0];
  if (!pathValue.startsWith('/')) {
    pathValue = `/${pathValue}`;
  }
  if (pathValue.length > 1 && pathValue.endsWith('/')) {
    pathValue = pathValue.slice(0, -1);
  }

  return pathValue;
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(ANALYTICS_DIR, { recursive: true });
  await fs.mkdir(ANALYTICS_RAW_DIR, { recursive: true });
}

async function loadTitleMap(): Promise<PageTitleMap> {
  const map: PageTitleMap = {
    [normalizePath('/')]: 'Home',
    [normalizePath('/hosting')]: 'Hosting',
    [normalizePath('/features')]: 'Features',
  };

  try {
    const files = await fs.readdir(CONTENT_DIR);
    for (const file of files) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
      const filePath = path.join(CONTENT_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) continue;
      const frontmatter = frontmatterMatch[1];
      const titleMatch = frontmatter.match(/title:\s*(?:"([^"]+)"|'([^']+)'|(.+))$/m);
      const title = titleMatch?.[1] || titleMatch?.[2] || titleMatch?.[3];
      if (!title) continue;
      const slug = file.replace(/\.(mdx|md)$/, '');
      map[normalizePath(`/articles/${slug}`)] = title.trim();
    }
  } catch {
    // Ignore if content directory is missing
  }

  return map;
}

function resolveTitle(pathname: string, titleMap: PageTitleMap): string {
  const normalized = normalizePath(pathname);
  if (titleMap[normalized]) return titleMap[normalized];
  return normalized === '/' ? 'Home' : normalized;
}

async function loadRawExport(date: string): Promise<AnalyticsData | null> {
  const rawPath = path.join(ANALYTICS_RAW_DIR, `${date}.json`);
  try {
    const rawContent = await fs.readFile(rawPath, 'utf-8');
    return JSON.parse(rawContent) as AnalyticsData;
  } catch {
    return null;
  }
}

async function plausibleRequest(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  if (!PLAUSIBLE_API_KEY || !PLAUSIBLE_SITE_ID) {
    throw new Error('Plausible API credentials not configured');
  }

  const url = new URL(`${PLAUSIBLE_API_BASE}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${PLAUSIBLE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Plausible API error (${response.status}): ${message}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

function extractResults(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  const results = payload.results;
  if (Array.isArray(results)) return results as Array<Record<string, unknown>>;
  const data = payload.data;
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  return [];
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

async function fetchPageBreakdown(date: string): Promise<Array<Record<string, unknown>>> {
  return extractResults(await plausibleRequest('stats/breakdown', {
    site_id: PLAUSIBLE_SITE_ID as string,
    period: 'day',
    date,
    property: 'event:page',
    metrics: 'pageviews,visitors,visit_duration,bounce_rate',
  }));
}

async function fetchEventBreakdown(date: string, eventName: string): Promise<Array<Record<string, unknown>>> {
  return extractResults(await plausibleRequest('stats/breakdown', {
    site_id: PLAUSIBLE_SITE_ID as string,
    period: 'day',
    date,
    property: 'event:page',
    metrics: 'events,visitors',
    filters: `event:name==${eventName}`,
  }));
}

async function fetchEventBreakdowns(date: string, eventNames: string[]): Promise<Array<Record<string, unknown>>> {
  const results = await Promise.all(eventNames.map(async (name) => {
    try {
      return await fetchEventBreakdown(date, name);
    } catch {
      return [];
    }
  }));
  return results.flat();
}

async function fetchEventTotals(date: string): Promise<Array<Record<string, unknown>>> {
  return extractResults(await plausibleRequest('stats/breakdown', {
    site_id: PLAUSIBLE_SITE_ID as string,
    period: 'day',
    date,
    property: 'event:name',
    metrics: 'events',
  }));
}

function resolvePagePath(record: Record<string, unknown>): string {
  const direct = record.page || record['event:page'] || record.label || record.name;
  if (typeof direct === 'string') return normalizePath(direct);
  return '';
}

function buildEventMap(records: Array<Record<string, unknown>>): Map<string, { events: number; visitors: number } > {
  const map = new Map<string, { events: number; visitors: number }>();
  for (const record of records) {
    const page = resolvePagePath(record);
    if (!page) continue;
    const events = toNumber(record.events);
    const visitors = toNumber(record.visitors);
    const existing = map.get(page);
    map.set(page, {
      events: (existing?.events || 0) + events,
      visitors: Math.max(existing?.visitors || 0, visitors),
    });
  }
  return map;
}

function estimateScrollDepth(events: number, visitors: number): number {
  if (!visitors) return 0;
  const depth = Math.round((events / visitors) * 25);
  return Math.min(100, Math.max(0, depth));
}

async function fetchFromPlausible(date: string, titleMap: PageTitleMap): Promise<AnalyticsData> {
  const pageResults = await fetchPageBreakdown(date);
  const ctaEvents = await fetchEventBreakdowns(date, CTA_EVENT_NAMES);
  const scrollEvents = await fetchEventBreakdowns(date, SCROLL_EVENT_NAMES);
  const eventTotals = await fetchEventTotals(date);

  const ctaMap = buildEventMap(ctaEvents);
  const scrollMap = buildEventMap(scrollEvents);

  const pages: PageStats[] = pageResults
    .map((record) => {
      const path = resolvePagePath(record);
      if (!path) return null;
      const pv = toNumber(record.pageviews);
      const uv = toNumber(record.visitors);
      const avgDuration = Math.round(toNumber(record.visit_duration));
      const bounceRate = toNumber(record.bounce_rate);
      const cta = ctaMap.get(path)?.events || 0;
      const scrollEvent = scrollMap.get(path);
      const scrollDepth = scrollEvent ? estimateScrollDepth(scrollEvent.events, scrollEvent.visitors) : 0;

      return {
        path,
        title: resolveTitle(path, titleMap),
        pv,
        uv,
        avgDuration,
        bounceRate,
        scrollDepth,
        ctaClicks: cta,
      } as PageStats;
    })
    .filter((item): item is PageStats => Boolean(item));

  const events: EventStats[] = eventTotals.map((record) => {
    const name = typeof record.name === 'string' ? record.name : 'unknown';
    const count = toNumber(record.events);
    return {
      name,
      count,
      pages: [],
    } as EventStats;
  });

  return {
    date,
    pages,
    events,
  };
}

async function collectAnalytics(): Promise<void> {
  await ensureDirs();

  const date = process.env.SEO_DATE || process.env.ANALYTICS_DATE || new Date().toISOString().split('T')[0];
  console.log('Collecting analytics data for:', date);

  const titleMap = await loadTitleMap();

  // Prefer Plausible API when configured
  if (PLAUSIBLE_API_KEY && PLAUSIBLE_SITE_ID) {
    try {
      const analyticsData = await fetchFromPlausible(date, titleMap);
      const outPath = path.join(ANALYTICS_DIR, `${date}.json`);
      await fs.writeFile(outPath, JSON.stringify(analyticsData, null, 2));
      console.log(`Analytics data saved to: ${outPath}`);
      return;
    } catch (error) {
      console.error('Plausible collection failed:', error);
    }
  }

  // Fallback to raw export if present
  const rawExport = await loadRawExport(date);
  if (rawExport) {
    const outPath = path.join(ANALYTICS_DIR, `${date}.json`);
    await fs.writeFile(outPath, JSON.stringify(rawExport, null, 2));
    console.log(`Analytics data copied from raw export to: ${outPath}`);
    return;
  }

  console.warn('No analytics source available. Provide PLAUSIBLE_API_KEY/PLAUSIBLE_SITE_ID or drop a JSON export in data/analytics/raw/.');
}

collectAnalytics().catch((error) => {
  console.error(error);
});
