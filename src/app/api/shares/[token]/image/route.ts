import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getPublicShare } from "@/lib/shares/server";
import { createR2Client } from "@/lib/r2/client";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getPublicShare(token);
  if (!share) return new NextResponse(null, { status: 404 });
  try {
    const object = await createR2Client().send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: share.r2Key }));
    if (!object.Body) return new NextResponse(null, { status: 404 });
    const bytes = await sharp(await object.Body.transformToByteArray()).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Shared image unavailable", error);
    return new NextResponse(null, { status: 503 });
  }
}
