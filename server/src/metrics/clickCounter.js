import { ClickBuffer } from "./clickBuffer.js";

const FLUSH_INTERVAL_MS = 2000;

export class ClickCounter extends ClickBuffer {
  /**
   * @param {{ incrementClicksBy(code: string, delta: number): Promise<void> }} linkRepo
   */
  constructor(linkRepo) {
    super(FLUSH_INTERVAL_MS);
    this.linkRepo = linkRepo;

    this.buffer = new Map(); // code -> count
    this.maxBufferSize = 5000;
  }

  /** Increments the in-memory click count for a code; triggers an early flush if the buffer is full. */
  trackClick(code) {
    const current = this.buffer.get(code) || 0;
    this.buffer.set(code, current + 1);

    // Safety valve: flush early if buffer grows too much
    if (this.buffer.size >= this.maxBufferSize) {
      void this.flush();
    }
  }

  /**
   * Returns pending and flushed click metrics (matches RedisClickBuffer interface).
   * pendingCodes: number of distinct codes with buffered clicks.
   * flushedTotal: not tracked for the in-memory implementation.
   */
  async metrics() {
    return {
      pendingCodes: this.buffer.size,
      flushedTotal: 0
    };
  }

  /**
   * Drains the in-memory click buffer to the database.
   * Swaps buffers atomically so new clicks are not blocked; merges back on failure.
   */
  async flush() {
    if (this._flushing) {
      return;
    }
    if (this.buffer.size === 0) {
      return;
    }

    this._flushing = true;

    // Swap buffers to avoid blocking new clicks
    const snapshot = this.buffer;
    this.buffer = new Map();

    try {
      const entries = [...snapshot.entries()];
      const results = await Promise.allSettled(
        entries.map(([code, delta]) => this.linkRepo.incrementClicksBy(code, delta))
      );

      // Merge back any that failed
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "rejected") {
          const [code, delta] = entries[i];
          this.buffer.set(code, (this.buffer.get(code) || 0) + delta);
        }
      }

      const failCount = results.filter((r) => r.status === "rejected").length;
      if (failCount > 0) {
        console.error(`ClickCounter flush: ${failCount} of ${entries.length} entries failed`);
      }
    } finally {
      this._flushing = false;
    }
  }
}
