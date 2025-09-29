// Tiny file-based persistence so dev workers share “last created” leagues.
import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), ".next", "itz_test_store.json");

type PersistLeague = { id: string; name: string; ownerId: string; ts: number };
type Persist = { leagues: PersistLeague[] };

function readPersist(): Persist {
  try {
    const s = fs.readFileSync(FILE, "utf8");
    const j = JSON.parse(s);
    if (j && Array.isArray(j.leagues)) return { leagues: j.leagues as PersistLeague[] };
  } catch {}
  return { leagues: [] };
}

function writePersist(p: Persist) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(p), "utf8");
  } catch {}
}

export function persistAddLeague(id: string, name: string, ownerId: string) {
  const p = readPersist();
  const rec: PersistLeague = { id, name, ownerId, ts: Date.now() };
  const idx = p.leagues.findIndex((l) => l.id === id);
  if (idx >= 0) p.leagues[idx] = rec;
  else p.leagues.push(rec);
  writePersist(p);
}

export function persistClear() {
  writePersist({ leagues: [] });
}

export function persistGetLeaguesFor(ownerId: string): Array<{ id: string; name: string; ts?: number }> {
  const p = readPersist();
  return p.leagues
    .filter((l) => l.ownerId === ownerId)
    .sort((a, b) => b.ts - a.ts)
    .map(({ id, name, ts }) => ({ id, name, ts }));
}

export function persistGetLeague(id: string): { id: string; name: string } | null {
  const p = readPersist();
  const rec = p.leagues.find((l) => l.id === id);
  return rec ? { id: rec.id, name: rec.name } : null;
}

export function persistGetLatest(): { id: string; name: string; ownerId: string; ts: number } | null {
  const p = readPersist();
  if (!p.leagues.length) return null;
  const latest = [...p.leagues].sort((a, b) => b.ts - a.ts)[0];
  return latest ?? null;
}
