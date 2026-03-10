export class ClickCounter {
  /**
   * @param {{ incrementClicksBy(code: string, delta: number): Promise<void> }} linkRepo
   */
  constructor(linkRepo) {
    this.linkRepo = linkRepo;

    this.buffer = new Map(); // code -> count
    this.flushIntervalMs = 2000;
    this.maxBufferSize = 5000;

    this._timer = null;
    this._flushing = false;
  }

  start() {
    if (this._timer) {
      return;
    }

    this._timer = setInterval(() => this.flush().catch(() => {}), this.flushIntervalMs);
    this._timer.unref?.();
  }

  stop() {
    if (!this._timer) {
      return;
    }

    clearInterval(this._timer);
    this._timer = null;
  }

  trackClick(code) {
    const current = this.buffer.get(code) || 0;
    this.buffer.set(code, current + 1);

    // Safety valve: flush early if buffer grows too much
    if (this.buffer.size >= this.maxBufferSize) {
      void this.flush();
    }
  }

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
      for (const [code, delta] of snapshot.entries()) {
        await this.linkRepo.incrementClicksBy(code, delta);
      }
    } catch (err) {
      // On failure, merge back (best effort)
      for (const [code, delta] of snapshot.entries()) {
        this.buffer.set(code, (this.buffer.get(code) || 0) + delta);
      }
      
      console.error("ClickCounter flush failed:", err);
    } finally {
      this._flushing = false;
    }
  }
}
