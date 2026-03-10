# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

All commands run from the `server/` directory unless noted otherwise.

**Start the full stack (recommended):**
```bash
docker-compose up
```
This starts Postgres (port 5433), Redis (port 6379), and the API (port 3001) with hot-reload.

**Run API locally (requires external Postgres and Redis):**
```bash
cd server
DATABASE_URL=postgres://app:app@localhost:5433/shortener REDIS_URL=redis://localhost:6379 npm run dev
```
`npm run dev` uses `node --watch` for auto-restart on file changes.

**Run tests** (requires the stack to be running):
```bash
cd server && npm test
# or against a different host:
API_URL=http://somehost:3001 npm test
```

**Load test a redirect endpoint:**
```bash
node scripts/loadtest.js http://localhost:3001/<code> 1000 50
# args: url, totalRequests (default 500), concurrency (default 25)
```

## Architecture

The server is a Node.js/Express ESM app (`"type": "module"`) with three infrastructure dependencies: PostgreSQL, Redis (optional), and the Node process itself.

**Request flow for redirects (hot path):**
1. `GET /:code` → `LinkService.resolveRedirect`
2. Check `LinkCache` (Redis key `link:<code>`) — returns longUrl, null (miss), or `__NOT_FOUND__` sentinel (negative cache)
3. On miss: check `inFlightLoads` map — if a DB query for this code is already in-flight, await the same Promise (single-flight / stampede protection)
4. Otherwise query Postgres, populate cache, then return
4. Click tracking is **asynchronous** — `ClickCounter` buffers counts in-memory and flushes to Postgres every 2 seconds via `incrementClicksBy`

**Short code generation:** On `POST /api/shorten`, a row is inserted with placeholder code `"_"`, the auto-incremented `id` is encoded to base62, then the row is updated. This avoids needing a separate sequence and keeps codes short.

**Redis is optional** — if `REDIS_URL` is unset, `redis` is `null` and `linkCache` is `null`. All cache paths in `LinkService` guard with `if (this.linkCache)`.

**Layer responsibilities:**
- `src/index.js` — Express routes, wires up all dependencies
- `src/services/linkService.js` — Business logic, cache-aside pattern, single-flight stampede protection (`inFlightLoads` map), URL normalization
- `src/repositories/linkRepository.js` — All SQL queries via `pg` Pool
- `src/cache/linkCache.js` — Redis read/write with TTLs (1hr found, 30s not-found)
- `src/metrics/clickCounter.js` — In-memory click buffer with periodic flush; swaps buffer on flush to avoid dropping clicks
- `src/metrics/cacheMetrics.js` — In-process hit/miss counters, exposed via `GET /api/stats`
- `src/base62.js` — Encodes numeric IDs to base62 short codes

**Environment variables:**
- `DATABASE_URL` — Postgres connection string (required)
- `REDIS_URL` — Redis connection string (optional; disables caching if absent)
- `PORT` — API port (default `3000`; Docker Compose uses `3001`)
- `BASE_URL` — Used to build `shortUrl` in responses (default `http://localhost:<PORT>`)

**Database schema** (`db/init.sql`):
```sql
links(id BIGSERIAL PK, code VARCHAR(16) UNIQUE, long_url TEXT, created_at TIMESTAMPTZ, clicks BIGINT)
```
Index on `code` column for fast redirect lookups.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/shorten` | Create short link, body: `{ "url": "..." }` |
| `GET` | `/:code` | Redirect (302) to long URL |
| `GET` | `/api/links/:code` | Link details with click count |
| `GET` | `/api/links` | List recent links (`?limit=N`, max 200) |
| `GET` | `/api/stats` | Aggregate stats + cache hit ratio |
| `GET` | `/health` | Health check |
