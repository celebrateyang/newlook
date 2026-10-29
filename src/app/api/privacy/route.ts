import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ownedConvex } from "@/lib/convex/server";
import { sameOrigin } from "@/lib/shares/anonymous";
import { api } from "../../../../convex/_generated/api";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client } from "@/lib/r2/client";
import { r2Env } from "@/lib/env";
import { createHash, createHmac, randomBytes } from "node:crypto";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const client = await ownedConvex();
    if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
    const data = await client.query(api.privacy.summary, {});
    const r2 = createR2Client(), bucket = r2Env().R2_BUCKET_NAME;
    const uploads = await Promise.all(data.uploads.map(async ({ r2Key, ...upload }) => ({ ...upload, url: await getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: r2Key }), { expiresIn: 300 }) })));
    return NextResponse.json({ ...data, uploads }, { headers });
  } catch { return NextResponse.json({ error: "Could not load photo privacy settings." }, { status: 503, headers }); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request" }, { status: 403, headers });
  try {
    const client = await ownedConvex();
    if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
    const parsed = z.object({ scope: z.enum(["upload", "generation", "media", "account"]), id: z.string().min(1).max(100).optional(), confirm: z.literal("DELETE") }).safeParse(await request.json().catch(() => null));
    if (!parsed.success || (["upload", "generation"].includes(parsed.data.scope) && !parsed.data.id)) return NextResponse.json({ error: "Confirm what you want to delete." }, { status: 400, headers });
    const { scope, id } = parsed.data;
    const accountUserId = scope === "account" ? (await auth()).userId : null;
    if (scope === "account" && !accountUserId) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
    const receipt = scope === "account" ? randomBytes(32).toString("hex") : undefined;
    const receiptHash = receipt ? createHash("sha256").update(receipt).digest("hex") : undefined;
    const result = await client.mutation(api.privacy.erase, { scope, id, ...(receiptHash ? { receiptHash } : {}) });
    if (scope === "account") {
      const confirmDeleted = async () => {
        const secret = process.env.SHARING_SIGNING_SECRET;
        if (!secret || secret.length < 32) return false;
        const issuedAt = Date.now(), signature = createHmac("sha256", secret).update(`newself-account-deletion-v1|${accountUserId}|${issuedAt}`).digest("hex");
        try { await client.mutation(api.privacy.eraseFromWebhook, { clerkId: accountUserId!, issuedAt, signature }); return true; }
        catch { return false; } // The verified Clerk webhook can still complete confirmation.
      };
      try { await (await clerkClient()).users.deleteUser(accountUserId!); }
      catch (error) {
        if (error && typeof error === "object" && "status" in error && error.status === 404) return NextResponse.json({ ...result, accountDeleted: true, receipt, statusConfirmationPending: !await confirmDeleted() }, { status: 202, headers });
        // Media and application access is already revoked; never report that Clerk deletion succeeded.
        return NextResponse.json({ error: "Your application data was removed, but sign-in account deletion is pending. Retry or contact hello@newself.cc.", accountPending: true, receipt, ...result }, { status: 503, headers });
      }
      return NextResponse.json({ ...result, accountDeleted: true, receipt, statusConfirmationPending: !await confirmDeleted() }, { status: 202, headers });
    }
    return NextResponse.json({ ...result, accountDeleted: false }, { status: 202, headers });
  } catch { return NextResponse.json({ error: "Could not request deletion. Please retry or contact hello@newself.cc." }, { status: 400, headers }); }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request" }, { status: 403, headers });
  let client;
  try { client = await ownedConvex(); }
  catch { return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503, headers }); }
  if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
  const parsed = z.object({ uploadId: z.string().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid photo" }, { status: 400, headers });
  try {
    await client.mutation(api.privacy.keepUpload, { uploadId: parsed.data.uploadId as import("../../../../convex/_generated/dataModel").Id<"uploads"> });
    return NextResponse.json({ kept: true }, { headers });
  } catch { return NextResponse.json({ error: "Photo unavailable" }, { status: 404, headers }); }
}
