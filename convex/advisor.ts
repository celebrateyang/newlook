import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { savedAnalysisSchema, advisorPreferencesSchema, ADVISOR_RULES_VERSION } from "../shared/advisor";

export const source = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    const upload = await ctx.db.query("uploads").withIndex("by_r2_key", q => q.eq("r2Key", key)).unique();
    if (!user || user.deleting || !upload || upload.userId !== user._id || upload.type !== "original") return null;
    return { id: upload._id, mimeType: upload.mimeType };
  },
});

export const save = mutation({
  args: { key: v.string(), analysisJson: v.string(), preferencesJson: v.string(), locale: v.union(v.literal("en"), v.literal("zh")), model: v.string(), promptVersion: v.string(), durationMs: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    const upload = await ctx.db.query("uploads").withIndex("by_r2_key", q => q.eq("r2Key", args.key)).unique();
    if (!user || user.deleting || !upload || upload.userId !== user._id || upload.type !== "original") throw new Error("Upload not found");
    if (args.analysisJson.length > 20000 || args.preferencesJson.length > 1000) throw new Error("Invalid assessment");
    const analysis = savedAnalysisSchema.parse(JSON.parse(args.analysisJson));
    const preferences = advisorPreferencesSchema.parse(JSON.parse(args.preferencesJson));
    const now = Date.now();
    const id = await ctx.db.insert("advisorSessions", { userId: user._id, uploadId: upload._id, analysisJson: JSON.stringify(analysis), preferencesJson: JSON.stringify(preferences), locale: args.locale, model: args.model, promptVersion: args.promptVersion, rulesVersion: ADVISOR_RULES_VERSION, createdAt: now });
    await ctx.db.insert("modelUsage", { userId: user._id, provider: "openai", model: args.model, taskType: "hair_analysis", durationMs: args.durationMs, status: "completed", createdAt: now });
    return id;
  },
});

export const recordFailure = mutation({
  args: { key: v.string(), model: v.string(), durationMs: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    const upload = await ctx.db.query("uploads").withIndex("by_r2_key", q => q.eq("r2Key", args.key)).unique();
    if (!user || !upload || upload.userId !== user._id) return;
    await ctx.db.insert("modelUsage", { userId: user._id, provider: "openai", model: args.model, taskType: "hair_analysis", durationMs: args.durationMs, status: "failed", createdAt: Date.now() });
  },
});
