import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { r2Env } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";

const requestSchema = z.object({
  type: z.enum(["original", "reference"]),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});
const extensions: Record<z.infer<typeof requestSchema>["mimeType"], string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid upload", details: body.error.flatten() }, { status: 400 });

  const env = r2Env();
  const folder = body.data.type === "original" ? "uploads" : "references";
  const prefix = body.data.type === "original" ? "original" : "reference";
  const key = `${folder}/user_${userId}/${prefix}_${randomUUID()}.${extensions[body.data.mimeType]}`;
  const command = new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: body.data.mimeType, ContentLength: body.data.size });
  const uploadUrl = await getSignedUrl(createR2Client(), command, { expiresIn: 300 });
  return NextResponse.json({ uploadUrl, key, expiresIn: 300 });
}
