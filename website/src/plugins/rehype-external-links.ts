import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/**
 * SEO Link Strategy:
 *
 * 1. TRUSTED DOMAINS (dofollow) - Pass link juice to authoritative sources
 *    - Official documentation sites
 *    - Major tech companies
 *    - Educational institutions
 *
 * 2. SPONSORED DOMAINS - Affiliate/partner links
 *    - Hosting providers
 *    - Tool vendors with referral programs
 *
 * 3. NEUTRAL DOMAINS (nofollow) - Don't pass link juice
 *    - User-generated content links
 *    - Untrusted sources
 *    - Competitor sites
 *
 * 4. DEFAULT - Regular external links get noopener noreferrer
 */

// Trusted domains that should pass link juice (dofollow)
const TRUSTED_DOMAINS = new Set([
  // Official Clawdbot
  'clawd.bot',
  'docs.clawd.bot',
  'clawdbot.com',

  // Major tech platforms
  'github.com',
  'nodejs.org',
  'npmjs.com',
  'docker.com',
  'docs.docker.com',

  // Cloud providers
  'aws.amazon.com',
  'cloud.google.com',
  'azure.microsoft.com',
  'digitalocean.com',

  // Documentation sites
  'developer.mozilla.org',
  'stackoverflow.com',
  'wikipedia.org',

  // Official frameworks
  'astro.build',
  'tailwindcss.com',
  'typescriptlang.org',
]);

// Sponsored/affiliate domains
const SPONSORED_DOMAINS = new Set([
  'hosting.com',
  'hostinger.com',
  'vultr.com',
  'linode.com',
  'hetzner.com',
]);

// Domains to always nofollow
const NOFOLLOW_DOMAINS = new Set<string>([
  // Add competitor or untrusted domains here
]);

function getDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function getRelAttribute(url: string): string {
  const domain = getDomain(url);
  if (!domain) return 'noopener noreferrer';

  // Check if domain or parent domain is in our lists
  const domainParts = domain.split('.');
  const checkDomains = [domain];

  // Also check parent domain (e.g., docs.anthropic.com -> anthropic.com)
  if (domainParts.length > 2) {
    checkDomains.push(domainParts.slice(-2).join('.'));
  }

  for (const d of checkDomains) {
    if (NOFOLLOW_DOMAINS.has(d)) {
      return 'noopener noreferrer nofollow';
    }
    if (SPONSORED_DOMAINS.has(d)) {
      return 'noopener sponsored';
    }
    if (TRUSTED_DOMAINS.has(d)) {
      // Trusted domains: only noopener for security, but allow follow
      return 'noopener';
    }
  }

  // Default: noopener noreferrer (doesn't pass referrer but does follow)
  return 'noopener noreferrer';
}

export function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;

      const href = node.properties?.href;
      if (typeof href !== 'string') return;

      if (isExternalUrl(href)) {
        // Set target="_blank" for external links
        node.properties = node.properties || {};
        node.properties.target = '_blank';

        // Set appropriate rel attribute based on domain
        node.properties.rel = getRelAttribute(href);

        // Add SEO-friendly attributes
        // Don't override existing title if present
        if (!node.properties.title && node.children?.[0]) {
          const textContent = node.children
            .filter((child): child is { type: 'text'; value: string } => child.type === 'text')
            .map(child => child.value)
            .join('');
          if (textContent) {
            node.properties.title = `Visit ${textContent}`;
          }
        }
      }
    });
  };
}

export default rehypeExternalLinks;
