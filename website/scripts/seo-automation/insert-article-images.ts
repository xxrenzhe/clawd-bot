import './load-env.js';
import fs from 'node:fs/promises';
import path from 'node:path';

type Frontmatter = {
  title?: string;
};

const ARTICLES_DIR = path.join(process.cwd(), 'src', 'content', 'articles');
const FRONTMATTER_BLOCK = /^---\n[\s\S]*?\n---/;
const HERO_IMAGE_PATTERN = /!\[[^\]]*\]\(\/images\/articles\/.+?\)/;

function parseFrontmatter(content: string): Frontmatter | null {
  if (!content.startsWith('---')) return null;
  const parts = content.split('---', 3);
  if (parts.length < 3) return null;
  const lines = parts[1].split('\n');
  const data: Frontmatter = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (!value) continue;
    value = value.replace(/^["']|["']$/g, '');
    if (key === 'title') data.title = value;
  }

  return data;
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

async function main(): Promise<void> {
  const files = await fs.readdir(ARTICLES_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

  let updatedCount = 0;
  console.log(`🖼️  Ensuring hero images in ${mdxFiles.length} articles...`);

  for (const file of mdxFiles) {
    const slug = path.basename(file, '.mdx');
    const filePath = path.join(ARTICLES_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    const title = frontmatter?.title || slug.replace(/-/g, ' ');

    const { updated, changed } = insertHeroImage(content, slug, title);
    if (!changed) continue;

    await fs.writeFile(filePath, updated, 'utf-8');
    updatedCount += 1;
  }

  console.log(`✅ Hero images ensured for ${updatedCount} articles.`);
}

main().catch((err) => {
  console.error('❌ Image insertion failed:', err);
  process.exitCode = 1;
});
