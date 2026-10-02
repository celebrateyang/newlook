import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { quotaErrorResponse } from "../src/lib/generations/quota";

const modules = {
  "../convex/_generated/server.js": () => import("../convex/_generated/server"),
  "../convex/generations.ts": () => import("../convex/generations"),
  "../convex/shares.ts": () => import("../convex/shares"),
};
const provider = { provider: "openai", model: "test", promptVersion: "test" };

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const other = t.withIdentity({ subject: "other" });
  await t.run(async ctx => {
    const userId = await ctx.db.insert("users", { clerkId: "owner", locale: "en", credits: 0, createdAt: Date.now() });
    for (const type of ["original", "reference", "side"] as const) await ctx.db.insert("uploads", { userId, type, r2Key: `${type}-key`, mimeType: "image/jpeg", size: 100, createdAt: Date.now() });
  });
  return { t, owner, other };
}

async function savedResult() {
  const context = await setup();
  const generationId = await context.owner.mutation(api.generations.start, { uploadKey: "original-key", styleSlug: "french-bob", ...provider });
  await context.owner.mutation(api.generations.complete, { generationId, r2Keys: [`generations/user_owner/gen_${generationId}_front.webp`], durationMs: 100 });
  const data = await context.owner.query(api.generations.getMine, { generationId });
  return { ...context, generationId, resultId: data!.results[0]._id };
}

afterEach(() => vi.restoreAllMocks());

test("parallel generation requests cannot exceed the daily limit", async () => {
  const { owner } = await setup();
  const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => owner.mutation(api.generations.start, { uploadKey: "original-key", styleSlug: "french-bob", ...provider })));
  expect(outcomes.filter(item => item.status === "fulfilled")).toHaveLength(6);
  const blocked = outcomes.find(item => item.status === "rejected");
  const response = quotaErrorResponse(blocked?.status === "rejected" ? blocked.reason : null);
  expect(response?.status).toBe(429);
  expect(Number(response?.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect(await response?.json()).toMatchObject({ code: "DAILY_GENERATION_LIMIT" });
  expect(await owner.query(api.generations.quotaMine, {})).toMatchObject({ used: 6, remaining: 0 });
});

test("source images cannot be registered as shareable generated results", async () => {
  const { owner } = await setup();
  const generationId = await owner.mutation(api.generations.start, { uploadKey: "original-key", styleSlug: "french-bob", ...provider });
  await expect(owner.mutation(api.generations.complete, { generationId, r2Keys: ["uploads/user_owner/original_photo.jpg"], durationMs: 1 })).rejects.toThrow("Invalid generation completion");
});

test("seventh generation is blocked and another account has independent quota", async () => {
  const { t, owner, other } = await setup();
  for (let i = 0; i < 6; i++) await owner.mutation(api.generations.start, { uploadKey: "original-key", styleSlug: "french-bob", ...provider });
  await expect(owner.mutation(api.generations.start, { uploadKey: "original-key", styleSlug: "french-bob", ...provider })).rejects.toThrow("DAILY_GENERATION_LIMIT");
  expect(await owner.query(api.generations.quotaMine, {})).toMatchObject({ used: 6, remaining: 0 });
  await t.run(async ctx => {
    const userId = await ctx.db.insert("users", { clerkId: "other", locale: "en", credits: 0, createdAt: Date.now() });
    await ctx.db.insert("uploads", { userId, type: "original", r2Key: "other-key", mimeType: "image/jpeg", size: 100, createdAt: Date.now() });
  });
  await other.mutation(api.generations.start, { uploadKey: "other-key", styleSlug: "french-bob", ...provider });
  expect(await other.query(api.generations.quotaMine, {})).toMatchObject({ remaining: 5 });
});

