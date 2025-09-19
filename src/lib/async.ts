// src/lib/async.ts
/** Explicitly mark a promise as intentionally not awaited (with catch). */
export function fireAndForget<T>(p: Promise<T>): void {
  // You can centralize telemetry here later
  void p.catch((err) => {
    // don't spam, but at least log during dev:
    // eslint-disable-next-line no-console
    console.error(err);
  });
}
