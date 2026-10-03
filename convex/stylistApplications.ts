import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { stylistApplicationSchema } from "./stylistApplicationFields";
import { resolveLegacyRegion, resolveRegion } from "../shared/regions";
import { salonLocationInput } from "./salonLocationFields";

export const mine = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    return ctx.db.query("stylistApplications").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
  },
});

export const submit = mutation({
  args: { name: v.string(), phone: v.string(), wechat: v.string(), provinceCode: v.optional(v.string()), cityCode: v.optional(v.string()), districtCode: v.optional(v.string()), city: v.optional(v.string()), district: v.optional(v.string()), salon: v.string(), address: v.string(), location: v.optional(salonLocationInput), experienceYears: v.number(), specialties: v.array(v.string()), portfolioUrl: v.string(), introduction: v.string(), consent: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    const hasCodes = args.provinceCode !== undefined || args.cityCode !== undefined || args.districtCode !== undefined;
    const selection = hasCodes ? args : resolveLegacyRegion(args.city, args.district);
    const parsed = stylistApplicationSchema.safeParse({ ...args, ...selection });
    if (!parsed.success) throw new ConvexError("INVALID_APPLICATION");
    const existing = await ctx.db.query("stylistApplications").withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject)).unique();
    const now = Date.now();
    const region = resolveRegion(parsed.data)!;
    const addressChanged = existing && (existing.address !== parsed.data.address || existing.provinceCode !== region.provinceCode || existing.cityCode !== region.cityCode || existing.districtCode !== region.districtCode);
    const pin = parsed.data.location;
    const samePin = pin && existing?.location && pin.latitude === existing.location.latitude && pin.longitude === existing.location.longitude && pin.source === existing.location.source && pin.accuracyMeters === existing.location.accuracyMeters;
    const location = pin === undefined ? (addressChanged ? null : existing?.location ?? null)
      : pin === null ? null : { ...pin, confirmedAt: samePin && !addressChanged ? existing!.location!.confirmedAt : now };
    const data = { ...parsed.data, ...region, location, status: "received" as const, consentVersion: "stylist-recruitment-v1", consentAt: now, updatedAt: now };
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
