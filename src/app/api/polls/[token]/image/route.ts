import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getPublicPoll } from "@/lib/shares/polls";
import { createPollCollage } from "@/lib/shares/collage";
import { createR2Client } from "@/lib/r2/client";
import { r2Env } from "@/lib/env";
import { isLocale } from "@/lib/i18n/locale";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const poll = await getPublicPoll((await params).token);
    if (!poll) return new NextResponse(null, { status: 404 });
    const query = new URL(request.url).searchParams;
    const language = query.get("locale"), locale = isLocale(language) ? language : "en";
    const shape = query.get("shape") === "square" ? "square" : "wide";
    const rawIndex = query.get("index");
    const index = rawIndex === null ? null : /^\d$/.test(rawIndex) ? Number(rawIndex) : -1;
    if (index !== null && (index < 0 || index >= poll.items.length)) return new NextResponse(null, { status: 404 });
    const r2 = createR2Client(), env = r2Env();
    const items = index === null ? poll.items : [poll.items[index]];
    const images = await Promise.all(items.map(async item => {
      const object = await r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: item.r2Key }));
      if (!object.Body) throw new Error("Image not found");
      return object.Body.transformToByteArray();
    }));
    const bytes = index === null ? await createPollCollage(images, locale, shape) : await sharp(images[0]).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new NextResponse(null, { status: 503 }); }
}
