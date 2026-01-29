import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLAWDBOT_KNOWLEDGE, VERIFIED_COMMANDS } from './clawdbot-knowledge-base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QualityScore {
  overall: number;
  accuracy: number;
  completeness: number;
  clarity: number;
  value: number;
  safety: number;
}

interface QualityIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  line?: number;
}

interface ValidationResult {
  file: string;
  passed: boolean;
  score: QualityScore;
  issues: QualityIssue[];
  recommendations: string[];
}

async function validateArticleQuality(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: path.basename(filePath),
    passed: false,
    score: {
      overall: 0,
      accuracy: 0,
      completeness: 0,
      clarity: 0,
      value: 0,
      safety: 0,
    },
    issues: [],
    recommendations: [],
  };

  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract frontmatter and content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      result.issues.push({
        severity: 'critical',
        category: 'Structure',
        message: 'Invalid article structure - missing frontmatter',
      });
      return result;
    }

    const articleContent = frontmatterMatch[2];

    // 1. ACCURACY CHECKS
    result.score.accuracy = await checkAccuracy(articleContent, result.issues);

    // 2. COMPLETENESS CHECKS
    result.score.completeness = checkCompleteness(articleContent, result.issues);

    // 3. CLARITY CHECKS
    result.score.clarity = checkClarity(articleContent, result.issues);

    // 4. VALUE CHECKS
    result.score.value = checkValue(articleContent, result.issues);

    // 5. SAFETY CHECKS
    result.score.safety = checkSafety(articleContent, result.issues);

    // Calculate overall score
    result.score.overall = Math.round(
      (result.score.accuracy * 0.3 +
        result.score.completeness * 0.2 +
        result.score.clarity * 0.2 +
        result.score.value * 0.2 +
        result.score.safety * 0.1) * 100
    ) / 100;

    // Generate recommendations
    result.recommendations = generateRecommendations(result.score, result.issues);

    // Article passes if overall score >= 7.0 and no critical issues
    const hasCriticalIssues = result.issues.some(issue => issue.severity === 'critical');
    result.passed = result.score.overall >= 7.0 && !hasCriticalIssues;

  } catch (error) {
    result.issues.push({
      severity: 'critical',
      category: 'System',
      message: `Failed to validate article: ${error}`,
    });
  }

  return result;
}

async function checkAccuracy(content: string, issues: QualityIssue[]): Promise<number> {
  let score = 10;

  // Check for warning signs of AI hallucination
  const hallucination_patterns = [
    /as of (my knowledge cutoff|my last update)/i,
    /I don't have access to/i,
    /I cannot verify/i,
    /this may not be accurate/i,
    /please verify/i,
  ];

  hallucination_patterns.forEach(pattern => {
    if (pattern.test(content)) {
      score -= 2;
      issues.push({
        severity: 'warning',
        category: 'Accuracy',
        message: 'Content contains uncertainty phrases suggesting potential inaccuracy',
      });
    }
  });

  // Check for vague or placeholder content
  // Note: "coming soon" is allowed when used in headings/tables to describe upcoming features
  const vague_patterns = [
    /\[TODO\]/i,
    /\[PLACEHOLDER\]/i,
    /\[INSERT.*?\]/i,
    // Only flag "coming soon" if it appears as incomplete content, not as a feature status
    /content coming soon/i,
    /will be added later/i,
  ];

  vague_patterns.forEach(pattern => {
    if (pattern.test(content)) {
      score -= 3;
      issues.push({
        severity: 'critical',
        category: 'Accuracy',
        message: 'Content contains placeholders or incomplete information',
      });
    }
  });

  // Check for specific version numbers (good sign of accuracy)
  const hasVersionNumbers = /v?\d+\.\d+(\.\d+)?/.test(content);
  if (hasVersionNumbers) {
    score += 0.5;
  }

  // Check for external references/sources
  const hasReferences = /\[.*?\]\(https?:\/\/.*?\)/.test(content);
  if (hasReferences) {
    score += 0.5;
  } else {
    issues.push({
      severity: 'warning',
      category: 'Accuracy',
      message: 'No external references or sources cited',
    });
  }

  // Check for verified Clawdbot commands using knowledge base
  // Only check inside code blocks to avoid false positives from prose
  const validCommands = VERIFIED_COMMANDS.clawdbot;
  const codeBlocks = content.match(/```(?:bash|sh|shell|console)?\n([\s\S]*?)```/g) || [];
  const invalidCommands: string[] = [];

  const clawdbotCommandPattern = /clawdbot[ \t]+(\w+)/g;
  codeBlocks.forEach(block => {
    let cmdMatch;
    while ((cmdMatch = clawdbotCommandPattern.exec(block)) !== null) {
      const subCommand = cmdMatch[1];
      if (subCommand && !validCommands.includes(subCommand) && !invalidCommands.includes(`clawdbot ${subCommand}`)) {
        invalidCommands.push(`clawdbot ${subCommand}`);
      }
    }
  });

  if (invalidCommands.length > 0) {
    score -= 2;
    issues.push({
      severity: 'warning',
      category: 'Accuracy',
      message: `Potentially unverified commands found: ${invalidCommands.slice(0, 3).join(', ')}`,
    });
  }

  // Check if installation command matches knowledge base
  const hasCorrectInstallCmd = content.includes(CLAWDBOT_KNOWLEDGE.installation.quickInstall.command) ||
    content.includes(CLAWDBOT_KNOWLEDGE.installation.quickInstall.alternative);
  if (content.toLowerCase().includes('install') && !hasCorrectInstallCmd) {
    // Only warn if it's an installation-focused article
    if (/install|setup|getting started/i.test(content.substring(0, 500))) {
      issues.push({
        severity: 'info',
        category: 'Accuracy',
        message: 'Installation article may not include verified install commands',
      });
    }
  }

  return Math.max(0, Math.min(10, score));
}

