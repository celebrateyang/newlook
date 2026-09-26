import { mutation } from "./_generated/server";
import { v } from "convex/values";

const catalog = {
  "soft-layered-cut": { name: "Soft Layered Cut", category: "layers", length: "medium" },
  "french-bob": { name: "French Bob", category: "bob", length: "chin" },
  "curtain-bangs": { name: "Curtain Bangs", category: "bangs", length: "medium" },
  "textured-crop": { name: "Textured Crop", category: "short", length: "short" },
} as const;

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
    const style = catalog[args.styleSlug as keyof typeof catalog];
    if (!style) throw new Error("Unsupported hairstyle");
    let hairstyle = await ctx.db.query("hairstyles").withIndex("by_slug", (q) => q.eq("slug", args.styleSlug)).unique();
    if (!hairstyle) {
      const hairstyleId = await ctx.db.insert("hairstyles", {
        slug: args.styleSlug, nameEn: style.name, nameZh: style.name, gender: "unisex", category: style.category,
        length: style.length, texture: ["straight", "wavy", "curly"], maintenanceLevel: "medium",
        requiresPerm: false, requiresColor: false, minHairLength: "short", recommendedFaceShapes: [],
        notRecommendedFaceShapes: [], recommendedDensity: [], recommendedTexture: [], referenceImages: [],
        promptTemplate: args.styleSlug, active: true, createdAt: Date.now(),
      });
      hairstyle = await ctx.db.get(hairstyleId);
    }
    if (!hairstyle) throw new Error("Could not create hairstyle");
    return await ctx.db.insert("generations", {
      userId: user._id, uploadId: upload._id, hairstyleId: hairstyle._id, provider: args.provider,
      model: args.model, promptVersion: args.promptVersion, status: "processing", creditsUsed: 0, createdAt: Date.now(),
    });
  },
});

export const complete = mutation({
  args: { generationId: v.id("generations"), r2Keys: v.array(v.string()), durationMs: v.number(), providerRequestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const generation = await ctx.db.get(args.generationId);
    if (!generation) throw new Error("Generation not found");
    const user = await ctx.db.get(generation.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Generation ownership check failed");
    const createdAt = Date.now();
    for (const r2Key of args.r2Keys) await ctx.db.insert("generationResults", { generationId: args.generationId, r2Key, selected: false, createdAt });
    await ctx.db.insert("modelUsage", {
      userId: generation.userId, generationId: args.generationId, provider: generation.provider, model: generation.model,
      taskType: "hair_try_on", durationMs: args.durationMs, status: "completed", providerRequestId: args.providerRequestId, createdAt,
    });
    await ctx.db.patch(args.generationId, { status: "completed", generationTimeMs: args.durationMs, updatedAt: createdAt });
  },
});

export const fail = mutation({
  args: { generationId: v.id("generations"), durationMs: v.number(), errorCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const generation = await ctx.db.get(args.generationId);
    if (!generation) return;
    const user = await ctx.db.get(generation.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Generation ownership check failed");
    const now = Date.now();
    await ctx.db.insert("modelUsage", {
      userId: generation.userId, generationId: args.generationId, provider: generation.provider, model: generation.model,
      taskType: "hair_try_on", durationMs: args.durationMs, status: "failed", createdAt: now,
    });
    await ctx.db.patch(args.generationId, { status: "failed", generationTimeMs: args.durationMs, errorCode: args.errorCode, updatedAt: now });
  },
});
