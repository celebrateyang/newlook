import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createHmac } from "node:crypto";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { MEDIA_DELETE_GRACE_MS, MEDIA_RETENTION_MS, MEDIA_REVIEW_MS, mediaHash } from "../shared/media";
const mock = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({ S3Client: class { send = mock.send; }, DeleteObjectCommand: class { constructor(public input: unknown) {} }, ListObjectsV2Command: class { constructor(public input: unknown) {} } }));
const modules = {
  "../convex/_generated/server.js": () => import("../convex/_generated/server"),
  "../convex/privacy.ts": () => import("../convex/privacy"),
  "../convex/mediaCleanup.ts": () => import("../convex/mediaCleanup"),
  "../convex/quality.ts": () => import("../convex/quality"),
  "../convex/uploads.ts": () => import("../convex/uploads"),
  "../convex/generations.ts": () => import("../convex/generations"),
  "../convex/shares.ts": () => import("../convex/shares"),
  "../convex/polls.ts": () => import("../convex/polls"),
};
const provider = { provider: "openai", model: "test", promptVersion: "test" };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-27T12:00:00Z")); mock.send.mockReset().mockResolvedValue({}); for (const key of ["CLOUDFLARE_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]) vi.stubEnv(key, "test"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
async function setup() {
  const t = convexTest(schema, modules), owner = t.withIdentity({ subject: "user_owner" }), other = t.withIdentity({ subject: "user_other" });
  const userId = await t.run(ctx => ctx.db.insert("users", { clerkId: "user_owner", locale: "en", credits: 0, createdAt: Date.now() }));
  const key = "uploads/user_user_owner/original_test.jpg";
  await owner.mutation(api.privacy.registerObject, { key });
  const uploadId = await owner.mutation(api.uploads.recordCompleted, { type: "original", r2Key: key, mimeType: "image/jpeg", size: 100 });
  const generationId = await owner.mutation(api.generations.start, { uploadKey: key, styleSlug: "french-bob", ...provider });
  const resultKey = `generations/user_user_owner/gen_${generationId}_front.webp`;
  await owner.mutation(api.privacy.registerObject, { key: resultKey });
  await owner.mutation(api.generations.complete, { generationId, r2Keys: [resultKey], durationMs: 1 });
  const resultId = (await owner.query(api.generations.getMine, { generationId }))!.results[0]._id;
  return { t, owner, other, userId, key, uploadId, generationId, resultKey, resultId };
}
test("another user and unauthenticated callers cannot delete media or store quality reviews", async () => {
  const { t, owner, other, uploadId, generationId, resultId } = await setup();
  await expect(t.mutation(api.privacy.erase, { scope: "media" })).rejects.toThrow("Unauthenticated");
  await expect(other.mutation(api.privacy.erase, { scope: "upload", id: uploadId })).rejects.toThrow();
  await expect(other.mutation(api.privacy.erase, { scope: "generation", id: generationId })).rejects.toThrow();
  await expect(other.mutation(api.quality.review, { resultId, verdict: "usable" })).rejects.toThrow("Result not found");
  expect(await owner.query(api.generations.getMine, { generationId })).not.toBeNull();
});
test("media registration rejects traversal, extra path segments and another owner's keys", async () => {
  const { owner } = await setup();
  for (const key of ["uploads/user_user_other/original_private.jpg", "uploads/user_user_owner/../original_private.jpg", "uploads/user_user_owner/original_%2fprivate.jpg", "uploads/user_user_owner/nested/original_private.jpg"]) await expect(owner.mutation(api.privacy.registerObject, { key })).rejects.toThrow("Invalid media ownership");
});
test("deleting a result revokes single and comparison shares but retains its source and quota", async () => {
  const { t, owner, uploadId, generationId, resultId } = await setup();
  const secondId = await owner.mutation(api.generations.start, { uploadKey: "uploads/user_user_owner/original_test.jpg", styleSlug: "long-bob", ...provider });
  await owner.mutation(api.generations.complete, { generationId: secondId, r2Keys: [`generations/user_user_owner/gen_${secondId}_front.webp`], durationMs: 1 });
  const secondResult = (await owner.query(api.generations.getMine, { generationId: secondId }))!.results[0]._id;
  await owner.mutation(api.shares.enable, { resultId, token: "a".repeat(48) });
  await owner.mutation(api.polls.create, { resultIds: [resultId, secondResult], token: "b".repeat(48), title: "" });
  await owner.mutation(api.quality.review, { resultId, verdict: "face_changed" });
  await owner.mutation(api.privacy.erase, { scope: "generation", id: generationId });
  expect(await t.query(api.shares.publicResult, { token: "a".repeat(48) })).toBeNull();
  expect(await t.query(api.polls.publicPoll, { token: "b".repeat(48) })).toBeNull();
  expect(await owner.query(api.generations.getMine, { generationId })).toBeNull();
  expect(await t.run(ctx => ctx.db.get(uploadId))).not.toBeNull();
  expect((await owner.query(api.generations.quotaMine, {})).used).toBe(2);
  expect(await owner.query(api.quality.mine, { resultId })).toBeNull();
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});
test("source deletion removes dependent results and metadata, then retries failed R2 cleanup", async () => {
  const { t, owner, uploadId, generationId } = await setup();
  await owner.mutation(api.privacy.erase, { scope: "upload", id: uploadId });
  expect(await owner.query(api.generations.getMine, { generationId })).toBeNull();
  expect((await owner.query(api.privacy.summary, {})).pendingFiles).toBe(2);
  await t.action(internal.mediaCleanup.drain, {});
  expect(mock.send).not.toHaveBeenCalled();
  mock.send.mockRejectedValue(new Error("R2 unavailable"));
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect((await owner.query(api.privacy.summary, {})).retryingFiles).toBe(2);
  mock.send.mockResolvedValue({});
  vi.advanceTimersByTime(60_001);
  await t.action(internal.mediaCleanup.drain, {});
  expect((await owner.query(api.privacy.summary, {})).pendingFiles).toBe(0);
});
test("expired uncompleted uploads are removed while a saved result retains its source", async () => {
  const { t, owner, uploadId } = await setup();
  const unused = "references/user_user_owner/reference_unused.jpg";
  await owner.mutation(api.privacy.registerObject, { key: unused });
  await owner.mutation(api.uploads.recordCompleted, { type: "reference", r2Key: unused, mimeType: "image/jpeg", size: 100 });
  vi.advanceTimersByTime(MEDIA_RETENTION_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  expect(await t.run(ctx => ctx.db.get(uploadId))).not.toBeNull();
  expect((await owner.query(api.privacy.summary, {})).uploads).toHaveLength(2);
  expect((await owner.query(api.privacy.summary, {})).uploads.find(u => u.r2Key === unused)?.reviewUntil).toBe(Date.now() + MEDIA_REVIEW_MS);
  vi.advanceTimersByTime(MEDIA_REVIEW_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  expect((await owner.query(api.privacy.summary, {})).uploads).toHaveLength(1);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});
test("account deletion is idempotent and stale credentials cannot recreate deleted media", async () => {
  const { t, owner, generationId, key } = await setup();
  await owner.mutation(api.privacy.erase, { scope: "account" });
  expect(await owner.query(api.generations.getMine, { generationId })).toBeNull();
  await expect(owner.mutation(api.privacy.registerObject, { key: "uploads/user_user_owner/original_new.jpg" })).rejects.toThrow("Account deletion requested");
  await expect(owner.mutation(api.uploads.recordCompleted, { type: "original", r2Key: key, mimeType: "image/jpeg", size: 100 })).rejects.toThrow("Account deletion requested");
  await owner.mutation(api.privacy.erase, { scope: "account" });
  expect(await t.run(ctx => ctx.db.query("users").collect())).toHaveLength(0);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});
test("only signed, fresh webhook proofs can delete an account", async () => {
  const { t, owner, generationId } = await setup();
  vi.stubEnv("SHARING_SIGNING_SECRET", "s".repeat(40));
  const issuedAt = Date.now(), clerkId = "user_owner";
  await expect(t.mutation(api.privacy.eraseFromWebhook, { clerkId, issuedAt, signature: "0".repeat(64) })).rejects.toThrow("Invalid deletion proof");
  expect(await owner.query(api.generations.getMine, { generationId })).not.toBeNull();
  const signature = createHmac("sha256", "s".repeat(40)).update(`newself-account-deletion-v1|${clerkId}|${issuedAt}`).digest("hex");
  await t.mutation(api.privacy.eraseFromWebhook, { clerkId, issuedAt, signature });
  expect(await owner.query(api.generations.getMine, { generationId })).toBeNull();
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

test("legacy adoption registers only database-owned files and keeps saved sources", async () => {
  const { t, owner, uploadId } = await setup();
  await t.run(async ctx => { for (const object of await ctx.db.query("mediaObjects").collect()) await ctx.db.delete(object._id); });
  await t.mutation(internal.privacy.adoptLegacyMedia, { kind: "uploads" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run(ctx => ctx.db.query("mediaObjects").collect())).toHaveLength(2);
  vi.advanceTimersByTime(MEDIA_RETENTION_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  expect(await t.run(ctx => ctx.db.get(uploadId))).not.toBeNull();
  expect((await owner.query(api.privacy.summary, {})).pendingFiles).toBe(0);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

test("deleting a side photo removes its dependent result, and deleted generations cannot recreate outputs", async () => {
  const { t, owner, userId, generationId } = await setup();
  const key = "uploads/user_user_owner/side_test.jpg";
  const uploadId = await t.run(ctx => ctx.db.insert("uploads", { userId, type: "side", r2Key: key, mimeType: "image/jpeg", size: 100, createdAt: Date.now() }));
  await owner.mutation(api.generations.startSide, { generationId, uploadKey: key });
  await owner.mutation(api.generations.appendSideResult, { generationId, uploadKey: key, r2Key: `generations/user_user_owner/gen_${generationId}_side_test.webp`, durationMs: 1 });
  await owner.mutation(api.privacy.erase, { scope: "upload", id: uploadId });
  expect(await owner.query(api.generations.getMine, { generationId })).toBeNull();
  await expect(owner.mutation(api.privacy.registerObject, { key: `generations/user_user_owner/gen_${generationId}_late.webp` })).rejects.toThrow("Generation no longer available");
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

test("legacy side previews protect unresolved side sources only within their owner's history", async () => {
  const { t, owner, other, userId, generationId } = await setup();
  const legacyKey = "uploads/user_user_owner/side_legacy.jpg";
  const otherKey = "uploads/user_user_other/side_unused.jpg";
  await t.run(async ctx => {
    await ctx.db.insert("uploads", { userId, type: "side", r2Key: legacyKey, mimeType: "image/jpeg", size: 100, createdAt: Date.now() });
    await ctx.db.insert("generationResults", { generationId, r2Key: `generations/user_user_owner/gen_${generationId}_legacy.webp`, view: "side", selected: false, createdAt: Date.now() });
  });
  await owner.mutation(api.privacy.registerObject, { key: legacyKey });
  await other.mutation(api.privacy.registerObject, { key: otherKey });
  await other.mutation(api.uploads.recordCompleted, { type: "side", r2Key: otherKey, mimeType: "image/jpeg", size: 100 });
  vi.advanceTimersByTime(MEDIA_RETENTION_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  vi.advanceTimersByTime(MEDIA_REVIEW_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  expect((await owner.query(api.privacy.summary, {})).uploads.some(upload => upload.r2Key === legacyKey)).toBe(true);
  expect((await owner.query(api.privacy.summary, {})).pendingFiles).toBe(0);
  expect((await other.query(api.privacy.summary, {})).uploads).toHaveLength(0);
  expect((await other.query(api.privacy.summary, {})).pendingFiles).toBe(1);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

test("owners can cancel automatic expiry and unknown legacy files stay protected", async () => {
  const { t, owner, other, key, userId } = await setup();
  const unused = "uploads/user_user_owner/original_cancel.jpg";
  await owner.mutation(api.privacy.registerObject, { key: unused });
  const uploadId = await owner.mutation(api.uploads.recordCompleted, { type: "original", r2Key: unused, mimeType: "image/jpeg", size: 100 });
  vi.advanceTimersByTime(MEDIA_RETENTION_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  expect((await owner.query(api.privacy.summary, {})).uploads.find(u => u.id === uploadId)?.retentionReason).toBe("unused_grace");
  await expect(other.mutation(api.privacy.keepUpload, { uploadId })).rejects.toThrow("Photo not found");
  await owner.mutation(api.privacy.keepUpload, { uploadId });
  vi.advanceTimersByTime(MEDIA_REVIEW_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  expect((await owner.query(api.privacy.summary, {})).uploads.find(u => u.id === uploadId)?.retentionReason).toBe("kept_by_owner");
  // A legacy object has no trustworthy registration provenance, even if it looks unused.
  const legacy = "references/user_user_owner/reference_old.jpg";
  await t.run(async ctx => { await ctx.db.insert("uploads", { userId, type: "reference", r2Key: legacy, mimeType: "image/jpeg", size: 100, createdAt: 1 }); await ctx.db.insert("mediaObjects", { clerkId: "user_owner", r2Key: legacy, expiresAt: 1, createdAt: 1 }); });
  await t.mutation(internal.privacy.expire, {});
  expect((await owner.query(api.privacy.summary, {})).uploads.find(u => u.r2Key === legacy)?.retentionReason).toBe("legacy_unknown");
  expect((await owner.query(api.privacy.summary, {})).uploads.some(u => u.r2Key === key)).toBe(true);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

test("deletion audit records cause, retries and completion without raw resource identifiers", async () => {
  const { t, owner, uploadId, key } = await setup();
  await owner.mutation(api.privacy.erase, { scope: "upload", id: uploadId });
  mock.send.mockRejectedValue(Error("R2 failed"));
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  let audit = (await owner.query(api.privacy.summary, {})).audit;
  expect(audit.some(a => a.status === "retrying" && a.reason === "user_upload")).toBe(true);
  mock.send.mockResolvedValue({});
  vi.advanceTimersByTime(60_001);
  await t.action(internal.mediaCleanup.drain, {});
  audit = (await owner.query(api.privacy.summary, {})).audit;
  expect(audit.every(a => a.status === "deleted" && a.completedAt)).toBe(true);
  const stored = await t.run(ctx => ctx.db.query("mediaDeletionAudit").collect());
  expect(JSON.stringify(stored)).not.toContain(key);
  expect(JSON.stringify(stored)).not.toContain("user_owner");
});

test("a saved result created during review prevents automatic source removal", async () => {
  const { t, owner } = await setup();
  const key = "uploads/user_user_owner/original_rescue.jpg";
  await owner.mutation(api.privacy.registerObject, { key });
  const uploadId = await owner.mutation(api.uploads.recordCompleted, { type: "original", r2Key: key, mimeType: "image/jpeg", size: 100 });
  vi.advanceTimersByTime(MEDIA_RETENTION_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  const generationId = await owner.mutation(api.generations.start, { uploadKey: key, styleSlug: "french-bob", ...provider });
  await owner.mutation(api.generations.complete, { generationId, r2Keys: [`generations/user_user_owner/gen_${generationId}_front.webp`], durationMs: 1 });
  vi.advanceTimersByTime(MEDIA_REVIEW_MS + 1);
  await t.mutation(internal.privacy.expire, {});
  expect((await owner.query(api.privacy.summary, {})).uploads.find(u => u.id === uploadId)).toMatchObject({ retentionReason: "saved_result" });
  expect((await owner.query(api.privacy.summary, {})).pendingFiles).toBe(0);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
});

test("cleanup leases exclude competing workers and old queues need operator review", async () => {
  const { t, owner, uploadId } = await setup();
  await owner.mutation(api.privacy.erase, { scope: "upload", id: uploadId });
  vi.advanceTimersByTime(MEDIA_DELETE_GRACE_MS + 1);
  const due = await t.query(internal.privacy.due, {});
  expect(await t.mutation(internal.privacy.claim, { id: due[0]._id })).not.toBeNull();
  expect(await t.mutation(internal.privacy.claim, { id: due[0]._id })).toBeNull();
  const oldId = await t.run(ctx => ctx.db.insert("mediaDeletions", { clerkId: "user_owner", r2Key: "uploads/user_user_owner/original_old.jpg", attempts: 0, nextAttemptAt: 1, createdAt: 1 }));
  expect(await t.mutation(internal.privacy.claim, { id: oldId })).toBeNull();
  expect((await t.query(internal.privacy.due, {})).some(row => row._id === oldId)).toBe(false);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run(ctx => ctx.db.get(oldId))).not.toBeNull();
});

test("account deletion receipt survives sign-out, reveals only progress, and requires Clerk confirmation", async () => {
  const { t, owner } = await setup();
  const receiptHash = await mediaHash("receipt-secret");
  await owner.mutation(api.privacy.erase, { scope: "account", receiptHash });
  expect(await t.query(api.privacy.accountStatus, { receiptHash: "0".repeat(64) })).toBeNull();
  const pending = await t.query(api.privacy.accountStatus, { receiptHash });
  expect(pending).toMatchObject({ clerkStatus: "pending", appDataRemoved: true, complete: false, pendingFiles: 2 });
  expect(JSON.stringify(pending)).not.toContain("user_owner");
  vi.stubEnv("SHARING_SIGNING_SECRET", "s".repeat(40));
  const issuedAt = Date.now(), clerkId = "user_owner";
  const signature = createHmac("sha256", "s".repeat(40)).update(`newself-account-deletion-v1|${clerkId}|${issuedAt}`).digest("hex");
  await t.mutation(api.privacy.eraseFromWebhook, { clerkId, issuedAt, signature });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.query(api.privacy.accountStatus, { receiptHash })).toMatchObject({ clerkStatus: "deleted", complete: true, pendingFiles: 0 });
});
