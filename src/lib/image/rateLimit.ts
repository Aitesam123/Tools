import { LIMITS } from "./limits";

/**
 * Simple in-memory sliding-window rate limiter, keyed by client IP.
 * Sufficient for a single-instance deployment; a multi-instance deployment
 * would need a shared store (e.g. Redis) instead.
 */
const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - LIMITS.rateLimit.windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= LIMITS.rateLimit.maxRequests) {
    const oldest = timestamps[0] ?? now;
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterMs: Math.max(0, oldest + LIMITS.rateLimit.windowMs - now) };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= windowStart)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function clientKeyFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
