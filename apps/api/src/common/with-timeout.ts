/**
 * Races `promise` against a timeout, rejecting if it doesn't settle in time.
 * Shared so a bounded async check (health, future dependency probes) doesn't
 * each hand-roll setTimeout/clearTimeout bookkeeping -- and risk forgetting
 * the clearTimeout, which leaks a timer for the full duration on every call.
 *
 * This bounds how long the CALLER waits; it does not cancel `promise` itself.
 * For a DB query specifically, that means a slow (not dead) query keeps
 * running server-side and holding its connection after the caller gives up
 * on it -- true cancellation would need query-level abort support the
 * underlying client doesn't expose here. Accepted for a health check: it's
 * polled occasionally, not a hot path, and this is the same tradeoff most
 * client-side timeout patterns make industry-wide.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
