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
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const REPORTS_DIR = path.join(__dirname, '..', '..', 'src', 'pages', 'reports');
const PUBLIC_REPORT_DIR = path.join(__dirname, '..', '..', 'public', 'report');

async function ensureDirs(): Promise<void> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_REPORT_DIR, { recursive: true });
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
  if (value > 0) return `<span class="trend-up">↑ ${value.toFixed(1)}%</span>`;
  if (value < 0) return `<span class="trend-down">↓ ${Math.abs(value).toFixed(1)}%</span>`;
  return '<span class="trend-flat">→ 0%</span>';
}

function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'high': return 'priority-high';
    case 'medium': return 'priority-medium';
    case 'low': return 'priority-low';
    default: return '';
  }
}

function buildReportBlocks(
  analysis: DailyAnalysis,
  kbSummary: CollectionSummary | null
): { title: string; description: string; style: string; body: string } {
  const { date, generatedAt, summary, topPages, lowPerformingPages, recommendations, trends } = analysis;
  const topEvents = analysis.topEvents || [];
  const title = `SEO Report - ${date}`;
  const description = `Daily SEO optimization report for ${date}`;

  const style = `
  .report-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .report-header {
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 1rem;
    margin-bottom: 2rem;
  }

  .report-header h1 {
    font-size: 2rem;
    color: #1f2937;
    margin: 0;
  }

  .report-header .date {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .summary-card {
    background: #f9fafb;
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: center;
  }

  .summary-card .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .summary-card .label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
  }

  .summary-card .trend {
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }

  .trend-up { color: #10b981; }
  .trend-down { color: #ef4444; }
  .trend-flat { color: #6b7280; }

  .section {
    margin-bottom: 2rem;
  }

  .section h2 {
    font-size: 1.25rem;
    color: #1f2937;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  .section h2 .emoji {
    margin-right: 0.5rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }

  tr:hover {
    background: #f9fafb;
  }

  .recommendation-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .recommendation-card .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .recommendation-card .issue {
    font-weight: 600;
    color: #1f2937;
  }

  .recommendation-card .page {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .recommendation-card .suggestion {
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .recommendation-card .impact {
    font-size: 0.75rem;
    color: #10b981;
  }

  .priority-badge {
    font-size: 0.625rem;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .priority-high {
    background: #fee2e2;
    color: #dc2626;
  }

  .priority-medium {
    background: #fef3c7;
    color: #d97706;
  }

  .priority-low {
    background: #dbeafe;
    color: #2563eb;
  }

  .kb-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .kb-card {
    background: #f0fdf4;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .kb-card h4 {
    margin: 0 0 0.5rem 0;
    color: #166534;
  }

  .footer {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #6b7280;
    font-size: 0.75rem;
  }
`;

  const topEventsSection = topEvents.length > 0
    ? `
  <div class="section">
    <h2><span class="emoji">🧭</span>Top Interaction Events</h2>
    <table>
      <thead>
        <tr>
          <th>Event</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        ${topEvents.map(event => `
        <tr>
          <td>${event.name}</td>
          <td>${event.count}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  `
    : '';

  const kbCategoryBlock = kbSummary?.byCategory
    ? `
      <div class="kb-card">
        <h4>Content Types</h4>
        <div>${Object.entries(kbSummary.byCategory).map(([category, count]) =>
          `${category}: ${count}`
        ).join(' | ')}</div>
      </div>
    `
    : '';

  const body = `
<div class="report-container">
  <div class="report-header">
    <h1>📊 SEO Optimization Report</h1>
    <p class="date">Date: ${date} | Generated: ${new Date(generatedAt).toLocaleString()}</p>
  </div>

  <div class="section">
    <h2><span class="emoji">📈</span>Daily Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${summary.totalPV.toLocaleString()}</div>
        <div class="label">Page Views</div>
        <div class="trend">${formatTrend(trends.pvTrend)}</div>
      </div>
      <div class="summary-card">
        <div class="value">${summary.totalUV.toLocaleString()}</div>
        <div class="label">Unique Visitors</div>
        <div class="trend">${formatTrend(trends.uvTrend)}</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatDuration(summary.avgDuration)}</div>
        <div class="label">Avg. Duration</div>
        <div class="trend">${formatTrend(trends.engagementTrend)}</div>
      </div>
      <div class="summary-card">
        <div class="value">${summary.avgBounceRate}%</div>
        <div class="label">Bounce Rate</div>
      </div>
      <div class="summary-card">
        <div class="value">${summary.avgScrollDepth}%</div>
        <div class="label">Scroll Depth</div>
      </div>
      <div class="summary-card">
        <div class="value">${summary.totalCTAClicks}</div>
        <div class="label">CTA Clicks</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2><span class="emoji">🏆</span>Top Performing Pages</h2>
    <table>
      <thead>
        <tr>
          <th>Page</th>
          <th>PV</th>
          <th>UV</th>
          <th>Duration</th>
          <th>Bounce</th>
          <th>Scroll</th>
        </tr>
      </thead>
      <tbody>
        ${topPages.map(page => `
        <tr>
          <td><a href="${page.path}">${page.title}</a></td>
          <td>${page.pv}</td>
          <td>${page.uv}</td>
          <td>${formatDuration(page.avgDuration)}</td>
          <td>${page.bounceRate.toFixed(1)}%</td>
          <td>${page.scrollDepth.toFixed(1)}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2><span class="emoji">⚠️</span>Pages Needing Optimization</h2>
    <table>
      <thead>
        <tr>
          <th>Page</th>
          <th>PV</th>
          <th>Bounce</th>
          <th>Duration</th>
          <th>Issue</th>
        </tr>
      </thead>
      <tbody>
        ${lowPerformingPages.map(page => {
          let issue = '';
          if (page.bounceRate > 70) issue = 'High bounce rate';
          else if (page.avgDuration < 30) issue = 'Low engagement';
          else if (page.scrollDepth < 40) issue = 'Low scroll depth';
          else issue = 'Low traffic';

          return `
          <tr>
            <td><a href="${page.path}">${page.title}</a></td>
            <td>${page.pv}</td>
            <td>${page.bounceRate.toFixed(1)}%</td>
            <td>${formatDuration(page.avgDuration)}</td>
            <td>${issue}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  ${topEventsSection}

  <div class="section">
    <h2><span class="emoji">💡</span>Recommendations</h2>
    ${recommendations.map(rec => `
    <div class="recommendation-card">
      <div class="header">
        <span class="issue">${rec.issue}</span>
        <span class="priority-badge ${getPriorityClass(rec.priority)}">${rec.priority}</span>
      </div>
      ${rec.page ? `<div class="page">Page: ${rec.page}</div>` : ''}
      <div class="suggestion">${rec.suggestion}</div>
      <div class="impact">Expected Impact: ${rec.expectedImpact}</div>
    </div>
    `).join('')}
  </div>

  ${kbSummary ? `
  <div class="section">
    <h2><span class="emoji">📚</span>Knowledge Base Updates</h2>
    <div class="kb-stats">
      <div class="kb-card">
        <h4>New Items Today</h4>
        <div class="value">${kbSummary.newItems}</div>
      </div>
      <div class="kb-card">
        <h4>Total Items</h4>
        <div class="value">${kbSummary.totalItems}</div>
      </div>
      <div class="kb-card">
        <h4>Sources</h4>
        <div>${Object.entries(kbSummary.bySource).map(([source, count]) =>
          `${source}: ${count}`
        ).join(' | ')}</div>
      </div>
      ${kbCategoryBlock}
      <div class="kb-card">
        <h4>Top Topics</h4>
        <div>${Object.entries(kbSummary.topTopics).slice(0, 5).map(([topic, count]) =>
          `${topic} (${count})`
        ).join(', ')}</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>This report is automatically generated by the SEO Automation System.</p>
    <p>© ${new Date().getFullYear()} Moltbot (Clawdbot)</p>
  </div>
</div>
`;

  return { title, description, style, body };
}

function generateAstroReport(analysis: DailyAnalysis, kbSummary: CollectionSummary | null): string {
  const { title, description, style, body } = buildReportBlocks(analysis, kbSummary);
  return `---\nimport BaseLayout from '../../layouts/BaseLayout.astro';\n\nconst title = ${JSON.stringify(title)};\nconst description = ${JSON.stringify(description)};\n---\n\n<BaseLayout title={title} description={description}>\n  <style>${style}\n  </style>\n  ${body}\n</BaseLayout>\n`;
}

function generateStandaloneReport(analysis: DailyAnalysis, kbSummary: CollectionSummary | null): string {
  const { title, description, style, body } = buildReportBlocks(analysis, kbSummary);
  return `<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\" />\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n<title>${title}</title>\n<meta name=\"description\" content=\"${description}\" />\n<style>${style}\n</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

async function generateIndexPage(reports: string[]): Promise<void> {
  const indexContent = `---
import BaseLayout from '../../layouts/BaseLayout.astro';

const title = 'SEO Reports';
const description = 'Daily SEO optimization reports';
---

<BaseLayout title={title} description={description}>
  <style>
  .reports-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .reports-container h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .reports-list {
    list-style: none;
    padding: 0;
  }

  .reports-list li {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .reports-list a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .reports-list a:hover {
    text-decoration: underline;
  }
  </style>

  <div class="reports-container">
    <h1>📊 SEO Optimization Reports</h1>
    <p>Daily reports analyzing website performance and providing optimization recommendations.</p>

    <ul class="reports-list">
      ${reports.map(report => {
        const reportDate = report.replace('.astro', '');
        return `
      <li>
        <a href="/reports/${reportDate}">${reportDate}</a>
      </li>`;
      }).join('')}
    </ul>
  </div>
</BaseLayout>
`;

  await fs.writeFile(
    path.join(REPORTS_DIR, 'index.astro'),
    indexContent
  );
}

async function generatePublicIndex(reports: string[]): Promise<void> {
  const listItems = reports.map((report) => {
    const reportDate = report.replace('.astro', '');
    const slug = reportDate.replace(/-/g, '');
    return `<li><a href=\"/report/${slug}.html\">${reportDate}</a></li>`;
  }).join('');

  const html = `<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>SEO Reports</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; margin: 0; padding: 2rem; }
    h1 { margin-bottom: 0.5rem; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb; }
    a { color: #2563eb; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>📊 SEO Optimization Reports</h1>
  <p>Daily reports analyzing website performance and providing optimization recommendations.</p>
  <ul>${listItems}</ul>
</body>
</html>
`;

  await fs.writeFile(
    path.join(PUBLIC_REPORT_DIR, 'index.html'),
    html
  );
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

  // Generate report HTML
  const reportContent = generateAstroReport(analysis, kbSummary);
  const reportHtml = generateStandaloneReport(analysis, kbSummary);

  // Save report
  const reportFileName = `${today}.astro`;
  const reportPath = path.join(REPORTS_DIR, reportFileName);
  await fs.writeFile(reportPath, reportContent);

  console.log(`Report saved to: ${reportPath}`);

  const publicSlug = today.replace(/-/g, '');
  const publicReportPath = path.join(PUBLIC_REPORT_DIR, `${publicSlug}.html`);
  await fs.writeFile(publicReportPath, reportHtml);
  console.log(`Public report saved to: ${publicReportPath}`);

  // Update index page
  const existingReports = await fs.readdir(REPORTS_DIR);
  const reportFiles = existingReports
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.astro$/))
    .sort()
    .reverse();

  await generateIndexPage(reportFiles);
  await generatePublicIndex(reportFiles);
  console.log('Index page updated');

  console.log('\nReport generation complete!');
  console.log(`View at: /reports/${today} and /report/${publicSlug}.html`);
}

// Run
generateReport().catch(console.error);
