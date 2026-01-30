// SEO Automation System Types

export interface PageStats {
  path: string;
  title: string;
  pv: number;
  uv: number;
  avgDuration: number; // seconds
  bounceRate: number; // percentage
  scrollDepth: number; // percentage
  ctaClicks: number;
  date: string;
}

export interface DailyReport {
  date: string;
  generatedAt: string;
  summary: {
    totalPV: number;
    totalUV: number;
    avgDuration: number;
    bounceRate: number;
    pvChange: number; // percentage vs previous day
    uvChange: number;
  };
  topPages: PageStats[];
  lowPerformingPages: PageStats[];
  recommendations: Recommendation[];
  contentUpdates: ContentUpdate[];
  knowledgeBaseUpdates: KnowledgeUpdate[];
}

export interface Recommendation {
  type: 'content' | 'seo' | 'ux' | 'technical';
  priority: 'high' | 'medium' | 'low';
  page?: string;
  issue: string;
  suggestion: string;
  expectedImpact: string;
}

export interface ContentUpdate {
  action: 'created' | 'updated' | 'optimized';
  page: string;
  description: string;
  timestamp: string;
}

export interface KnowledgeUpdate {
  source: string;
  title: string;
  url: string;
  relevance: number;
  addedAt: string;
}

export interface CollectedArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  contentType?: 'news' | 'article' | 'case-study' | 'feedback' | 'community';
  content?: string;
  summary?: string;
  publishedAt: string;
  collectedAt: string;
  relevanceScore: number;
  topics: string[];
}

export interface AnalyticsEvent {
  name: string;
  page: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

export interface TrackingData {
  sessionId: string;
  visitorId: string;
  page: string;
  referrer: string;
  userAgent: string;
  timestamp: string;
  events: AnalyticsEvent[];
  duration?: number;
  scrollDepth?: number;
}
