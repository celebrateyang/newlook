import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { voteProof, verifyVote, limitVote } from "./anonymousVotes";

async function currentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
  if (!user) throw new Error("User not found");
  return user;
}
async function resultData(ctx: QueryCtx | MutationCtx, resultId: Id<"generationResults">, userId: Id<"users">) {
  const result = await ctx.db.get(resultId);
  const generation = result ? await ctx.db.get(result.generationId) : null;
  const owner = await ctx.db.get(userId);
  if (!result || !generation || generation.status !== "completed" || generation.userId !== userId || !owner || !result.r2Key.startsWith(`generations/user_${owner.clerkId}/gen_${generation._id}_`)) return null;
  const style = await ctx.db.get(generation.hairstyleId);
  return { r2Key: result.r2Key, name: style?.nameEn ?? "Hairstyle", nameZh: style?.nameZh ?? "发型", view: result.view ?? "front" };
}
export const create = mutation({
  args: { resultIds: v.array(v.id("generationResults")), title: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (args.resultIds.length < 2 || args.resultIds.length > 6 || new Set(args.resultIds).size !== args.resultIds.length || !/^[a-f0-9]{48}$/.test(args.token) || args.title.trim().length > 100) throw new Error("Invalid poll");
    for (const id of args.resultIds) if (!await resultData(ctx, id, user._id)) throw new Error("Result not found");
    if (await ctx.db.query("hairstylePolls").withIndex("by_token", q => q.eq("token", args.token)).unique()) throw new Error("Token already exists");
    await ctx.db.insert("hairstylePolls", { userId: user._id, title: args.title.trim(), token: args.token, active: true, resultIds: args.resultIds, counts: args.resultIds.map(() => 0), totals: args.resultIds.map(() => 0), createdAt: Date.now() });
    return args.token;
  },
});
export const mine = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    if (!user) return [];
    const polls = await ctx.db.query("hairstylePolls").withIndex("by_user", q => q.eq("userId", user._id)).order("desc").take(50);
    return polls.map(poll => ({ token: poll.token, active: poll.active, title: poll.title, count: poll.resultIds.length, createdAt: poll.createdAt }));
  },
});
export const disable = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    const poll = await ctx.db.query("hairstylePolls").withIndex("by_token", q => q.eq("token", args.token)).unique();
    if (!poll || poll.userId !== user._id) throw new Error("Poll not found");
    await ctx.db.patch(poll._id, { active: false, updatedAt: Date.now() });
  },
});
export const publicPoll = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!/^[a-f0-9]{48}$/.test(args.token)) return null;
    const poll = await ctx.db.query("hairstylePolls").withIndex("by_token", q => q.eq("token", args.token)).unique();
    if (!poll?.active) return null;
    const items = [];
    for (let index = 0; index < poll.resultIds.length; index++) {
      const result = await resultData(ctx, poll.resultIds[index], poll.userId);
      if (!result) return null;
      items.push({ ...result, index, label: String.fromCharCode(65 + index), count: poll.counts[index], average: poll.counts[index] ? poll.totals[index] / poll.counts[index] : 0 });
    }
    return { title: poll.title, items };
  },
});
export const rate = mutation({
  args: { proof: voteProof },
  handler: async (ctx, { proof }) => {
    await verifyVote(proof);
    if (proof.kind !== "poll") throw new ConvexError({ code: "INVALID_VOTE" });
    const poll = await ctx.db.query("hairstylePolls").withIndex("by_token", q => q.eq("token", proof.token)).unique();
    if (!poll?.active || proof.index < 0 || proof.index >= poll.resultIds.length) throw new ConvexError({ code: "SHARE_UNAVAILABLE" });
    const owner = await ctx.db.get(poll.userId);
    if (proof.accountId && proof.accountId === owner?.clerkId) throw new ConvexError({ code: "SELF_VOTE" });
    for (const id of poll.resultIds) if (!await resultData(ctx, id, poll.userId)) throw new ConvexError({ code: "SHARE_UNAVAILABLE" });
    await limitVote(ctx, proof);
    const previous = await ctx.db.query("pollRatings").withIndex("by_poll_voter", q => q.eq("pollId", poll._id).eq("voterId", proof.voterId)).unique();
    const scores = previous?.scores ?? poll.resultIds.map(() => 0);
    const oldScore = scores[proof.index];
    scores[proof.index] = proof.score;
    if (previous) await ctx.db.patch(previous._id, { scores, updatedAt: Date.now() });
    else await ctx.db.insert("pollRatings", { pollId: poll._id, voterId: proof.voterId, scores, createdAt: Date.now() });
    const counts = [...poll.counts], totals = [...poll.totals];
    counts[proof.index] += oldScore ? 0 : 1;
    totals[proof.index] += proof.score - oldScore;
    await ctx.db.patch(poll._id, { counts, totals, updatedAt: Date.now() });
    return { index: proof.index, score: proof.score, count: counts[proof.index], average: totals[proof.index] / counts[proof.index] };
  },
});

export const myRatings = query({
  args: { proof: voteProof },
  handler: async (ctx, { proof }) => {
    await verifyVote(proof);
    if (proof.kind !== "poll") throw new ConvexError({ code: "INVALID_VOTE" });
    const poll = await ctx.db.query("hairstylePolls").withIndex("by_token", q => q.eq("token", proof.token)).unique();
    if (!poll?.active) return [];
    const row = await ctx.db.query("pollRatings").withIndex("by_poll_voter", q => q.eq("pollId", poll._id).eq("voterId", proof.voterId)).unique();
    return row?.scores ?? [];
  },
});
