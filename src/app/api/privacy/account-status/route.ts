import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { publicConvex } from "@/lib/convex/server";
import { api } from "../../../../../convex/_generated/api";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function GET(request: Request) {
  // A random receipt is a status-only capability. Never place it in query strings.
  const receipt = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(receipt)) return NextResponse.json({ error: "Invalid receipt" }, { status: 404, headers });
  try {
    const status = await publicConvex().query(api.privacy.accountStatus, { receiptHash: createHash("sha256").update(receipt).digest("hex") });
    return NextResponse.json(status ?? { error: "Receipt unavailable" }, { status: status ? 200 : 404, headers });
  } catch { return NextResponse.json({ error: "Status temporarily unavailable" }, { status: 503, headers }); }
}
