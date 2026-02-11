import { test, expect } from "@playwright/test";

test.describe("auth", () => {
  test("/dashboard without auth redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/login renders Google sign-in button", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });

  test("/login?error=OAuthCallbackError shows error alert", async ({
    page,
  }) => {
    await page.goto("/login?error=OAuthCallbackError");
    await expect(
      page.getByText(/something went wrong/i),
    ).toBeVisible();
  });

  test("/ is accessible without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Telltale")).toBeVisible();
  });
});
