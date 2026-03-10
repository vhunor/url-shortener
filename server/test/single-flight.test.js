import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LinkService } from "../src/services/linkService.js";

describe("Single-flight protection", () => {

  it("coalesces concurrent DB lookups for the same code into one call", async () => {
    let dbCallCount = 0;

    const mockRepo = {
      getLongUrlByCode: async (_code) => {
        dbCallCount++;
        // Simulate DB latency so concurrent calls truly overlap
        await new Promise((r) => setTimeout(r, 20));

        return "https://example.com";
      }
    };

    const service = new LinkService(mockRepo); // no cache → always hits DB path

    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.resolveRedirect("abc"))
    );

    assert.ok(
      results.every((r) => r === "https://example.com"),
      "all callers should receive the correct URL"
    );
    assert.equal(dbCallCount, 1, `expected 1 DB call, got ${dbCallCount}`);
  });

  it("allows a fresh DB lookup once the in-flight promise settles", async () => {
    let dbCallCount = 0;

    const mockRepo = {
      getLongUrlByCode: async (_code) => {
        dbCallCount++;
        await new Promise((r) => setTimeout(r, 10));

        return "https://example.com";
      }
    };

    const service = new LinkService(mockRepo);

    // First wave — all concurrent
    await Promise.all(
      Array.from({ length: 5 }, () => service.resolveRedirect("abc"))
    );

    assert.equal(dbCallCount, 1, "first wave should produce exactly 1 DB call");

    // Second wave after the first settled — should trigger one new call
    await Promise.all(
      Array.from({ length: 5 }, () => service.resolveRedirect("abc"))
    );

    assert.equal(dbCallCount, 2, "second wave should produce exactly 1 more DB call");
  });

  it("removes the in-flight entry on DB error so retries are not stuck", async () => {
    let dbCallCount = 0;

    const mockRepo = {
      getLongUrlByCode: async (_code) => {
        dbCallCount++;
        await new Promise((r) => setTimeout(r, 10));
        throw new Error("DB unavailable");
      }
    };

    const service = new LinkService(mockRepo);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => service.resolveRedirect("abc"))
    );

    assert.ok(
      results.every((r) => r.status === "rejected"),
      "all callers should receive the DB error"
    );
    assert.equal(dbCallCount, 1, "error path should still only make 1 DB call");
    assert.equal(service.inFlightLoads.size, 0, "in-flight map must be empty after error");

    // A retry after the error should work
    service.linkRepo = {
      getLongUrlByCode: async () => "https://example.com"
    };
    const retry = await service.resolveRedirect("abc");
    assert.equal(retry, "https://example.com", "retry after error should succeed");
  });

  it("does not coalesce requests for different codes", async () => {
    let dbCallCount = 0;

    const mockRepo = {
      getLongUrlByCode: async (code) => {
        dbCallCount++;
        await new Promise((r) => setTimeout(r, 20));

        return `https://example.com/${code}`;
      }
    };

    const service = new LinkService(mockRepo);

    await Promise.all([
      service.resolveRedirect("aaa"),
      service.resolveRedirect("bbb"),
      service.resolveRedirect("ccc"),
    ]);

    assert.equal(dbCallCount, 3, "each distinct code should trigger its own DB call");
  });

  it("coalesces concurrent DB lookups for the same missing code", async () => {
    let dbCallCount = 0;

    const mockRepo = {
      getLongUrlByCode: async (_code) => {
        dbCallCount++;
        await new Promise((r) => setTimeout(r, 20));

        return null; // code does not exist
      }
    };

    const service = new LinkService(mockRepo);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.resolveRedirect("missing"))
    );

    assert.ok(
      results.every((r) => r === null),
      "all callers should receive null for a non-existent code"
    );
    assert.equal(dbCallCount, 1, `expected 1 DB call, got ${dbCallCount}`);
  });

});
