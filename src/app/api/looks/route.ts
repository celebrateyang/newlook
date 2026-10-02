import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { api } from "../../../../convex/_generated/api";
import { ownedConvex } from "@/lib/convex/server";
import { createR2Client } from "@/lib/r2/client";
import { r2Env } from "@/lib/env";
export async function GET(request: Request) {
  try {
    const client = await ownedConvex();
    if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const data = await client.query(api.generations.historyMine, { paginationOpts: { numItems: 12, cursor: new URL(request.url).searchParams.get("cursor") } });
    const r2 = createR2Client(), env = r2Env();
    const items = await Promise.all(data.page.map(async ({ r2Key, ...item }) => ({ ...item, url: await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: r2Key }), { expiresIn: 3600 }) })));
    return NextResponse.json({ items, isDone: data.isDone, cursor: data.continueCursor }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Could not load your hairstyles." }, { status: 500 }); }
}
