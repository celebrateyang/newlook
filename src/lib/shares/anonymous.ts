import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexError } from "convex/values";
import { votePayload, type VoteProof } from "../../../convex/anonymousVotes";
export async function signVote(request: Request, kind: VoteProof["kind"], token: string, index: number, score: number) {
  const secret = process.env.SHARING_SIGNING_SECRET;
  if (!secret || secret.length < 32) throw new Error("Anonymous rating is not configured");
  const hash = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  const store = await cookies();
  const [id, mac] = (store.get("newself-voter")?.value ?? "").split(".");
  const valid = /^[a-f0-9]{48}$/.test(id ?? "") && /^[a-f0-9]{64}$/.test(mac ?? "") && timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(hash(`cookie:${id}`), "hex"));
  const visitor = valid ? id : randomBytes(24).toString("hex");
  if (!valid) store.set("newself-voter", `${visitor}.${hash(`cookie:${visitor}`)}`, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 31_536_000 });
  const accountId = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (await auth()).userId ?? "" : "";
  // Vercel overwrites this header at its edge. Generic forwarded headers from
  // clients must not control production rate limiting.
  const network = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "local";
  const proof = { kind, token, index, score, voterId: accountId || `anon:${hash(`visitor:${visitor}`)}`, networkId: hash(`network:${network}`), accountId, issuedAt: Date.now() };
  return { ...proof, signature: hash(votePayload(proof)) };
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}
export function ratingError(error: unknown) {
  const data = error instanceof ConvexError && typeof error.data === "object" && error.data ? error.data : null;
  const code = data && "code" in data ? String(data.code) : "RATING_UNAVAILABLE";
  const messages: Record<string, string> = { RATE_LIMITED: "Too many ratings. Please wait a minute.", SELF_VOTE: "Ask a friend to rate your look", SHARE_UNAVAILABLE: "Share unavailable", INVALID_VOTE: "Could not submit your rating.", RATING_UNAVAILABLE: "Rating unavailable" };
  return NextResponse.json({ error: messages[code] ?? messages.RATING_UNAVAILABLE }, { status: code === "RATE_LIMITED" ? 429 : code === "SELF_VOTE" || code === "INVALID_VOTE" ? 400 : code === "SHARE_UNAVAILABLE" ? 404 : 503, headers: { "Cache-Control": "no-store", ...(code === "RATE_LIMITED" ? { "Retry-After": "60" } : {}) } });
}
