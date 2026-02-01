/**
 * Analytics Analyzer - Analyzes collected data and generates insights
 * Runs daily via GitHub Actions
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

interface AnalyticsData {
  date: string;
  pages: PageStats[];
  events: EventStats[];
}

interface EventStats {
  name: string;
  count: number;
  pages: string[];
}

interface Recommendation {
  type: 'content' | 'seo' | 'ux' | 'technical';
  priority: 'high' | 'medium' | 'low';
  page?: string;
  issue: string;
  suggestion: string;
  expectedImpact: string;
}

interface DailyAnalysis {
  date: string;
  generatedAt: string;
  summary: {
    totalPV: number;
    totalUV: number;
    avgDuration: number;
    avgBounceRate: number;
    avgScrollDepth: number;
    totalCTAClicks: number;
  };
  topPages: PageStats[];
  lowPerformingPages: PageStats[];
  topEvents: EventStats[];
  recommendations: Recommendation[];
  trends: {
    pvTrend: number;
    uvTrend: number;
    engagementTrend: number;
  };
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ANALYTICS_DIR = path.join(DATA_DIR, 'analytics');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');

async function ensureDirs(): Promise<void> {
  await fs.mkdir(ANALYTICS_DIR, { recursive: true });
  await fs.mkdir(ANALYSIS_DIR, { recursive: true });
}

async function loadAnalyticsData(date: string): Promise<AnalyticsData | null> {
  const filePath = path.join(ANALYTICS_DIR, `${date}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function loadPreviousAnalysis(): Promise<DailyAnalysis | null> {
  try {
    const files = await fs.readdir(ANALYSIS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

    if (jsonFiles.length > 0) {
      const content = await fs.readFile(
        path.join(ANALYSIS_DIR, jsonFiles[0]),
        'utf-8'
      );
      return JSON.parse(content);
    }
  } catch {
    // No previous analysis
  }
  return null;
}

function generateMockData(date: string): AnalyticsData {
  // Generate realistic mock data for testing
  // In production, this would come from the tracking system
  const articles = [
    { path: '/articles/setup-clawdbot-beginners', title: 'Getting Started with Openclaw (Moltbot/Clawdbot)' },
    { path: '/articles/clawdbot-telegram-integration', title: 'Openclaw + Telegram Integration' },
    { path: '/articles/clawdbot-docker-setup', title: 'Openclaw + Docker Setup' },
    { path: '/articles/clawdbot-prompt-engineering', title: 'Prompt Engineering for Openclaw' },
    { path: '/articles/clawdbot-rag-implementation', title: 'Openclaw RAG Implementation Guide' },
    { path: '/articles/clawdbot-vs-chatgpt', title: 'Openclaw vs ChatGPT' },
    { path: '/articles/clawdbot-security-best-practices', title: 'Openclaw Security Best Practices' },
    { path: '/articles/clawdbot-task-automation', title: 'Task Automation with Openclaw' },
    { path: '/', title: 'Openclaw (Moltbot/Clawdbot) Home' },
    { path: '/hosting', title: 'Openclaw Hosting' },
  ];

  const pages: PageStats[] = articles.map(article => ({
    path: article.path,
    title: article.title,
    pv: Math.floor(Math.random() * 500) + 50,
    uv: Math.floor(Math.random() * 300) + 30,
    avgDuration: Math.floor(Math.random() * 300) + 30,
    bounceRate: Math.random() * 60 + 20,
    scrollDepth: Math.random() * 40 + 40,
    ctaClicks: Math.floor(Math.random() * 20),
  }));

  return {
    date,
    pages,
    events: [
      { name: 'cta_click', count: 45, pages: ['/hosting', '/'] },
      { name: 'scroll_depth_75', count: 120, pages: articles.map(a => a.path) },
      { name: 'outbound_link', count: 30, pages: articles.map(a => a.path) },
    ],
  };
}

function identifyLowPerformingPages(pages: PageStats[]): PageStats[] {
  if (pages.length === 0) return [];
  return pages
    .filter(p => {
      // High bounce rate
      if (p.bounceRate > 70) return true;
      // Low duration
      if (p.avgDuration < 30) return true;
      // Low scroll depth
      if (p.scrollDepth < 40) return true;
      // Low PV relative to others
      const avgPV = pages.reduce((sum, pg) => sum + pg.pv, 0) / pages.length;
      if (p.pv < avgPV * 0.3) return true;

      return false;
    })
    .sort((a, b) => a.bounceRate - b.bounceRate)
    .slice(0, 5);
}

function generateRecommendations(
  pages: PageStats[],
  lowPerforming: PageStats[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (pages.length === 0) {
    return recommendations;
  }

  for (const page of lowPerforming) {
    if (page.bounceRate > 70) {
      recommendations.push({
        type: 'content',
        priority: 'high',
        page: page.path,
        issue: `High bounce rate (${page.bounceRate.toFixed(1)}%)`,
        suggestion: 'Improve opening paragraph, add table of contents, ensure content matches title promise',
        expectedImpact: 'Reduce bounce rate by 15-25%',
      });
    }

    if (page.avgDuration < 30) {
      recommendations.push({
        type: 'content',
        priority: 'medium',
        page: page.path,
        issue: `Low average duration (${page.avgDuration}s)`,
        suggestion: 'Add more detailed content, code examples, or interactive elements',
        expectedImpact: 'Increase time on page by 30-50%',
      });
    }

    if (page.scrollDepth < 40) {
      recommendations.push({
        type: 'ux',
        priority: 'medium',
        page: page.path,
        issue: `Low scroll depth (${page.scrollDepth.toFixed(1)}%)`,
        suggestion: 'Add visual breaks, images, and scannable headings to encourage scrolling',
        expectedImpact: 'Improve content consumption by 20%',
      });
    }

    if (page.ctaClicks === 0) {
      recommendations.push({
        type: 'ux',
        priority: 'medium',
        page: page.path,
        issue: 'No CTA clicks recorded',
        suggestion: 'Review CTA placement, make it more prominent, test different copy',
        expectedImpact: 'Potential 2-5% CTR on CTAs',
      });
    }
  }

  // General recommendations
  const avgBounce = pages.reduce((sum, p) => sum + p.bounceRate, 0) / pages.length;
  if (avgBounce > 50) {
    recommendations.push({
      type: 'seo',
      priority: 'high',
      issue: `Site-wide bounce rate is high (${avgBounce.toFixed(1)}%)`,
      suggestion: 'Review meta descriptions to ensure they accurately represent content, improve page load speed',
      expectedImpact: 'Better search rankings, more engaged visitors',
    });
  }

  const brandKeywords = ['openclaw', 'moltbot', 'clawdbot'];
  const pagesMissingBrand = pages
    .filter((page) => page.path.startsWith('/articles') || page.path === '/' || page.path === '/features' || page.path === '/hosting')
    .filter((page) => !brandKeywords.some((keyword) => page.title.toLowerCase().includes(keyword)));

  if (pagesMissingBrand.length > 0) {
    const examples = pagesMissingBrand.slice(0, 3).map((page) => page.path).join(', ');
    recommendations.push({
      type: 'seo',
      priority: 'medium',
      issue: 'Some high-value pages lack brand keywords in titles',
      suggestion: `Add Openclaw/Moltbot/Clawdbot (any brand keyword) to key page titles/meta. Example pages: ${examples}`,
      expectedImpact: 'Improved brand recall and higher CTR from search results',
    });
  }

  return recommendations;
}

async function analyze(): Promise<void> {
  console.log('Starting daily analysis...');
  console.log('Date:', new Date().toISOString());

  await ensureDirs();

  const targetDate = process.env.SEO_DATE || process.env.ANALYTICS_DATE || new Date().toISOString().split('T')[0];

  // Try to load real analytics data, fall back to mock
  let analyticsData = await loadAnalyticsData(targetDate);

  if (!analyticsData) {
    if (process.env.ALLOW_MOCK_ANALYTICS === 'true') {
      console.log('No analytics data found, using mock data for demonstration');
      analyticsData = generateMockData(targetDate);

      // Save mock data for reference
      await fs.writeFile(
        path.join(ANALYTICS_DIR, `${targetDate}.json`),
        JSON.stringify(analyticsData, null, 2)
      );
    } else {
      console.log('No analytics data found. Continuing with empty dataset.');
      analyticsData = { date: targetDate, pages: [], events: [] };
    }
  }

  const previousAnalysis = await loadPreviousAnalysis();

  // Calculate summary
  const pageCount = analyticsData.pages.length || 1;
  const summary = {
    totalPV: analyticsData.pages.reduce((sum, p) => sum + p.pv, 0),
    totalUV: analyticsData.pages.reduce((sum, p) => sum + p.uv, 0),
    avgDuration: Math.round(
      analyticsData.pages.reduce((sum, p) => sum + p.avgDuration, 0) /
      pageCount
    ),
    avgBounceRate: Math.round(
      analyticsData.pages.reduce((sum, p) => sum + p.bounceRate, 0) /
      pageCount * 10
    ) / 10,
    avgScrollDepth: Math.round(
      analyticsData.pages.reduce((sum, p) => sum + p.scrollDepth, 0) /
      pageCount * 10
    ) / 10,
    totalCTAClicks: analyticsData.pages.reduce((sum, p) => sum + p.ctaClicks, 0),
  };

  // Calculate trends
  const trends = {
    pvTrend: previousAnalysis
      ? ((summary.totalPV - previousAnalysis.summary.totalPV) / previousAnalysis.summary.totalPV) * 100
      : 0,
    uvTrend: previousAnalysis
      ? ((summary.totalUV - previousAnalysis.summary.totalUV) / previousAnalysis.summary.totalUV) * 100
      : 0,
    engagementTrend: previousAnalysis
      ? ((summary.avgDuration - previousAnalysis.summary.avgDuration) / previousAnalysis.summary.avgDuration) * 100
      : 0,
  };

  // Get top and low performing pages
  const topPages = [...analyticsData.pages]
    .sort((a, b) => b.pv - a.pv)
    .slice(0, 5);

  const lowPerformingPages = identifyLowPerformingPages(analyticsData.pages);

  // Generate recommendations
  const recommendations = generateRecommendations(
    analyticsData.pages,
    lowPerformingPages
  );

  const topEvents = [...analyticsData.events]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const analysis: DailyAnalysis = {
    date: targetDate,
    generatedAt: new Date().toISOString(),
    summary,
    topPages,
    lowPerformingPages,
    topEvents,
    recommendations,
    trends,
  };

  // Save analysis
  const analysisPath = path.join(ANALYSIS_DIR, `${targetDate}.json`);
  await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));

  console.log('\nAnalysis Complete:');
  console.log(`- Total PV: ${summary.totalPV}`);
  console.log(`- Total UV: ${summary.totalUV}`);
  console.log(`- Avg Duration: ${summary.avgDuration}s`);
  console.log(`- Avg Bounce Rate: ${summary.avgBounceRate}%`);
  console.log(`- Top Pages: ${topPages.length}`);
  console.log(`- Low Performing: ${lowPerformingPages.length}`);
  console.log(`- Recommendations: ${recommendations.length}`);

  console.log(`\nAnalysis saved to: ${analysisPath}`);
}

// Run
analyze().catch(console.error);
