import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { convertPhotoToJpeg } from "@/lib/downloads/image";
import { createSalonGuidePdf } from "@/lib/downloads/pdf";
import { createZip } from "@/lib/downloads/zip";
import { getOwnedGeneration, safeFilename } from "@/lib/generations/server";
import { getSalonGuide } from "@/lib/hairstyles/salon-guides";
import { r2Env } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  const owned = await getOwnedGeneration(generationId);
  if (owned.status === 401) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (owned.status === 404) return NextResponse.json({ error: "Result not found" }, { status: 404 });
  const guide = getSalonGuide(owned.data.hairstyle.slug);
  if (!guide) return NextResponse.json({ error: "Guide is unavailable" }, { status: 404 });
  const r2 = createR2Client();
  const bucket = r2Env().R2_BUCKET_NAME;
  const files = await Promise.all(owned.data.results.map(async (result) => {
    const object = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: result.r2Key }));
    if (!object.Body) throw new Error("A result image is unavailable");
    return { name: `${result.view ?? "front"}-preview.jpg`, bytes: new Uint8Array(await convertPhotoToJpeg(await object.Body.transformToByteArray())) };
  }));
  files.push({ name: "salon-guide.pdf", bytes: createSalonGuidePdf(owned.data.hairstyle.nameEn, guide) });
  const zip = createZip(files);
  return new Response(Buffer.from(zip), { headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="newlook-${safeFilename(owned.data.hairstyle.nameEn)}.zip"`,
    "Cache-Control": "private, no-store",
  } });
}
