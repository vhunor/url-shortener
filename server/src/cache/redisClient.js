import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

export const redis = REDIS_URL
  ? createClient({ url: REDIS_URL })
  : null;

export async function initRedis() {
  if (!redis) return;

  redis.on("error", (err) => {
    console.error("Redis client error:", err);
  });

  await redis.connect();
  console.log("Connected to Redis");
}
