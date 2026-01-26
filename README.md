# Clawdbot Promotional Website

A high-performance, SEO-optimized content website built with Astro 4.x to promote Clawdbot and earn Hosting.com referral commissions.

## 🚀 Project Overview

- **Production Domain**: clawd-bot.app
- **Tech Stack**: Astro 4.x + Tailwind CSS + MDX
- **Deployment**: Docker + Nginx + Supervisord (single container, port 80)
- **Content**: 100 AI-generated SEO-optimized articles
- **Monetization**: Hosting.com VPS referral links

## 📁 Project Structure

```
clawd-bot/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── docker/
│   ├── Dockerfile              # Multi-stage Docker build
│   ├── nginx.conf              # Nginx configuration
│   └── supervisord.conf        # Process management
└── website/
    ├── public/                 # Static assets
    ├── scripts/
    │   ├── generate-articles.ts # Article generation script
    │   └── validate-seo.ts     # SEO validation script
    └── src/
        ├── components/
        │   ├── Analytics/      # Plausible Analytics
        │   ├── CTA/            # Hosting.com CTAs
        │   ├── Layout/         # Header, Footer
        │   └── SEO/            # SEO components
        ├── content/
        │   ├── articles/       # MDX articles (100)
        │   └── config.ts       # Content collections
        ├── layouts/
        │   ├── ArticleLayout.astro
        │   └── BaseLayout.astro
        └── pages/
            ├── articles/
            │   ├── [slug].astro
            │   └── index.astro
            ├── index.astro
            └── robots.txt.ts
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+
- Docker (for deployment)
- Anthropic API key (for article generation)

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/clawd-bot.git
cd clawd-bot/website
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
HOSTING_REFERRAL_URL=https://hosting.com/ref/your-code
HOSTING_REFERRAL_TRACKING_ID=clawdbot-promo
PUBLIC_PLAUSIBLE_DOMAIN=clawd-bot.app
```

4. **Start development server**

```bash
npm run dev
```

Visit `http://localhost:4321`

## 📝 Content Generation

### Generate Articles

The project includes a script to generate 100 SEO-optimized articles using Claude AI:

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=your-api-key

# Generate all articles
npm run generate-articles
```

This will create 100 MDX articles in `src/content/articles/` covering:
- Setup & Installation (25 articles)
- Use Cases (20 articles)
- Best Practices (15 articles)
- Comparisons (15 articles)
- Advanced Topics (15 articles)
- News & Updates (10 articles)

### Validate SEO

Before deploying, validate all articles for SEO compliance:

```bash
npm run validate-seo
```

This checks:
- Title length (50-60 characters)
- Description length (120-160 characters)
- Keyword presence
- Heading hierarchy
- CTA placement
- Internal linking

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -f docker/Dockerfile -t clawd-bot:latest \
  --build-arg HOSTING_REFERRAL_URL=https://hosting.com/ref/your-code \
  .
```

### Run Container

```bash
docker run -d -p 80:80 \
  -e HOSTING_REFERRAL_URL=https://hosting.com/ref/your-code \
  --name clawd-bot-web \
  clawd-bot:latest
```

### Health Check

```bash
curl http://localhost:80/
```

## 🚢 CI/CD Pipeline

The project uses GitHub Actions for automated deployment:

1. **Trigger**: Push to `main` branch or version tags (`v*`)
2. **Build**: Multi-stage Docker build with caching
3. **Push**: Image pushed to GitHub Container Registry
4. **Tags**:
   - `prod-latest` (main branch)
   - `prod-{version}` (version tags)
   - `prod-{commitid}` (all commits)

### Setup GitHub Secrets

Add the following secrets to your GitHub repository:

- `HOSTING_REFERRAL_URL`: Your Hosting.com referral URL

## 📊 Analytics & Tracking

### Plausible Analytics

The site uses Plausible Analytics for privacy-friendly tracking:

- **Page views**: Automatic
- **CTA clicks**: Custom event tracking
- **Reading depth**: 25%, 50%, 75%, 100% milestones

### Conversion Tracking

Track Hosting.com referral performance:
- Click-through rate by article
- CTA position effectiveness
- Most popular articles
- User journey analysis

## 🎨 Customization

### Update Hosting.com CTA

Edit `src/components/CTA/HostingCTA.astro` to customize:
- CTA messaging
- Button styles
- Context-aware content

### Add New Articles

1. Create a new MDX file in `src/content/articles/`
2. Follow the frontmatter schema in `src/content/config.ts`
3. Include 2-3 `<HostingCTA>` components
4. Run `npm run validate-seo` to check

### Modify Styling

The site uses Tailwind CSS. Update styles in:
- `tailwind.config.js` for theme customization
- Component files for specific styling

## 🔍 SEO Features

- **Sitemap**: Auto-generated at `/sitemap-index.xml`
- **Robots.txt**: Configured for optimal crawling
- **Meta Tags**: Open Graph, Twitter Cards
- **Structured Data**: JSON-LD for articles and breadcrumbs
- **Performance**: 100/100 Lighthouse score target
- **Image Optimization**: AVIF/WebP formats

## 📈 Performance Optimization

- **Zero-JS by default**: Astro's island architecture
- **Image optimization**: Sharp with AVIF/WebP
- **CSS inlining**: Critical styles inlined
- **Gzip compression**: Level 6 via Nginx
- **Asset caching**: 1 year for static, 1 hour for HTML

## 🧪 Testing

### Local Testing

```bash
# Build production version
npm run build

# Preview production build
npm run preview
```

### Docker Testing

```bash
# Build and run
docker build -f docker/Dockerfile -t clawd-bot:test .
docker run -p 8080:80 clawd-bot:test

# Visit http://localhost:8080
```

### SEO Testing

- Google Search Console
- Google Rich Results Test
- Facebook Debugger (Open Graph)
- Twitter Card Validator

## 📦 Production Deployment

1. **Push to main branch**
2. **GitHub Actions builds Docker image**
3. **Pull image on server**:

```bash
docker pull ghcr.io/yourusername/clawd-bot:prod-latest
```

4. **Run container**:

```bash
docker run -d -p 80:80 \
  -e HOSTING_REFERRAL_URL=$HOSTING_REFERRAL_URL \
  --name clawd-bot-web \
  --restart unless-stopped \
  ghcr.io/yourusername/clawd-bot:prod-latest
```

5. **Configure DNS**: Point clawd-bot.app to server IP
6. **Setup SSL**: Use Let's Encrypt or Cloudflare

## 🐛 Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules .astro dist
npm install
npm run build
```

### Docker Issues

```bash
# Check logs
docker logs clawd-bot-web

# Restart container
docker restart clawd-bot-web

# Rebuild without cache
docker build --no-cache -f docker/Dockerfile -t clawd-bot:latest .
```

### SEO Validation Failures

```bash
# Run validation with details
npm run validate-seo

# Fix common issues:
# - Title too long: Edit frontmatter
# - Missing CTAs: Add <HostingCTA> components
# - No internal links: Add links to related articles
```

## 📚 Resources

- [Astro Documentation](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [Anthropic API](https://docs.anthropic.com)
- [Plausible Analytics](https://plausible.io)

## 📄 License

This project is proprietary. All rights reserved.

## 🤝 Contributing

This is a private project. For questions or issues, contact the project maintainer.

## 📞 Support

For support or questions:
- Email: support@clawd-bot.app
- GitHub Issues: [Create an issue](https://github.com/yourusername/clawd-bot/issues)

---

Built with ❤️ using Astro and Claude AI
