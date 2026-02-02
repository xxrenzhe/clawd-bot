/**
 * Rewrite Template Articles with AI
 * Takes existing template-generated articles and rewrites them using AI
 */

import './load-env.ts';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLAWDBOT_KNOWLEDGE } from '../clawdbot-knowledge-base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AICODECAT_API_URL = process.env.AICODECAT_API_URL;
const AICODECAT_API_KEY = process.env.AICODECAT_API_KEY;
const AICODECAT_MODEL = process.env.AICODECAT_MODEL || 'gemini-3-flash-preview';
const REWRITE_SLUGS = process.env.REWRITE_SLUGS?.split(',').map((slug) => slug.trim()).filter(Boolean) || [];
const REWRITE_DATE = process.env.REWRITE_DATE || process.env.SEO_DATE || process.env.ANALYTICS_DATE;

const ARTICLES_DIR = path.join(__dirname, '..', '..', 'src', 'content', 'articles');
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'knowledge-base');

// Default articles to rewrite (fallback)
const DEFAULT_TEMPLATE_ARTICLES = [
  'comparing-llm-providers-for-moltbot-claude-gpt-4-and-more',
];

interface ArticleFrontmatter {
  title: string;
  description: string;
  category: string;
  tags: string[];
  keywords: string[];
  difficulty: string;
  slug: string;
}

const FRONTMATTER_BLOCK = /^---\n[\s\S]*?\n---/;
const HERO_IMAGE_PATTERN = /!\[[^\]]*\]\(\/images\/articles\/.+?\)/;

function extractFrontmatterValue(content: string, key: string): string | null {
  const pattern = new RegExp(`^${key}:\\s*\"?([^\"\\n]+)\"?\\s*$`, 'm');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function matchesRewriteDate(content: string, targetDate: string): boolean {
  const pubDate = extractFrontmatterValue(content, 'pubDate');
  const modifiedDate = extractFrontmatterValue(content, 'modifiedDate');
  return pubDate === targetDate || modifiedDate === targetDate;
}

async function getRewriteSlugs(): Promise<string[]> {
  if (REWRITE_SLUGS.length > 0) {
    return REWRITE_SLUGS;
  }

  if (REWRITE_DATE) {
    try {
      const generatedPath = path.join(DATA_DIR, 'generated-articles.json');
      const raw = await fs.readFile(generatedPath, 'utf-8');
      const data = JSON.parse(raw);
      const slugs = Array.isArray(data) ? data : (Array.isArray(data?.articles) ? data.articles : []);
      const filtered: string[] = [];

      for (const slug of slugs) {
        if (typeof slug !== 'string') continue;
        const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          if (matchesRewriteDate(content, REWRITE_DATE)) {
            filtered.push(slug);
          }
        } catch {
          // Skip missing or unreadable files
        }
      }

      if (filtered.length > 0) return filtered;
    } catch {
      // Fall through to default list
    }
  }

  return DEFAULT_TEMPLATE_ARTICLES;
}

function normalizeGeneratedContent(raw: string): string {
  let content = raw.trim();

  if (content.startsWith('```mdx')) {
    content = content.replace(/^```mdx\n/, '').replace(/\n```$/, '');
  } else if (content.startsWith('```markdown')) {
    content = content.replace(/^```markdown\n/, '').replace(/\n```$/, '');
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  const frontmatterStart = content.indexOf('---\n');
  if (frontmatterStart > 0) {
    content = content.substring(frontmatterStart).trim();
  }

  return content;
}

function insertHeroImage(content: string, slug: string, title: string): { updated: string; changed: boolean } {
  if (new RegExp(`/images/articles/${slug}\\.(jpg|jpeg|png)`).test(content)) {
    return { updated: content, changed: false };
  }

  if (HERO_IMAGE_PATTERN.test(content)) {
    return { updated: content, changed: false };
  }

  const frontmatterMatch = content.match(FRONTMATTER_BLOCK);
  if (!frontmatterMatch) {
    return { updated: content, changed: false };
  }

  const frontmatterBlock = frontmatterMatch[0];
  const rest = content.slice(frontmatterBlock.length);
  const lines = rest.split('\n');
  let inserted = false;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith('# ')) {
      lines.splice(i + 1, 0, '', `![${title}](/images/articles/${slug}.jpg)`, '');
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    let insertAt = 0;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].trim().startsWith('import ')) {
        insertAt = i + 1;
        continue;
      }
      if (lines[i].trim() === '') {
        insertAt = i + 1;
        continue;
      }
      break;
    }
    lines.splice(insertAt, 0, '', `![${title}](/images/articles/${slug}.jpg)`, '');
    inserted = true;
  }

  if (!inserted) {
    return { updated: content, changed: false };
  }

  return { updated: `${frontmatterBlock}${lines.join('\n')}`, changed: true };
}

