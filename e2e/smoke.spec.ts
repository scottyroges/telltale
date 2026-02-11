import { test, expect } from "@playwright/test";

test("homepage has title visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Telltale" })).toBeVisible();
});
