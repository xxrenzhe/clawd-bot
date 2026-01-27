import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LinkValidationResult {
  file: string;
  totalLinks: number;
  validLinks: number;
  brokenLinks: LinkIssue[];
  warnings: LinkIssue[];
}

interface LinkIssue {
  url: string;
  type: 'internal' | 'external' | 'anchor';
  status?: number;
  message: string;
  line?: number;
}

// Known good domains that don't need HTTP verification
const TRUSTED_DOMAINS = [
  'github.com',
  'anthropic.com',
  'console.anthropic.com',
  'nodejs.org',
  'discord.gg',
  'discord.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'plausible.io',
  'tailscale.com',
  'cloudflare.com',
  'hetzner.com',
  'digitalocean.com',
  'aws.amazon.com',
];

const externalLinkCache = new Map<string, LinkIssue | null>();
const skipExternalLinkCheck = process.env.SKIP_EXTERNAL_LINK_CHECK === 'true';

// Extract all links from markdown content
function extractLinks(content: string): Array<{ url: string; line: number; text: string }> {
  const links: Array<{ url: string; line: number; text: string }> = [];
  const lines = content.split('\n');

  // Markdown links: [text](url)
  const mdLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

  // HTML links: href="url"
  const htmlLinkRegex = /href=["']([^"']+)["']/g;

  lines.forEach((line, lineIndex) => {
    let match: RegExpExecArray | null;

    // Extract markdown links
    while ((match = mdLinkRegex.exec(line)) !== null) {
      links.push({
        url: match[2],
        line: lineIndex + 1,
        text: match[1],
      });
    }

    // Extract HTML links
    while ((match = htmlLinkRegex.exec(line)) !== null) {
      const href = match[1];
      if (!href) {
        continue;
      }
      // Avoid duplicates from markdown links
      if (!links.some(l => l.url === href && l.line === lineIndex + 1)) {
        links.push({
          url: href,
          line: lineIndex + 1,
          text: '',
        });
      }
    }
  });

  return links;
}

// Validate internal links (within the site)
async function validateInternalLink(
  url: string,
  articlesDir: string,
  pagesDir: string,
  publicDir: string
): Promise<LinkIssue | null> {
  // Handle relative URLs
  let targetPath = url;

  // Remove anchor
  const anchorIndex = targetPath.indexOf('#');
  if (anchorIndex !== -1) {
    targetPath = targetPath.substring(0, anchorIndex);
  }

  // Remove leading slash for file lookup
  if (targetPath.startsWith('/')) {
    targetPath = targetPath.substring(1);
  }

  // Skip empty paths (just anchors)
  if (!targetPath) {
    return null;
  }

  // Check common internal paths
  const possiblePaths = [
    path.join(pagesDir, `${targetPath}.astro`),
    path.join(pagesDir, targetPath, 'index.astro'),
    path.join(pagesDir, `${targetPath}.mdx`),
    path.join(articlesDir, `${targetPath}.mdx`),
  ];

  // Check for articles path
  if (targetPath.startsWith('articles/')) {
    const articleSlug = targetPath.replace('articles/', '');
    possiblePaths.push(path.join(articlesDir, `${articleSlug}.mdx`));
  }

  for (const possiblePath of possiblePaths) {
    try {
      await fs.access(possiblePath);
      return null; // File exists
    } catch {
      // Continue checking
    }
  }

  // Check static assets in public/
  try {
    await fs.access(path.join(publicDir, targetPath));
    return null;
  } catch {
    // Continue to error
  }

  // Special case for root
  if (targetPath === '' || targetPath === '/') {
    return null;
  }

  return {
    url,
    type: 'internal',
    message: `Internal page not found: ${url}`,
  };
}

// Validate external links
async function validateExternalLink(url: string): Promise<LinkIssue | null> {
  if (skipExternalLinkCheck) {
    return null;
  }

  if (externalLinkCache.has(url)) {
    return externalLinkCache.get(url) ?? null;
  }

  try {
    const urlObj = new URL(url);

    // Skip trusted domains (known to be valid)
    if (TRUSTED_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
      externalLinkCache.set(url, null);
      return null;
    }

    // Check for common URL issues
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      return {
        url,
        type: 'external',
        message: `Unsupported protocol: ${urlObj.protocol}`,
      };
    }

    // Try to fetch with HEAD request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ClawdbotLinkChecker/1.0)',
        },
      });

      clearTimeout(timeout);

      if (response.status >= 400) {
        if (response.status === 403 || response.status === 405) {
          const retry = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ClawdbotLinkChecker/1.0)',
              Range: 'bytes=0-0',
            },
          });
          if (retry.status < 400) {
            externalLinkCache.set(url, null);
            return null;
          }
        }

        return {
          url,
          type: 'external',
          status: response.status,
          message: `HTTP ${response.status} error`,
        };
      }

      externalLinkCache.set(url, null);
      return null;
    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';

      // Don't fail on network errors for external links, just warn
      const issue = {
        url,
        type: 'external',
        message: `Could not verify: ${errorMessage}`,
      } as LinkIssue;
      externalLinkCache.set(url, issue);
      return issue;
    }
  } catch {
    const issue = {
      url,
      type: 'external',
      message: `Invalid URL format`,
    } as LinkIssue;
    externalLinkCache.set(url, issue);
    return issue;
  }
}

