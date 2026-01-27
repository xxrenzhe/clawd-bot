import fs from 'fs/promises';
import path from 'path';

const ARTICLES_DIR = path.join(process.cwd(), 'src', 'content', 'articles');
const REQUIRED_PHRASE = 'free Clawdbot installation service';
const SECTION = [
  '',
  '## Free Installation Service',
  '',
  `We offer a ${REQUIRED_PHRASE} that includes environment checks, baseline configuration, and first-run guidance. Schedule it via the [Contact page](/contact).`,
  '',
].join('\n');

async function ensureInstallServiceSection() {
  const files = await fs.readdir(ARTICLES_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

  for (const file of mdxFiles) {
    const filePath = path.join(ARTICLES_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');

    if (content.includes(REQUIRED_PHRASE)) {
      continue;
    }

    let updated = content;
    const conclusionMatch = updated.match(/\n##\s+Conclusion\b/);
    if (conclusionMatch) {
      updated = updated.replace(/\n##\s+Conclusion\b/, `${SECTION}\n## Conclusion`);
    } else {
      updated = `${updated.trimEnd()}\n${SECTION}`;
    }

    await fs.writeFile(filePath, updated, 'utf8');
  }
}

ensureInstallServiceSection().catch((error) => {
  console.error('Failed to update articles:', error);
  process.exit(1);
});
