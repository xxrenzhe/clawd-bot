# SEO Quick Reference Guide

## 🚀 Quick SEO Checklist

### Before Publishing Articles

- [ ] Title is 50-60 characters
- [ ] Description is 120-160 characters
- [ ] Keywords are relevant and natural
- [ ] URL slug is SEO-friendly (lowercase, hyphens)
- [ ] H1 tag is unique and descriptive
- [ ] H2-H6 tags follow proper hierarchy
- [ ] Images have alt text
- [ ] Internal links to related articles (2-3 minimum)
- [ ] External links have proper attributes
- [ ] Content is 1500-2000 words
- [ ] Reading time is calculated
- [ ] Category and tags are assigned

### Article URL Best Practices

✅ **Good URLs**:
- `/articles/setup-clawdbot-beginners`
- `/articles/clawdbot-vs-chatgpt`
- `/articles/clawdbot-security-best-practices`

❌ **Bad URLs**:
- `/articles/article-123`
- `/articles/Setup_Clawdbot_For_Beginners`
- `/articles/how-to-setup-clawdbot-for-beginners-step-by-step-guide-2024`

### Meta Tags Priority

1. **Title** - Most important for SEO
2. **Description** - Affects click-through rate
3. **Keywords** - Less important but still useful
4. **Open Graph** - Social media sharing
5. **Twitter Cards** - Twitter sharing
6. **Canonical URL** - Prevent duplicate content

### Internal Linking Strategy

**Link to**:
- Related articles in same category
- Pillar content pages
- Homepage
- Category pages
- Popular articles

**Link from**:
- Article content (contextual links)
- Related articles section
- Breadcrumbs
- Tags
- Author bio

### Content Optimization

**Keyword Placement**:
1. Title (H1)
2. First paragraph
3. Subheadings (H2, H3)
4. Throughout content (natural)
5. Image alt text
6. Meta description
7. URL slug

**Content Structure**:
```
Introduction (100-150 words)
  ↓
<HostingCTA context="setup" />
  ↓
Main Content (1200-1500 words)
  - H2 sections
  - H3 subsections
  - Code examples
  - Lists and tables
  ↓
<HostingCTA context="inline" />
  ↓
Conclusion (100-150 words)
  ↓
<HostingCTA context="conclusion" />
```

### Technical SEO Checklist

- [ ] Sitemap submitted to Google Search Console
- [ ] Robots.txt is accessible
- [ ] All pages have canonical URLs
- [ ] Mobile-responsive design
- [ ] Fast page load (<3 seconds)
- [ ] HTTPS enabled
- [ ] Structured data implemented
- [ ] 404 page exists
- [ ] Breadcrumbs implemented
- [ ] Social sharing buttons

### Performance Optimization

**Target Metrics**:
- Lighthouse Performance: 90+
- Lighthouse SEO: 100
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1

**Optimization Techniques**:
- Inline critical CSS
- Preload key resources
- Lazy load images
- Minify CSS/JS
- Compress images
- Use CDN
- Enable caching

### Schema.org Markup

**Implemented**:
- ✅ Article schema
- ✅ Breadcrumb schema
- ✅ Website schema
- ✅ Organization schema
- ✅ Author schema

**Test with**:
- Google Rich Results Test
- Schema.org Validator

### Social Media Optimization

**Open Graph Tags**:
- og:title
- og:description
- og:image (1200x630px)
- og:url
- og:type
- og:site_name

**Twitter Cards**:
- twitter:card (summary_large_image)
- twitter:title
- twitter:description
- twitter:image
- twitter:site
- twitter:creator

### Monitoring & Analytics

**Track**:
- Organic traffic
- Keyword rankings
- Bounce rate
- Time on page
- Pages per session
- Conversion rate
- Click-through rate (CTR)

**Tools**:
- Google Search Console
- Google Analytics 4
- Plausible Analytics
- Bing Webmaster Tools

### Common SEO Mistakes to Avoid

❌ **Don't**:
- Keyword stuffing
- Duplicate content
- Thin content (<300 words)
- Broken links
- Missing alt text
- Slow page speed
- No mobile optimization
- Missing meta descriptions
- Poor URL structure
- No internal linking

✅ **Do**:
- Write for humans first
- Use keywords naturally
- Create unique content
- Fix broken links
- Add descriptive alt text
- Optimize performance
- Mobile-first design
- Compelling descriptions
- Clean URL structure
- Strategic internal linking

### Quick Wins

**Easy SEO Improvements**:
1. Add missing alt text to images
2. Fix broken internal links
3. Update old meta descriptions
4. Add internal links to new articles
5. Optimize page titles
6. Compress large images
7. Add breadcrumbs
8. Create 404 page
9. Submit sitemap
10. Enable HTTPS

### SEO Testing Commands

```bash
# Test local build
npm run build
npm run preview

# Validate SEO
npm run validate-seo

# Check for broken links
# (Install broken-link-checker)
blc http://localhost:4321 -ro

# Test mobile-friendliness
# Use Google Mobile-Friendly Test

# Check page speed
# Use Google PageSpeed Insights
```

### Resources

**Official Documentation**:
- [Google Search Central](https://developers.google.com/search)
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmasters-guidelines-30fba23a)
- [Schema.org](https://schema.org/)

**Testing Tools**:
- [Google Search Console](https://search.google.com/search-console)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

**Learning Resources**:
- [Moz Beginner's Guide to SEO](https://moz.com/beginners-guide-to-seo)
- [Ahrefs SEO Guide](https://ahrefs.com/seo)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)

---

**Remember**: SEO is a long-term strategy. Focus on creating high-quality, valuable content for users, and the rankings will follow.
