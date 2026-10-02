import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

async function ownedResult(ctx: QueryCtx | MutationCtx, resultId: Id<"generationResults">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const result = await ctx.db.get(resultId);
  const generation = result ? await ctx.db.get(result.generationId) : null;
  const user = generation ? await ctx.db.get(generation.userId) : null;
  if (!result || !generation || generation.status !== "completed" || !user || user.clerkId !== identity.subject) throw new Error("Result not found");
  if (!result.r2Key.startsWith(`generations/user_${user.clerkId}/gen_${generation._id}_`)) throw new Error("Invalid result image");
  return { result, user };
}

export const mine = query({
  args: { resultId: v.id("generationResults") },
  handler: async (ctx, args) => {
    await ownedResult(ctx, args.resultId);
    const share = await ctx.db.query("resultShares").withIndex("by_result", q => q.eq("generationResultId", args.resultId)).unique();
    return share ? { token: share.token, active: share.active, count: share.ratingCount, average: share.ratingCount ? share.ratingTotal / share.ratingCount : 0 } : null;
  },
});

export const enable = mutation({
  args: { resultId: v.id("generationResults"), token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await ownedResult(ctx, args.resultId);
    if (!/^[a-f0-9]{48}$/.test(args.token)) throw new Error("Invalid share token");
    const existing = await ctx.db.query("resultShares").withIndex("by_result", q => q.eq("generationResultId", args.resultId)).unique();
    if (existing?.active) return existing.token;
    if (await ctx.db.query("resultShares").withIndex("by_token", q => q.eq("token", args.token)).unique()) throw new Error("Share token already exists");
    if (existing) await ctx.db.patch(existing._id, { token: args.token, active: true, updatedAt: Date.now() });
    else await ctx.db.insert("resultShares", { userId: user._id, generationResultId: args.resultId, token: args.token, active: true, ratingCount: 0, ratingTotal: 0, createdAt: Date.now() });
    return args.token;
  },
});

export const disable = mutation({
  args: { resultId: v.id("generationResults") },
  handler: async (ctx, args) => {
    await ownedResult(ctx, args.resultId);
    const share = await ctx.db.query("resultShares").withIndex("by_result", q => q.eq("generationResultId", args.resultId)).unique();
    if (share) await ctx.db.patch(share._id, { active: false, updatedAt: Date.now() });
  },
});

export const publicResult = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!/^[a-f0-9]{48}$/.test(args.token)) return null;
    const share = await ctx.db.query("resultShares").withIndex("by_token", q => q.eq("token", args.token)).unique();
    if (!share?.active) return null;
    const result = await ctx.db.get(share.generationResultId);
    const generation = result ? await ctx.db.get(result.generationId) : null;
    if (!result || !generation || generation.status !== "completed" || generation.userId !== share.userId) return null;
    const hairstyle = await ctx.db.get(generation.hairstyleId);
    // Only the explicitly shared output is public. Never include source uploads or account data.
    return { name: hairstyle?.nameEn ?? "Hairstyle", nameZh: hairstyle?.nameZh ?? "发型", r2Key: result.r2Key, count: share.ratingCount, average: share.ratingCount ? share.ratingTotal / share.ratingCount : 0 };
  },
});

export const rate = mutation({
  args: { token: v.string(), score: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (!Number.isInteger(args.score) || args.score < 1 || args.score > 5) throw new Error("Choose a score from 1 to 5");
    const share = await ctx.db.query("resultShares").withIndex("by_token", q => q.eq("token", args.token)).unique();
    if (!share?.active) throw new Error("Share unavailable");
    const owner = await ctx.db.get(share.userId);
    if (owner?.clerkId === identity.subject) throw new Error("Ask a friend to rate your look");
    const result = await ctx.db.get(share.generationResultId);
    const generation = result ? await ctx.db.get(result.generationId) : null;
    if (!generation || generation.status !== "completed") throw new Error("Share unavailable");
    const previous = await ctx.db.query("shareRatings").withIndex("by_share_voter", q => q.eq("shareId", share._id).eq("voterId", identity.subject)).unique();
    if (previous) await ctx.db.patch(previous._id, { score: args.score, updatedAt: Date.now() });
    else await ctx.db.insert("shareRatings", { shareId: share._id, voterId: identity.subject, score: args.score, createdAt: Date.now() });
    const count = share.ratingCount + (previous ? 0 : 1);
    const total = share.ratingTotal - (previous?.score ?? 0) + args.score;
    await ctx.db.patch(share._id, { ratingCount: count, ratingTotal: total, updatedAt: Date.now() });
    return { count, average: total / count, score: args.score };
  },
});