function checkCompleteness(content: string, issues: QualityIssue[]): number {
  let score = 10;

  // Check for essential sections
  const sections = {
    introduction: /##\s*(Introduction|Overview|What is)/i,
    prerequisites: /##\s*(Prerequisites|Requirements|Before|What.*Need)/i,
    steps: /##\s*(Step|Install|Setup|Configure|How to)/i,
    troubleshooting: /##\s*(Troubleshooting|Common Issues|Problems|Errors)/i,
    conclusion: /##\s*(Conclusion|Summary|Next Steps)/i,
  };

  const missingSections: string[] = [];
  Object.entries(sections).forEach(([name, pattern]) => {
    if (!pattern.test(content)) {
      missingSections.push(name);
      score -= 1.5;
    }
  });

  if (missingSections.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Completeness',
      message: `Missing recommended sections: ${missingSections.join(', ')}`,
    });
  }

  // Note: Removed requirement for "free installation service" mention
  // as it's not applicable to all article types (news, comparisons, etc.)

  // Check for code examples in technical content
  const hasCodeBlocks = /```[\s\S]*?```/.test(content);
  if (!hasCodeBlocks && /install|setup|configure|command/i.test(content)) {
    score -= 2;
    issues.push({
      severity: 'warning',
      category: 'Completeness',
      message: 'Technical content lacks code examples',
    });
  }

  // Check content length
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 800) {
    score -= 3;
    issues.push({
      severity: 'warning',
      category: 'Completeness',
      message: `Content too short (${wordCount} words, recommended 1500+)`,
    });
  } else if (wordCount < 1200) {
    score -= 1;
    issues.push({
      severity: 'info',
      category: 'Completeness',
      message: `Content could be more detailed (${wordCount} words, recommended 1500+)`,
    });
  }

  return Math.max(0, Math.min(10, score));
}

