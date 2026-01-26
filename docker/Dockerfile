# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY website/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY website/ ./

# Build arguments for environment variables
ARG HOSTING_REFERRAL_URL
ARG HOSTING_REFERRAL_TRACKING_ID=clawdbot-promo
ARG PUBLIC_PLAUSIBLE_DOMAIN=clawd-bot.app

# Set environment variables for build
ENV HOSTING_REFERRAL_URL=${HOSTING_REFERRAL_URL}
ENV HOSTING_REFERRAL_TRACKING_ID=${HOSTING_REFERRAL_TRACKING_ID}
ENV PUBLIC_PLAUSIBLE_DOMAIN=${PUBLIC_PLAUSIBLE_DOMAIN}

# Build the site
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Install supervisord
RUN apk add --no-cache supervisor

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy supervisord configuration
COPY docker/supervisord.conf /etc/supervisord.conf

# Copy built static files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create log directory
RUN mkdir -p /var/log/supervisor

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
