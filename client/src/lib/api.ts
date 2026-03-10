import type { ShortLink, Stats, HealthStatus, ShortenResponse } from "./types";

const BASE_URL = "/api";

export async function shortenUrl(url: string): Promise<ShortenResponse> {
  const res = await fetch(`${BASE_URL}/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const data = await res.json();

  return {
    code: data.code,
    shortUrl: data.shortUrl,
    originalUrl: data.longUrl,
  };
}

export async function fetchLinks(limit = 50): Promise<ShortLink[]> {
  const res = await fetch(`${BASE_URL}/links?limit=${limit}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data: Array<{ code: string; longUrl: string; clicks: number; createdAt: string }> =
    await res.json();

  return data.map((item) => ({
    code: item.code,
    shortUrl: `${window.location.origin}/${item.code}`,
    originalUrl: item.longUrl,
    clicks: item.clicks,
    createdAt: item.createdAt,
  }));
}

export async function fetchLinkByCode(code: string): Promise<ShortLink | undefined> {
  const res = await fetch(`${BASE_URL}/links/${code}`);

  if (res.status === 404) {
    return undefined;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const item: { code: string; longUrl: string; clicks: number; createdAt: string } =
    await res.json();

  return {
    code: item.code,
    shortUrl: `${window.location.origin}/${item.code}`,
    originalUrl: item.longUrl,
    clicks: item.clicks,
    createdAt: item.createdAt,
  };
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${BASE_URL}/stats`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();

  return {
    totalLinks: data.totalLinks,
    totalClicks: data.totalClicks,
    cacheHits: data.cache?.hits ?? 0,
    cacheMisses: data.cache?.misses ?? 0,
    cacheHitRatio: data.cache?.hitRatio ?? 0,
    negativeCacheHits: data.cache?.negativeHits ?? 0,
  };
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch("/health");

  return {
    api: res.ok ? "healthy" : "degraded",
    cache: "connected",
    rateLimit: "active",
    lastChecked: new Date().toISOString(),
  };
}
