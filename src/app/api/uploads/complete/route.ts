import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { r2Env } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";

export const runtime = "nodejs";

const requestSchema = z.object({
  type: z.enum(["original", "reference", "side"]),
  key: z.string().min(1).max(500),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const recordCompleted = makeFunctionReference<"mutation", {
  type: "original" | "reference" | "side";
  r2Key: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}, string>("uploads:recordCompleted");

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session.userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Invalid upload metadata" }, { status: 400 });

    const folder = body.data.type === "reference" ? "references" : "uploads";
    const prefix = body.data.type;
    if (!body.data.key.startsWith(`${folder}/user_${session.userId}/${prefix}_`)) {
      return NextResponse.json({ error: "This upload does not belong to the signed-in user" }, { status: 403 });
    }

    const env = r2Env();
    const object = await createR2Client().send(new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: body.data.key }));
    if (object.ContentLength !== body.data.size || object.ContentType !== body.data.mimeType) {
      return NextResponse.json({ error: "Uploaded object metadata does not match the authorization" }, { status: 409 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("Convex is not configured: NEXT_PUBLIC_CONVEX_URL");
    const token = await session.getToken({ template: "convex" });
    if (!token) throw new Error("Could not create a Convex authentication token");
    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(token);
    const uploadId = await convex.mutation(recordCompleted, {
      type: body.data.type,
      r2Key: body.data.key,
      mimeType: body.data.mimeType,
      size: body.data.size,
      width: body.data.width,
      height: body.data.height,
    });
    return NextResponse.json({ uploadId });
  } catch (error) {
    console.error("Upload completion failed", error);
    const message = error instanceof Error ? error.message : "Upload completion failed";
    return NextResponse.json({ error: process.env.NODE_ENV === "development" ? message : "Could not save the upload" }, { status: 500 });
  }
}
