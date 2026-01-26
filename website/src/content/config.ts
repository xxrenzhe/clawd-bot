import { defineCollection, z } from 'astro:content';

const articlesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().max(60, 'Title should be 60 characters or less for SEO'),
    description: z.string().min(120).max(160, 'Description should be 120-160 characters for SEO'),
    pubDate: z.date(),
    author: z.string().default('Clawdbot Team'),
    category: z.enum(['Tutorial', 'Guide', 'Comparison', 'Best Practices', 'News', 'Advanced']),
    tags: z.array(z.string()),
    image: z.string().default('/images/articles/default-og.jpg'),
    keywords: z.array(z.string()),
    readingTime: z.number().positive(),
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  articles: articlesCollection,
};
