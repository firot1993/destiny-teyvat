import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
}

function getUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Lazy-initialized Redis client — null if env vars not set (dev without Upstash)
let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    _redis = url && token ? new Redis({ url, token }) : null;
  }
  return _redis;
}

// Lazy-initialized per-IP limiter (30 req/min sliding window)
let _perIpLimiter: Ratelimit | null | undefined;
function getPerIpLimiter(): Ratelimit | null {
  if (_perIpLimiter === undefined) {
    const redis = getRedis();
    _perIpLimiter = redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(30, "1 m"),
          prefix: "destiny-rl",
        })
      : null;
  }
  return _perIpLimiter;
}

export async function checkPerIpLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getPerIpLimiter();
  if (!limiter) return { allowed: true, limit: 30, remaining: 30 };

  const result = await limiter.limit(ip);
  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
  };
}

export async function checkAndConsumeDaily(
  max: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return { allowed: true, limit: max, remaining: max };

  const key = `destiny-daily:${getUtcDateKey()}`;
  const count = await redis.incr(key);

  // Set TTL on the first increment of each day
  if (count === 1) {
    const now = new Date();
    const endOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    );
    const ttlSeconds = Math.ceil((endOfDay.getTime() - now.getTime()) / 1000);
    await redis.expire(key, ttlSeconds);
  }

  const remaining = Math.max(0, max - count);
  return { allowed: count <= max, limit: max, remaining };
}
