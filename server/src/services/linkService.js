export class LinkService {
  /**
   * @param {import("../repositories/linkRepository.js").LinkRepository} linkRepo
   */
  constructor(linkRepo, linkCache = null, clickCounter = null, cacheMetrics = null) {
    this.linkRepo = linkRepo;
    this.linkCache = linkCache;
    this.clickCounter = clickCounter;
    this.cacheMetrics = cacheMetrics;
    this.inFlightLoads = new Map();
  }

  /**
   * Sanitizes and validates a URL string, prepending https:// if no scheme is present.
   * @returns {string|null} The normalized URL, or null if invalid or private.
   */
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

      if (!process.env.ALLOW_PRIVATE_HOSTS && this._isPrivateHost(u.hostname)) {
        return null;
      }

      return u.toString();
    } catch {
      return null;
    }
  }

  /**
   * Returns true for loopback, RFC-1918, and link-local addresses (including cloud metadata endpoints).
   * @param {string} hostname
   */
  _isPrivateHost(hostname) {
    const h = hostname.toLowerCase();

    return (
      h === "localhost" ||
      h === "::1" ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^169\.254\./.test(h)  // link-local + AWS/GCP metadata
    );
  }

  /**
   * Validates and normalizes rawUrl, then persists a new short link.
   * @throws {Error} With code "INVALID_URL" if the URL is rejected.
   */
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

  /**
   * Resolves a short code to its long URL using a cache-first strategy with single-flight DB coalescing.
   * @returns {Promise<string|null>} The long URL, or null if the code does not exist.
   */
  async resolveRedirect(code) {
    // 1) cache first
    if (this.linkCache) {
      try {
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
      } catch (err) {
        console.error("Cache error, falling back to DB:", err);
      }
    }

    // 2) Single-flight: coalesce concurrent DB lookups for the same code
    if (this.inFlightLoads.has(code)) {
      const longUrl = await this.inFlightLoads.get(code);

      if (longUrl) {
        this.clickCounter?.trackClick(code);
      }

      return longUrl;
    }

    const load = this._loadFromDb(code);
    this.inFlightLoads.set(code, load);

    let longUrl;

    try {
      longUrl = await load;
    } finally {
      this.inFlightLoads.delete(code);
    }

    if (longUrl) {
      this.clickCounter?.trackClick(code);
    }

    return longUrl;
  }

  /**
   * Fetches the long URL from the database and populates the cache (positive or negative entry).
   * @returns {Promise<string|null>}
   */
  async _loadFromDb(code) {
    const longUrl = await this.linkRepo.getLongUrlByCode(code);

    if (!longUrl) {
      await this.linkCache?.setNotFound(code);

      return null;
    }

    await this.linkCache?.setFound(code, longUrl);

    return longUrl;
  }

  async listRecentLinks(limit) {
    return this.linkRepo.listRecent(limit);
  }

  async getStats() {
    return this.linkRepo.getStats();
  }
}
