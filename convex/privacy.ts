import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { MEDIA_AUDIT_RETENTION_MS, MEDIA_DELETE_GRACE_MS, MEDIA_RETENTION_MS, MEDIA_REVIEW_MS, mediaHash, ownsMedia, type DeletionReason } from "../shared/media";

const week = MEDIA_RETENTION_MS;

export async function queueMediaDeletion(ctx: MutationCtx, clerkId: string, key: string, reason: DeletionReason) {
  if (!ownsMedia(clerkId, key)) throw new Error("Invalid media ownership");
  if (!await ctx.db.query("mediaDeletions").withIndex("by_key", q => q.eq("r2Key", key)).unique()) {
    const now = Date.now();
    const auditId = await ctx.db.insert("mediaDeletionAudit", { ownerHash: await mediaHash(`owner:${clerkId}`), keyHash: await mediaHash(`object:${key}`), reason, status: "queued", attempts: 0, createdAt: now, expiresAt: now + MEDIA_AUDIT_RETENTION_MS });
    await ctx.db.insert("mediaDeletions", { clerkId, r2Key: key, reason, auditId, attempts: 0, nextAttemptAt: now + MEDIA_DELETE_GRACE_MS, createdAt: now });
    await ctx.scheduler.runAfter(MEDIA_DELETE_GRACE_MS, internal.mediaCleanup.drain, {});
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
    if (!await ctx.db.query("mediaObjects").withIndex("by_key", q => q.eq("r2Key", key)).unique()) await ctx.db.insert("mediaObjects", { clerkId: identity.subject, r2Key: key, origin: "registered", retentionReason: "awaiting_upload", expiresAt: Date.now() + week, createdAt: Date.now() });
  },
});

async function eraseGeneration(ctx: MutationCtx, clerkId: string, generationId: Id<"generations">, reason: DeletionReason) {
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
    await queueMediaDeletion(ctx, clerkId, result.r2Key, reason);
    await ctx.db.delete(result._id);
  }
  for (const table of ["favorites", "stylistGuides"] as const) {
    for (const row of await ctx.db.query(table).withIndex("by_user", q => q.eq("userId", generation.userId)).collect()) if (resultIds.has(row.generationResultId)) await ctx.db.delete(row._id);
  }
  for (const usage of await ctx.db.query("modelUsage").withIndex("by_generation", q => q.eq("generationId", generationId)).collect()) await ctx.db.delete(usage._id);
  await ctx.db.delete(generationId);
}

async function eraseUpload(ctx: MutationCtx, clerkId: string, id: Id<"uploads">, reason: DeletionReason) {
  const upload = await ctx.db.get(id);
  if (!upload) return;
  for (const table of ["advisorSessions", "faceAnalyses", "hairAnalyses"] as const) for (const row of await ctx.db.query(table).withIndex("by_upload", q => q.eq("uploadId", id)).collect()) await ctx.db.delete(row._id);
  for (const row of await ctx.db.query("recommendations").withIndex("by_user_upload", q => q.eq("userId", upload.userId).eq("uploadId", id)).collect()) await ctx.db.delete(row._id);
  await queueMediaDeletion(ctx, clerkId, upload.r2Key, reason);
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
    const objects = await ctx.db.query("mediaObjects").withIndex("by_owner", q => q.eq("clerkId", identity.subject)).collect();
    const ownerHash = await mediaHash(`owner:${identity.subject}`);
    const audit = await ctx.db.query("mediaDeletionAudit").withIndex("by_owner", q => q.eq("ownerHash", ownerHash)).order("desc").take(50);
    return { uploads: uploads.map(u => { const object = objects.find(o => o.r2Key === u.r2Key); return { id: u._id, type: u.type, createdAt: u.createdAt, r2Key: u.r2Key, reviewUntil: object?.reviewUntil, retentionReason: object?.retained ? "kept_by_owner" : object?.origin !== "registered" ? "legacy_unknown" : object?.retentionReason ?? "unused", expiresAt: object?.expiresAt }; }), pendingFiles: pending.length, retryingFiles: pending.filter(p => p.attempts > 0).length, audit: audit.map(a => ({ id: a._id, reason: a.reason, status: a.status, attempts: a.attempts, createdAt: a.createdAt, completedAt: a.completedAt })) };
  },
});

