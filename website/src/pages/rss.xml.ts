import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles');

  // Sort by date, newest first
  const sortedArticles = articles.sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );

  return rss({
    title: 'Moltbot (Clawdbot) - AI Assistant Articles & Tutorials',
    description: 'The latest tutorials, guides, and best practices for setting up and using Moltbot (Clawdbot), your open-source AI assistant.',
    site: context.site?.href || 'https://clawd-bot.app',
    items: sortedArticles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.pubDate,
      link: `/articles/${article.slug}`,
      categories: [article.data.category, ...article.data.tags],
      author: article.data.author,
      customData: `
        <category>${article.data.category}</category>
        <readingTime>${article.data.readingTime}</readingTime>
      `,
    })),
    customData: `
      <language>en-us</language>
      <copyright>© 2026 Moltbot (Clawdbot). All rights reserved.</copyright>
      <managingEditor>team@clawd-bot.app (Moltbot (Clawdbot) Team)</managingEditor>
      <webMaster>team@clawd-bot.app (Moltbot (Clawdbot) Team)</webMaster>
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      <ttl>60</ttl>
      <image>
        <url>https://clawd-bot.app/logo.jpg</url>
        <title>Moltbot (Clawdbot)</title>
        <link>https://clawd-bot.app</link>
      </image>
    `,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      content: 'http://purl.org/rss/1.0/modules/content/',
    },
  });
}
