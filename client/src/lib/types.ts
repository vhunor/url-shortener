export interface ShortLink {
  code: string;
  shortUrl: string;
  originalUrl: string;
  clicks: number;
  createdAt: string;
}

export interface Stats {
  totalLinks: number;
  totalClicks: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatio: number;
  negativeCacheHits: number;
}

export interface HealthStatus {
  api: "healthy" | "degraded" | "down";
  cache: "connected" | "disconnected";
  rateLimit: "active" | "inactive";
  lastChecked: string;
}

export interface ShortenResponse {
  code: string;
  shortUrl: string;
  originalUrl: string;
}
