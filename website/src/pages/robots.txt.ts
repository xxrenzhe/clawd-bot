---
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const robotsTxt = `
# Robots.txt for clawd-bot.app
# Allow all crawlers

User-agent: *
Allow: /
Disallow: /api/
Disallow: /_astro/
Disallow: /admin/
Disallow: /*.json$
Disallow: /*?*sort=
Disallow: /*?*filter=

# Crawl delay for polite crawling
Crawl-delay: 1

# Sitemaps
Sitemap: https://clawd-bot.app/sitemap-index.xml

# Specific bot rules
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Googlebot-Image
Allow: /

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 1

# Block bad bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: DotBot
Crawl-delay: 10

User-agent: MJ12bot
Disallow: /

User-agent: BLEXBot
Disallow: /
`.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
