// src/lib/devlog.ts
export function devlog(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
