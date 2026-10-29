import { test, expect } from "@playwright/test";
for (const locale of ["en", "zh"]) {
  test(`${locale}: public entry, upload validation and private status`, async ({ page, request }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto(`/${locale}/upload`);
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
    await expect(page.getByText(locale === "zh" ? "请选择 JPG、PNG 或 WebP 图片。" : "Choose a JPG, PNG or WebP image.", { exact: true })).toBeVisible();
    expect((await request.get("/api/privacy")).status()).toBe(401);
    expect((await request.get("/api/privacy/account-status")).status()).toBe(404);
    await page.goto(`/${locale}/settings/deletion-status`);
    await expect(page.locator("h1")).toHaveText(locale === "zh" ? "账户删除进度" : "Account deletion progress");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
}
