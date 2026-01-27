# Content Quality Guidelines

## 🎯 Content Quality Standards

### Minimum Requirements

All articles MUST meet these standards before publication:

- ✅ **Overall Quality Score**: ≥ 7.0/10
- ✅ **No Critical Issues**: Zero critical validation errors
- ✅ **Word Count**: Minimum 1500 words
- ✅ **Technical Accuracy**: All commands verified against knowledge base
- ✅ **Human Review**: At least one human reviewer approval

## 🔐 Knowledge-Based Content Generation

**NEW**: Articles are now generated using a verified knowledge base (`clawdbot-knowledge-base.ts`) that contains:

### Verified Information Sources
- Official Clawdbot documentation (https://docs.clawd.bot/)
- GitHub repository (https://github.com/clawdbot/clawdbot)
- Authoritative third-party guides from dev.to, Medium, MacStories
- Security analysis from SOCRadar

### What's in the Knowledge Base
1. **Product Information**: Official name, description, links
2. **System Requirements**: Node.js 22+, OS support, hardware options
3. **Installation Commands**: Verified commands only
4. **Architecture**: Gateway, Agent, Skills, Memory components
5. **Channel Setup**: Telegram, Discord, WhatsApp, Slack configuration
6. **Security Considerations**: Risks and best practices
7. **Deployment Options**: Local, Mac Mini, VPS, Raspberry Pi, Docker

### How Generation Works
1. AI receives ONLY verified information from knowledge base
2. Prompt explicitly prohibits inventing features or commands
3. Generated content is validated against known commands
4. Security warnings are required for sensitive topics

## 📋 Quality Dimensions

### 1. Accuracy (Weight: 30%)

**Definition**: Information is factually correct, technically sound, and verifiable.

**Requirements**:
- ✅ All technical details verified against knowledge base
- ✅ Commands match exactly with `clawdbot-knowledge-base.ts`
- ✅ Version numbers specified where applicable (Node.js 22+)
- ✅ External references cited (official docs, GitHub)
- ✅ No AI hallucinations or invented features

**Verified Commands (from knowledge base)**:
```bash
# Installation
curl -fsSL https://clawd.bot/install.sh | bash
npm install -g ClawdBot@latest

# Setup
clawdbot onboard
clawdbot onboard --install-daemon

# Running
clawdbot gateway --port 18789 --verbose

# Verification
clawdbot health
clawdbot doctor
clawdbot status
clawdbot --version
```

**Red Flags**:
- ❌ Placeholder text ([TODO], [INSERT], etc.)
- ❌ Uncertainty phrases ("may not be accurate", "please verify")
- ❌ Invented commands or features
- ❌ No sources or references
- ❌ Contradicts official documentation

**How to Ensure Accuracy**:
1. Reference official documentation
2. Test all commands in actual environment
3. Verify code examples compile/run
4. Cross-check with multiple sources
5. Include version numbers
6. Cite sources with links

### 2. Completeness (Weight: 20%)

**Definition**: Article covers all necessary information for user to succeed.

**Required Sections**:
- ✅ Introduction (what, why, who)
- ✅ Prerequisites (requirements, dependencies)
- ✅ Main Content (steps, instructions, examples)
- ✅ Troubleshooting (common issues, solutions)
- ✅ Conclusion (summary, next steps)

**Required Elements**:
- ✅ Code examples for technical content
- ✅ Expected outputs
- ✅ Error messages and solutions
- ✅ Alternative approaches
- ✅ Related resources

**Red Flags**:
- ❌ Missing prerequisites
- ❌ Incomplete steps
- ❌ No troubleshooting section
- ❌ No code examples in technical guides
- ❌ Abrupt ending without conclusion

### 3. Clarity (Weight: 20%)

**Definition**: Content is easy to understand and follow.

**Requirements**:
- ✅ Clear, concise language
- ✅ Proper heading hierarchy (H1 → H2 → H3)
- ✅ Short paragraphs (3-5 sentences)
- ✅ Bullet points and lists
- ✅ Technical terms explained
- ✅ Logical flow

**Writing Style**:
- Use active voice
- Write in second person ("you")
- Keep sentences under 25 words
- One idea per paragraph
- Use transitions between sections

**Red Flags**:
- ❌ Multiple H1 headings
- ❌ Sentences over 30 words
- ❌ Unexplained jargon
- ❌ Wall of text (no lists)
- ❌ Illogical structure

### 4. Value (Weight: 20%)

**Definition**: Article provides actionable, useful information.

**Requirements**:
- ✅ Solves real user problems
- ✅ Actionable steps
- ✅ Practical examples
- ✅ Tips and best practices
- ✅ Visual aids (screenshots, diagrams)
- ✅ Unique insights

**Value Indicators**:
- Clear step-by-step instructions
- Real-world examples
- Pro tips and warnings
- Time-saving shortcuts
- Common pitfalls to avoid

**Red Flags**:
- ❌ Generic, obvious information
- ❌ No actionable steps
- ❌ Duplicate of existing content
- ❌ No examples
- ❌ Purely theoretical

### 5. Safety (Weight: 10%)

**Definition**: Content doesn't put users at risk.

**Requirements**:
- ✅ Warnings for dangerous commands
- ✅ Security best practices
- ✅ No hardcoded credentials
- ✅ Proper error handling
- ✅ Risk mitigation strategies

**Dangerous Commands Requiring Warnings**:
```bash
rm -rf          # File deletion
sudo rm         # Root deletion
dd if=          # Disk operations
mkfs            # Format disk
chmod 777       # Insecure permissions
curl | sh       # Pipe to shell
wget | sh       # Pipe to shell
```

**Security Topics Requiring Warnings**:
- API keys and tokens
- Passwords and credentials
- Database connections
- File permissions
- Network exposure

**Red Flags**:
- ❌ Dangerous commands without warnings
- ❌ Hardcoded secrets
- ❌ Insecure practices recommended
- ❌ No mention of security implications
- ❌ Missing error handling

## 🔍 Validation Process

### Automated Validation

Run before human review:

```bash
# SEO validation
npm run validate-seo

# Content quality validation
npm run validate-content-quality
```

**Automated Checks**:
- Title/description length
- Keyword presence
- Content structure
- Code block presence
- Heading hierarchy
- Dangerous command detection
- Placeholder detection

### Human Review Checklist

#### Technical Accuracy
- [ ] All commands tested and working
- [ ] Code examples compile/run successfully
- [ ] Version numbers are current
- [ ] Screenshots are accurate
- [ ] Links are not broken
- [ ] References are authoritative

#### Content Quality
- [ ] Introduction clearly states purpose
- [ ] Prerequisites are complete
- [ ] Steps are in logical order
- [ ] Examples are relevant
- [ ] Troubleshooting covers common issues
- [ ] Conclusion provides next steps

#### Writing Quality
- [ ] Grammar and spelling correct
- [ ] Tone is professional but friendly
- [ ] Technical terms explained
- [ ] Sentences are clear and concise
- [ ] Formatting is consistent
- [ ] No placeholder text

#### SEO Optimization
- [ ] Title is compelling (50-60 chars)
- [ ] Description is enticing (120-160 chars)
- [ ] Keywords used naturally
- [ ] Internal links included (2-3 minimum)
- [ ] Images have alt text
- [ ] URL slug is SEO-friendly

#### Safety & Ethics
- [ ] No dangerous commands without warnings
- [ ] Security best practices mentioned
- [ ] No hardcoded credentials
- [ ] Ethical considerations addressed
- [ ] Legal compliance (copyright, licenses)

## 📝 Content Creation Workflow

### Phase 1: Research & Planning
1. Identify target keywords
2. Research official documentation
3. Outline article structure
4. Gather code examples
5. Test all technical steps

### Phase 2: Writing
1. Write first draft
2. Include all required sections
3. Add code examples
4. Insert CTAs (3 per article)
5. Add internal links

### Phase 3: Validation
1. Run automated SEO validation
2. Run automated quality validation
3. Fix all critical issues
4. Address warnings

### Phase 4: Human Review
1. Technical reviewer checks accuracy
2. Editor checks writing quality
3. SEO specialist checks optimization
4. Revise based on feedback

### Phase 5: Publication
1. Final validation pass
2. Generate Open Graph images
3. Publish to staging
4. Final review on staging
5. Publish to production

## 🚫 Content Red Flags

### Immediate Rejection Criteria

Articles with these issues should NOT be published:

1. **Fabricated Information**
   - Invented features or commands
   - Non-existent software versions
   - Fake statistics or benchmarks

2. **Dangerous Content**
   - Destructive commands without warnings
   - Security vulnerabilities
   - Malicious code

3. **Plagiarism**
   - Copied from other sources
   - No attribution
   - Copyright violation

4. **Incomplete Content**
   - Missing critical steps
   - Placeholder text
   - Broken code examples

5. **Misleading Information**
   - False comparisons
   - Exaggerated claims
   - Biased recommendations

## 📊 Quality Scoring System

### Score Interpretation

- **9.0-10.0**: Exceptional - Publish immediately
- **8.0-8.9**: Excellent - Minor polish needed
- **7.0-7.9**: Good - Meets minimum standards
- **6.0-6.9**: Fair - Significant improvements needed
- **Below 6.0**: Poor - Major rewrite required

### Score Calculation

```
Overall Score = (Accuracy × 0.3) +
                (Completeness × 0.2) +
                (Clarity × 0.2) +
                (Value × 0.2) +
                (Safety × 0.1)
```

## 🎓 Best Practices

### Writing Tips

1. **Start Strong**: Hook readers in first paragraph
2. **Show, Don't Tell**: Use examples liberally
3. **Be Specific**: Avoid vague language
4. **Stay Focused**: One topic per article
5. **End Strong**: Clear call-to-action

### Technical Writing

1. **Test Everything**: Run all commands before publishing
2. **Version Specificity**: Always include version numbers
3. **Error Handling**: Show what to do when things fail
4. **Screenshots**: Visual proof of working examples
5. **Alternatives**: Mention different approaches

### SEO Writing

1. **Keyword Research**: Target specific search terms
2. **Natural Integration**: Don't force keywords
3. **Internal Linking**: Connect related articles
4. **Meta Optimization**: Compelling titles and descriptions
5. **User Intent**: Answer the search query

## 🔄 Continuous Improvement

### Post-Publication

1. **Monitor Analytics**: Track engagement metrics
2. **User Feedback**: Respond to comments
3. **Update Regularly**: Keep content current
4. **Fix Errors**: Correct reported issues
5. **A/B Testing**: Test different approaches

### Quality Metrics to Track

- Bounce rate (target: <60%)
- Time on page (target: >3 minutes)
- Scroll depth (target: >75%)
- Social shares
- Backlinks
- Organic traffic
- Conversion rate

## 📚 Resources

### Official Documentation
- Product official docs (primary source)
- GitHub repositories
- API documentation
- Release notes

### Writing Resources
- [Google Technical Writing Guide](https://developers.google.com/tech-writing)
- [Microsoft Writing Style Guide](https://docs.microsoft.com/en-us/style-guide/)
- [Hemingway Editor](http://hemingwayapp.com/) - Readability checker

### SEO Resources
- [Google Search Central](https://developers.google.com/search)
- [Moz SEO Guide](https://moz.com/beginners-guide-to-seo)
- [Ahrefs Content Guide](https://ahrefs.com/blog/content-marketing/)

---

**Remember**: Quality over quantity. One excellent article is worth more than ten mediocre ones.

**Minimum Standard**: If you wouldn't want to follow the guide yourself, don't publish it.
