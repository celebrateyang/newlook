import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const DAILY_GENERATION_LIMIT = 6;
const DAY = 86_400_000;
const OFFSET = 8 * 3_600_000;

export function quotaDay(now = Date.now()) {
  const start = Math.floor((now + OFFSET) / DAY) * DAY - OFFSET;
  return { start, resetAt: start + DAY };
}

export async function readQuota(ctx: QueryCtx, userId: Id<"users">, now = Date.now()) {
  const { start, resetAt } = quotaDay(now);
  const quota = await ctx.db.query("generationQuotas").withIndex("by_user_day", q => q.eq("userId", userId).eq("dayStart", start)).unique();
  // Include pre-existing generations on the day the quota feature is deployed.
  const used = quota?.used ?? (await ctx.db.query("generations").withIndex("by_user_created", q => q.eq("userId", userId).gte("createdAt", start)).take(DAILY_GENERATION_LIMIT)).length;
  return { limit: DAILY_GENERATION_LIMIT, used, remaining: Math.max(0, DAILY_GENERATION_LIMIT - used), resetAt, timezone: "Asia/Shanghai" };
}

export async function reserveGeneration(ctx: MutationCtx, userId: Id<"users">) {
  const now = Date.now();
  const state = await readQuota(ctx, userId, now);
  if (!state.remaining) throw new ConvexError({ code: "DAILY_GENERATION_LIMIT", resetAt: state.resetAt });
  const { start } = quotaDay(now);
  const quota = await ctx.db.query("generationQuotas").withIndex("by_user_day", q => q.eq("userId", userId).eq("dayStart", start)).unique();
  if (quota) await ctx.db.patch(quota._id, { used: state.used + 1 });
  else await ctx.db.insert("generationQuotas", { userId, dayStart: start, used: state.used + 1 });
}
