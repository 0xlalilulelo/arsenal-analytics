/**
 * Simple in-memory rate limiter.
 *
 * NOTE: This works within a single process instance only.
 * For production serverless deployments, replace with a Redis-backed
 * implementation (Upstash Ratelimit + Vercel KV) to enforce limits
 * across all instances.
 *
 * Usage:
 *   const result = rateLimit(`login:${ip}:${email}`, 5, 900);
 *   if (!result.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * @param identifier  Unique key (e.g. "login:127.0.0.1:user@example.com")
 * @param limit       Max requests allowed in the window
 * @param windowSecs  Window duration in seconds
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowSecs: number,
): { allowed: boolean; remaining: number; retryAfterSecs: number } {
  const now = Date.now();

  let entry = store.get(identifier);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowSecs * 1000 };
  }

  if (entry.count >= limit) {
    store.set(identifier, entry);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSecs: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  store.set(identifier, entry);

  // Periodic cleanup of expired entries to prevent unbounded growth
  if (store.size > 5000) {
    for (const [k, v] of store.entries()) {
      if (now >= v.resetAt) store.delete(k);
    }
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    retryAfterSecs: 0,
  };
}
