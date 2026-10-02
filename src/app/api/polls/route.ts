import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ownedConvex } from "@/lib/convex/server";
import { sameOrigin } from "@/lib/shares/anonymous";
export async function GET() {
  try {
    const client = await ownedConvex();
    if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    return NextResponse.json(await client.query(api.polls.mine, {}), { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Could not load sharing settings." }, { status: 500 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  try {
    const client = await ownedConvex();
    if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const parsed = z.object({ resultIds: z.array(z.string().min(1).max(100)).min(2).max(6), title: z.string().trim().max(100).default("") }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Select 2–6 saved looks." }, { status: 400 });
    const token = await client.mutation(api.polls.create, { ...parsed.data, resultIds: parsed.data.resultIds as Id<"generationResults">[], token: randomBytes(24).toString("hex") });
    return NextResponse.json({ token }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not create your sharing page." }, { status: 400 }); }
}
