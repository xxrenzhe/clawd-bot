# Batch SEO Content Upgrade Design (All 120 Articles)

Date: 2026-02-04

## Goal
Bring all 120 articles up to SEO and content quality targets in one pass:
- Word count ≥ 1500 (aim 1500–2000)
- Required sections present: Introduction, Prerequisites, Steps/How-to, Troubleshooting, Conclusion
- 2–3 internal links per article
- External links point to stable domains to avoid link validation warnings
- Safety warnings for risky commands and secrets

## Scope
- Files: `website/src/content/articles/*.mdx`
- Keep frontmatter intact unless readingTime needs adjustment
- Preserve existing CTAs and H1
- Do not introduce unverified product details or commands

## Source of Truth
Use `website/scripts/clawdbot-knowledge-base.ts` as the only factual source for:
- Install commands
- System requirements
- Core product descriptions
- Verified URLs

## Approach (Hybrid)
1. **Structure scan**: Parse each MDX into frontmatter + body. Detect missing sections.
2. **Module injection**: Insert or append standardized sections when missing, aligned to the article’s topic.
3. **Content expansion**: Add topic-relevant paragraphs, examples, and lists to reach 1500–2000 words.
4. **Internal links**: Add 2–3 related article links based on slug/keyword matching.
5. **Safety & security**: Insert warnings near `curl | bash` and credential mentions.
6. **Reading time**: Update `readingTime` based on final word count.

## Standard Section Templates
- **Introduction** (100–150 words)
- **Prerequisites** (table using Node.js 22+, OS list, RAM, storage)
- **Steps/How-to** (2–4 sections, include verified commands)
- **Troubleshooting** (table with 3–5 common issues)
- **Conclusion** (100–150 words + next steps)

## Internal Linking Strategy
- Use slug keyword mapping (e.g., `security` → `clawdbot-security-best-practices`)
- Ensure links are internal and valid
- Place in a “Related Resources/Next Steps” section near the end

## External Links Strategy
Only reference stable, verified domains:
- `https://docs.openclaw.ai/`
- `https://github.com/clawdbot/clawdbot`
- `https://openclaw.ai/`

## Safety Rules
- Prepend warning for `curl | bash` or similar pipe-to-shell commands
- Add “do not commit secrets” warning where API keys are mentioned

## Output Verification
- Run `npm run validate-all` in `website/`
- Expect zero broken links
- Expect SEO warnings reduced significantly (goal: no “missing section” warnings)
- Randomly audit 10–15 articles for relevance and readability

## Rollback
- The script is one-time and not committed
- Git diff review after generation

## Deliverables
- Updated MDX content for all 120 articles
- Updated readingTime values
- No new tooling committed
