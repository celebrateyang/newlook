import { GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeHairImage } from "@/lib/ai/hair-analysis";
import { r2Env } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";

export const runtime = "nodejs";

const requestSchema = z.object({
  key: z.string().min(1).max(500),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Please sign in before starting the analysis." }, { status: 401 });
    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Invalid analysis request." }, { status: 400 });
    const expectedPrefix = `uploads/user_${userId}/original_`;
    if (!body.data.key.startsWith(expectedPrefix)) return NextResponse.json({ error: "This upload does not belong to the signed-in user." }, { status: 403 });

    const env = r2Env();
    const object = await createR2Client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: body.data.key }));
    if (!object.Body) throw new Error("The uploaded image could not be read from R2.");
    const bytes = await object.Body.transformToByteArray();
    const analysis = await analyzeHairImage(bytes, body.data.mimeType);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Hair analysis failed", error);
    const message = error instanceof Error ? error.message : "Analysis failed unexpectedly.";
    return NextResponse.json({ error: process.env.NODE_ENV === "development" ? message : "Analysis failed. Please try again." }, { status: 500 });
  }
}
