/**
 * Basic in-memory, fixed-window rate limiter — brute-force protection for
 * login attempts. Deliberately simple: per-process memory, no persistence.
 * That means limits reset on a server restart and aren't shared across
 * multiple instances, which is an accepted tradeoff for "basic" protection
 * on a small, single-instance deployment rather than a distributed one.
 */

type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Prevents `attempts` from growing forever from one-off/garbage keys (typos,
 * scanners) — swept lazily on each call rather than on a timer, since this
 * runs in a serverless-friendly request-driven environment. */
function sweepExpired(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/** Records one attempt for `key` and reports whether it's within the limit.
 * Call this once per login attempt, before checking credentials, so a
 * sustained guessing attempt against one identifier gets throttled
 * regardless of whether any individual guess is right. */
export function recordLoginAttempt(key: string): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clears a key's attempt count — call on successful login so a user who
 * mistyped their password a couple of times isn't left half-throttled. */
export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}

/** Test-only: resets all state so tests don't leak counts across cases. */
export function __resetRateLimiterForTests() {
  attempts.clear();
}
