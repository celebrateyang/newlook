import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { MEDIA_DELETE_GRACE_MS, MEDIA_RETENTION_MS, ownsMedia } from "../shared/media";

const week = MEDIA_RETENTION_MS;

export async function queueMediaDeletion(ctx: MutationCtx, clerkId: string, key: string) {
  if (!ownsMedia(clerkId, key)) throw new Error("Invalid media ownership");
  if (!await ctx.db.query("mediaDeletions").withIndex("by_key", q => q.eq("r2Key", key)).unique()) {
    await ctx.db.insert("mediaDeletions", { clerkId, r2Key: key, attempts: 0, nextAttemptAt: Date.now() + MEDIA_DELETE_GRACE_MS, createdAt: Date.now() });
  }
  const object = await ctx.db.query("mediaObjects").withIndex("by_key", q => q.eq("r2Key", key)).unique();
  if (object) await ctx.db.delete(object._id);
}

export const registerObject = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (!ownsMedia(identity.subject, key)) throw new Error("Invalid media ownership");
    if (await ctx.db.query("deletedAccounts").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique()) throw new Error("Account deletion requested");
    if (await ctx.db.query("mediaDeletions").withIndex("by_key", q => q.eq("r2Key", key)).unique()) throw new Error("Photo deletion requested");
    if (key.startsWith("generations/")) {
      const candidate = key.slice(`generations/user_${identity.subject}/gen_`.length).split("_")[0];
      const generationId = ctx.db.normalizeId("generations", candidate);
      const generation = generationId ? await ctx.db.get(generationId) : null;
      const user = generation ? await ctx.db.get(generation.userId) : null;
      if (!generation || user?.clerkId !== identity.subject || !["processing", "completed"].includes(generation.status)) throw new Error("Generation no longer available");
    }
    if (!await ctx.db.query("mediaObjects").withIndex("by_key", q => q.eq("r2Key", key)).unique()) await ctx.db.insert("mediaObjects", { clerkId: identity.subject, r2Key: key, expiresAt: Date.now() + week, createdAt: Date.now() });
  },
});

async function eraseGeneration(ctx: MutationCtx, clerkId: string, generationId: Id<"generations">) {
  const results = await ctx.db.query("generationResults").withIndex("by_generation", q => q.eq("generationId", generationId)).collect();
  const resultIds = new Set(results.map(r => r._id));
  const generation = await ctx.db.get(generationId);
  if (!generation) return;
  const polls = await ctx.db.query("hairstylePolls").withIndex("by_user", q => q.eq("userId", generation.userId)).collect();
  for (const poll of polls.filter(p => p.resultIds.some(id => resultIds.has(id)))) {
    // Delete the whole comparison so no remaining selected output is exposed unexpectedly.
    for (const rating of await ctx.db.query("pollRatings").withIndex("by_poll_voter", q => q.eq("pollId", poll._id)).collect()) await ctx.db.delete(rating._id);
    await ctx.db.delete(poll._id);
  }
  for (const result of results) {
    for (const review of await ctx.db.query("previewReviews").withIndex("by_result", q => q.eq("resultId", result._id)).collect()) await ctx.db.delete(review._id);
    for (const share of await ctx.db.query("resultShares").withIndex("by_result", q => q.eq("generationResultId", result._id)).collect()) {
      for (const rating of await ctx.db.query("shareRatings").withIndex("by_share_voter", q => q.eq("shareId", share._id)).collect()) await ctx.db.delete(rating._id);
      await ctx.db.delete(share._id);
    }
    await queueMediaDeletion(ctx, clerkId, result.r2Key);
    await ctx.db.delete(result._id);
  }
  for (const table of ["favorites", "stylistGuides"] as const) {
    for (const row of await ctx.db.query(table).withIndex("by_user", q => q.eq("userId", generation.userId)).collect()) if (resultIds.has(row.generationResultId)) await ctx.db.delete(row._id);
  }
  for (const usage of await ctx.db.query("modelUsage").withIndex("by_generation", q => q.eq("generationId", generationId)).collect()) await ctx.db.delete(usage._id);
  await ctx.db.delete(generationId);
}

async function eraseUpload(ctx: MutationCtx, clerkId: string, id: Id<"uploads">) {
  const upload = await ctx.db.get(id);
  if (!upload) return;
  for (const table of ["advisorSessions", "faceAnalyses", "hairAnalyses"] as const) for (const row of await ctx.db.query(table).withIndex("by_upload", q => q.eq("uploadId", id)).collect()) await ctx.db.delete(row._id);
  for (const row of await ctx.db.query("recommendations").withIndex("by_user_upload", q => q.eq("userId", upload.userId).eq("uploadId", id)).collect()) await ctx.db.delete(row._id);
  await queueMediaDeletion(ctx, clerkId, upload.r2Key);
  await ctx.db.delete(id);
}

