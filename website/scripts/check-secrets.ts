import fs from 'fs/promises';
import path from 'path';

const ROOT_DIR = process.cwd();
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.astro', '.vercel', '.cache']);
const TEXT_EXTENSIONS = new Set([
  '.ts', '.js', '.mjs', '.cjs', '.json', '.md', '.mdx', '.astro', '.yml', '.yaml', '.env', '.txt', '.toml', '.ini', '.css', '.html'
]);
const ENV_EXAMPLE_FILES = new Set(['.env.example', '.env.sample', '.env.template']);

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Google API key', regex: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'OpenAI key', regex: /sk-[A-Za-z0-9]{20,}/g },
  { name: 'GitHub token', regex: /ghp_[A-Za-z0-9]{36,}/g },
  { name: 'GitHub fine-grained token', regex: /github_pat_[A-Za-z0-9_]{20,}/g },
  { name: 'Slack token', regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'Generic bearer', regex: /bearer\s+[A-Za-z0-9._-]{20,}/gi },
];

async function isTextFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext) || path.basename(filePath).startsWith('.env')) {
    return true;
  }
  return false;
}

async function scanFile(filePath: string) {
  const baseName = path.basename(filePath);
  if (baseName.startsWith('.env') && !ENV_EXAMPLE_FILES.has(baseName)) {
    return [] as Array<{ name: string; match: string; file: string }>;
  }

  if (!(await isTextFile(filePath))) {
    return [] as Array<{ name: string; match: string; file: string }>;
  }

  const content = await fs.readFile(filePath, 'utf8');
  const findings: Array<{ name: string; match: string; file: string }> = [];

  for (const pattern of SECRET_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      findings.push({ name: pattern.name, match: match[0], file: filePath });
    }
  }

  return findings;
}

async function walk(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const findings: Array<{ name: string; match: string; file: string }> = [];

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findings.push(...await walk(fullPath));
      continue;
    }

    if (entry.isFile()) {
      findings.push(...await scanFile(fullPath));
    }
  }

  return findings;
}

async function run() {
  const findings = await walk(ROOT_DIR);
  if (findings.length === 0) {
    console.log('No secrets detected.');
    return;
  }

  console.error('Potential secrets found:');
  findings.forEach((finding) => {
    console.error(`- ${finding.name}: ${finding.match} (${path.relative(ROOT_DIR, finding.file)})`);
  });
  process.exit(1);
}

run().catch((error) => {
  console.error('Secret scan failed:', error);
  process.exit(1);
});
