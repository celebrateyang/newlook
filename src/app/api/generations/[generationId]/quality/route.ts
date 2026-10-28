import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnedGeneration } from "@/lib/generations/server";
import { sameOrigin } from "@/lib/shares/anonymous";
import { api } from "../../../../../../convex/_generated/api";
export async function GET(request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  const owned = await getOwnedGeneration((await params).generationId);
  if (owned.status !== 200) return NextResponse.json({ error: "Result unavailable" }, { status: owned.status });
  const result = owned.data.results.find(r => r._id === new URL(request.url).searchParams.get("resultId"));
  if (!result) return NextResponse.json({ error: "Result unavailable" }, { status: 404 });
  return NextResponse.json({ verdict: await owned.convex.query(api.quality.mine, { resultId: result._id }) }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const owned = await getOwnedGeneration((await params).generationId);
  if (owned.status !== 200) return NextResponse.json({ error: "Result unavailable" }, { status: owned.status });
  const parsed = z.object({ resultId: z.string(), verdict: z.enum(["usable", "face_changed", "hair_unrealistic"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  const result = owned.data.results.find(r => r._id === parsed.data.resultId);
  if (!result) return NextResponse.json({ error: "Result unavailable" }, { status: 404 });
  await owned.convex.mutation(api.quality.review, { resultId: result._id, verdict: parsed.data.verdict });
  return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "private, no-store" } });
}
