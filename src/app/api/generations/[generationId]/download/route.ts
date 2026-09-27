import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { convertPhotoToJpeg } from "@/lib/downloads/image";
import { getOwnedGeneration, safeFilename } from "@/lib/generations/server";
import { r2Env } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  const owned = await getOwnedGeneration(generationId);
  if (owned.status === 401) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (owned.status === 404) return NextResponse.json({ error: "Result not found" }, { status: 404 });
  const resultId = new URL(request.url).searchParams.get("resultId");
  const result = owned.data.results.find((item) => item._id === resultId);
  if (!result) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  const object = await createR2Client().send(new GetObjectCommand({ Bucket: r2Env().R2_BUCKET_NAME, Key: result.r2Key }));
  if (!object.Body) return NextResponse.json({ error: "Image is unavailable" }, { status: 404 });
  const bytes = await convertPhotoToJpeg(await object.Body.transformToByteArray());
  const view = result.view ?? "front";
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": "image/jpeg",
    "Content-Disposition": `attachment; filename="${safeFilename(owned.data.hairstyle.nameEn)}-${view}.jpg"`,
    "Cache-Control": "private, no-store",
  } });
}
