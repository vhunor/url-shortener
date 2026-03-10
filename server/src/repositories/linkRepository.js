import { encodeBase62 } from "../base62.js";

export class LinkRepository {
  /**
   * @param {import("pg").Pool} pool
   */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Creates a new link and returns { code, longUrl, createdAt, clicks }
   * Uses an INSERT to get a monotonic id and encodes it to base62.
   */
  async createLink(longUrl) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");

      // Insert with placeholder to get id
      const insert = await client.query(
        "INSERT INTO links (code, long_url) VALUES ($1, $2) RETURNING id, created_at, clicks",
        ["_", longUrl]
      );

      const { id, created_at: createdAt, clicks } = insert.rows[0];
      const code = encodeBase62(Number(id));

      // Update to final code
      await client.query("UPDATE links SET code = $1 WHERE id = $2", [code, id]);

      await client.query("COMMIT");

      return { code, longUrl, createdAt, clicks: Number(clicks) };
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Returns link details by code or null.
   */
  async getLinkByCode(code) {
    const result = await this.pool.query(
      "SELECT code, long_url, clicks, created_at FROM links WHERE code = $1",
      [code]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      code: row.code,
      longUrl: row.long_url,
      clicks: Number(row.clicks),
      createdAt: row.created_at
    };
  }

  /**
   * Returns longUrl for redirect or null.
   */
  async getLongUrlByCode(code) {
    const result = await this.pool.query(
      "SELECT long_url FROM links WHERE code = $1",
      [code]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return result.rows[0].long_url;
  }

  /**
   * Increments click counter.
   */
  async incrementClicks(code) {
    await this.pool.query("UPDATE links SET clicks = clicks + 1 WHERE code = $1", [code]);
  }

  /**
   * List recent links (helpful for debugging/admin)
   */
  async listRecent(limit = 50) {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const result = await this.pool.query(
      "SELECT code, long_url, clicks, created_at FROM links ORDER BY created_at DESC LIMIT $1",
      [safeLimit]
    );

    return result.rows.map((row) => ({
      code: row.code,
      longUrl: row.long_url,
      clicks: Number(row.clicks),
      createdAt: row.created_at
    }));
  }

  /** Returns aggregate totals: { totalLinks, totalClicks } across all stored links. */
  async getStats() {
    const result = await this.pool.query(
      "SELECT COUNT(*)::bigint AS total_links, COALESCE(SUM(clicks), 0)::bigint AS total_clicks FROM links"
    );

    const row = result.rows[0];

    return {
      totalLinks: Number(row.total_links),
      totalClicks: Number(row.total_clicks)
    };
  }

  /**
   * Atomically adds delta to the click counter for a code; used by the batched ClickCounter flush.
   * @param {string} code
   * @param {number} delta - The number of clicks to add (may be > 1 from the in-memory buffer).
   */
  async incrementClicksBy(code, delta) {
    await this.pool.query(
      "UPDATE links SET clicks = clicks + $2 WHERE code = $1",
      [code, delta]
    );
  }
}
