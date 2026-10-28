import { NextResponse } from "next/server";
import { createSalonGuidePdf } from "@/lib/downloads/pdf";
import { getOwnedGeneration, safeFilename } from "@/lib/generations/server";
import { getAssessedSalonGuide } from "@/lib/hairstyles/salon-guides";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  const owned = await getOwnedGeneration(generationId);
  if (owned.status === 401) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (owned.status === 404) return NextResponse.json({ error: "Result not found" }, { status: 404 });
  const guide = getAssessedSalonGuide(owned.data.hairstyle.slug, "en", owned.data.assessment);
  if (!guide) return NextResponse.json({ error: "Guide is unavailable" }, { status: 404 });
  const pdf = createSalonGuidePdf(owned.data.hairstyle.nameEn, guide);
  return new Response(Buffer.from(pdf), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${safeFilename(owned.data.hairstyle.nameEn)}-salon-guide.pdf"`,
    "Cache-Control": "private, no-store",
  } });
}
