/**
 * Lightweight Analytics Tracker
 * Self-hosted, privacy-friendly tracking for SEO optimization
 */

interface TrackingConfig {
  endpoint: string;
  siteId: string;
  debug?: boolean;
}

interface PageViewData {
  p: string;  // page path
  r: string;  // referrer
  t: string;  // title
  w: number;  // viewport width
  h: number;  // viewport height
}

interface EventData {
  n: string;  // event name
  p: string;  // page
  d?: Record<string, unknown>;  // custom data
}

class SEOTracker {
  private config: TrackingConfig;
  private sessionId: string;
  private visitorId: string;
  private startTime: number;
  private maxScrollDepth: number = 0;
  private events: EventData[] = [];

  constructor(config: TrackingConfig) {
    this.config = config;
    this.sessionId = this.generateId();
    this.visitorId = this.getOrCreateVisitorId();
    this.startTime = Date.now();

    this.init();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getOrCreateVisitorId(): string {
    const key = 'seo_visitor_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = this.generateId();
      localStorage.setItem(key, id);
    }
    return id;
  }

  private init(): void {
    // Track page view
    this.trackPageView();

    // Track scroll depth
    this.trackScrollDepth();

    // Track time on page
    this.trackTimeOnPage();

    // Track CTA clicks
    this.trackCTAClicks();

    // Track outbound links
    this.trackOutboundLinks();
  }

  private trackPageView(): void {
    const data: PageViewData = {
      p: window.location.pathname,
      r: document.referrer,
      t: document.title,
      w: window.innerWidth,
      h: window.innerHeight,
    };

    this.send('pageview', data);
  }

  private trackScrollDepth(): void {
    const checkScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

      if (scrollPercent > this.maxScrollDepth) {
        this.maxScrollDepth = scrollPercent;

        // Track milestones
        const milestones = [25, 50, 75, 100];
        for (const milestone of milestones) {
          if (scrollPercent >= milestone && this.maxScrollDepth < milestone + 5) {
            this.trackEvent('scroll_depth', { depth: milestone });
          }
        }
      }
    };

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkScroll();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  private trackTimeOnPage(): void {
    const sendDuration = () => {
      const duration = Math.round((Date.now() - this.startTime) / 1000);
      this.send('duration', {
        d: duration,
        s: this.maxScrollDepth,
        p: window.location.pathname,
      });
    };

    // Send on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendDuration();
      }
    });

    // Fallback for older browsers
    window.addEventListener('beforeunload', sendDuration);
  }

  private trackCTAClicks(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const ctaElement = target.closest('[data-analytics-event]') as HTMLElement;

      if (ctaElement) {
        this.trackEvent(ctaElement.dataset.analyticsEvent || 'cta_click', {
          context: ctaElement.dataset.analyticsContext,
          text: ctaElement.textContent?.trim().substring(0, 50),
        });
      }
    });
  }

  private trackOutboundLinks(): void {
    document.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement;

      if (link && link.hostname !== window.location.hostname) {
        this.trackEvent('outbound_link', {
          url: link.href,
          text: link.textContent?.trim().substring(0, 50),
        });
      }
    });
  }

  public trackEvent(name: string, data?: Record<string, unknown>): void {
    const eventData: EventData = {
      n: name,
      p: window.location.pathname,
      d: data,
    };

    this.events.push(eventData);
    this.send('event', eventData);

    if (this.config.debug) {
      console.log('[SEO Tracker] Event:', name, data);
    }
  }

  private send(type: string, data: unknown): void {
    const payload = {
      type,
      data,
      sid: this.sessionId,
      vid: this.visitorId,
      ts: Date.now(),
      site: this.config.siteId,
    };

    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        this.config.endpoint,
        JSON.stringify(payload)
      );
    } else {
      // Fallback to fetch
      fetch(this.config.endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently fail
      });
    }

    if (this.config.debug) {
      console.log('[SEO Tracker] Sent:', type, data);
    }
  }
}

// Auto-initialize if config is present
declare global {
  interface Window {
    SEO_TRACKER_CONFIG?: TrackingConfig;
    seoTracker?: SEOTracker;
  }
}

if (typeof window !== 'undefined') {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.SEO_TRACKER_CONFIG) {
        window.seoTracker = new SEOTracker(window.SEO_TRACKER_CONFIG);
      }
    });
  } else {
    if (window.SEO_TRACKER_CONFIG) {
      window.seoTracker = new SEOTracker(window.SEO_TRACKER_CONFIG);
    }
  }
}

export { SEOTracker, TrackingConfig };
