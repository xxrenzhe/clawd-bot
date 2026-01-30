import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationResult {
  file: string;
  slug: string;
  errors: string[];
  warnings: string[];
  info: string[];
  score: number;
}

async function validateArticle(filePath: string): Promise<ValidationResult> {
  const fileName = path.basename(filePath);
  const slug = fileName.replace('.mdx', '');

  const result: ValidationResult = {
    file: fileName,
    slug,
    errors: [],
    warnings: [],
    info: [],
    score: 100,
  };

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const bodyContent = content.replace(/^---[\s\S]*?---/, '').trim();

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      result.errors.push('No frontmatter found');
      result.score = 0;
      return result;
    }

    const frontmatter = frontmatterMatch[1];

    // Parse frontmatter values - use backreference to match same quote type
    const titleMatch = frontmatter.match(/title:\s*(["'])(.+?)\1/) || frontmatter.match(/title:\s*(.+)$/m);
    const descMatch = frontmatter.match(/description:\s*(["'])(.+?)\1/) || frontmatter.match(/description:\s*(.+)$/m);
    const keywordsMatch = frontmatter.match(/keywords:\s*\[(.*?)\]/);
    const readingTimeMatch = frontmatter.match(/readingTime:\s*(\d+)/);
    const categoryMatch = frontmatter.match(/category:\s*(["'])(.+?)\1/) || frontmatter.match(/category:\s*(.+)$/m);
    const imageMatch = frontmatter.match(/image:\s*(["'])(.+?)\1/);
    const imageAltMatch = frontmatter.match(/imageAlt:\s*(["'])(.+?)\1/);

    // === TITLE VALIDATION ===
    if (!titleMatch) {
      result.errors.push('Missing title');
      result.score -= 20;
    } else {
      // Handle both quoted (group 2) and unquoted (group 1) matches
      const title = titleMatch[2] || titleMatch[1];
      if (title.length < 30) {
        result.warnings.push(`Title too short (${title.length} chars, recommended 50-60)`);
        result.score -= 5;
      } else if (title.length > 60) {
        result.errors.push(`Title too long (${title.length} chars, max 60)`);
        result.score -= 10;
      }

      // Check for power words in title
      const powerWords = ['guide', 'tutorial', 'how', 'best', 'complete', 'ultimate', 'step', 'easy', 'quick', 'free'];
      const hasPowerWord = powerWords.some(word => title.toLowerCase().includes(word));
      if (!hasPowerWord) {
        result.info.push('Consider adding a power word to the title (guide, tutorial, how, best, etc.)');
      }

      // Check for brand keyword inclusion
      const brandKeywords = ['openclaw', 'moltbot', 'clawdbot'];
      const hasBrandKeyword = brandKeywords.some((keyword) => title.toLowerCase().includes(keyword));
      if (!hasBrandKeyword) {
        result.warnings.push('Title should include a brand keyword (Openclaw, Moltbot, or Clawdbot) for recognition');
        result.score -= 3;
      }
    }

    // === DESCRIPTION VALIDATION ===
    if (!descMatch) {
      result.errors.push('Missing description');
      result.score -= 20;
    } else {
      // Handle both quoted (group 2) and unquoted (group 1) matches
      const description = descMatch[2] || descMatch[1];
      if (description.length < 120) {
        result.warnings.push(`Description too short (${description.length} chars, recommended 120-160)`);
        result.score -= 5;
      } else if (description.length > 160) {
        result.errors.push(`Description too long (${description.length} chars, max 160)`);
        result.score -= 10;
      }

      // Check for call-to-action in description
      const ctaWords = ['learn', 'discover', 'find out', 'get started', 'explore', 'master'];
      const hasDescCta = ctaWords.some(word => description.toLowerCase().includes(word));
      if (!hasDescCta) {
        result.info.push('Consider adding a call-to-action word in description (learn, discover, etc.)');
      }
    }

    // === KEYWORDS VALIDATION ===
    if (!keywordsMatch) {
      result.errors.push('Missing keywords');
      result.score -= 10;
    } else {
      const keywords = keywordsMatch[1].split(',').map((k) => k.trim().replace(/["']/g, '')).filter(k => k);
      if (keywords.length < 3) {
        result.warnings.push(`Too few keywords (${keywords.length}, recommended 5-10)`);
        result.score -= 5;
      } else if (keywords.length > 15) {
        result.warnings.push(`Too many keywords (${keywords.length}, recommended 5-10)`);
        result.score -= 3;
      }

      // Check if slug contains primary keyword
      if (!keywords.some(kw => slug.includes(kw.toLowerCase().replace(/\s+/g, '-')))) {
        result.info.push('Consider aligning slug with primary keyword');
      }
    }

    // === SLUG VALIDATION ===
    if (slug.length > 60) {
      result.warnings.push(`Slug too long (${slug.length} chars, recommended under 60)`);
      result.score -= 5;
    }

    if (slug.includes('_')) {
      result.errors.push('Slug contains underscores (use hyphens instead)');
      result.score -= 10;
    }

    if (slug !== slug.toLowerCase()) {
      result.errors.push('Slug contains uppercase letters');
      result.score -= 10;
    }

    if (/-{2,}/.test(slug)) {
      result.warnings.push('Slug contains consecutive hyphens');
      result.score -= 3;
    }

    // === IMAGE VALIDATION ===
    if (!imageMatch) {
      result.warnings.push('Missing featured image');
      result.score -= 5;
    }

    if (imageMatch && !imageAltMatch) {
      result.warnings.push('Missing image alt text for accessibility and SEO');
      result.score -= 5;
    }

    // === READING TIME VALIDATION ===
    if (!readingTimeMatch) {
      result.errors.push('Missing readingTime');
      result.score -= 5;
    } else {
      const readingTime = parseInt(readingTimeMatch[1]);
      if (readingTime < 3) {
        result.warnings.push(`Reading time very short (${readingTime} min)`);
      } else if (readingTime > 20) {
        result.warnings.push(`Reading time very long (${readingTime} min), consider splitting into multiple articles`);
      }
    }

    // === CONTENT VALIDATION ===

    // Check for HostingCTA components
    const ctaCount = (content.match(/<HostingCTA/g) || []).length;
    if (ctaCount === 0) {
      result.errors.push('No HostingCTA components found');
      result.score -= 10;
    } else if (ctaCount < 2) {
      result.warnings.push(`Only ${ctaCount} HostingCTA component(s), recommended 2-3`);
      result.score -= 3;
    } else if (ctaCount > 4) {
      result.warnings.push(`Too many HostingCTA components (${ctaCount}), recommended 2-3`);
      result.score -= 3;
    }

    // Check heading hierarchy
    // Remove code blocks before counting headings to avoid false positives from comments
    const contentWithoutCodeBlocks = bodyContent.replace(/```[\s\S]*?```/g, '');
    const h1Count = (contentWithoutCodeBlocks.match(/^# [^#]/gm) || []).length;
    if (h1Count > 1) {
      result.errors.push(`Multiple H1 headings found (${h1Count}), should have only 1`);
      result.score -= 10;
    } else if (h1Count === 0) {
      result.warnings.push('No H1 heading found in content');
      result.score -= 5;
    }

    const h2Count = (contentWithoutCodeBlocks.match(/^## [^#]/gm) || []).length;
    if (h2Count === 0) {
      result.warnings.push('No H2 headings found, consider adding section headings');
      result.score -= 5;
    } else if (h2Count < 3) {
      result.info.push(`Only ${h2Count} H2 headings, consider adding more structure`);
    }

    // Check for H2 before H3
    const firstH2 = bodyContent.indexOf('## ');
    const firstH3 = bodyContent.indexOf('### ');
    if (firstH3 !== -1 && (firstH2 === -1 || firstH3 < firstH2)) {
      result.warnings.push('H3 appears before H2, maintain heading hierarchy');
      result.score -= 5;
    }

    // Check for code blocks in tutorials
    const codeBlockCount = (bodyContent.match(/```/g) || []).length / 2;
    const categoryValue = categoryMatch ? (categoryMatch[2] || categoryMatch[1]) : '';
    const isTutorial = categoryValue.toLowerCase() === 'tutorial';
    if (codeBlockCount === 0 && isTutorial) {
      result.warnings.push('No code blocks found in tutorial article');
      result.score -= 10;
    }

    // Check for internal links
    const internalLinkCount = (bodyContent.match(/\[.*?\]\(\/articles\//g) || []).length;
    if (internalLinkCount === 0) {
      result.warnings.push('No internal links to other articles (helps SEO and user engagement)');
      result.score -= 5;
    }

    // Check for external links with proper attributes
    const externalLinks = bodyContent.match(/\[.*?\]\(https?:\/\/[^)]+\)/g) || [];
    if (externalLinks.length === 0) {
      result.info.push('Consider adding external links to authoritative sources');
    }

    // Check for images
    const imageCount = (bodyContent.match(/!\[.*?\]\(/g) || []).length;
    if (imageCount === 0) {
      result.warnings.push('No images found, visual content improves engagement');
      result.score -= 5;
    }

    // Check for image alt text
    const imagesWithoutAlt = (bodyContent.match(/!\[\]\(/g) || []).length;
    if (imagesWithoutAlt > 0) {
      result.errors.push(`${imagesWithoutAlt} image(s) missing alt text`);
      result.score -= imagesWithoutAlt * 3;
    }

    // Word count check
    const wordCount = bodyContent.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 800) {
      result.warnings.push(`Content too short (${wordCount} words, recommended 1000-2000)`);
      result.score -= 10;
    } else if (wordCount < 1000) {
      result.info.push(`Content slightly short (${wordCount} words)`);
    } else if (wordCount > 3000) {
      result.info.push(`Long content (${wordCount} words), consider splitting into series`);
    }

    // Check for keyword density (rough check)
    if (titleMatch) {
      const title = titleMatch[1].toLowerCase();
      const titleWords = title.split(/\s+/).filter(w => w.length > 4);
      const contentLower = bodyContent.toLowerCase();
      const primaryKeyword = titleWords[0];
      if (primaryKeyword) {
        const keywordOccurrences = (contentLower.match(new RegExp(primaryKeyword, 'g')) || []).length;
        const density = (keywordOccurrences / wordCount) * 100;
        if (density < 0.5) {
          result.info.push(`Low keyword density for "${primaryKeyword}" (${density.toFixed(1)}%)`);
        } else if (density > 3) {
          result.warnings.push(`High keyword density for "${primaryKeyword}" (${density.toFixed(1)}%), may appear spammy`);
          result.score -= 5;
        }
      }
    }

    // Check for lists (improve readability)
    const listCount = (bodyContent.match(/^[\-\*]\s/gm) || []).length + (bodyContent.match(/^\d+\.\s/gm) || []).length;
    if (listCount === 0 && wordCount > 500) {
      result.info.push('Consider adding bullet points or numbered lists for readability');
    }

    // Check for conclusion
    const hasConclusion = /##.*?(conclusion|summary|wrap|final|takeaway)/i.test(bodyContent);
    if (!hasConclusion && wordCount > 800) {
      result.info.push('Consider adding a Conclusion section');
    }

    // === ENSURE MINIMUM SCORE ===
    result.score = Math.max(0, result.score);

  } catch (error) {
    result.errors.push(`Failed to read file: ${error}`);
    result.score = 0;
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

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              SEO VALIDATION REPORT                         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Articles: ${String(mdxFiles.length).padEnd(48)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const results: ValidationResult[] = [];
    for (const file of mdxFiles) {
      const filePath = path.join(articlesDir, file);
      const result = await validateArticle(filePath);
      results.push(result);
    }

    // Sort by score (worst first)
    results.sort((a, b) => a.score - b.score);

    // Print results
    let totalErrors = 0;
    let totalWarnings = 0;
    let perfectCount = 0;
    let goodCount = 0;
    let needsWorkCount = 0;
    let poorCount = 0;

    for (const result of results) {
      // Categorize by score
      if (result.score >= 95) perfectCount++;
      else if (result.score >= 80) goodCount++;
      else if (result.score >= 60) needsWorkCount++;
      else poorCount++;

      // Only show articles with issues
      if (result.errors.length === 0 && result.warnings.length === 0 && result.info.length === 0) {
        continue;
      }

      const scoreEmoji = result.score >= 90 ? '✅' : result.score >= 70 ? '⚠️' : '❌';
      console.log(`\n${scoreEmoji} ${result.file} (Score: ${result.score}/100)`);
      console.log(`   Slug: ${result.slug}`);

      if (result.errors.length > 0) {
        console.log('   ❌ Errors:');
        result.errors.forEach((error) => console.log(`      - ${error}`));
        totalErrors += result.errors.length;
      }

      if (result.warnings.length > 0) {
        console.log('   ⚠️  Warnings:');
        result.warnings.forEach((warning) => console.log(`      - ${warning}`));
        totalWarnings += result.warnings.length;
      }

      if (result.info.length > 0) {
        console.log('   ℹ️  Suggestions:');
        result.info.forEach((info) => console.log(`      - ${info}`));
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    VALIDATION SUMMARY                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total articles:     ${String(results.length).padEnd(38)}║`);
    console.log(`║  ✅ Perfect (95+):   ${String(perfectCount).padEnd(38)}║`);
    console.log(`║  ✓  Good (80-94):    ${String(goodCount).padEnd(38)}║`);
    console.log(`║  ⚠️  Needs work (60-79): ${String(needsWorkCount).padEnd(34)}║`);
    console.log(`║  ❌ Poor (<60):      ${String(poorCount).padEnd(38)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total errors:       ${String(totalErrors).padEnd(38)}║`);
    console.log(`║  Total warnings:     ${String(totalWarnings).padEnd(38)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Average score
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    console.log(`\n📊 Average SEO Score: ${avgScore.toFixed(1)}/100`);

    if (totalErrors > 0) {
      console.log('\n❌ Validation failed. Please fix errors before deploying.');
      process.exit(1);
    } else if (avgScore < 70) {
      console.log('\n⚠️  Average score is low. Consider improving SEO quality.');
      process.exit(0);
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