function checkClarity(content: string, issues: QualityIssue[]): number {
  let score = 10;

  // Remove code blocks before checking headings to avoid false positives from comments
  const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

  // Check for proper heading hierarchy
  const headings = contentWithoutCodeBlocks.match(/^#{1,6}\s+.+$/gm) || [];
  const h1Count = headings.filter(h => h.startsWith('# ')).length;

  if (h1Count > 1) {
    score -= 2;
    issues.push({
      severity: 'warning',
      category: 'Clarity',
      message: 'Multiple H1 headings found (should have only one)',
    });
  }

  // Check for lists (good for clarity)
  const hasLists = /^[\s]*[-*+]\s+/m.test(content) || /^\d+\.\s+/m.test(content);
  if (!hasLists) {
    score -= 1;
    issues.push({
      severity: 'info',
      category: 'Clarity',
      message: 'Consider adding lists for better readability',
    });
  }

  // Check for overly complex sentences
  const sentences = content.split(/[.!?]+/);
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 30);
  if (longSentences.length > 5) {
    score -= 1.5;
    issues.push({
      severity: 'info',
      category: 'Clarity',
      message: 'Some sentences are too long (>30 words), consider breaking them up',
    });
  }

  // Check for technical jargon without explanation
  const jargonTerms = ['API', 'CLI', 'SDK', 'REST', 'JSON', 'YAML', 'Docker', 'Kubernetes'];
  const unexplainedJargon = jargonTerms.filter(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(content)) {
      // Check if term is explained (appears with "is", "means", "refers to", etc.)
      const explanationRegex = new RegExp(`${term}\\s+(is|means|refers to|stands for)`, 'i');
      return !explanationRegex.test(content);
    }
    return false;
  });

  if (unexplainedJargon.length > 3) {
    score -= 1;
    issues.push({
      severity: 'info',
      category: 'Clarity',
      message: `Consider explaining technical terms: ${unexplainedJargon.slice(0, 3).join(', ')}`,
    });
  }

  return Math.max(0, Math.min(10, score));
}

function checkValue(content: string, issues: QualityIssue[]): number {
  let score = 10;

  // Check for actionable content
  const hasActionableSteps = /^(Step \d+|First|Then|Next|Finally)/m.test(content);
  if (!hasActionableSteps) {
    score -= 2;
    issues.push({
      severity: 'warning',
      category: 'Value',
      message: 'Content lacks clear actionable steps',
    });
  }

  // Check for examples
  const hasExamples = /for example|e\.g\.|such as|like this/i.test(content);
  if (!hasExamples) {
    score -= 1;
    issues.push({
      severity: 'info',
      category: 'Value',
      message: 'Consider adding more examples',
    });
  }

  // Check for tips or best practices
  const hasTips = /tip:|note:|important:|warning:|best practice/i.test(content);
  if (hasTips) {
    score += 0.5;
  }

  // Check for screenshots or images (mentioned)
  const hasVisuals = /!\[.*?\]\(.*?\)|screenshot|image|diagram/i.test(content);
  if (!hasVisuals) {
    score -= 0.5;
    issues.push({
      severity: 'info',
      category: 'Value',
      message: 'Consider adding screenshots or diagrams',
    });
  }

  return Math.max(0, Math.min(10, score));
}

