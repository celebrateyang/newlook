import { createHmac } from "node:crypto";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { publicConvex } from "@/lib/convex/server";
import { api } from "../../../../../convex/_generated/api";
import type { NextRequest } from "next/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  let event;
  try { event = await verifyWebhook(request); }
  catch { return new Response("Invalid webhook signature", { status: 400 }); }
  if (event.type !== "user.deleted") return new Response("Ignored", { status: 200 });
  const clerkId = event.data.id, secret = process.env.SHARING_SIGNING_SECRET;
  if (!clerkId || !secret || secret.length < 32) return new Response("Deletion processing unavailable", { status: 503 });
  const issuedAt = Date.now(), signature = createHmac("sha256", secret).update(`newself-account-deletion-v1|${clerkId}|${issuedAt}`).digest("hex");
  try {
    await publicConvex().mutation(api.privacy.eraseFromWebhook, { clerkId, issuedAt, signature });
    return new Response("Deletion queued", { status: 200 });
  } catch { return new Response("Deletion processing unavailable", { status: 503 }); }
}
