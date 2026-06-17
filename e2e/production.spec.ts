import { test, expect } from "@playwright/test";

const apiURL = process.env.PLAYWRIGHT_API_URL || "https://coffee-shop-api.brewbean.workers.dev";

test("homepage loads live statistics from production API", async ({ page }) => {
  const statsPromise = page.waitForResponse(
    (res) => res.url().includes("/v1/stats") && res.status() === 200,
  );
  await page.goto("/");
  const statsRes = await statsPromise;
  const stats = await statsRes.json();
  expect(stats.data.menuCount).toBeGreaterThan(0);

  await expect(page.getByRole("heading", { name: /drinks? on the menu/i })).toBeVisible({
    timeout: 15_000,
  });
});

test("catalog loads database products", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: /drinks made to order/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cold Brew" })).toBeVisible({ timeout: 15_000 });
});

test("product can be added to cart and persists after refresh", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.goto("/cart");
  await expect(page.getByText(/Cold Brew|House Latte|Matcha/i)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Cold Brew|House Latte|Matcha/i)).toBeVisible();
});

test("checkout validation requires email", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.goto("/checkout");
  const email = page.getByLabel(/email for receipt/i);
  await expect(email).toHaveAttribute("required", "");
  await expect(email).toHaveAttribute("type", "email");
});

test("admin API rejects unauthenticated access", async ({ request }) => {
  const res = await request.get(`${apiURL}/v1/admin/stats`);
  expect(res.status()).toBe(403);
});

test("contact form submission works", async ({ request }) => {
  const res = await request.post(`${apiURL}/v1/contact`, {
    data: {
      name: "Playwright",
      email: `playwright-${Date.now()}@example.com`,
      subject: "E2E",
      message: `Automated contact form test ${Date.now()}.`,
    },
  });
  expect([200, 429]).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(body.data.ok).toBe(true);
  }
});

test("success page shows processing state for unknown session", async ({ page }) => {
  await page.goto("/success?session_id=cs_test_missing_session");
  await expect(page.getByText(/processing your payment/i)).toBeVisible();
});

test("mobile navigation works", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Menu", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog/);
});
