import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
}

interface ArticleFrontmatter {
  title: string;
  description: string;
  keywords: string[];
  readingTime: number;
}

async function validateArticle(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: path.basename(filePath),
    errors: [],
    warnings: [],
  };

  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      result.errors.push('No frontmatter found');
      return result;
    }

    const frontmatter = frontmatterMatch[1];

    // Parse frontmatter (simple parsing)
    const titleMatch = frontmatter.match(/title:\s*["'](.+?)["']/);
    const descMatch = frontmatter.match(/description:\s*["'](.+?)["']/);
    const keywordsMatch = frontmatter.match(/keywords:\s*\[(.*?)\]/);
    const readingTimeMatch = frontmatter.match(/readingTime:\s*(\d+)/);

    // Validate title
    if (!titleMatch) {
      result.errors.push('Missing title');
    } else {
      const title = titleMatch[1];
      if (title.length < 30) {
        result.warnings.push(`Title too short (${title.length} chars, recommended 50-60)`);
      } else if (title.length > 60) {
        result.errors.push(`Title too long (${title.length} chars, max 60)`);
      }
    }

    // Validate description
    if (!descMatch) {
      result.errors.push('Missing description');
    } else {
      const description = descMatch[1];
      if (description.length < 120) {
        result.warnings.push(`Description too short (${description.length} chars, recommended 120-160)`);
      } else if (description.length > 160) {
        result.errors.push(`Description too long (${description.length} chars, max 160)`);
      }
    }

    // Validate keywords
    if (!keywordsMatch) {
      result.errors.push('Missing keywords');
    } else {
      const keywords = keywordsMatch[1].split(',').map((k) => k.trim().replace(/["']/g, ''));
      if (keywords.length < 3) {
        result.warnings.push(`Too few keywords (${keywords.length}, recommended 5-10)`);
      }
    }

    // Validate reading time
    if (!readingTimeMatch) {
      result.errors.push('Missing readingTime');
    } else {
      const readingTime = parseInt(readingTimeMatch[1]);
      if (readingTime < 3) {
        result.warnings.push(`Reading time very short (${readingTime} min)`);
      } else if (readingTime > 20) {
        result.warnings.push(`Reading time very long (${readingTime} min)`);
      }
    }

    // Check for HostingCTA components
    const ctaCount = (content.match(/<HostingCTA/g) || []).length;
    if (ctaCount === 0) {
      result.errors.push('No HostingCTA components found');
    } else if (ctaCount < 2) {
      result.warnings.push(`Only ${ctaCount} HostingCTA component(s), recommended 2-3`);
    } else if (ctaCount > 4) {
      result.warnings.push(`Too many HostingCTA components (${ctaCount}), recommended 2-3`);
    }

    // Check heading hierarchy
    const h1Count = (content.match(/^# /gm) || []).length;
    if (h1Count > 1) {
      result.errors.push(`Multiple H1 headings found (${h1Count}), should have only 1`);
    }

    const h2Count = (content.match(/^## /gm) || []).length;
    if (h2Count === 0) {
      result.warnings.push('No H2 headings found, consider adding section headings');
    }

    // Check for code blocks
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    if (codeBlockCount === 0 && result.file.includes('tutorial')) {
      result.warnings.push('No code blocks found in tutorial article');
    }

    // Check for internal links
    const internalLinkCount = (content.match(/\[.*?\]\(\/articles\//g) || []).length;
    if (internalLinkCount === 0) {
      result.warnings.push('No internal links to other articles');
    }

    // Check for images
    const imageCount = (content.match(/!\[.*?\]\(/g) || []).length;
    if (imageCount === 0) {
      result.warnings.push('No images found, consider adding visual content');
    }

  } catch (error) {
    result.errors.push(`Failed to read file: ${error}`);
  }

  return result;
}

async function validateAllArticles() {
  const articlesDir = path.join(__dirname, '..', 'src', 'content', 'articles');

  try {
    const files = await fs.readdir(articlesDir);
    const mdxFiles = files.filter((f) => f.endsWith('.mdx'));

    if (mdxFiles.length === 0) {
      console.log('No articles found to validate.');
      return;
    }

    console.log(`Validating ${mdxFiles.length} articles...\n`);

    const results: ValidationResult[] = [];
    for (const file of mdxFiles) {
      const filePath = path.join(articlesDir, file);
      const result = await validateArticle(filePath);
      results.push(result);
    }

    // Print results
    let totalErrors = 0;
    let totalWarnings = 0;
    let perfectCount = 0;

    for (const result of results) {
      if (result.errors.length === 0 && result.warnings.length === 0) {
        perfectCount++;
        continue;
      }

      console.log(`\n📄 ${result.file}`);

      if (result.errors.length > 0) {
        console.log('  ❌ Errors:');
        result.errors.forEach((error) => console.log(`     - ${error}`));
        totalErrors += result.errors.length;
      }

      if (result.warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        result.warnings.forEach((warning) => console.log(`     - ${warning}`));
        totalWarnings += result.warnings.length;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total articles: ${results.length}`);
    console.log(`Perfect articles: ${perfectCount} ✓`);
    console.log(`Articles with issues: ${results.length - perfectCount}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total warnings: ${totalWarnings}`);

    if (totalErrors > 0) {
      console.log('\n❌ Validation failed. Please fix errors before deploying.');
      process.exit(1);
    } else if (totalWarnings > 0) {
      console.log('\n⚠️  Validation passed with warnings. Consider addressing them.');
      process.exit(0);
    } else {
      console.log('\n✅ All articles passed validation!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

validateAllArticles();
