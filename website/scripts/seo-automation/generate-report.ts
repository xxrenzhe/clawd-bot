/**
 * Report Generator - Creates HTML reports from analysis data
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

interface CollectionSummary {
  date: string;
  newItems: number;
  totalItems: number;
  bySource: Record<string, number>;
  byCategory?: Record<string, number>;
  topTopics: Record<string, number>;
  brandMentions?: number;
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const REPORTS_DIR = path.join(__dirname, '..', '..', 'data', 'reports');

async function ensureDirs(): Promise<void> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

async function loadAnalysis(date: string): Promise<DailyAnalysis | null> {
  const filePath = path.join(DATA_DIR, 'analysis', `${date}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function loadKnowledgeBaseSummary(): Promise<CollectionSummary | null> {
  const filePath = path.join(DATA_DIR, 'knowledge-base', 'collection-summary.json');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatTrend(value: number): string {
  if (value > 0) return `↑ ${value.toFixed(1)}%`;
  if (value < 0) return `↓ ${Math.abs(value).toFixed(1)}%`;
  return '→ 0%';
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function mdRow(values: string[]): string {
  return `| ${values.join(' | ')} |`;
}

function generateMarkdownReport(analysis: DailyAnalysis, kbSummary: CollectionSummary | null): string {
  const { date, generatedAt, summary, topPages, lowPerformingPages, recommendations, trends } = analysis;
  const topEvents = analysis.topEvents || [];

  const lines: string[] = [];
  lines.push(`# SEO Report - ${date}`);
  lines.push('');
  lines.push(`Generated: ${new Date(generatedAt).toLocaleString()}`);
  lines.push('');
  lines.push('## Daily Summary');
  lines.push(mdRow(['Metric', 'Value']));
  lines.push(mdRow(['---', '---']));
  lines.push(mdRow(['Page Views', summary.totalPV.toLocaleString()]));
  lines.push(mdRow(['Unique Visitors', summary.totalUV.toLocaleString()]));
  lines.push(mdRow(['Avg. Duration', formatDuration(summary.avgDuration)]));
  lines.push(mdRow(['Avg. Bounce Rate', `${summary.avgBounceRate}%`]));
  lines.push(mdRow(['Avg. Scroll Depth', `${summary.avgScrollDepth}%`]));
  lines.push(mdRow(['CTA Clicks', `${summary.totalCTAClicks}`]));
  lines.push(mdRow(['PV Trend', formatTrend(trends.pvTrend)]));
  lines.push(mdRow(['UV Trend', formatTrend(trends.uvTrend)]));
  lines.push(mdRow(['Engagement Trend', formatTrend(trends.engagementTrend)]));
  lines.push('');

  lines.push('## Top Performing Pages');
  lines.push(mdRow(['Page', 'PV', 'UV', 'Duration', 'Bounce', 'Scroll', 'CTA']));
  lines.push(mdRow(['---', '---', '---', '---', '---', '---', '---']));
  topPages.forEach((page) => {
    lines.push(mdRow([
      `[${escapeMarkdown(page.title)}](${page.path})`,
      page.pv.toString(),
      page.uv.toString(),
      formatDuration(page.avgDuration),
      `${page.bounceRate.toFixed(1)}%`,
      `${page.scrollDepth.toFixed(1)}%`,
      page.ctaClicks.toString(),
    ]));
  });
  lines.push('');

  lines.push('## Pages Needing Optimization');
  lines.push(mdRow(['Page', 'PV', 'Bounce', 'Duration', 'Issue']));
  lines.push(mdRow(['---', '---', '---', '---', '---']));
  lowPerformingPages.forEach((page) => {
    let issue = 'Low traffic';
    if (page.bounceRate > 70) issue = 'High bounce rate';
    else if (page.avgDuration < 30) issue = 'Low engagement';
    else if (page.scrollDepth < 40) issue = 'Low scroll depth';
    lines.push(mdRow([
      `[${escapeMarkdown(page.title)}](${page.path})`,
      page.pv.toString(),
      `${page.bounceRate.toFixed(1)}%`,
      formatDuration(page.avgDuration),
      issue,
    ]));
  });
  lines.push('');

  if (topEvents.length > 0) {
    lines.push('## Top Interaction Events');
    lines.push(mdRow(['Event', 'Count']));
    lines.push(mdRow(['---', '---']));
    topEvents.forEach((event) => {
      lines.push(mdRow([escapeMarkdown(event.name), event.count.toString()]));
    });
    lines.push('');
  }

  lines.push('## Recommendations');
  recommendations.forEach((rec) => {
    const pageInfo = rec.page ? ` | Page: ${rec.page}` : '';
    lines.push(`- [${rec.priority.toUpperCase()}][${rec.type}] ${rec.issue}${pageInfo}`);
    lines.push(`  - Suggestion: ${rec.suggestion}`);
    lines.push(`  - Expected impact: ${rec.expectedImpact}`);
  });
  lines.push('');

  if (kbSummary) {
    lines.push('## Knowledge Base Updates');
    lines.push(mdRow(['Metric', 'Value']));
    lines.push(mdRow(['---', '---']));
    lines.push(mdRow(['New Items Today', kbSummary.newItems.toString()]));
    lines.push(mdRow(['Total Items', kbSummary.totalItems.toString()]));
    if (typeof kbSummary.brandMentions === 'number') {
      lines.push(mdRow(['Brand Mentions (Openclaw/Moltbot/Clawdbot)', kbSummary.brandMentions.toString()]));
    }
    lines.push(mdRow(['Sources', Object.entries(kbSummary.bySource).map(([source, count]) => `${source}: ${count}`).join(' | ')]));
    if (kbSummary.byCategory) {
      lines.push(mdRow(['Content Types', Object.entries(kbSummary.byCategory).map(([category, count]) => `${category}: ${count}`).join(' | ')]));
    }
    lines.push(mdRow(['Top Topics', Object.entries(kbSummary.topTopics).slice(0, 5).map(([topic, count]) => `${topic} (${count})`).join(', ')]));
    lines.push('');
  }

  lines.push('---');
  lines.push('This report is automatically generated by the SEO Automation System.');
  lines.push(`© ${new Date().getFullYear()} Openclaw (Moltbot/Clawdbot)`);

  return lines.join('\n');
}


async function generateReport(): Promise<void> {
  console.log('Generating daily report...');
  console.log('Date:', new Date().toISOString());

  await ensureDirs();

  const today = new Date().toISOString().split('T')[0];

  // Load analysis data
  const analysis = await loadAnalysis(today);

  if (!analysis) {
    console.log('No analysis data found for today. Run analyze-data.ts first.');
    return;
  }

  // Load knowledge base summary
  const kbSummary = await loadKnowledgeBaseSummary();

  // Generate report markdown
  const reportContent = generateMarkdownReport(analysis, kbSummary);

  // Save report
  const reportFileName = `${today}.md`;
  const reportPath = path.join(REPORTS_DIR, reportFileName);
  await fs.writeFile(reportPath, reportContent);

  console.log(`Report saved to: ${reportPath}`);

  console.log('\nReport generation complete!');
}

// Run
generateReport().catch(console.error);
