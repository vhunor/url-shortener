import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

export const redis = REDIS_URL
  ? createClient({ url: REDIS_URL })
  : null;

const CONNECT_TIMEOUT_MS = 5000;

/**
 * Connects the Redis client with a timeout guard. No-ops if REDIS_URL is unset.
 * Logs an error event on the client rather than throwing on connection drops.
 */
export async function initRedis() {
  if (!redis) {
    return;
  }

  redis.on("error", (err) => {
    console.error("Redis client error:", err);
  });

  await Promise.race([
    redis.connect(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timeout")), CONNECT_TIMEOUT_MS)
    )
  ]);

  console.log("Connected to Redis");
}
