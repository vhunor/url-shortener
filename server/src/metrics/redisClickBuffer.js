import { randomUUID } from "node:crypto";
import { ClickBuffer } from "./clickBuffer.js";

const PENDING_KEY = "clicks:pending";
const FLUSHING_KEY_PREFIX = "clicks:flushing:";
const FLUSH_INTERVAL_MS = 2000;

export class RedisClickBuffer extends ClickBuffer {
  /**
   * @param {import("redis").RedisClientType} redis
   * @param {{ incrementClicksBy(code: string, delta: number): Promise<void> }} linkRepo
   */
  constructor(redis, linkRepo) {
    super(FLUSH_INTERVAL_MS);
    this.redis = redis;
    this.linkRepo = linkRepo;
    this._flushedTotal = 0;
  }

  /**
   * Increments the Redis click counter for a code. Fire-and-forget — errors are logged but not thrown.
   * @param {string} code
   */
  trackClick(code) {
    this.redis.hIncrBy(PENDING_KEY, code, 1).catch((err) => {
      console.error("RedisClickBuffer.trackClick failed:", err.message);
    });
  }

  /**
   * Atomically grabs all pending clicks via RENAME, flushes them to Postgres in parallel, then
   * deletes the temp key. Failed entries are merged back into clicks:pending to avoid data loss.
   * Multi-instance safe: only one instance will win the RENAME; others will find no key and skip.
   */
  async flush() {
    if (this._flushing) {
      return;
    }

    this._flushing = true;

    const tempKey = `${FLUSHING_KEY_PREFIX}${randomUUID()}`;

    // Atomically take ownership of the pending hash
    try {
      await this.redis.rename(PENDING_KEY, tempKey);
    } catch {
      // clicks:pending doesn't exist — nothing to flush
      this._flushing = false;

      return;
    }

    let entries;

    try {
      entries = Object.entries(await this.redis.hGetAll(tempKey));
    } catch (err) {
      console.error("RedisClickBuffer: failed to read flush buffer:", err.message);
      await this.redis.del(tempKey).catch(() => {});
      this._flushing = false;

      return;
    }

    try {
      // Write all deltas to Postgres concurrently
      const results = await Promise.allSettled(
        entries.map(([code, countStr]) => {
          const delta = Number(countStr);

          if (delta <= 0) {
            return Promise.resolve();
          }

          return this.linkRepo.incrementClicksBy(code, delta).then(() => {
            this._flushedTotal += delta;
          });
        })
      );

      // Merge failed entries back into the pending key to avoid data loss
      const failed = entries.filter((_, i) => results[i].status === "rejected");

      if (failed.length > 0) {
        console.error(`RedisClickBuffer flush: ${failed.length} of ${entries.length} entries failed, merging back`);

        await Promise.all(
          failed.map(([code, countStr]) =>
            this.redis.hIncrBy(PENDING_KEY, code, Number(countStr)).catch(() => {})
          )
        );
      }
    } finally {
      await this.redis.del(tempKey).catch(() => {});
      this._flushing = false;
    }
  }

  /**
   * Returns pending and flushed click metrics.
   * pendingCodes: number of distinct codes with unflushed clicks in Redis.
   * flushedTotal: total clicks written to Postgres by this instance since startup.
   */
  async metrics() {
    const pendingCodes = await this.redis.hLen(PENDING_KEY).catch(() => 0);

    return {
      pendingCodes,
      flushedTotal: this._flushedTotal
    };
  }
}
