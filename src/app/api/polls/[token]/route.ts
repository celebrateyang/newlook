import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { ownedConvex } from "@/lib/convex/server";
import { sameOrigin } from "@/lib/shares/anonymous";
export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  try {
    const client = await ownedConvex();
    if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    await client.mutation(api.polls.disable, await params); return NextResponse.json({ active: false });
  } catch { return NextResponse.json({ error: "Could not turn off sharing." }, { status: 400 }); }
}
