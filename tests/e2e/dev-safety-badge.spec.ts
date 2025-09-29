import { test, expect } from "@playwright/test";

/**
 * This spec first asks the *app* (via /api/test/dev-safety) whether the
 * flag is ON or OFF, and only then runs the appropriate assertion.
 *
 * Benefit: no more mismatches between your server terminal and the
 * Playwright terminal. If the app says it's ON, we assert visibility.
 * If the app says it's OFF, we assert absence.
 */

async function appFlagOn(request: import("@playwright/test").APIRequestContext) {
  const resp = await request.get("/api/test/dev-safety");
  expect(resp.ok(), "GET /api/test/dev-safety should be 200").toBeTruthy();
  const data = await resp.json();
  // data.raw is the raw env string; data.on is the strict boolean (raw === "1")
  return Boolean(data?.on);
}

async function gotoHome(page: import("@playwright/test").Page) {
  const res = await page.goto("/", { waitUntil: "networkidle" });
  expect(res?.ok(), "Failed to navigate to '/'").toBeTruthy();
}

test.describe("Dev Safety Badge toggle (app-driven)", () => {
  test("is VISIBLE when app flag is ON", async ({ page, request }) => {
    const on = await appFlagOn(request);
    test.skip(!on, "Skipping: app reports dev-safety flag is OFF");

    await gotoHome(page);
    const badge = page.getByTestId("dev-safety-badge");

    await expect(badge, "Expected dev-safety badge to be visible").toBeVisible();
    await expect(
      badge,
      "Badge should mention DEV or E2E for clarity"
    ).toContainText(/dev|e2e/i);
  });

  test("is ABSENT when app flag is OFF", async ({ page, request }) => {
    const on = await appFlagOn(request);
    test.skip(on, "Skipping: app reports dev-safety flag is ON");

    await gotoHome(page);
    const badge = page.getByTestId("dev-safety-badge");
    await expect(
      badge,
      "Dev safety badge should not exist when flag is OFF"
    ).toHaveCount(0);
  });
});
