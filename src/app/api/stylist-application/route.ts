import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { stylistApplicationSchema } from "../../../../convex/stylistApplicationFields";
import { ownedConvex } from "@/lib/convex/server";

const headers = { "Cache-Control": "private, no-store" };
const failure = () => NextResponse.json({ error: "Application service unavailable. Please try again." }, { status: 503, headers });
const unauthenticated = () => NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function GET() {
  try {
    const client = await ownedConvex();
    if (!client) return unauthenticated();
    return NextResponse.json({ application: await client.query(api.stylistApplications.mine, {}) }, { headers });
  } catch { return failure(); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers });
  try {
    const client = await ownedConvex();
    if (!client) return unauthenticated();
    // Bound input before JSON parsing; application fields have tighter limits below.
    const text = await request.text();
    if (text.length > 16_000) return NextResponse.json({ error: "Application too large" }, { status: 413, headers });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid application" }, { status: 400, headers }); }
    const parsed = stylistApplicationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid application" }, { status: 400, headers });
    await client.mutation(api.stylistApplications.submit, parsed.data);
    return NextResponse.json({ application: await client.query(api.stylistApplications.mine, {}) }, { headers });
  } catch { return failure(); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers });
  try {
    const client = await ownedConvex();
    if (!client) return unauthenticated();
    await client.mutation(api.stylistApplications.withdraw, {});
    return NextResponse.json({ application: null }, { headers });
  } catch { return failure(); }
}
