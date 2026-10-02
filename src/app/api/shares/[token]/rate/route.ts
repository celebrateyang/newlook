import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "../../../../../../convex/_generated/api";
import { getPublicShare } from "@/lib/shares/server";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Sign in to rate this look" }, { status: 401 });
  const body = z.object({ score: z.number().int().min(1).max(5) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a score from 1 to 5" }, { status: 400 });
  if (!await getPublicShare(token)) return NextResponse.json({ error: "Share unavailable" }, { status: 404 });
  const authToken = await session.getToken({ template: "convex" });
  if (!authToken || !process.env.NEXT_PUBLIC_CONVEX_URL) return NextResponse.json({ error: "Rating unavailable" }, { status: 503 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(authToken);
  try {
    return NextResponse.json(await convex.mutation(api.shares.rate, { token, score: body.data.score }));
  } catch {
    return NextResponse.json({ error: "Could not rate this look. You cannot rate your own look." }, { status: 400 });
  }
}
