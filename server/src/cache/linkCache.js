const KEY_PREFIX = "link:";
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const NEGATIVE_TTL_SECONDS = 30;      // 30 seconds
const NOT_FOUND = "__NOT_FOUND__";

export class LinkCache {
  constructor(redis) {
    this.redis = redis;
  }

  /** @returns {string} The Redis key for a given short code. */
  key(code) {
    return `${KEY_PREFIX}${code}`;
  }

  /**
   * Returns:
   * - string longUrl if found
   * - null if not in cache
   * - NOT_FOUND sentinel if negative cached
   */
  async get(code) {
    if (!this.redis) {
      return null;
    }

    return this.redis.get(this.key(code));
  }

  /** Stores the resolved long URL in cache with a positive TTL. */
  async setFound(code, longUrl, ttlSeconds = DEFAULT_TTL_SECONDS) {
    if (!this.redis) {
      return;
    }

    await this.redis.set(this.key(code), longUrl, { EX: ttlSeconds });
  }

  /** Caches a negative result for a short-lived TTL to prevent DB hammering on unknown codes. */
  async setNotFound(code, ttlSeconds = NEGATIVE_TTL_SECONDS) {
    if (!this.redis) {
      return;
    }

    await this.redis.set(this.key(code), NOT_FOUND, { EX: ttlSeconds });
  }

  /** Returns true if the cached value is the negative-cache sentinel rather than a real URL. */
  isNotFound(value) {
    return value === NOT_FOUND;
  }
}
