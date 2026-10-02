import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

export async function GET() {
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const token = await session.getToken({ template: "convex" });
  if (!url || !token) return NextResponse.json({ error: "Quota unavailable" }, { status: 503 });
  const convex = new ConvexHttpClient(url);
  convex.setAuth(token);
  return NextResponse.json(await convex.query(api.generations.quotaMine, {}), { headers: { "Cache-Control": "private, no-store" } });
}
