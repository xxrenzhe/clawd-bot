---
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const robotsTxt = `
User-agent: *
Allow: /

# Sitemaps
Sitemap: https://clawd-bot.app/sitemap-index.xml

# Crawl delay
Crawl-delay: 1

# Disallow admin or private paths (if any)
Disallow: /api/
Disallow: /_astro/
`.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
