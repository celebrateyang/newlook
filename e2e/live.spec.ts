import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { readFile } from "node:fs/promises";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { state } from "./safety";

test("real development services: upload, advice, preview, reload, downloads, ownership and deletion", async ({ page, browser }) => {
  test.setTimeout(1_500_000); // Includes the real 15-minute storage deletion grace period.
  const data = await state();
  await page.goto("/en/upload");
  await clerk.signIn({ page, emailAddress: data.users[0].email });
  await page.reload();
  await page.getByLabel("Upload your selfie", { exact: true }).setInputFiles("public/images/hairstyles/catalog/french-bob-v1.webp");
  const [uploadResponse, analysisResponse] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith("/api/uploads/complete") && r.request().method() === "POST", { timeout: 60_000 }),
    page.waitForResponse(r => r.url().endsWith("/api/analysis") && r.request().method() === "POST", { timeout: 180_000 }),
    page.getByRole("button", { name: /Recommend styles for me/ }).click(),
  ]);
  expect(uploadResponse.ok()).toBe(true);
  const { uploadId } = await uploadResponse.json();
  const sourceKey = uploadResponse.request().postDataJSON().key as string;
  expect(analysisResponse.ok()).toBe(true);
  expect((await analysisResponse.json()).consultationId).toBeTruthy();
  console.log("Development upload and real analysis passed.");
  const generated = page.waitForResponse(r => r.url().endsWith("/api/generations") && r.request().method() === "POST", { timeout: 300_000 });
  await page.locator("#recommendations button").first().click();
  const generationResponse = await generated;
  expect(generationResponse.ok()).toBe(true);
  const result = await generationResponse.json();
  const id = result.generationId as string;
  console.log("Real image generation passed.");
  await page.goto(`/en/results/${id}`);
  await expect(page.getByRole("button", { name: "Compare with original", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Compare with original", exact: true }).click();
  await expect(page.getByAltText("Original selfie", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Looks usable to me", exact: true }).click();
  await expect(page.getByRole("button", { name: "Looks usable to me", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Looks usable to me", exact: true })).toHaveAttribute("aria-pressed", "true");
  for (const label of ["Download this view (JPG)", "Download guide PDF", "Download salon pack"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: label, exact: true }).click();
    const file = await download;
    expect(await file.failure()).toBeNull();
    const bytes = await readFile((await file.path())!);
    expect(bytes.length).toBeGreaterThan(100);
    if (label.includes("PDF")) expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    else if (label.includes("pack")) expect(bytes.subarray(0, 2).toString()).toBe("PK");
    else expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
  }
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("http://localhost:3000/en");
  await clerk.signIn({ page: otherPage, emailAddress: data.users[1].email });
  expect((await otherPage.request.get(`/api/generations/${id}`)).status()).toBe(404);
  const forbidden = await otherPage.request.delete("/api/privacy", { headers: { Origin: "http://localhost:3000" }, data: { scope: "upload", id: uploadId, confirm: "DELETE" } });
  expect(forbidden.ok()).toBe(false);
  expect((await page.request.get(`/api/generations/${id}`)).ok()).toBe(true);
  await other.close();
  console.log("Persistence, JPG/PDF/ZIP downloads and cross-account access checks passed.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/zh/results/${id}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/zh/settings/privacy");
  await page.getByRole("button", { name: "保留此照片，取消自动清理", exact: true }).click();
  await expect(page.getByText("你已选择保留此照片，直到你主动删除。", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "删除照片及关联结果", exact: true }).click();
  await page.getByRole("textbox", { name: /DELETE/ }).fill("DELETE");
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.getByAltText("私密上传的照片", { exact: true })).toHaveCount(0);
  expect((await page.request.get(`/api/generations/${id}`)).status()).toBe(404);
  await page.getByRole("button", { name: "删除账户及数据", exact: true }).click();
  await page.getByRole("textbox", { name: /DELETE/ }).fill("DELETE");
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page).toHaveURL(/settings\/deletion-status/);
  const receipt = await page.getByRole("textbox").inputValue();
  expect(receipt).toMatch(/^[a-f0-9]{64}$/);
  console.log("Owner deletion accepted; waiting for the real storage grace period.");
  await expect.poll(async () => {
    const response = await page.request.get("/api/privacy/account-status", { headers: { Authorization: `Bearer ${receipt}` } });
    return response.ok() && (await response.json()).complete;
  }, { timeout: 1_200_000, intervals: [15_000] }).toBe(true);
  const r2 = new S3Client({ region: "auto", endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
  for (const key of [sourceKey, ...result.results.map((r: { key: string }) => r.key)]) {
    let status = 200;
    try { await r2.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key })); }
    catch (error) { status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode ?? 0; }
    expect(status).toBe(404);
  }
});