async function eraseOwned(ctx: MutationCtx, args: { scope: "upload" | "generation" | "media" | "account"; id?: string; receiptHash?: string }, clerkId: string, webhook = false) {
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).unique();
    const reason: DeletionReason = args.scope === "account" ? webhook ? "clerk_account" : "user_account" : args.scope === "upload" ? "user_upload" : args.scope === "generation" ? "user_generation" : "user_media";
    if (args.scope === "account") {
      const marker = await ctx.db.query("deletedAccounts").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).unique();
      const fields = { ...(args.receiptHash ? { receiptHash: args.receiptHash } : {}), ...(webhook ? { clerkStatus: "deleted" as const, clerkDeletedAt: Date.now() } : !marker?.clerkStatus ? { clerkStatus: "pending" as const } : {}) };
      if (marker) await ctx.db.patch(marker._id, fields);
      else await ctx.db.insert("deletedAccounts", { clerkId, ...fields, createdAt: Date.now() });
    }
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
        await eraseGeneration(ctx, clerkId, generation._id, reason);
      }
      if (!generationId) {
        for (const upload of await ctx.db.query("uploads").withIndex("by_user", q => q.eq("userId", user._id)).collect()) if (!uploadId || upload._id === uploadId) await eraseUpload(ctx, clerkId, upload._id, reason);
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
    if (args.scope === "media" || args.scope === "account") for (const object of await ctx.db.query("mediaObjects").withIndex("by_owner", q => q.eq("clerkId", clerkId)).collect()) await queueMediaDeletion(ctx, clerkId, object.r2Key, reason);
    await ctx.scheduler.runAfter(0, internal.mediaCleanup.drain, {});
    return { pendingFiles: (await ctx.db.query("mediaDeletions").withIndex("by_owner", q => q.eq("clerkId", clerkId)).collect()).length };
}

export const erase = mutation({
  args: { scope: v.union(v.literal("upload"), v.literal("generation"), v.literal("media"), v.literal("account")), id: v.optional(v.string()), receiptHash: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (args.receiptHash && (args.scope !== "account" || !/^[a-f0-9]{64}$/.test(args.receiptHash))) throw new Error("Invalid receipt");
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
    return eraseOwned(ctx, { scope: "account" }, args.clerkId, true);
  },
});

export const keepUpload = mutation({ args: { uploadId: v.id("uploads") }, handler: async (ctx, { uploadId }) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const upload = await ctx.db.get(uploadId), user = upload ? await ctx.db.get(upload.userId) : null;
  if (!upload || user?.clerkId !== identity.subject) throw new Error("Photo not found");
  const object = await ctx.db.query("mediaObjects").withIndex("by_key", q => q.eq("r2Key", upload.r2Key)).unique();
  if (!object) throw new Error("Photo no longer available");
  await ctx.db.patch(object._id, { retained: true, reviewUntil: undefined, retentionReason: "kept_by_owner", expiresAt: Date.now() + week, updatedAt: Date.now() });
} });

export const accountStatus = query({ args: { receiptHash: v.string() }, handler: async (ctx, { receiptHash }) => {
  if (!/^[a-f0-9]{64}$/.test(receiptHash)) return null;
  const marker = await ctx.db.query("deletedAccounts").withIndex("by_receipt", q => q.eq("receiptHash", receiptHash)).unique();
  if (!marker || marker.createdAt + MEDIA_AUDIT_RETENTION_MS < Date.now()) return null;
  const pending = await ctx.db.query("mediaDeletions").withIndex("by_owner", q => q.eq("clerkId", marker.clerkId)).collect();
  const clerkStatus = marker.clerkStatus ?? "pending";
  return { appDataRemoved: true, clerkStatus, pendingFiles: pending.length, retryingFiles: pending.filter(p => p.attempts > 0).length, complete: clerkStatus === "deleted" && pending.length === 0, requestedAt: marker.createdAt };
} });

// Pre-audit queue records have no reliable reason. Hold them for operator review.
export const due = internalQuery({ args: {}, handler: async ctx => (await ctx.db.query("mediaDeletions").withIndex("by_retry", q => q.lte("nextAttemptAt", Date.now())).filter(q => q.neq(q.field("reason"), undefined)).take(100)) });
export const claim = internalMutation({ args: { id: v.id("mediaDeletions") }, handler: async (ctx, { id }) => {
  const item = await ctx.db.get(id);
  if (!item || !item.reason || item.nextAttemptAt > Date.now() || !ownsMedia(item.clerkId, item.r2Key)) return null;
  // Lease longer than the bounded R2 request; another worker can recover a crash.
  await ctx.db.patch(id, { nextAttemptAt: Date.now() + 120_000 });
  return item;
} });
export const acknowledged = internalMutation({ args: { id: v.id("mediaDeletions"), success: v.boolean() }, handler: async (ctx, { id, success }) => {
  const item = await ctx.db.get(id);
  if (!item) return;
  if (item.auditId) await ctx.db.patch(item.auditId, { status: success ? "deleted" : "retrying", attempts: item.attempts + 1, completedAt: success ? Date.now() : undefined, updatedAt: Date.now(), expiresAt: Date.now() + MEDIA_AUDIT_RETENTION_MS });
  if (success) await ctx.db.delete(id);
  else await ctx.db.patch(id, { attempts: item.attempts + 1, nextAttemptAt: Date.now() + Math.min(24 * 60, 2 ** Math.min(item.attempts, 10)) * 60_000, updatedAt: Date.now() });
} });

