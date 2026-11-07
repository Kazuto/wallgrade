/** Counts failures per key, e.g. wrong passwords per username, and refuses more than limit within window. */
export function createThrottle(limit: number, windowMs: number) {
  const failures = new Map<string, number[]>();

  const recent = (key: string, now: number) =>
    (failures.get(key) ?? []).filter((time) => time > now - windowMs);

  return {
    /** Milliseconds until key may try again, 0 when it may now. */
    wait(key: string, now = Date.now()): number {
      const times = recent(key, now);

      return times.length < limit ? 0 : times[0]! + windowMs - now;
    },

    fail(key: string, now = Date.now()) {
      failures.set(key, [...recent(key, now), now]);

      // Keys of the past would otherwise pile up, one per name ever tried.
      if (failures.size > 10_000) {
        for (const old of failures.keys()) {
          if (recent(old, now).length === 0) {
            failures.delete(old);
          }
        }
      }
    },

    reset(key: string) {
      failures.delete(key);
    },
  };
}