export const summary = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    const uploads = user ? await ctx.db.query("uploads").withIndex("by_user", q => q.eq("userId", user._id)).collect() : [];
    const pending = await ctx.db.query("mediaDeletions").withIndex("by_owner", q => q.eq("clerkId", identity.subject)).collect();
    return { uploads: uploads.map(u => ({ id: u._id, type: u.type, createdAt: u.createdAt, r2Key: u.r2Key })), pendingFiles: pending.length, retryingFiles: pending.filter(p => p.attempts > 0).length };
  },
});

async function eraseOwned(ctx: MutationCtx, args: { scope: "upload" | "generation" | "media" | "account"; id?: string }, clerkId: string) {
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).unique();
    if (args.scope === "account" && !await ctx.db.query("deletedAccounts").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).unique()) await ctx.db.insert("deletedAccounts", { clerkId, createdAt: Date.now() });
    if (user) {
      let uploadId: Id<"uploads"> | undefined;
      let generationId: Id<"generations"> | undefined;
      if (args.scope === "upload") {
        uploadId = ctx.db.normalizeId("uploads", args.id ?? "") ?? undefined;
        const upload = uploadId ? await ctx.db.get(uploadId) : null;
        if (!upload || upload.userId !== user._id) throw new Error("Photo not found");
      }
      if (args.scope === "generation") {
        generationId = ctx.db.normalizeId("generations", args.id ?? "") ?? undefined;
        const generation = generationId ? await ctx.db.get(generationId) : null;
        if (!generation || generation.userId !== user._id) throw new Error("Result not found");
      }
      const generations = await ctx.db.query("generations").withIndex("by_user", q => q.eq("userId", user._id)).collect();
      const sideDependencies = uploadId ? new Set((await ctx.db.query("generationResults").withIndex("by_side_upload", q => q.eq("sideUploadId", uploadId)).collect()).map(result => result.generationId)) : new Set<Id<"generations">>();
      for (const generation of generations) {
        if (generationId && generation._id !== generationId || uploadId && generation.uploadId !== uploadId && generation.referenceUploadId !== uploadId && !sideDependencies.has(generation._id)) continue;
        await eraseGeneration(ctx, clerkId, generation._id);
      }
      if (!generationId) {
        for (const upload of await ctx.db.query("uploads").withIndex("by_user", q => q.eq("userId", user._id)).collect()) if (!uploadId || upload._id === uploadId) await eraseUpload(ctx, clerkId, upload._id);
      }
      if (args.scope === "account") {
        for (const application of await ctx.db.query("stylistApplications").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).collect()) await ctx.db.delete(application._id);
        for (const poll of await ctx.db.query("hairstylePolls").withIndex("by_user", q => q.eq("userId", user._id)).collect()) {
          for (const rating of await ctx.db.query("pollRatings").withIndex("by_poll_voter", q => q.eq("pollId", poll._id)).collect()) await ctx.db.delete(rating._id);
          await ctx.db.delete(poll._id);
        }
        for (const share of await ctx.db.query("resultShares").withIndex("by_user", q => q.eq("userId", user._id)).collect()) {
          for (const rating of await ctx.db.query("shareRatings").withIndex("by_share_voter", q => q.eq("shareId", share._id)).collect()) await ctx.db.delete(rating._id);
          await ctx.db.delete(share._id);
        }
        for (const table of ["userProfiles", "creditTransactions", "orders", "modelUsage", "previewReviews", "favorites", "stylistGuides", "advisorSessions", "recommendations", "faceAnalyses", "hairAnalyses"] as const) {
          for (const row of await ctx.db.query(table).withIndex("by_user", q => q.eq("userId", user._id)).collect()) await ctx.db.delete(row._id);
        }
        for (const row of await ctx.db.query("generationQuotas").withIndex("by_user_day", q => q.eq("userId", user._id)).collect()) await ctx.db.delete(row._id);
        await ctx.db.delete(user._id);
      }
    } else if (args.scope === "upload" || args.scope === "generation") throw new Error("Resource not found");
    if (args.scope === "account") {
      for (const application of await ctx.db.query("stylistApplications").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).collect()) await ctx.db.delete(application._id);
      for (const rating of await ctx.db.query("shareRatings").withIndex("by_voter", q => q.eq("voterId", clerkId)).collect()) {
        const share = await ctx.db.get(rating.shareId);
        if (share) await ctx.db.patch(share._id, { ratingCount: Math.max(0, share.ratingCount - 1), ratingTotal: Math.max(0, share.ratingTotal - rating.score) });
        await ctx.db.delete(rating._id);
      }
      for (const rating of await ctx.db.query("pollRatings").withIndex("by_voter", q => q.eq("voterId", clerkId)).collect()) {
        const poll = await ctx.db.get(rating.pollId);
        if (poll) await ctx.db.patch(poll._id, { totals: poll.totals.map((value, i) => Math.max(0, value - (rating.scores[i] || 0))), counts: poll.counts.map((value, i) => Math.max(0, value - (rating.scores[i] ? 1 : 0))) });
        await ctx.db.delete(rating._id);
      }
    }
    if (args.scope === "media" || args.scope === "account") for (const object of await ctx.db.query("mediaObjects").withIndex("by_owner", q => q.eq("clerkId", clerkId)).collect()) await queueMediaDeletion(ctx, clerkId, object.r2Key);
    await ctx.scheduler.runAfter(0, internal.mediaCleanup.drain, {});
    return { pendingFiles: (await ctx.db.query("mediaDeletions").withIndex("by_owner", q => q.eq("clerkId", clerkId)).collect()).length };
}

