import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { stylistApplicationSchema } from "./stylistApplicationFields";

export const mine = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    return ctx.db.query("stylistApplications").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
  },
});

export const submit = mutation({
  args: { name: v.string(), phone: v.string(), wechat: v.string(), city: v.string(), district: v.string(), salon: v.string(), address: v.string(), experienceYears: v.number(), specialties: v.array(v.string()), portfolioUrl: v.string(), introduction: v.string(), consent: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    const parsed = stylistApplicationSchema.safeParse(args);
    if (!parsed.success) throw new ConvexError("INVALID_APPLICATION");
    const existing = await ctx.db.query("stylistApplications").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    const now = Date.now();
    const data = { ...parsed.data, status: "received" as const, consentVersion: "stylist-recruitment-v1", consentAt: now, updatedAt: now };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert("stylistApplications", { ...data, clerkId: identity.subject, createdAt: now });
  },
});

export const withdraw = mutation({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    const existing = await ctx.db.query("stylistApplications").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
