/**
 * SEO URL Utilities for Openclaw
 *
 * Best practices for URL optimization:
 * 1. Keep URLs short (under 60 characters if possible)
 * 2. Use hyphens to separate words
 * 3. Include primary keyword near the beginning
 * 4. Avoid stop words (a, the, is, are, etc.)
 * 5. Use lowercase only
 * 6. Avoid dates in URLs (makes content seem outdated)
 */

// Common stop words to remove from URLs
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'and', 'but', 'if', 'or', 'because', 'until', 'while', 'about', 'against',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am',
  'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
  'their', 'theirs', 'themselves', 'i', 'me', 'my', 'mine', 'myself', 'we',
  'our', 'ours', 'ourselves', 'you',
]);

// Words to keep even though they might look like stop words
const KEEP_WORDS = new Set([
  'setup', 'how', 'vs', 'best', 'top', 'new', 'free', 'guide', 'tutorial',
  '2026', '2025', '2024',
]);

/**
 * Generate an SEO-optimized URL slug from a title
 */
export function generateSeoSlug(title: string, options: {
  maxLength?: number;
  includeKeyword?: string;
  removeStopWords?: boolean;
} = {}): string {
  const {
    maxLength = 60,
    includeKeyword,
    removeStopWords = true,
  } = options;

  // Convert to lowercase and replace special characters
  let slug = title
    .toLowerCase()
    .trim()
    // Replace common abbreviations
    .replace(/&/g, 'and')
    .replace(/'s\b/g, 's')
    .replace(/n't\b/g, 'not')
    // Remove special characters except hyphens and spaces
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words
  let words = slug.split(' ');

  // Optionally remove stop words
  if (removeStopWords) {
    words = words.filter(word =>
      !STOP_WORDS.has(word) || KEEP_WORDS.has(word)
    );
  }

  // If a keyword should be included, ensure it's at the start
  if (includeKeyword) {
    const keywordLower = includeKeyword.toLowerCase();
    const keywordIndex = words.indexOf(keywordLower);
    if (keywordIndex > 0) {
      words.splice(keywordIndex, 1);
      words.unshift(keywordLower);
    } else if (keywordIndex === -1) {
      words.unshift(keywordLower);
    }
  }

  // Join with hyphens
  slug = words.join('-');

  // Truncate to max length at word boundary
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    const lastHyphen = slug.lastIndexOf('-');
    if (lastHyphen > maxLength * 0.5) {
      slug = slug.substring(0, lastHyphen);
    }
  }

  // Remove trailing hyphens
  slug = slug.replace(/-+$/, '');

  return slug;
}

/**
 * Generate canonical URL for an article
 */
export function generateCanonicalUrl(slug: string, baseUrl: string = 'https://clawd-bot.app'): string {
  // Ensure no trailing slash on base URL
  const cleanBase = baseUrl.replace(/\/$/, '');
  // Ensure no leading slash on slug
  const cleanSlug = slug.replace(/^\//, '');

  return `${cleanBase}/articles/${cleanSlug}`;
}

/**
 * Generate breadcrumb items for SEO
 */
export function generateBreadcrumbs(
  articleTitle: string,
  category: string,
  baseUrl: string = 'https://clawd-bot.app'
): Array<{ name: string; url: string }> {
  const cleanBase = baseUrl.replace(/\/$/, '');

  return [
    { name: 'Home', url: cleanBase },
    { name: 'Articles', url: `${cleanBase}/articles` },
    { name: category, url: `${cleanBase}/articles?category=${encodeURIComponent(category)}` },
    { name: articleTitle, url: '' }, // Current page, no URL needed
  ];
}

/**
 * Validate a URL slug for SEO best practices
 */
export function validateSlug(slug: string): {
  valid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check length
  if (slug.length > 60) {
    issues.push(`Slug is ${slug.length} characters (recommended: under 60)`);
    suggestions.push('Shorten the slug by removing unnecessary words');
  }

  // Check for underscores
  if (slug.includes('_')) {
    issues.push('Slug contains underscores (use hyphens instead)');
    suggestions.push(`Replace underscores: ${slug.replace(/_/g, '-')}`);
  }

  // Check for uppercase
  if (slug !== slug.toLowerCase()) {
    issues.push('Slug contains uppercase letters');
    suggestions.push(`Use lowercase: ${slug.toLowerCase()}`);
  }

  // Check for multiple consecutive hyphens
  if (/-{2,}/.test(slug)) {
    issues.push('Slug contains consecutive hyphens');
    suggestions.push(`Remove extra hyphens: ${slug.replace(/-+/g, '-')}`);
  }

  // Check for numbers-only segments
  if (/^[0-9-]+$/.test(slug)) {
    issues.push('Slug is numbers-only (add descriptive words)');
  }

  // Check for special characters
  if (!/^[a-z0-9-]+$/.test(slug)) {
    issues.push('Slug contains special characters');
    suggestions.push('Remove special characters');
  }

  // Check for keyword presence
  const primaryKeywords = ['openclaw', 'moltbot', 'clawdbot', 'setup', 'guide', 'tutorial', 'install'];
  const hasKeyword = primaryKeywords.some(kw => slug.includes(kw));
  if (!hasKeyword) {
    suggestions.push('Consider adding a brand keyword like "Openclaw", "Moltbot", or "Clawdbot" to the slug');
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
  };
}

/**
 * Generate meta title with proper formatting
 */
export function generateMetaTitle(
  title: string,
  siteName: string = 'Openclaw',
  maxLength: number = 60
): string {
  const separator = ' | ';
  const fullTitle = `${title}${separator}${siteName}`;

  if (fullTitle.length <= maxLength) {
    return fullTitle;
  }

  // Truncate title to fit
  const maxTitleLength = maxLength - separator.length - siteName.length;
  if (maxTitleLength > 20) {
    return `${title.substring(0, maxTitleLength - 3)}...${separator}${siteName}`;
  }

  // If site name is too long, just use title
  return title.substring(0, maxLength - 3) + '...';
}

/**
 * Generate meta description with optimal length
 */
export function generateMetaDescription(
  description: string,
  minLength: number = 120,
  maxLength: number = 160
): string {
  // Remove extra whitespace
  let desc = description.replace(/\s+/g, ' ').trim();

  if (desc.length >= minLength && desc.length <= maxLength) {
    return desc;
  }

  if (desc.length < minLength) {
    // Description too short, can't fix automatically
    return desc;
  }

  // Truncate at sentence or word boundary
  if (desc.length > maxLength) {
    desc = desc.substring(0, maxLength);

    // Try to end at a sentence
    const lastPeriod = desc.lastIndexOf('.');
    if (lastPeriod > minLength) {
      return desc.substring(0, lastPeriod + 1);
    }

    // End at word boundary
    const lastSpace = desc.lastIndexOf(' ');
    if (lastSpace > minLength - 10) {
      return desc.substring(0, lastSpace) + '...';
    }

    return desc.substring(0, maxLength - 3) + '...';
  }

  return desc;
}