export const erase = mutation({
  args: { scope: v.union(v.literal("upload"), v.literal("generation"), v.literal("media"), v.literal("account")), id: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return eraseOwned(ctx, args, identity.subject);
  },
});

export const eraseFromWebhook = mutation({
  args: { clerkId: v.string(), issuedAt: v.number(), signature: v.string() },
  handler: async (ctx, args) => {
    const secret = process.env.SHARING_SIGNING_SECRET;
    if (!secret || secret.length < 32 || !/^user_[a-zA-Z0-9]+$/.test(args.clerkId) || !/^[a-f0-9]{64}$/.test(args.signature) || Math.abs(Date.now() - args.issuedAt) > 300_000) throw new Error("Invalid deletion proof");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signature = Uint8Array.from(args.signature.match(/.{2}/g)!, value => parseInt(value, 16));
    if (!await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(`newself-account-deletion-v1|${args.clerkId}|${args.issuedAt}`))) throw new Error("Invalid deletion proof");
    return eraseOwned(ctx, { scope: "account" }, args.clerkId);
  },
});

export const due = internalQuery({ args: {}, handler: async ctx => (await ctx.db.query("mediaDeletions").withIndex("by_retry", q => q.lte("nextAttemptAt", Date.now())).take(100)) });
export const acknowledged = internalMutation({ args: { id: v.id("mediaDeletions"), success: v.boolean() }, handler: async (ctx, { id, success }) => {
  const item = await ctx.db.get(id);
  if (!item) return;
  if (success) await ctx.db.delete(id);
  else await ctx.db.patch(id, { attempts: item.attempts + 1, nextAttemptAt: Date.now() + Math.min(24 * 60, 2 ** Math.min(item.attempts, 10)) * 60_000, updatedAt: Date.now() });
} });

export const expire = internalMutation({ args: {}, handler: async ctx => {
  const objects = await ctx.db.query("mediaObjects").withIndex("by_expiry", q => q.lte("expiresAt", Date.now())).take(100);
  for (const object of objects) {
    const upload = await ctx.db.query("uploads").withIndex("by_r2_key", q => q.eq("r2Key", object.r2Key)).unique();
    let live = false;
    if (upload) {
      const uses = [...await ctx.db.query("generations").withIndex("by_upload", q => q.eq("uploadId", upload._id)).collect(), ...await ctx.db.query("generations").withIndex("by_reference", q => q.eq("referenceUploadId", upload._id)).collect()];
      live = uses.some(g => g.status === "completed" || (g.status === "processing" && g.createdAt > Date.now() - 60 * 60 * 1000));
      if (upload.type === "side" && await ctx.db.query("generationResults").withIndex("by_side_upload", q => q.eq("sideUploadId", upload._id)).first()) live = true;
    } else if (object.r2Key.startsWith("generations/")) live = await ctx.db.query("generationResults").withIndex("by_r2_key", q => q.eq("r2Key", object.r2Key)).first() !== null;
    if (live) await ctx.db.patch(object._id, { expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    else { if (upload) await eraseUpload(ctx, object.clerkId, upload._id); else await queueMediaDeletion(ctx, object.clerkId, object.r2Key); }
  }
  await ctx.scheduler.runAfter(0, internal.mediaCleanup.drain, {});
  if (objects.length === 100) await ctx.scheduler.runAfter(0, internal.privacy.expire, {});
} });

export const adoptLegacyMedia = internalMutation({
  args: { kind: v.union(v.literal("uploads"), v.literal("generationResults")), cursor: v.optional(v.string()) },
  handler: async (ctx, { kind, cursor }) => {
    const page = await ctx.db.query(kind).paginate({ cursor: cursor ?? null, numItems: 100 });
    for (const record of page.page) {
      const userId = "userId" in record ? record.userId : (await ctx.db.get(record.generationId))?.userId;
      const user = userId ? await ctx.db.get(userId) : null;
      if (!user || !ownsMedia(user.clerkId, record.r2Key)) continue;
      if (await ctx.db.query("mediaObjects").withIndex("by_key", q => q.eq("r2Key", record.r2Key)).unique() || await ctx.db.query("mediaDeletions").withIndex("by_key", q => q.eq("r2Key", record.r2Key)).unique()) continue;
      await ctx.db.insert("mediaObjects", { clerkId: user.clerkId, r2Key: record.r2Key, createdAt: record.createdAt, expiresAt: record.createdAt + week });
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.privacy.adoptLegacyMedia, { kind, cursor: page.continueCursor });
    else if (kind === "uploads") await ctx.scheduler.runAfter(0, internal.privacy.adoptLegacyMedia, { kind: "generationResults" });
  },
});

