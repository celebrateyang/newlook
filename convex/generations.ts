import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { catalogDocument, hairstyleCatalog } from "./hairstyleCatalog";

async function requireIdentity(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export const start = mutation({
  args: { uploadKey: v.string(), styleSlug: v.string(), provider: v.string(), model: v.string(), promptVersion: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("User profile not found");
    const upload = await ctx.db.query("uploads").withIndex("by_r2_key", (q) => q.eq("r2Key", args.uploadKey)).unique();
    if (!upload || upload.userId !== user._id) throw new Error("Upload not found");
    const style = hairstyleCatalog[args.styleSlug as keyof typeof hairstyleCatalog];
    if (!style) throw new Error("Unsupported hairstyle");
    let hairstyle = await ctx.db.query("hairstyles").withIndex("by_slug", (q) => q.eq("slug", args.styleSlug)).unique();
    if (!hairstyle) {
      const hairstyleId = await ctx.db.insert("hairstyles", { ...catalogDocument(args.styleSlug as keyof typeof hairstyleCatalog), createdAt: Date.now() });
      hairstyle = await ctx.db.get(hairstyleId);
    } else {
      await ctx.db.patch(hairstyle._id, { ...catalogDocument(args.styleSlug as keyof typeof hairstyleCatalog), updatedAt: Date.now() });
      hairstyle = await ctx.db.get(hairstyle._id);
    }
    if (!hairstyle) throw new Error("Could not create hairstyle");
    return await ctx.db.insert("generations", {
      userId: user._id, uploadId: upload._id, hairstyleId: hairstyle._id, provider: args.provider,
      model: args.model, promptVersion: args.promptVersion, status: "processing", creditsUsed: 0, createdAt: Date.now(),
    });
  },
});

export const startReference = mutation({
  args: { uploadKey: v.string(), referenceUploadKey: v.string(), provider: v.string(), model: v.string(), promptVersion: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("User profile not found");
    const [upload, referenceUpload] = await Promise.all([
      ctx.db.query("uploads").withIndex("by_r2_key", (q) => q.eq("r2Key", args.uploadKey)).unique(),
      ctx.db.query("uploads").withIndex("by_r2_key", (q) => q.eq("r2Key", args.referenceUploadKey)).unique(),
    ]);
    if (!upload || upload.userId !== user._id || upload.type !== "original") throw new Error("Source upload not found");
    if (!referenceUpload || referenceUpload.userId !== user._id || referenceUpload.type !== "reference") throw new Error("Reference upload not found");

    let hairstyle = await ctx.db.query("hairstyles").withIndex("by_slug", (q) => q.eq("slug", "reference-transfer")).unique();
    if (!hairstyle) {
      const hairstyleId = await ctx.db.insert("hairstyles", {
        slug: "reference-transfer", nameEn: "Reference Hairstyle", nameZh: "参考发型", gender: "unisex", category: "reference",
        length: "custom", texture: [], maintenanceLevel: "medium", requiresPerm: false, requiresColor: false,
        minHairLength: "custom", recommendedFaceShapes: [], notRecommendedFaceShapes: [], recommendedDensity: [],
        recommendedTexture: [], referenceImages: [], promptTemplate: "reference-transfer", active: true, createdAt: Date.now(),
      });
      hairstyle = await ctx.db.get(hairstyleId);
    }
    if (!hairstyle) throw new Error("Could not create reference hairstyle");
    return await ctx.db.insert("generations", {
      userId: user._id, uploadId: upload._id, hairstyleId: hairstyle._id, referenceUploadId: referenceUpload._id,
      provider: args.provider, model: args.model, promptVersion: args.promptVersion, status: "processing", creditsUsed: 0,
      createdAt: Date.now(),
    });
  },
});

export const complete = mutation({
  args: { generationId: v.id("generations"), r2Keys: v.array(v.string()), view: v.optional(v.union(v.literal("front"), v.literal("side"))), durationMs: v.number(), providerRequestId: v.optional(v.string()), taskType: v.optional(v.union(v.literal("hair_try_on"), v.literal("reference_transfer"))) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const generation = await ctx.db.get(args.generationId);
    if (!generation) throw new Error("Generation not found");
    const user = await ctx.db.get(generation.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Generation ownership check failed");
    const createdAt = Date.now();
    for (const r2Key of args.r2Keys) await ctx.db.insert("generationResults", { generationId: args.generationId, r2Key, view: args.view ?? "front", selected: false, createdAt });
    await ctx.db.insert("modelUsage", {
      userId: generation.userId, generationId: args.generationId, provider: generation.provider, model: generation.model,
      taskType: args.taskType ?? "hair_try_on", durationMs: args.durationMs, status: "completed", providerRequestId: args.providerRequestId, createdAt,
    });
    await ctx.db.patch(args.generationId, { status: "completed", generationTimeMs: args.durationMs, updatedAt: createdAt });
  },
});

export const appendSideResult = mutation({
  args: { generationId: v.id("generations"), uploadKey: v.string(), r2Key: v.string(), durationMs: v.number(), providerRequestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const generation = await ctx.db.get(args.generationId);
    if (!generation) throw new Error("Generation not found");
    const user = await ctx.db.get(generation.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Generation ownership check failed");
    const upload = await ctx.db.query("uploads").withIndex("by_r2_key", (q) => q.eq("r2Key", args.uploadKey)).unique();
    if (!upload || upload.userId !== user._id || upload.type !== "side") throw new Error("Side upload not found");
    const existing = await ctx.db.query("generationResults").withIndex("by_generation", (q) => q.eq("generationId", args.generationId)).collect();
    for (const result of existing.filter((item) => item.view === "side")) await ctx.db.delete(result._id);
    const createdAt = Date.now();
    const resultId = await ctx.db.insert("generationResults", { generationId: args.generationId, r2Key: args.r2Key, view: "side", selected: false, createdAt });
    await ctx.db.insert("modelUsage", {
      userId: generation.userId, generationId: args.generationId, provider: generation.provider, model: generation.model,
      taskType: "hair_try_on_side", durationMs: args.durationMs, status: "completed", providerRequestId: args.providerRequestId, createdAt,
    });
    return resultId;
  },
});

export const getMine = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const generation = await ctx.db.get(args.generationId);
    if (!generation) return null;
    const user = await ctx.db.get(generation.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    const hairstyle = await ctx.db.get(generation.hairstyleId);
    const upload = await ctx.db.get(generation.uploadId);
    if (!hairstyle || !upload) return null;
    const [results, referenceUpload] = await Promise.all([
      ctx.db.query("generationResults").withIndex("by_generation", (q) => q.eq("generationId", args.generationId)).collect(),
      generation.referenceUploadId ? ctx.db.get(generation.referenceUploadId) : Promise.resolve(null),
    ]);
    if (referenceUpload && referenceUpload.userId !== user._id) return null;
    return { generation, hairstyle, upload, referenceUpload, results };
  },
});

export const latestMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) return null;

    const latestGeneration = await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();

    if (latestGeneration) {
      const [upload, hairstyle, results] = await Promise.all([
        ctx.db.get(latestGeneration.uploadId),
        ctx.db.get(latestGeneration.hairstyleId),
        ctx.db.query("generationResults").withIndex("by_generation", (q) => q.eq("generationId", latestGeneration._id)).collect(),
      ]);
      const frontResults = results.filter((result) => (result.view ?? "front") === "front");
      const result = frontResults.find((item) => item.selected)
        ?? frontResults.sort((a, b) => b.createdAt - a.createdAt)[0];
      if (upload?.userId === user._id && upload.type === "original") {
        return { generation: latestGeneration, upload, hairstyle, result };
      }
    }

    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .filter((q) => q.eq(q.field("type"), "original"))
      .first();
    return upload ? { upload } : null;
  },
});

export const fail = mutation({
  args: { generationId: v.id("generations"), durationMs: v.number(), errorCode: v.string(), taskType: v.optional(v.union(v.literal("hair_try_on"), v.literal("reference_transfer"))) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const generation = await ctx.db.get(args.generationId);
    if (!generation) return;
    const user = await ctx.db.get(generation.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Generation ownership check failed");
    const now = Date.now();
    await ctx.db.insert("modelUsage", {
      userId: generation.userId, generationId: args.generationId, provider: generation.provider, model: generation.model,
      taskType: args.taskType ?? "hair_try_on", durationMs: args.durationMs, status: "failed", createdAt: now,
    });
    await ctx.db.patch(args.generationId, { status: "failed", generationTimeMs: args.durationMs, errorCode: args.errorCode, updatedAt: now });
  },
});
