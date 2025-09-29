// src/lib/abs.ts
export function abs(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
  // Guarantees an absolute URL no matter what we pass
  return new URL(path, base).toString();
}
