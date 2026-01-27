import fs from 'fs/promises';
import path from 'path';

const ARTICLES_DIR = path.join(process.cwd(), 'src', 'content', 'articles');
const REQUIRED_PHRASE = '提供免费的 Clawdbot 安装服务';
const SECTION = [
  '',
  '## 免费安装服务',
  '',
  `我们${REQUIRED_PHRASE}，包含环境检查、基础配置与首次运行指导。欢迎通过 [联系页面](/contact) 与我们预约。`,
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
