import { convexTest } from "convex-test";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { votePayload, type VoteProof } from "../convex/anonymousVotes";
const secret = "test-only-signing-secret-for-ratings-123456";
const token = "c".repeat(48);
const modules = { "../convex/_generated/server.js": () => import("../convex/_generated/server"), "../convex/generations.ts": () => import("../convex/generations"), "../convex/polls.ts": () => import("../convex/polls"), "../convex/shares.ts": () => import("../convex/shares") };
beforeEach(() => vi.stubEnv("SHARING_SIGNING_SECRET", secret));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function proof(overrides: Partial<Omit<VoteProof, "signature">> = {}): VoteProof {
  const payload = { kind: "poll" as const, token, index: 0, score: 5, voterId: "anon:visitor1", networkId: "a".repeat(64), accountId: "", issuedAt: Date.now(), ...overrides };
  return { ...payload, signature: createHmac("sha256", secret).update(votePayload(payload)).digest("hex") };
}
async function setup() {
  const t = convexTest(schema, modules), owner = t.withIdentity({ subject: "owner" }), other = t.withIdentity({ subject: "other" });
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert("users", { clerkId: "owner", locale: "en", credits: 0, createdAt: Date.now() });
    const uploadId = await ctx.db.insert("uploads", { userId, type: "original", r2Key: "private-selfie", mimeType: "image/jpeg", size: 100, createdAt: Date.now() });
    const hairstyleId = await ctx.db.insert("hairstyles", { slug: "test", nameEn: "Test look", nameZh: "测试发型", gender: "unisex", category: "short", length: "short", texture: [], maintenanceLevel: "low", requiresPerm: false, requiresColor: false, minHairLength: "short", recommendedFaceShapes: [], notRecommendedFaceShapes: [], recommendedDensity: [], recommendedTexture: [], referenceImages: [], promptTemplate: "test", active: true, createdAt: Date.now() });
    const resultIds = [];
    for (let i = 0; i < 3; i++) {
      const generationId = await ctx.db.insert("generations", { userId, uploadId, hairstyleId, provider: "test", model: "test", promptVersion: "test", status: "completed", creditsUsed: 0, createdAt: Date.now() + i });
      resultIds.push(await ctx.db.insert("generationResults", { generationId, r2Key: `generations/user_owner/gen_${generationId}_front.webp`, view: "front", selected: false, createdAt: Date.now() + i }));
    }
    await ctx.db.insert("users", { clerkId: "other", locale: "en", credits: 0, createdAt: Date.now() });
    return resultIds;
  });
  await owner.mutation(api.polls.create, { token, title: "Help me choose", resultIds: ids.slice(0, 2) });
  return { t, owner, other, ids };
}
test("gallery paginates all owned results without exposing another user's history", async () => {
  const { owner, other } = await setup();
  const first = await owner.query(api.generations.historyMine, { paginationOpts: { numItems: 1, cursor: null } });
  expect(first.page).toHaveLength(1); expect(first.isDone).toBe(false);
  const next = await owner.query(api.generations.historyMine, { paginationOpts: { numItems: 2, cursor: first.continueCursor } });
  expect(next.page).toHaveLength(2); expect(next.isDone).toBe(true);
  expect((await other.query(api.generations.historyMine, { paginationOpts: { numItems: 12, cursor: null } })).page).toEqual([]);
});
test("polls require ownership, distinct selected outputs and at most six images", async () => {
  const { owner, other, ids } = await setup();
  await expect(other.mutation(api.polls.create, { token: "d".repeat(48), title: "", resultIds: ids })).rejects.toThrow("Result not found");
  await expect(owner.mutation(api.polls.create, { token: "d".repeat(48), title: "", resultIds: [ids[0], ids[0]] })).rejects.toThrow("Invalid poll");
  await expect(owner.mutation(api.polls.create, { token: "d".repeat(48), title: "", resultIds: [ids[0]] })).rejects.toThrow("Invalid poll");
});
test("anonymous votes save, reload and replace scores instead of adding duplicate ratings", async () => {
  const { t } = await setup();
  await t.mutation(api.polls.rate, { proof: proof() });
  await t.mutation(api.polls.rate, { proof: proof({ score: 3 }) });
  await t.mutation(api.polls.rate, { proof: proof({ index: 1, score: 4 }) });
  expect(await t.query(api.polls.myRatings, { proof: proof() })).toEqual([3, 4]);
  const poll = await t.query(api.polls.publicPoll, { token });
  expect(poll?.items.map(item => [item.count, item.average])).toEqual([[1, 3], [1, 4]]);
  expect(Object.keys(poll!).sort()).toEqual(["items", "title"]);
  expect(JSON.stringify(poll)).not.toContain("private-selfie");
});
test("parallel anonymous voters preserve accurate aggregate counts", async () => {
  const { t } = await setup();
  await Promise.all(Array.from({ length: 6 }, (_, i) => t.mutation(api.polls.rate, { proof: proof({ voterId: `anon:visitor${i}`, score: i % 2 ? 5 : 3 }) })));
  expect((await t.query(api.polls.publicPoll, { token }))?.items[0]).toMatchObject({ count: 6, average: 4 });
});
test("tampered, expired and wrong-target signatures are rejected", async () => {
  const { t } = await setup();
  await expect(t.mutation(api.polls.rate, { proof: { ...proof(), score: 2 } })).rejects.toThrow("INVALID_VOTE");
  await expect(t.mutation(api.polls.rate, { proof: proof({ issuedAt: Date.now() - 61_000 }) })).rejects.toThrow("INVALID_VOTE");
  await expect(t.mutation(api.polls.rate, { proof: proof({ kind: "single" }) })).rejects.toThrow("INVALID_VOTE");
  await expect(t.mutation(api.polls.rate, { proof: proof({ index: 5 }) })).rejects.toThrow("SHARE_UNAVAILABLE");
});
test("visitor and network limits are atomic and reset after a minute", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
  const { t } = await setup();
  for (let i = 0; i < 20; i++) await t.mutation(api.polls.rate, { proof: proof() });
  await expect(t.mutation(api.polls.rate, { proof: proof() })).rejects.toThrow("RATE_LIMITED");
  now.mockReturnValue(1_060_000);
  await t.mutation(api.polls.rate, { proof: proof() });
  expect((await t.query(api.polls.publicPoll, { token }))?.items[0].count).toBe(1);
});
test("only owners can revoke; revocation stops public images and future voting", async () => {
  const { t, owner, other } = await setup();
  await expect(other.mutation(api.polls.disable, { token })).rejects.toThrow("Poll not found");
  await owner.mutation(api.polls.disable, { token });
  expect(await t.query(api.polls.publicPoll, { token })).toBeNull();
  await expect(t.mutation(api.polls.rate, { proof: proof() })).rejects.toThrow("SHARE_UNAVAILABLE");
});

test("a network cannot bypass its limit by creating new anonymous browser identities", async () => {
  const { t } = await setup();
  for (let i = 0; i < 60; i++) await t.mutation(api.polls.rate, { proof: proof({ voterId: `anon:networkvisitor${i}` }) });
  await expect(t.mutation(api.polls.rate, { proof: proof({ voterId: "anon:one-more" }) })).rejects.toThrow("RATE_LIMITED");
});
test("signed-in owners cannot rate their own polls; existing single links allow anonymous updates", async () => {
  const { t, owner, ids } = await setup();
  await expect(t.mutation(api.polls.rate, { proof: proof({ accountId: "owner", voterId: "owner" }) })).rejects.toThrow("SELF_VOTE");
  await owner.mutation(api.shares.enable, { token, resultId: ids[0] });
  await t.mutation(api.shares.rateAnonymous, { proof: proof({ kind: "single" }) });
  await t.mutation(api.shares.rateAnonymous, { proof: proof({ kind: "single", score: 2 }) });
  expect(await t.query(api.shares.myAnonymousRating, { proof: proof({ kind: "single" }) })).toBe(2);
  expect(await t.query(api.shares.publicResult, { token })).toMatchObject({ count: 1, average: 2 });
});
