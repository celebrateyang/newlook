import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { OpenAIImageEditProvider } from "@/lib/ai/providers/openai";
import { buildHairTryOnPrompt, HAIR_TRY_ON_PROMPT_VERSION } from "@/lib/ai/prompts/hair-try-on";
import { imageGenerationEnv } from "@/lib/env";
import { getStarterHairstyle } from "@/lib/hairstyles/catalog";
import { createR2Client } from "@/lib/r2/client";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({ uploadKey: z.string().min(1).max(500), styleSlug: z.string().min(1).max(80) });

export async function POST(request: Request) {
  const startedAt = Date.now();
  let generationId: Id<"generations"> | undefined;
  let convex: ConvexHttpClient | undefined;
  let refreshConvexAuth: (() => Promise<void>) | undefined;
  try {
    const session = await auth();
    if (!session.userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Invalid generation request" }, { status: 400 });
    const style = getStarterHairstyle(body.data.styleSlug);
    if (!style) return NextResponse.json({ error: "Unsupported hairstyle" }, { status: 400 });
    if (!body.data.uploadKey.startsWith(`uploads/user_${session.userId}/original_`)) return NextResponse.json({ error: "Upload ownership check failed" }, { status: 403 });

    const env = imageGenerationEnv();
    const token = await session.getToken({ template: "convex" });
    if (!token) throw new Error("Could not create a Convex authentication token");
    convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
    convex.setAuth(token);
    refreshConvexAuth = async () => {
      const refreshedToken = await session.getToken({ template: "convex" });
      if (!refreshedToken) throw new Error("Could not refresh the Convex authentication token");
      convex?.setAuth(refreshedToken);
    };
    generationId = await convex.mutation(api.generations.start, {
      uploadKey: body.data.uploadKey, styleSlug: style.slug, provider: "openai", model: env.OPENAI_IMAGE_MODEL,
      promptVersion: HAIR_TRY_ON_PROMPT_VERSION,
    });

    const r2 = createR2Client();
    const source = await r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: body.data.uploadKey }));
    if (!source.Body || !source.ContentType || !["image/jpeg", "image/png", "image/webp"].includes(source.ContentType)) throw new Error("Source image is unavailable or unsupported");
    const bytes = await source.Body.transformToByteArray();
    const sourceExtension = source.ContentType === "image/jpeg" ? "jpg" : source.ContentType === "image/png" ? "png" : "webp";
    const provider = new OpenAIImageEditProvider(env.OPENAI_API_KEY, env.OPENAI_IMAGE_MODEL);
    const results = await provider.generate({
      task: "hair_try_on", sourceImage: { bytes, mimeType: source.ContentType as "image/jpeg" | "image/png" | "image/webp", filename: `selfie.${sourceExtension}` },
      prompt: buildHairTryOnPrompt(style.prompt), count: 1,
    });

    const keys: string[] = [];
    for (const result of results) {
      const key = `generations/user_${session.userId}/gen_${generationId}_${randomUUID()}.webp`;
      await r2.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: result.bytes, ContentType: result.mimeType }));
      keys.push(key);
    }
    await refreshConvexAuth();
    await convex.mutation(api.generations.complete, { generationId, r2Keys: keys, view: "front", durationMs: Date.now() - startedAt, providerRequestId: results[0]?.providerRequestId });
    const urls = await Promise.all(keys.map((key) => getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }), { expiresIn: 3600 })));
    return NextResponse.json({ generationId, styleName: style.name, results: urls.map((url, index) => ({ url, key: keys[index] })) });
  } catch (error) {
    console.error("Hair generation failed", error);
    if (convex && generationId) {
      await refreshConvexAuth?.().catch((refreshError) => console.error("Could not refresh Convex authentication", refreshError));
      await convex.mutation(api.generations.fail, { generationId, durationMs: Date.now() - startedAt, errorCode: "generation_failed" }).catch((failure) => console.error("Could not record generation failure", failure));
    }
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: process.env.NODE_ENV === "development" ? message : "Could not generate this hairstyle. Please try again." }, { status: 500 });
  }
}
