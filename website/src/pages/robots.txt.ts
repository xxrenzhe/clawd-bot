import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const robotsTxt = `
# Robots.txt for clawd-bot.app
# OpenClaw (Moltbot/Clawdbot) - Open Source AI Assistant
# https://clawd-bot.app

# Default rules for all crawlers
User-agent: *
Allow: /
Allow: /articles/
Allow: /features
Allow: /getting-started
Disallow: /api/
Disallow: /_astro/
Disallow: /admin/
Disallow: /*.json$
Disallow: /*?*sort=
Disallow: /*?*filter=
Disallow: /*?*page=
Disallow: /search?
Disallow: /preview/

# Crawl delay for polite crawling
Crawl-delay: 1

# Sitemaps
Sitemap: https://clawd-bot.app/sitemap-index.xml

# RSS Feed
# Allow: /rss.xml

# Google
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Googlebot-Image
Allow: /images/

User-agent: Googlebot-Video
Allow: /

User-agent: Googlebot-News
Allow: /articles/

User-agent: Storebot-Google
Allow: /

# Bing
User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: BingPreview
Allow: /

# Yahoo
User-agent: Slurp
Allow: /
Crawl-delay: 1

# DuckDuckGo
User-agent: DuckDuckBot
Allow: /
Crawl-delay: 1

# Yandex
User-agent: Yandex
Allow: /
Crawl-delay: 2

# Baidu
User-agent: Baiduspider
Allow: /
Crawl-delay: 2

# Facebook/Meta
User-agent: facebookexternalhit
Allow: /

User-agent: Facebot
Allow: /

# Twitter
User-agent: Twitterbot
Allow: /

# LinkedIn
User-agent: LinkedInBot
Allow: /

# Pinterest
User-agent: Pinterest
Allow: /

# Slack
User-agent: Slackbot
Allow: /

# Telegram
User-agent: TelegramBot
Allow: /

# WhatsApp
User-agent: WhatsApp
Allow: /

# Discord
User-agent: Discordbot
Allow: /

# SEO Tools (limited access)
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: DotBot
Crawl-delay: 10

User-agent: Screaming Frog SEO Spider
Allow: /
Crawl-delay: 2

# AI/LLM Crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Bytespider
Crawl-delay: 5

User-agent: CCBot
Allow: /

# Block bad bots
User-agent: MJ12bot
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: DataForSeoBot
Disallow: /

User-agent: dotbot
Disallow: /

User-agent: Exabot
Disallow: /

User-agent: ia_archiver
Disallow: /

User-agent: 360Spider
Disallow: /

User-agent: Sogou
Disallow: /

User-agent: YisouSpider
Disallow: /

# Archive bots (allow)
User-agent: archive.org_bot
Allow: /
Crawl-delay: 10

User-agent: Wayback
Allow: /
`.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'X-Robots-Tag': 'all',
    },
  });
};
