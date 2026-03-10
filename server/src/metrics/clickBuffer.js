/**
 * Abstract base class providing timer lifecycle and flush-guard for click buffer implementations.
 * Subclasses must implement flush().
 */
export class ClickBuffer {
  /** @param {number} intervalMs - How often to flush, in milliseconds. */
  constructor(intervalMs) {
    this._intervalMs = intervalMs;
    this._timer = null;
    this._flushing = false;
  }

  /** Starts the periodic flush interval. Safe to call multiple times. */
  start() {
    if (this._timer) {
      return;
    }

    this._timer = setInterval(() => this.flush().catch(() => {}), this._intervalMs);
    this._timer.unref?.();
  }

  /** Stops the flush interval without draining the buffer. Call flush() afterward for a clean shutdown. */
  stop() {
    if (!this._timer) {
      return;
    }

    clearInterval(this._timer);
    this._timer = null;
  }
}