test("try-on, reference, side and failures share the daily allowance", async () => {
  const { owner, generationId } = await savedResult();
  await owner.mutation(api.generations.startSide, { generationId, uploadKey: "side-key" });
  const referenceId = await owner.mutation(api.generations.startReference, { uploadKey: "original-key", referenceUploadKey: "reference-key", ...provider });
  await owner.mutation(api.generations.fail, { generationId: referenceId, durationMs: 100, errorCode: "test_failure" });
  expect(await owner.query(api.generations.quotaMine, {})).toMatchObject({ used: 3, remaining: 3 });
  await expect(owner.mutation(api.generations.startSide, { generationId, uploadKey: "original-key" })).rejects.toThrow("Side upload not found");
  expect(await owner.query(api.generations.quotaMine, {})).toMatchObject({ used: 3 });
});

test("quota resets at Beijing midnight and includes same-day legacy generations", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-02T15:59:59Z"));
  const { t, owner, generationId } = await savedResult();
  await t.run(async ctx => {
    const quotas = await ctx.db.query("generationQuotas").collect();
    for (const quota of quotas) await ctx.db.delete(quota._id);
    const generation = await ctx.db.get(generationId);
    if (generation) {
      const { _id: omittedId, _creationTime: omittedTime, ...fields } = generation;
      void omittedId; void omittedTime;
      for (let i = 0; i < 5; i++) await ctx.db.insert("generations", fields);
    }
  });
  await expect(owner.mutation(api.generations.start, { uploadKey: "original-key", styleSlug: "french-bob", ...provider })).rejects.toThrow("DAILY_GENERATION_LIMIT");
  now.mockReturnValue(Date.parse("2026-10-02T16:00:00Z"));
  expect(await owner.query(api.generations.quotaMine, {})).toMatchObject({ remaining: 6, resetAt: Date.parse("2026-10-03T16:00:00Z") });
  await owner.mutation(api.generations.start, { uploadKey: "original-key", styleSlug: "french-bob", ...provider });
  expect(await owner.query(api.generations.quotaMine, {})).toMatchObject({ remaining: 5 });
});

test("sharing requires ownership, exposes only output and revokes old tokens", async () => {
  const { t, owner, other, resultId } = await savedResult();
  const token = "a".repeat(48);
  expect(await t.query(api.shares.publicResult, { token })).toBeNull();
  await expect(other.mutation(api.shares.enable, { resultId, token })).rejects.toThrow("Result not found");
  await owner.mutation(api.shares.enable, { resultId, token });
  const publicData = await t.query(api.shares.publicResult, { token });
  expect(Object.keys(publicData!).sort()).toEqual(["average", "count", "name", "nameZh", "r2Key"]);
  await expect(other.mutation(api.shares.disable, { resultId })).rejects.toThrow("Result not found");
  await owner.mutation(api.shares.disable, { resultId });
  expect(await t.query(api.shares.publicResult, { token })).toBeNull();
  await owner.mutation(api.shares.enable, { resultId, token: "b".repeat(48) });
  expect(await t.query(api.shares.publicResult, { token })).toBeNull();
  expect(await t.query(api.shares.publicResult, { token: "b".repeat(48) })).not.toBeNull();
});

test("ratings require login, reject self-votes and update instead of duplicating", async () => {
  const { t, owner, other, resultId } = await savedResult();
  const token = "a".repeat(48);
  await owner.mutation(api.shares.enable, { resultId, token });
  await expect(t.mutation(api.shares.rate, { token, score: 5 })).rejects.toThrow("Unauthenticated");
  await expect(owner.mutation(api.shares.rate, { token, score: 5 })).rejects.toThrow("Ask a friend");
  await expect(other.mutation(api.shares.rate, { token, score: 6 })).rejects.toThrow("Choose a score");
  expect(await other.mutation(api.shares.rate, { token, score: 5 })).toMatchObject({ count: 1, average: 5 });
  expect(await other.mutation(api.shares.rate, { token, score: 3 })).toMatchObject({ count: 1, average: 3 });
  const friend = t.withIdentity({ subject: "friend" });
  expect(await friend.mutation(api.shares.rate, { token, score: 5 })).toMatchObject({ count: 2, average: 4 });
  await owner.mutation(api.shares.disable, { resultId });
  await expect(other.mutation(api.shares.rate, { token, score: 2 })).rejects.toThrow("Share unavailable");
});
