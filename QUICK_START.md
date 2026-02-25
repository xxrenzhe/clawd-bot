# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Generate Articles

Generate all 100 SEO-optimized articles using Gemini AI:

```bash
cd website
export GEMINI_API_KEY=your-gemini-api-key
npm run generate-articles
```

This will take approximately 3-4 minutes (2 seconds per article).

### Step 2: Test Locally

Start the development server to preview your site:

```bash
npm run dev
```

Visit `http://localhost:4321` to see your site.

### Step 3: Deploy to Production

#### Option A: Docker (Recommended)

```bash
# Build Docker image
docker build -f docker/Dockerfile -t clawd-bot:latest \
  --build-arg HOSTING_REFERRAL_URL=https://hosting.com?aid=6977a573baa53 \
  .

# Run container
docker run -d -p 80:80 \
  -e HOSTING_REFERRAL_URL=https://hosting.com?aid=6977a573baa53 \
  --name clawd-bot-web \
  --restart unless-stopped \
  clawd-bot:latest
```

#### Option B: GitHub Actions (Automated)

1. Add `HOSTING_REFERRAL_URL` to GitHub Secrets
2. Push to main branch:

```bash
git add .
git commit -m "Initial commit: Clawdbot promotional website"
git push origin main
```

3. GitHub Actions will automatically build and push to GHCR
4. Pull and run on your server:

```bash
docker pull ghcr.io/yourusername/clawd-bot:prod-latest
docker run -d -p 80:80 \
  -e HOSTING_REFERRAL_URL=$HOSTING_REFERRAL_URL \
  --name clawd-bot-web \
  --restart unless-stopped \
  ghcr.io/yourusername/clawd-bot:prod-latest
```

## 🔧 Configuration

### Update Hosting.com Referral URL

Edit `.env` file:

```env
HOSTING_REFERRAL_URL=https://hosting.com?aid=6977a573baa53
```

### Configure Analytics

Edit `.env` file:

```env
PUBLIC_PLAUSIBLE_DOMAIN=clawd-bot.app
```

Then add the Plausible script to your Plausible account.

## ✅ Validation

Before deploying, validate your articles:

```bash
npm run validate-seo
```

This checks:
- Title and description lengths
- Keyword presence
- CTA placement
- Heading hierarchy
- Internal linking

## 📊 Post-Deployment

1. **Configure DNS**: Point `clawd-bot.app` to your server IP
2. **Setup SSL**: Use Let's Encrypt or Cloudflare
3. **Submit Sitemap**: Add `https://clawd-bot.app/sitemap-index.xml` to Google Search Console
4. **Monitor Analytics**: Check Plausible for traffic and conversions

## 🎯 Key Files

- **Articles**: `website/src/content/articles/*.mdx`
- **Homepage**: `website/src/pages/index.astro`
- **CTA Component**: `website/src/components/CTA/HostingCTA.astro`
- **Docker**: `docker/Dockerfile`, `docker/nginx.conf`
- **CI/CD**: `.github/workflows/deploy.yml`

## 🆘 Troubleshooting

### Articles not generating?

Check your Gemini API key:

```bash
echo $GEMINI_API_KEY
```

### Build failing?

Clear cache and rebuild:

```bash
rm -rf node_modules .astro dist
npm install
npm run build
```

### Docker container not starting?

Check logs:

```bash
docker logs clawd-bot-web
```

## 📚 Full Documentation

See `README.md` and `IMPLEMENTATION_SUMMARY.md` for complete documentation.

---

**Ready to launch!** 🚀
