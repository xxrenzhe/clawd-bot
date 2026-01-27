import { defineCollection, z } from 'astro:content';

const articlesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // Primary SEO fields
    title: z.string().max(60, 'Title should be 60 characters or less for SEO'),
    description: z.string().min(120).max(160, 'Description should be 120-160 characters for SEO'),

    // Dates
    pubDate: z.date(),
    modifiedDate: z.date().optional(),

    // Author info
    author: z.string().default('Clawdbot Team'),
    authorUrl: z.string().url().optional(),

    // Categorization
    category: z.enum(['Tutorial', 'Guide', 'Comparison', 'Best Practices', 'News', 'Advanced']),
    tags: z.array(z.string()),
    keywords: z.array(z.string()),

    // Images
    image: z.string().default('/images/articles/default-og.jpg'),
    imageAlt: z.string().optional(),

    // Reading experience
    readingTime: z.number().positive(),
    featured: z.boolean().default(false),

    // Advanced SEO
    canonicalUrl: z.string().url().optional(),
    noindex: z.boolean().default(false),

    // Content quality indicators
    sources: z.array(z.string().url()).optional(),
    lastVerified: z.date().optional(),

    // Schema.org enhancements
    articleType: z.enum(['Article', 'TechArticle', 'HowTo', 'FAQPage', 'NewsArticle']).default('TechArticle'),

    // Related content
    relatedArticles: z.array(z.string()).optional(),

    // Audience targeting
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    audience: z.array(z.string()).optional(),
  }),
});

export const collections = {
  articles: articlesCollection,
};
