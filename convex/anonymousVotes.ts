import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";

export const voteProof = v.object({
  kind: v.union(v.literal("poll"), v.literal("single")), token: v.string(),
  index: v.number(), score: v.number(), voterId: v.string(), networkId: v.string(),
  accountId: v.string(), issuedAt: v.number(), signature: v.string(),
});
export type VoteProof = { kind: "poll" | "single"; token: string; index: number; score: number; voterId: string; networkId: string; accountId: string; issuedAt: number; signature: string };
export function votePayload(proof: Omit<VoteProof, "signature">) {
  return JSON.stringify([proof.kind, proof.token, proof.index, proof.score, proof.voterId, proof.networkId, proof.accountId, proof.issuedAt]);
}

export async function verifyVote(proof: VoteProof) {
  const secret = process.env.SHARING_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new ConvexError({ code: "RATING_UNAVAILABLE" });
  if (!/^[a-f0-9]{48}$/.test(proof.token) || !/^[a-f0-9]{64}$/.test(proof.signature) || !proof.voterId || proof.voterId.length > 150 || !/^[a-f0-9]{64}$/.test(proof.networkId) || Math.abs(Date.now() - proof.issuedAt) > 60_000 || !Number.isInteger(proof.index) || !Number.isInteger(proof.score) || proof.score < 1 || proof.score > 5) throw new ConvexError({ code: "INVALID_VOTE" });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signature = Uint8Array.from(proof.signature.match(/../g)!, value => parseInt(value, 16));
  if (!await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(votePayload(proof)))) throw new ConvexError({ code: "INVALID_VOTE" });
}

export async function limitVote(ctx: MutationCtx, proof: VoteProof) {
  const start = Math.floor(Date.now() / 60_000) * 60_000;
  for (const [key, limit] of [[`visitor:${proof.voterId}`, 20], [`network:${proof.networkId}`, 60]] as const) {
    const row = await ctx.db.query("ratingLimits").withIndex("by_key", q => q.eq("key", key)).unique();
    if (row?.windowStart === start && row.used >= limit) throw new ConvexError({ code: "RATE_LIMITED" });
    if (row) await ctx.db.patch(row._id, { windowStart: start, used: row.windowStart === start ? row.used + 1 : 1 });
    else await ctx.db.insert("ratingLimits", { key, windowStart: start, used: 1 });
  }
}

export const pruneLimits = internalMutation({
  args: {},
  handler: async ctx => {
    const rows = await ctx.db.query("ratingLimits").withIndex("by_window", q => q.lt("windowStart", Date.now() - 86_400_000)).take(1000);
    for (const row of rows) await ctx.db.delete(row._id);
  },
});
