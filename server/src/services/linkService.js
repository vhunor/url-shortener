export class LinkService {
  /**
   * @param {import("../repositories/linkRepository.js").LinkRepository} linkRepo
   */
  constructor(linkRepo, linkCache = null, clickCounter = null, cacheMetrics = null) {
    this.linkRepo = linkRepo;
    this.linkCache = linkCache;
    this.clickCounter = clickCounter;
    this.cacheMetrics = cacheMetrics;
  }

  normalizeUrl(input) {
    if (typeof input !== "string") {
      return null;
    }

    const trimmed = input.trim();

    if (!trimmed) {
      return null;
    }

    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const u = new URL(withProto);

      if (!["http:", "https:"].includes(u.protocol)) {
        return null;
      }

      return u.toString();
    } catch {
      return null;
    }
  }

  async createShortLink(rawUrl) {
    const longUrl = this.normalizeUrl(rawUrl);

    if (!longUrl) {
      const err = new Error("Invalid url");
      err.code = "INVALID_URL";

      throw err;
    }

    return this.linkRepo.createLink(longUrl);
  }

  async getLinkDetails(code) {
    return this.linkRepo.getLinkByCode(code);
  }

  async resolveRedirect(code) {
    // 1) cache first
    if (this.linkCache) {
      const cached = await this.linkCache.get(code);

      if (cached) {
        if (this.linkCache.isNotFound(cached)) {
          this.cacheMetrics?.negativeHit();

          return null; // fast miss
        }

        this.cacheMetrics?.hit();
        this.clickCounter?.trackClick(code);

        return cached; // cached longUrl
      }

      this.cacheMetrics?.miss();
    }

    // 2) DB fallback
    const longUrl = await this.linkRepo.getLongUrlByCode(code);

    if (!longUrl) {
      await this.linkCache?.setNotFound(code);

      return null;
    }

     // 3) populate cache
    await this.linkCache?.setFound(code, longUrl);

    // 4) track click
    this.clickCounter?.trackClick(code);

    return longUrl;
  }

  async listRecentLinks(limit) {
    return this.linkRepo.listRecent(limit);
  }

  async getStats() {
    return this.linkRepo.getStats();
  }
}
