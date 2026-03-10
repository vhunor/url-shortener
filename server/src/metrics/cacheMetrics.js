export class CacheMetrics {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.negativeHits = 0;
  }

  hit() {
    this.hits += 1;
  }

  miss() {
    this.misses += 1;
  }

  negativeHit() {
    this.negativeHits += 1;
  }

  /** Returns a point-in-time summary including hit ratio rounded to 4 decimal places. */
  snapshot() {
    const total = this.hits + this.misses;
    const hitRatio = total === 0 ? 0 : this.hits / total;

    return {
      hits: this.hits,
      misses: this.misses,
      negativeHits: this.negativeHits,
      hitRatio: Number(hitRatio.toFixed(4))
    };
  }
}
