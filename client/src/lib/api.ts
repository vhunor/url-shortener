import type { ShortLink, Stats, HealthStatus, ShortenResponse } from "./types";

const BASE_URL = "/api";

export const shortenUrl = async (url: string): Promise<ShortenResponse> => {
  const res = await fetch(`${BASE_URL}/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  const { code, shortUrl, longUrl } = await res.json();

  return { code, shortUrl, originalUrl: longUrl };
};

export const fetchLinks = async (limit = 50): Promise<ShortLink[]> => {
  const res = await fetch(`${BASE_URL}/links?limit=${limit}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data: Array<{ code: string; longUrl: string; clicks: number; createdAt: string }> =
    await res.json();

  return data.map(({ code, longUrl, clicks, createdAt }) => ({
    code,
    shortUrl: `${window.location.origin}/${code}`,
    originalUrl: longUrl,
    clicks,
    createdAt,
  }));
};

export const fetchLinkByCode = async (code: string): Promise<ShortLink | undefined> => {
  const res = await fetch(`${BASE_URL}/links/${code}`);

  if (res.status === 404) {
    return undefined;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const { code: linkCode, longUrl, clicks, createdAt }: { code: string; longUrl: string; clicks: number; createdAt: string } =
    await res.json();

  return {
    code: linkCode,
    shortUrl: `${window.location.origin}/${linkCode}`,
    originalUrl: longUrl,
    clicks,
    createdAt,
  };
};

export const fetchStats = async (): Promise<Stats> => {
  const res = await fetch(`${BASE_URL}/stats`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const { totalLinks, totalClicks, cache } = await res.json();

  return {
    totalLinks,
    totalClicks,
    cacheHits: cache?.hits ?? 0,
    cacheMisses: cache?.misses ?? 0,
    cacheHitRatio: cache?.hitRatio ?? 0,
    negativeCacheHits: cache?.negativeHits ?? 0,
  };
};

export const fetchHealth = async (): Promise<HealthStatus> => {
  const res = await fetch("/health");

  return {
    api: res.ok ? "healthy" : "degraded",
    cache: "connected",
    rateLimit: "active",
    lastChecked: new Date().toISOString(),
  };
};
