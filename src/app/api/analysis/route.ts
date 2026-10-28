import { GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeHairImage } from "@/lib/ai/hair-analysis";
import { r2Env } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";
import { getLocale } from "@/lib/i18n/server";
import { ownedConvex } from "@/lib/convex/server";
import { api } from "../../../../convex/_generated/api";
import { advisorPreferencesSchema, defaultPreferences } from "../../../../shared/advisor";
import { HAIR_ANALYSIS_PROMPT_VERSION } from "@/lib/ai/prompts/hair-analysis";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  key: z.string().min(1).max(500),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  preferences: advisorPreferencesSchema.default(defaultPreferences),
});

export async function POST(request: Request) {
  const startedAt = Date.now();
  let client: Awaited<ReturnType<typeof ownedConvex>> = null;
  let attemptedKey: string | undefined;
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Please sign in before starting the analysis." }, { status: 401 });
    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Invalid analysis request." }, { status: 400 });
    const expectedPrefix = `uploads/user_${userId}/original_`;
    if (!body.data.key.startsWith(expectedPrefix)) return NextResponse.json({ error: "This upload does not belong to the signed-in user." }, { status: 403 });
    const convex = await ownedConvex(); client = convex;
    if (!convex) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const upload = await convex.query(api.advisor.source, { key: body.data.key });
    if (!upload || upload.mimeType !== body.data.mimeType) return NextResponse.json({ error: "Photo unavailable. Upload a new selfie." }, { status: 404 });

    const env = r2Env();
    const object = await createR2Client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: body.data.key }));
    if (!object.Body) throw new Error("The uploaded image could not be read from R2.");
    const bytes = await object.Body.transformToByteArray();
    const locale = await getLocale();
    if (object.ContentType !== upload.mimeType || bytes.length > 10 * 1024 * 1024) throw new Error("Invalid source photo");
    attemptedKey = body.data.key;
    const analysis = await analyzeHairImage(bytes, body.data.mimeType, locale, body.data.preferences);
    const consultationId = await convex.mutation(api.advisor.save, { key: body.data.key, analysisJson: JSON.stringify(analysis), preferencesJson: JSON.stringify(body.data.preferences), locale, model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4.1-mini", promptVersion: HAIR_ANALYSIS_PROMPT_VERSION, durationMs: Date.now() - startedAt });
    return NextResponse.json({ analysis, consultationId, locale }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (client && attemptedKey) await client.mutation(api.advisor.recordFailure, { key: attemptedKey, model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4.1-mini", durationMs: Date.now() - startedAt }).catch(() => undefined);
    console.error("Hair analysis failed", error);
    const message = error instanceof Error ? error.message : "Analysis failed unexpectedly.";
    return NextResponse.json({ error: process.env.NODE_ENV === "development" ? message : "Analysis failed. Please try again." }, { status: 500 });
  }
}