export const expire = internalMutation({ args: {}, handler: async ctx => {
  const objects = await ctx.db.query("mediaObjects").withIndex("by_expiry", q => q.lte("expiresAt", Date.now())).take(100);
  for (const object of objects) {
    if (object.origin !== "registered" || object.retained) {
      await ctx.db.patch(object._id, { reviewUntil: undefined, retentionReason: object.retained ? "kept_by_owner" : "legacy_unknown", expiresAt: Date.now() + week });
      continue;
    }
    const upload = await ctx.db.query("uploads").withIndex("by_r2_key", q => q.eq("r2Key", object.r2Key)).unique();
    let live = false;
    if (upload) {
      const uses = [...await ctx.db.query("generations").withIndex("by_upload", q => q.eq("uploadId", upload._id)).collect(), ...await ctx.db.query("generations").withIndex("by_reference", q => q.eq("referenceUploadId", upload._id)).collect()];
      live = uses.some(g => g.status === "completed" || (g.status === "processing" && g.createdAt > Date.now() - 60 * 60 * 1000));
      if (upload.type === "side") {
        if (await ctx.db.query("generationResults").withIndex("by_side_upload", q => q.eq("sideUploadId", upload._id)).first()) live = true;
        // Old side previews did not record their source ID. Absence of a link is
        // not evidence that this owner's side photo is unused. Keep it while
        // any of their saved side previews has an unresolved source.
        if (!live) {
          const history = await ctx.db.query("generations").withIndex("by_user", q => q.eq("userId", upload.userId)).collect();
          for (const generation of history) {
            const results = await ctx.db.query("generationResults").withIndex("by_generation", q => q.eq("generationId", generation._id)).collect();
            if (results.some(result => result.view === "side" && !result.sideUploadId)) { live = true; break; }
          }
        }
      }
    } else if (object.r2Key.startsWith("generations/")) live = await ctx.db.query("generationResults").withIndex("by_r2_key", q => q.eq("r2Key", object.r2Key)).first() !== null;
    if (live) await ctx.db.patch(object._id, { reviewUntil: undefined, retentionReason: "saved_result", expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    else if (!object.reviewUntil) {
      const reviewUntil = Date.now() + MEDIA_REVIEW_MS;
      await ctx.db.patch(object._id, { reviewUntil, retentionReason: "unused_grace", expiresAt: reviewUntil });
    } else if (object.reviewUntil <= Date.now()) {
      if (upload) await eraseUpload(ctx, object.clerkId, upload._id, "auto_expiry");
      else await queueMediaDeletion(ctx, object.clerkId, object.r2Key, "auto_expiry");
    }
  }
  await ctx.scheduler.runAfter(0, internal.mediaCleanup.drain, {});
  const audit = await ctx.db.query("mediaDeletionAudit").withIndex("by_expiry", q => q.lte("expiresAt", Date.now())).take(100);
  for (const row of audit) {
    const pending = await ctx.db.query("mediaDeletions").filter(q => q.eq(q.field("auditId"), row._id)).first();
    if (!pending) await ctx.db.delete(row._id);
    else await ctx.db.patch(row._id, { expiresAt: Date.now() + MEDIA_AUDIT_RETENTION_MS });
  }
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
      await ctx.db.insert("mediaObjects", { clerkId: user.clerkId, r2Key: record.r2Key, origin: "legacy", retentionReason: "legacy_unknown", createdAt: record.createdAt, expiresAt: Date.now() + week });
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.privacy.adoptLegacyMedia, { kind, cursor: page.continueCursor });
    else if (kind === "uploads") await ctx.scheduler.runAfter(0, internal.privacy.adoptLegacyMedia, { kind: "generationResults" });
  },
});

