import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "../../../../../../convex/_generated/api";
import { publicConvex } from "@/lib/convex/server";
import { sameOrigin, signVote, ratingError } from "@/lib/shares/anonymous";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const { token } = await params;
  const body = z.object({ index: z.number().int().min(0).max(5), score: z.number().int().min(1).max(5) }).safeParse(await request.json().catch(() => null));
  if (!body.success || !/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: "Choose a score from 1 to 5" }, { status: 400 });
  try {
    const proof = await signVote(request, "poll", token, body.data.index, body.data.score);
    return NextResponse.json(await publicConvex().mutation(api.polls.rate, { proof }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return ratingError(error); }
}
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({}, { status: 403 });
  try {
    const { token } = await params;
    const proof = await signVote(request, "poll", token, 0, 1);
    return NextResponse.json({ scores: await publicConvex().query(api.polls.myRatings, { proof }) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return ratingError(error); }
}
