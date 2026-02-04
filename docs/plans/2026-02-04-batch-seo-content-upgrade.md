# Batch SEO Content Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand all 120 MDX articles to meet SEO/content targets (sections, 1500+ words, internal links, safety warnings) and eliminate validate-all warnings.

**Architecture:** Use a temporary Node/TSX script to inject standardized sections and topic-aligned expansions into each article, based on the verified knowledge base. Validate with a temporary check script, then run `npm run validate-all` and delete temporary scripts.

**Tech Stack:** Node.js (22+), TypeScript via `tsx`, MDX files in `website/src/content/articles`, knowledge base in `website/scripts/clawdbot-knowledge-base.ts`.

---

### Task 1: Add temporary SEO check script (test harness)

**Files:**
- Create: `website/scripts/tmp/seo-batch-check.ts`

**Step 1: Write the failing test**

```ts
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.join(__dirname, '..', '..', 'src', 'content', 'articles');

const REQUIRED_SECTIONS = [
  /##\s*(Introduction|Overview|What is)/i,
  /##\s*(Prerequisites|Requirements|Before|What.*Need)/i,
  /##\s*(Step|Install|Setup|Configure|How to)/i,
  /##\s*(Troubleshooting|Common Issues|Problems|Errors)/i,
  /##\s*(Conclusion|Summary|Next Steps)/i,
];

const INTERNAL_LINK = /\]\(\/articles\//g;

function countWords(content: string) {
  return content.split(/\s+/).filter(Boolean).length;
}

async function main() {
  const files = (await fs.readdir(ARTICLES_DIR)).filter(f => f.endsWith('.mdx'));
  const failures: string[] = [];

  for (const file of files) {
    const fullPath = path.join(ARTICLES_DIR, file);
    const raw = await fs.readFile(fullPath, 'utf-8');
    const match = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    if (!match) {
      failures.push(`${file}: missing frontmatter`);
      continue;
    }
    const content = match[1];
    const wordCount = countWords(content);
    const sectionMissing = REQUIRED_SECTIONS.some(rx => !rx.test(content));
    const internalLinks = (content.match(INTERNAL_LINK) || []).length;

    if (wordCount < 1500 || sectionMissing || internalLinks < 2) {
      failures.push(`${file}: words=${wordCount} sectionsMissing=${sectionMissing} internalLinks=${internalLinks}`);
    }
  }

  if (failures.length > 0) {
    console.error(`SEO batch check failed (${failures.length} files):`);
    failures.slice(0, 25).forEach(f => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log('SEO batch check passed.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npx tsx website/scripts/tmp/seo-batch-check.ts`
Expected: **FAIL**, many files below 1500 words / missing sections / insufficient internal links.

**Step 3: Commit**

Skip commit (temporary test file). Do not commit this file.

---

### Task 2: Add temporary batch upgrade script

**Files:**
- Create: `website/scripts/tmp/seo-batch-upgrade.ts`
- Read: `website/scripts/clawdbot-knowledge-base.ts`

**Step 1: Write the failing test**

Run: `npx tsx website/scripts/tmp/seo-batch-check.ts`
Expected: **FAIL** (baseline before upgrade).

**Step 2: Write minimal implementation**

Create a script that:
- Reads each MDX file
- Preserves frontmatter, H1, CTA blocks, hero image
- Injects required sections when missing
- Appends topic-aligned expansion text to reach 1500–2000 words
- Inserts 2–3 internal links in a “Related Resources” section
- Adds safety warnings for `curl | bash` and secret handling
- Updates `readingTime` (words / 180, clamp 5–15)

```ts
// Pseudocode structure
// - parse frontmatter block
// - extract body
// - compute slug, title
// - generate sections + expansion
// - ensure internal links
// - update readingTime in frontmatter
// - write file
```

**Step 3: Run script**

Run: `npx tsx website/scripts/tmp/seo-batch-upgrade.ts`
Expected: files updated; summary printed.

**Step 4: Run test to verify it passes**

Run: `npx tsx website/scripts/tmp/seo-batch-check.ts`
Expected: **PASS**.

**Step 5: Commit**

Skip commit (temporary script). Do not commit this file.

---

### Task 3: Validate repository checks

**Files:**
- Modify: `website/src/content/articles/*.mdx`

**Step 1: Run validation**

Run: `npm run validate-all` (from `website/`)
Expected: **PASS** with zero broken links and no quality failures.

**Step 2: Fix any stragglers**

If any files still fail, adjust content manually in:
- `website/src/content/articles/<slug>.mdx`

**Step 3: Re-run validation**

Run: `npm run validate-all`
Expected: **PASS**.

**Step 4: Commit**

```bash
git add website/src/content/articles

git commit -m "seo: expand articles to meet quality targets"
```

---

### Task 4: Cleanup temporary scripts

**Files:**
- Delete: `website/scripts/tmp/seo-batch-check.ts`
- Delete: `website/scripts/tmp/seo-batch-upgrade.ts`

**Step 1: Remove files**

```bash
rm website/scripts/tmp/seo-batch-check.ts
rm website/scripts/tmp/seo-batch-upgrade.ts
```

**Step 2: Commit cleanup**

```bash
git add -u website/scripts/tmp

git commit -m "chore: remove temporary seo batch scripts"
```

---

### Task 5: Final verification

**Step 1: Run validation**

Run: `npm run validate-all` (from `website/`)
Expected: **PASS**.

**Step 2: Report summary**

Summarize:
- Word count range
- Number of articles updated
- Remaining warnings (should be none)

---

## Notes
- Use @superpowers:test-driven-development for test-first flow.
- Use @superpowers:verification-before-completion before claiming success.
- Do not commit temporary scripts.