async function callAicodecatAPI(prompt: string): Promise<string> {
  const response = await fetch(`${AICODECAT_API_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AICODECAT_API_KEY}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AICODECAT_MODEL,
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content =
    data?.content?.[0]?.text ??
    data?.content?.text ??
    (typeof data?.content === 'string' ? data.content : '') ??
    data?.choices?.[0]?.message?.content ??
    '';
  return content;
}

function extractFrontmatter(content: string): ArticleFrontmatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const title = yaml.match(/title:\s*"([^"]+)"/)?.[1] || '';
  const description = yaml.match(/description:\s*"([^"]+)"/)?.[1] || '';
  const category = yaml.match(/category:\s*"([^"]+)"/)?.[1] || '';
  const difficulty = yaml.match(/difficulty:\s*"([^"]+)"/)?.[1] || 'intermediate';

  // Parse tags and keywords arrays
  const tagsMatch = yaml.match(/tags:\s*\[(.*?)\]/s);
  const tags = tagsMatch ? tagsMatch[1].match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, '')) || [] : [];

  const keywordsMatch = yaml.match(/keywords:\s*\[(.*?)\]/s);
  const keywords = keywordsMatch ? keywordsMatch[1].match(/"([^"]+)"/g)?.map(k => k.replace(/"/g, '')) || [] : [];

  return { title, description, category, tags, keywords, difficulty, slug: '' };
}

function buildRewritePrompt(frontmatter: ArticleFrontmatter): string {
  const kb = CLAWDBOT_KNOWLEDGE;

  return `You are an expert technical writer. Your task is to write a complete, high-quality MDX article about Moltbot.

CRITICAL INSTRUCTIONS:
1. Output ONLY the final MDX article content
2. DO NOT include any meta-commentary, planning notes, or thinking process
3. DO NOT explain what you're going to write - just write it
4. Start your response directly with the frontmatter (---)
5. The article must be ready to publish as-is

## ARTICLE SPECIFICATIONS

**Title:** ${frontmatter.title}
**Category:** ${frontmatter.category}
**Keywords:** ${frontmatter.keywords.join(', ')}
**Difficulty:** ${frontmatter.difficulty}

## VERIFIED PRODUCT INFORMATION

- Name: ${kb.product.name} (also known as Moltbot, Clawdbot, Openclaw)
- Type: ${kb.product.type}
- Description: ${kb.product.description}
- GitHub: ${kb.product.github}
- Documentation: ${kb.product.docs}

### Key Features
- Self-hosted AI gateway - your data stays private
- Multi-platform messaging: Telegram, Discord, Slack, WhatsApp
- Works with Claude, GPT-4, and local LLMs via Ollama
- File-based memory persistence
- Extensible skills and plugins

### Installation (VERIFIED COMMANDS)
- Quick install: \`${kb.installation.quickInstall.command}\`
- Onboarding: \`${kb.installation.onboarding.command}\`
- Health check: \`${kb.installation.health.command}\`
- Gateway: \`${kb.installation.gateway.command}\`

### Security Best Practices
${kb.security.bestPractices.slice(0, 5).map((p) => `- ${p}`).join('\n')}

## REQUIREMENTS

1. **Length:** 1500-2500 words
2. **Tone:** Professional yet approachable
3. **SEO:** Use keywords naturally in headings
4. **Brand:** Mention Openclaw, Moltbot, and Clawdbot
5. **Practical:** Include real code examples
6. **Engaging:** Start with a compelling hook

## REQUIRED FORMAT

Your output must start exactly like this:

---
title: "${frontmatter.title}"
description: "[Write 120-160 char description]"
pubDate: ${new Date().toISOString().split('T')[0]}
modifiedDate: ${new Date().toISOString().split('T')[0]}
category: "${frontmatter.category}"
tags: ${JSON.stringify(frontmatter.tags.slice(0, 5))}
keywords: ${JSON.stringify([...frontmatter.keywords.slice(0, 5), 'openclaw', 'moltbot', 'clawdbot'])}
readingTime: 12
featured: false
author: "Moltbot Team"
image: "/images/articles/${frontmatter.slug}.jpg"
imageAlt: "${frontmatter.title}"
articleType: "${frontmatter.category === 'Tutorial' ? 'HowTo' : 'TechArticle'}"
difficulty: "${frontmatter.difficulty}"
sources:
  - "https://docs.molt.bot/"
  - "https://github.com/clawdbot/clawdbot"
---

import HostingCTA from '../../components/CTA/HostingCTA.astro';

[Then write the full article content...]

## REQUIRED ELEMENTS

1. Include <HostingCTA context="setup" /> after introduction
2. Include <HostingCTA context="inline" /> mid-article
3. Include <HostingCTA context="conclusion" /> at the end
4. Mention free installation service: "We offer a free Moltbot installation service at [Contact](/contact)"

NOW OUTPUT THE COMPLETE MDX ARTICLE (starting with ---):`;
}

async function rewriteArticle(slug: string): Promise<boolean> {
  const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const originalFrontmatterMatch = content.match(/^---\n[\s\S]*?\n---/);
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) {
      console.log(`   ⚠️ Could not parse frontmatter for ${slug}`);
      return false;
    }

    frontmatter.slug = slug;

    console.log(`\n📝 Rewriting: ${frontmatter.title}`);
    console.log(`   Category: ${frontmatter.category}`);

    const prompt = buildRewritePrompt(frontmatter);
    let newContent: string | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const raw = await callAicodecatAPI(prompt);
      let normalized = normalizeGeneratedContent(raw);

      if (!FRONTMATTER_BLOCK.test(normalized) && originalFrontmatterMatch && normalized.length > 0) {
        normalized = `${originalFrontmatterMatch[0]}\n\n${normalized}\n`;
      }

      if (FRONTMATTER_BLOCK.test(normalized)) {
        newContent = normalized;
        break;
      }

      console.log(`   ⚠️ Invalid output format (attempt ${attempt}), retrying...`);
    }

    if (!newContent) {
      console.log(`   ⚠️ Invalid output format, skipping ${slug}`);
      return false;
    }

    // Backup original
    await fs.writeFile(`${filePath}.bak`, content, 'utf-8');

    const { updated, changed } = insertHeroImage(newContent, slug, frontmatter.title);
    if (changed) {
      newContent = updated;
    }

    // Save new content
    await fs.writeFile(filePath, newContent, 'utf-8');
    console.log(`   ✅ Rewritten successfully`);
    console.log(`   💾 Saved: ${slug}.mdx (backup: ${slug}.mdx.bak)`);

    return true;
  } catch (error) {
    console.error(`   ❌ Error:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function main(): Promise<void> {
  const slugs = await getRewriteSlugs();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         TEMPLATE ARTICLE REWRITER (AI Enhancement)         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Date: ${new Date().toISOString().split('T')[0].padEnd(51)}║`);
  console.log(`║  Model: ${AICODECAT_MODEL.padEnd(50)}║`);
  console.log(`║  Articles to Rewrite: ${String(slugs.length).padEnd(36)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!AICODECAT_API_URL || !AICODECAT_API_KEY) {
    console.error('Error: AICODECAT_API_URL and AICODECAT_API_KEY are required');
    process.exit(1);
  }

  if (slugs.length === 0) {
    console.log('No articles matched the rewrite criteria.');
    return;
  }

  let successCount = 0;

  for (const slug of slugs) {
    const success = await rewriteArticle(slug);
    if (success) successCount++;

    // Rate limiting - wait 3 seconds between articles
    if (slugs.indexOf(slug) < slugs.length - 1) {
      console.log(`   ⏳ Waiting 3 seconds before next article...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    REWRITE COMPLETE                        ║');
  console.log('╠══════════════════════���═════════════════════════════════════╣');
  console.log(`║  ✅ Successfully Rewritten: ${String(successCount).padEnd(30)}║`);
  console.log(`║  ❌ Failed: ${String(slugs.length - successCount).padEnd(47)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
