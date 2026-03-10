import express from "express";

import { pool } from "./db.js";
import { initRedis, redis } from "./cache/redisClient.js";

import { LinkRepository } from "./repositories/linkRepository.js";
import { LinkService } from "./services/linkService.js";
import { LinkCache } from "./cache/linkCache.js";
import { ClickCounter } from "./metrics/clickCounter.js";
import { CacheMetrics } from "./metrics/cacheMetrics.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

await initRedis();

const linkRepo = new LinkRepository(pool);
const linkCache = redis ? new LinkCache(redis) : null;

const clickCounter = new ClickCounter(linkRepo);
clickCounter.start();

const cacheMetrics = new CacheMetrics();

const linkService = new LinkService(linkRepo, linkCache, clickCounter, cacheMetrics);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Create short URL
app.post("/api/shorten", async (req, res) => {
  try {
    const created = await linkService.createShortLink(req.body?.url);

    return res.status(201).json({
      code: created.code,
      shortUrl: `${BASE_URL}/${created.code}`,
      longUrl: created.longUrl
    });
  } catch (err) {
    console.error("POST /api/shorten failed:", err);
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
    console.error("GET /api/links/:code failed:", err);

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
    console.error("GET /:code failed:", err);

    return res.status(500).send("Internal error");
  }
});

app.get("/api/links", async (req, res) => {
  try {
    const limit = req.query.limit;
    const items = await linkService.listRecentLinks(limit);

    res.json(items);
  } catch (err) {
    console.error("GET /api/links failed:", err);
    
    res.status(500).json({ error: "Internal error" });
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    const stats = await linkService.getStats(); // DB totals

    return res.json({
      ...stats,
      cache: cacheMetrics.snapshot()
    });
  } catch (err) {
    console.error("GET /api/stats failed:", err);
    
    return res.status(500).json({ error: "Internal error" });
  }
});


app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");

  clickCounter.stop();

  await clickCounter.flush();

  process.exit(0);
});
