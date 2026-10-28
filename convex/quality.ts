import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
const verdict = v.union(v.literal("usable"), v.literal("face_changed"), v.literal("hair_unrealistic"));
export const review = mutation({ args: { resultId: v.id("generationResults"), verdict }, handler: async (ctx, args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const result = await ctx.db.get(args.resultId), generation = result ? await ctx.db.get(result.generationId) : null;
  const user = generation ? await ctx.db.get(generation.userId) : null;
  if (!result || !generation || !user || user.clerkId !== identity.subject) throw new Error("Result not found");
  const existing = await ctx.db.query("previewReviews").withIndex("by_result", q => q.eq("resultId", result._id)).unique();
  if (existing) await ctx.db.patch(existing._id, { verdict: args.verdict, updatedAt: Date.now() });
  else await ctx.db.insert("previewReviews", { userId: user._id, resultId: result._id, verdict: args.verdict, createdAt: Date.now() });
} });
export const mine = query({ args: { resultId: v.id("generationResults") }, handler: async (ctx, args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const review = await ctx.db.query("previewReviews").withIndex("by_result", q => q.eq("resultId", args.resultId)).unique();
  const user = review ? await ctx.db.get(review.userId) : null;
  return user?.clerkId === identity.subject ? review?.verdict : null;
} });
