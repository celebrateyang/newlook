import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireIdentity(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export const recordCompleted = mutation({
  args: {
    type: v.union(v.literal("original"), v.literal("reference")),
    r2Key: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const expectedFolder = args.type === "original" ? "uploads" : "references";
    const expectedPrefix = args.type === "original" ? "original" : "reference";
    const ownedPrefix = `${expectedFolder}/user_${identity.subject}/${expectedPrefix}_`;
    if (!args.r2Key.startsWith(ownedPrefix)) throw new Error("Upload ownership check failed");

    const now = Date.now();
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    let userId = user?._id;
    if (!userId) {
      userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        locale: "en",
        credits: 1,
        createdAt: now,
      });
    } else {
      await ctx.db.patch(userId, { updatedAt: now });
    }

    const existing = await ctx.db
      .query("uploads")
      .withIndex("by_r2_key", (q) => q.eq("r2Key", args.r2Key))
      .unique();
    if (existing) {
      if (existing.userId !== userId) throw new Error("Upload ownership check failed");
      return existing._id;
    }

    return await ctx.db.insert("uploads", { userId, ...args, createdAt: now });
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) return [];
    return await ctx.db.query("uploads").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").collect();
  },
});
