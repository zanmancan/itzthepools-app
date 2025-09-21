/* src/lib/devlog.ts
   -------------------------------------------------------------
   Minimal dev logger that’s safe in both server & client code.
   - Enabled automatically in development.
   - In production, enable with NEXT_PUBLIC_DEBUG=1 (or "true").
   - Never throws; logs are no-ops when disabled.
   - Pretty error helpers + timers for quick profiling.
   ------------------------------------------------------------- */

/* eslint-disable no-console */

// prod toggle via env
const DEBUG_FLAG =
  (typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_DEBUG === "1" ||
      (process.env.NEXT_PUBLIC_DEBUG || "").toLowerCase() === "true")) ||
  false;

let ENABLED =
  (typeof process !== "undefined" && process.env.NODE_ENV !== "production") ||
  DEBUG_FLAG;

/** Toggle at runtime (handy in tests). */
export function setDevlogEnabled(on: boolean) {
  ENABLED = !!on;
}

/** Is logging currently enabled? */
export function isDevlogEnabled() {
  return ENABLED;
}

/** Safely stringify anything (handles cycles + Error objects). */
function safeStringify(value: unknown) {
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      value,
      (_k, v: any) => {
        if (typeof v === "object" && v !== null) {
          if (seen.has(v)) return "[Circular]";
          seen.add(v);
        }
        if (v instanceof Error) {
          return { name: v.name, message: v.message, stack: v.stack };
        }
        return v;
      },
      2
    );
  } catch {
    try {
      return String(value);
    } catch {
      return "[Unserializable]";
    }
  }
}

/** HH:MM:SS.mmm */
function ts() {
  const d = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3
  )}`;
}

/** Internal printer (styling in browsers, plaintext in Node). */
function print(
  kind: "log" | "warn" | "error" | "info",
  label: string,
  args: any[]
) {
  if (!ENABLED) return;

  // If one object => pretty print that one thing
  const singleObject =
    args.length === 1 && typeof args[0] === "object" ? args[0] : null;

  const c: any = console; // avoid TS noise for dynamic access

  if (typeof window !== "undefined") {
    // Browser: colorized prefix
    const prefix = `%c[dev ${label}]%c ${ts()}`;
    const styleA =
      kind === "error"
        ? "color:#ef4444;font-weight:600"
        : kind === "warn"
        ? "color:#f59e0b;font-weight:600"
        : "color:#22c55e;font-weight:600";
    const styleB = "color:#9ca3af;font-weight:400";

    if (singleObject) {
      const payload = safeStringify(singleObject);
      c[kind](prefix, styleA, styleB, payload);
    } else {
      c[kind](prefix, styleA, styleB, ...args);
    }
  } else {
    // Node: simple prefix
    const prefix = `[dev ${label}] ${ts()}`;
    if (singleObject) {
      c[kind](prefix, safeStringify(singleObject));
    } else {
      c[kind](prefix, ...args);
    }
  }
}

/** General purpose log */
export function devlog(...args: any[]) {
  print("log", "log", args);
}

/** Warning */
export function devwarn(...args: any[]) {
  print("warn", "warn", args);
}

/** Error (pretty Error extraction) */
export function deverror(scope: string, err?: unknown, extra?: unknown) {
  if (!ENABLED) return;
  const payload =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack, extra }
      : err !== undefined
      ? { error: err, extra }
      : extra !== undefined
      ? { extra }
      : undefined;
  print("error", scope, payload ? [payload] : []);
}

/** Quick timing: devtime('block'); ... devtimeEnd('block') */
const timers = new Map<string, number>();
export function devtime(label: string) {
  if (!ENABLED) return;
  timers.set(label, Date.now());
  print("info", "time", [`${label} …`]);
}
export function devtimeEnd(label: string) {
  if (!ENABLED) return;
  const start = timers.get(label);
  const ms = start ? Date.now() - start : 0;
  timers.delete(label);
  print("info", "time", [`${label} ${ms}ms`]);
}

/** Assertion that only throws when logging is enabled. */
export function devassert(cond: any, message = "Assertion failed") {
  if (!ENABLED) return;
  if (!cond) {
    const e = new Error(message);
    deverror("assert", e);
    throw e;
  }
}

/** Helper to standardize caught error reporting */
export function report(scope: string, e: unknown) {
  deverror(scope, e);
}
