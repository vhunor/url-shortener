import { randomUUID } from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";

import { pool } from "./db.js";
import { initRedis, redis } from "./cache/redisClient.js";

import { LinkRepository } from "./repositories/linkRepository.js";
import { LinkService } from "./services/linkService.js";
import { LinkCache } from "./cache/linkCache.js";
import { ClickCounter } from "./metrics/clickCounter.js";
import { CacheMetrics } from "./metrics/cacheMetrics.js";

const app = express();
app.use(express.json({ limit: "10kb" }));

// Attach a unique ID to every request for log correlation
app.use((req, _res, next) => {
  req.id = randomUUID();
  next();
});

// General rate limit: 200 req/min per IP
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

// Stricter limit on link creation: 30 req/min per IP
app.use("/api/shorten", rateLimit({ windowMs: 60_000, max: 30 }));

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

await initRedis().catch((err) => {
  console.error("Redis init failed, continuing without cache:", err.message);
});

const linkRepo = new LinkRepository(pool);
const linkCache = redis ? new LinkCache(redis) : null;

const clickCounter = new ClickCounter(linkRepo);
clickCounter.start();

const cacheMetrics = new CacheMetrics();

const linkService = new LinkService(linkRepo, linkCache, clickCounter, cacheMetrics);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Create short URL
app.post("/api/shorten", async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Request body must be a JSON object" });
  }

  try {
    const created = await linkService.createShortLink(req.body?.url);

    return res.status(201).json({
      code: created.code,
      shortUrl: `${BASE_URL}/${created.code}`,
      longUrl: created.longUrl
    });
  } catch (err) {
    if (err.code === "INVALID_URL") {
      return res.status(400).json({ error: "Invalid URL" });
    }

    console.error(JSON.stringify({ requestId: req.id, msg: "POST /api/shorten failed", error: err.message }));

    return res.status(500).json({ error: "Internal error" });
  }
});

// Link details
app.get("/api/links/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const link = await linkService.getLinkDetails(code);

    if (!link) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json(link);
  } catch (err) {
    console.error(JSON.stringify({ requestId: req.id, msg: "GET /api/links/:code failed", error: err.message }));

    return res.status(500).json({ error: "Internal error" });
  }
});

// Redirect (hot path)
app.get("/:code([0-9a-zA-Z]+)", async (req, res) => {
  try {
    const { code } = req.params;
    const longUrl = await linkService.resolveRedirect(code);

    if (!longUrl) {
      return res.status(404).send("Not found");
    }

    return res.redirect(302, longUrl);
  } catch (err) {
    console.error(JSON.stringify({ requestId: req.id, msg: "GET /:code failed", error: err.message }));

    return res.status(500).send("Internal error");
  }
});

// List recent links; accepts optional ?limit query param (1–200, default 50)
app.get("/api/links", async (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));

  try {
    const items = await linkService.listRecentLinks(limit);

    res.json(items);
  } catch (err) {
    console.error(JSON.stringify({ requestId: req.id, msg: "GET /api/links failed", error: err.message }));

    res.status(500).json({ error: "Internal error" });
  }
});

// Aggregate stats: total links, total clicks, and live cache hit-ratio metrics
app.get("/api/stats", async (req, res) => {
  try {
    const stats = await linkService.getStats();

    return res.json({
      ...stats,
      cache: cacheMetrics.snapshot()
    });
  } catch (err) {
    console.error(JSON.stringify({ requestId: req.id, msg: "GET /api/stats failed", error: err.message }));

    return res.status(500).json({ error: "Internal error" });
  }
});


app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

const FLUSH_TIMEOUT_MS = 10_000;

process.on("SIGINT", async () => {
  console.log("Shutting down...");

  clickCounter.stop();

  try {
    await Promise.race([
      clickCounter.flush(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Flush timeout")), FLUSH_TIMEOUT_MS)
      )
    ]);
  } catch (err) {
    console.error("Click flush error during shutdown:", err.message);
  }

  try {
    await pool.end();
  } catch (err) {
    console.error("DB pool close error:", err.message);
  }

  try {
    if (redis) {
      await redis.quit();
    }
  } catch (err) {
    console.error("Redis close error:", err.message);
  }

  process.exit(0);
});
