// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';
import { rehypeExternalLinks } from './src/plugins/rehype-external-links.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://clawd-bot.app',
  trailingSlash: 'never',
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  integrations: [
    tailwind(),
    mdx({
      rehypePlugins: [rehypeExternalLinks],
    }),
    sitemap({
      filter: (page) => !page.includes('/api/') && !page.includes('/admin/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      serialize: (item) => {
        // Higher priority for important pages
        if (item.url === 'https://clawd-bot.app/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (item.url.includes('/articles/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/getting-started') || item.url.includes('/features')) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        }
        return item;
      },
    }),
    compress({
      CSS: true,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: true,
    }),
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
