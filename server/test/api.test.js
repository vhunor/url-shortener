import { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_URL ?? "http://localhost:3001";

async function post(path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...opts });
  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, body };
}

describe("URL Shortener API", () => {
  let code;

  describe("GET /health", () => {
    it("returns ok", async () => {
      const { status, body } = await get("/health");
      assert.equal(status, 200);
      assert.deepEqual(body, { ok: true });
    });
  });

  describe("POST /api/shorten", () => {
    it("creates a short link for a valid URL", async () => {
      const { status, body } = await post("/api/shorten", { url: "https://example.com" });
      assert.equal(status, 201);
      assert.ok(body.code, "should have a code");
      assert.ok(body.shortUrl.includes(body.code), "shortUrl should contain the code");
      assert.equal(body.longUrl, "https://example.com/");
      code = body.code;
    });

    it("auto-prepends https:// for bare domains", async () => {
      const { status, body } = await post("/api/shorten", { url: "example.com" });
      assert.equal(status, 201);
      assert.equal(body.longUrl, "https://example.com/");
    });

    it("returns 400 for an invalid URL", async () => {
      const { status, body } = await post("/api/shorten", { url: "not a url !!" });
      assert.equal(status, 400);
      assert.ok(body.error);
    });

    it("returns 400 when url is missing", async () => {
      const { status, body } = await post("/api/shorten", {});
      assert.equal(status, 400);
      assert.ok(body.error);
    });

    it("returns 400 for a private/internal host", async () => {
      const { status, body } = await post("/api/shorten", { url: "http://localhost/secret" });
      assert.equal(status, 400);
      assert.ok(body.error);
    });

    it("returns 400 when body is an array", async () => {
      const res = await fetch(`${BASE}/api/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ url: "https://example.com" }]),
      });
      const body = await res.json();
      assert.equal(res.status, 400);
      assert.ok(body.error);
    });

    it("returns 413 for an oversized body", async () => {
      const res = await fetch(`${BASE}/api/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com", junk: "x".repeat(20_000) }),
      });
      assert.equal(res.status, 413);
    });
  });

  describe("GET /:code (redirect)", () => {
    it("redirects to the original URL", async () => {
      const { status, headers } = await get(`/${code}`);
      assert.equal(status, 302);
      assert.equal(headers.get("location"), "https://example.com/");
    });

    it("returns 404 for an unknown code", async () => {
      const { status } = await get("/DOESNOTEXIST999");
      assert.equal(status, 404);
    });
  });

  describe("GET /api/links/:code", () => {
    it("returns link details", async () => {
      const { status, body } = await get(`/api/links/${code}`);
      assert.equal(status, 200);
      assert.equal(body.code, code);
      assert.equal(body.longUrl, "https://example.com/");
      assert.ok(typeof body.clicks === "number");
      assert.ok(body.createdAt);
    });

    it("returns 404 for an unknown code", async () => {
      const { status, body } = await get("/api/links/DOESNOTEXIST999");
      assert.equal(status, 404);
      assert.ok(body.error);
    });
  });

  describe("GET /api/links", () => {
    it("returns an array of links", async () => {
      const { status, body } = await get("/api/links");
      assert.equal(status, 200);
      assert.ok(Array.isArray(body));
      assert.ok(body.length > 0);
    });

    it("respects the limit query param", async () => {
      const { status, body } = await get("/api/links?limit=2");
      assert.equal(status, 200);
      assert.ok(body.length <= 2);
    });

    it("clamps limit above 200 to 200", async () => {
      const { status, body } = await get("/api/links?limit=9999");
      assert.equal(status, 200);
      assert.ok(body.length <= 200);
    });

    it("uses default limit for non-numeric values", async () => {
      const { status, body } = await get("/api/links?limit=abc");
      assert.equal(status, 200);
      assert.ok(Array.isArray(body));
    });
  });

  describe("GET /api/stats", () => {
    it("returns aggregate stats and cache metrics", async () => {
      const { status, body } = await get("/api/stats");
      assert.equal(status, 200);
      assert.ok(typeof body.totalLinks === "number");
      assert.ok(typeof body.totalClicks === "number");
      assert.ok(typeof body.cache.hits === "number");
      assert.ok(typeof body.cache.misses === "number");
      assert.ok(typeof body.cache.hitRatio === "number");
    });
  });
});
