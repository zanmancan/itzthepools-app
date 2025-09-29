import { test, expect } from "@playwright/test";

test.describe("Health probe", () => {
  test("GET /api/test/health returns ok and sane fields", async ({ request }) => {
    const resp = await request.get("/api/test/health");
    expect(resp.ok(), "Health endpoint should return 200").toBeTruthy();

    const data = await resp.json();
    expect(data?.ok, "ok should be true").toBe(true);
    expect(typeof data?.now).toBe("string");

    // Check ISO timestamp shape (lightweight)
    const date = new Date(data.now);
    expect(isNaN(date.getTime()), "now should be a valid ISO date").toBe(false);

    // These are informative and optional; just sanity-check types.
    if (data.nodeEnv !== null) expect(typeof data.nodeEnv).toBe("string");
    if (data.e2eSafety !== null) expect(typeof data.e2eSafety).toBe("string");
    if (data.useSupabase !== null) expect(typeof data.useSupabase).toBe("string");
    if (data.commit !== null) expect(typeof data.commit).toBe("string");
    if (data.port !== null) expect(typeof data.port).toBe("string");
  });
});
