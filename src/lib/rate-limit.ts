import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;

const store = new Map<string, number[]>();

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const upstashLimiter = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(LIMIT, "10 m"),
      prefix: "md-checker",
      analytics: true,
    })
  : null;

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export async function enforceRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  if (upstashLimiter) {
    const result = await upstashLimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  const now = Date.now();
  // Local fallback keeps dev/testing usable even without external Redis.
  const bucket = store.get(identifier) ?? [];
  const fresh = bucket.filter((timestamp) => now - timestamp <= WINDOW_MS);

  if (fresh.length >= LIMIT) {
    const reset = fresh[0] + WINDOW_MS;
    store.set(identifier, fresh);
    return {
      success: false,
      limit: LIMIT,
      remaining: 0,
      reset,
    };
  }

  fresh.push(now);
  store.set(identifier, fresh);

  return {
    success: true,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - fresh.length),
    reset: now + WINDOW_MS,
  };
}
