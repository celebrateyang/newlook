import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { getOwnedGeneration } from "@/lib/generations/server";
import { getAssessedSalonGuide } from "@/lib/hairstyles/salon-guides";
import { r2Env } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";
import { getLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  try {
    const { generationId } = await params;
    const owned = await getOwnedGeneration(generationId);
    if (owned.status === 401) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (owned.status === 404) return NextResponse.json({ error: "Result not found" }, { status: 404 });
    const env = r2Env();
    const r2 = createR2Client();
    const views = await Promise.all(owned.data.results.map(async (result) => ({
      id: result._id,
      view: result.view ?? "front",
      sourceUrl: owned.data.sideSources.find(source => source.resultId === result._id) ? await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: owned.data.sideSources.find(source => source.resultId === result._id)!.r2Key }), { expiresIn: 900 }) : undefined,
      url: await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: result.r2Key }), { expiresIn: 3600 }),
    })));
    const reference = owned.data.referenceUpload ? {
      url: await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: owned.data.referenceUpload.r2Key }), { expiresIn: 3600 }),
    } : undefined;
    return NextResponse.json({
      generationId,
      status: owned.data.generation.status,
      style: { slug: owned.data.hairstyle.slug, name: owned.data.hairstyle.nameEn },
      source: { width: owned.data.upload.width, height: owned.data.upload.height },
      sourceUrl: await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: owned.data.upload.r2Key }), { expiresIn: 900 }),
      reference,
      views,
      guide: getAssessedSalonGuide(owned.data.hairstyle.slug, await getLocale(), owned.data.assessment),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load generation", error);
    return NextResponse.json({ error: "Could not load this result" }, { status: 500 });
  }
}