function checkSafety(content: string, issues: QualityIssue[]): number {
  let score = 10;

  // Check for dangerous commands without warnings
  // Only flag truly dangerous root-level commands, not legitimate uses like rm -rf /tmp/...
  const dangerousCommands = [
    { pattern: /rm\s+-rf\s+\/\s*($|&&|\||\n|")/, label: 'rm -rf /' },  // Only match bare "rm -rf /"
    { pattern: /sudo\s+rm\s+-rf\s+\/\s*($|&&|\||\n|")/, label: 'sudo rm -rf /' },
    { pattern: /dd\s+if=.*of=\/dev\/sd[a-z]\s/, label: 'dd to disk' },
    { pattern: /mkfs\s+\/dev\/sd[a-z]/, label: 'mkfs on disk' },
    { pattern: /chmod\s+777\s+\/\s*($|&&|\||\n)/, label: 'chmod 777 /' },
    { pattern: />\s*\/dev\/sda/, label: '> /dev/sda' },
  ];

  dangerousCommands.forEach(({ pattern, label }) => {
    if (pattern.test(content)) {
      // Check if there's a warning nearby
      const hasWarning = /⚠️|warning|caution|careful|dangerous/i.test(content);
      if (!hasWarning) {
        score -= 3;
        issues.push({
          severity: 'critical',
          category: 'Safety',
          message: `Dangerous command "${label}" without proper warning`,
        });
      }
    }
  });

  // Check for security best practices mentions
  const hasSecurityMentions = /security|secure|password|token|key|credential/i.test(content);
  if (hasSecurityMentions) {
    const hasSecurityWarnings = /never|don't|avoid.*commit|keep.*secret/i.test(content);
    if (!hasSecurityWarnings) {
      score -= 1;
      issues.push({
        severity: 'warning',
        category: 'Safety',
        message: 'Security-related content lacks proper warnings',
      });
    }
  }

  return Math.max(0, Math.min(10, score));
}

function generateRecommendations(score: QualityScore, issues: QualityIssue[]): string[] {
  const recommendations: string[] = [];

  if (score.accuracy < 7) {
    recommendations.push('Add references to official documentation');
    recommendations.push('Verify all technical details against authoritative sources');
    recommendations.push('Include version numbers for software mentioned');
  }

  if (score.completeness < 7) {
    recommendations.push('Add missing sections (prerequisites, troubleshooting, conclusion)');
    recommendations.push('Expand content to at least 1500 words');
    recommendations.push('Include more code examples');
  }

  if (score.clarity < 7) {
    recommendations.push('Break up long sentences');
    recommendations.push('Add more lists and bullet points');
    recommendations.push('Explain technical jargon');
  }

  if (score.value < 7) {
    recommendations.push('Add more actionable steps');
    recommendations.push('Include practical examples');
    recommendations.push('Add screenshots or diagrams');
  }

  if (score.safety < 7) {
    recommendations.push('Add warnings for dangerous commands');
    recommendations.push('Include security best practices');
    recommendations.push('Warn about potential risks');
  }

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    recommendations.unshift('⚠️ CRITICAL: Fix all critical issues before publication');
  }

  return recommendations;
}

async function validateAllArticles() {
  const articlesDir = path.join(__dirname, '..', 'src', 'content', 'articles');

  try {
    const files = await fs.readdir(articlesDir);
    const mdxFiles = files.filter(f => f.endsWith('.mdx'));

    if (mdxFiles.length === 0) {
      console.log('No articles found to validate.');
      return;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('CONTENT QUALITY VALIDATION REPORT');
    console.log(`${'='.repeat(80)}\n`);

    const results: ValidationResult[] = [];
    for (const file of mdxFiles) {
      const filePath = path.join(articlesDir, file);
      const result = await validateArticleQuality(filePath);
      results.push(result);
    }

    // Summary statistics
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const avgScore = results.reduce((sum, r) => sum + r.score.overall, 0) / results.length;

    console.log(`Total Articles: ${results.length}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ✗`);
    console.log(`Average Score: ${avgScore.toFixed(2)}/10\n`);

    // Detailed results
    results.forEach(result => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
      console.log(`\n${statusColor}${status}\x1b[0m ${result.file}`);
      console.log(`Overall Score: ${result.score.overall.toFixed(1)}/10`);
      console.log(`  Accuracy:     ${result.score.accuracy.toFixed(1)}/10`);
      console.log(`  Completeness: ${result.score.completeness.toFixed(1)}/10`);
      console.log(`  Clarity:      ${result.score.clarity.toFixed(1)}/10`);
      console.log(`  Value:        ${result.score.value.toFixed(1)}/10`);
      console.log(`  Safety:       ${result.score.safety.toFixed(1)}/10`);

      if (result.issues.length > 0) {
        console.log(`\n  Issues:`);
        result.issues.forEach(issue => {
          const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`    ${icon} [${issue.category}] ${issue.message}`);
        });
      }

      if (result.recommendations.length > 0) {
        console.log(`\n  Recommendations:`);
        result.recommendations.forEach(rec => {
          console.log(`    • ${rec}`);
        });
      }
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log('VALIDATION COMPLETE');
    console.log(`${'='.repeat(80)}\n`);

    // Exit with error if any articles failed
    if (failed > 0) {
      console.error(`\n❌ ${failed} article(s) failed quality validation`);
      process.exit(1);
    } else {
      console.log(`\n✅ All articles passed quality validation`);
      process.exit(0);
    }

  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

validateAllArticles();