async function validateArticleLinks(filePath: string): Promise<LinkValidationResult> {
  const result: LinkValidationResult = {
    file: path.basename(filePath),
    totalLinks: 0,
    validLinks: 0,
    brokenLinks: [],
    warnings: [],
  };

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const links = extractLinks(content);
    result.totalLinks = links.length;

    const articlesDir = path.join(__dirname, '..', 'src', 'content', 'articles');
    const pagesDir = path.join(__dirname, '..', 'src', 'pages');
    const publicDir = path.join(__dirname, '..', 'public');

    for (const link of links) {
      const { url, line } = link;

      // Skip mailto links
      if (url.startsWith('mailto:')) {
        result.validLinks++;
        continue;
      }

      // Skip fragment-only links
      if (url.startsWith('#')) {
        result.validLinks++;
        continue;
      }

      // Determine if internal or external
      const isExternal = url.startsWith('http://') || url.startsWith('https://');

      if (isExternal) {
        const issue = await validateExternalLink(url);
        if (issue) {
          issue.line = line;
        if (issue.status && issue.status >= 500) {
          result.warnings.push(issue);
        } else if (issue.status && issue.status >= 400) {
          result.brokenLinks.push(issue);
        } else {
          result.warnings.push(issue);
        }
        } else {
          result.validLinks++;
        }
      } else {
        const issue = await validateInternalLink(url, articlesDir, pagesDir, publicDir);
        if (issue) {
          issue.line = line;
          result.brokenLinks.push(issue);
        } else {
          result.validLinks++;
        }
      }
    }
  } catch (error) {
    result.brokenLinks.push({
      url: '',
      type: 'internal',
      message: `Error reading file: ${error}`,
    });
  }

  return result;
}

async function validateAllLinks() {
  const articlesDir = path.join(__dirname, '..', 'src', 'content', 'articles');

  try {
    const files = await fs.readdir(articlesDir);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));

    if (mdxFiles.length === 0) {
      console.log('No articles found to validate.');
      return;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('LINK VALIDATION REPORT');
    console.log(`${'='.repeat(80)}\n`);

    const results: LinkValidationResult[] = [];
    let totalBrokenLinks = 0;
    let totalWarnings = 0;

    for (const file of mdxFiles) {
      const filePath = path.join(articlesDir, file);
      console.log(`\nChecking: ${file}...`);
      const result = await validateArticleLinks(filePath);
      results.push(result);
      totalBrokenLinks += result.brokenLinks.length;
      totalWarnings += result.warnings.length;
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(80)}\n`);

    console.log(`Total articles checked: ${results.length}`);
    console.log(`Total links found: ${results.reduce((sum, r) => sum + r.totalLinks, 0)}`);
    console.log(`Valid links: ${results.reduce((sum, r) => sum + r.validLinks, 0)}`);
    console.log(`Broken links: ${totalBrokenLinks}`);
    console.log(`Warnings: ${totalWarnings}`);

    // Detailed results
    results.forEach(result => {
      if (result.brokenLinks.length > 0 || result.warnings.length > 0) {
        console.log(`\n--- ${result.file} ---`);
        console.log(`  Links: ${result.totalLinks} (${result.validLinks} valid)`);

        if (result.brokenLinks.length > 0) {
          console.log('\n  Broken links:');
          result.brokenLinks.forEach(link => {
            console.log(`    ❌ Line ${link.line}: ${link.url}`);
            console.log(`       ${link.message}`);
          });
        }

        if (result.warnings.length > 0) {
          console.log('\n  Warnings:');
          result.warnings.forEach(link => {
            console.log(`    ⚠️  Line ${link.line}: ${link.url}`);
            console.log(`       ${link.message}`);
          });
        }
      }
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log('VALIDATION COMPLETE');
    console.log(`${'='.repeat(80)}\n`);

    if (totalBrokenLinks > 0) {
      console.error(`\n❌ ${totalBrokenLinks} broken link(s) found`);
      process.exit(1);
    } else if (totalWarnings > 0) {
      console.log(`\n⚠️  ${totalWarnings} warning(s) - all links valid but some could not be verified`);
      process.exit(0);
    } else {
      console.log(`\n✅ All links validated successfully`);
      process.exit(0);
    }
  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

validateAllLinks();
