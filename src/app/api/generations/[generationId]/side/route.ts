import { quotaErrorResponse } from "@/lib/generations/quota";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "../../../../../../convex/_generated/api";
import { OpenAIImageEditProvider } from "@/lib/ai/providers/openai";
import { buildHairTryOnPrompt, HAIR_TRY_ON_PROMPT_VERSION } from "@/lib/ai/prompts/hair-try-on";
import { imageGenerationEnv } from "@/lib/env";
import { getOwnedGeneration } from "@/lib/generations/server";
import { getStarterHairstyle } from "@/lib/hairstyles/catalog";
import { createR2Client } from "@/lib/r2/client";
import { sideErrorMessages, type SideGenerationStage } from "@/lib/generations/side-errors";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({ uploadKey: z.string().min(1).max(500) });

export async function POST(request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  const startedAt = Date.now();
  const requestId = randomUUID();
  let stage: SideGenerationStage = "authenticate";
  try {
    const { generationId } = await params;
    const owned = await getOwnedGeneration(generationId);
    if (owned.status === 401) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (owned.status === 404) return NextResponse.json({ error: "Result not found" }, { status: 404 });
    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success || !body.data.uploadKey.startsWith(`uploads/user_${owned.session.userId}/side_`)) return NextResponse.json({ error: "Invalid side photo" }, { status: 400 });
    const style = getStarterHairstyle(owned.data.hairstyle.slug);
    if (!style) return NextResponse.json({ error: "Unsupported hairstyle" }, { status: 400 });
    stage = "configure";
    const env = imageGenerationEnv();
    stage = "reserve";
    await owned.convex.mutation(api.generations.startSide, { generationId: owned.data.generation._id, uploadKey: body.data.uploadKey });
    const r2 = createR2Client();
    stage = "read";
    const source = await r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: body.data.uploadKey }));
    if (!source.Body || !source.ContentType || !["image/jpeg", "image/png", "image/webp"].includes(source.ContentType)) throw new Error("Side image is unavailable or unsupported");
    const bytes = await source.Body.transformToByteArray();
    const extension = source.ContentType === "image/jpeg" ? "jpg" : source.ContentType === "image/png" ? "png" : "webp";
    const provider = new OpenAIImageEditProvider(env.OPENAI_API_KEY, env.OPENAI_IMAGE_MODEL);
    stage = "generate";
    const results = await provider.generate({
      task: "hair_try_on",
      sourceImage: { bytes, mimeType: source.ContentType as "image/jpeg" | "image/png" | "image/webp", filename: `side.${extension}` },
      prompt: `${buildHairTryOnPrompt(style.prompt)} This is a real side-view photo. Preserve this exact side-view camera angle and apply the same hairstyle design consistently from the side.`,
      count: 1,
    });
    const result = results[0];
    if (!result) throw new Error("The image provider returned no side result");
    const key = `generations/user_${owned.session.userId}/gen_${generationId}_side_${randomUUID()}.webp`;
    stage = "store";
    await r2.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: result.bytes, ContentType: result.mimeType }));
    stage = "save";
    const token = await owned.session.getToken({ template: "convex" });
    if (!token) throw new Error("Could not refresh the Convex authentication token");
    owned.convex.setAuth(token);
    const resultId = await owned.convex.mutation(api.generations.appendSideResult, { generationId: owned.data.generation._id, uploadKey: body.data.uploadKey, r2Key: key, durationMs: Date.now() - startedAt, providerRequestId: result.providerRequestId });
    stage = "preview";
    const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }), { expiresIn: 3600 });
    return NextResponse.json({ id: resultId, view: "side", url, promptVersion: HAIR_TRY_ON_PROMPT_VERSION });
  } catch (error) {
    const quotaResponse = quotaErrorResponse(error);
    if (quotaResponse) return quotaResponse;
    console.error("Side generation failed", { requestId, stage, durationMs: Date.now() - startedAt }, error);
    return NextResponse.json({ error: sideErrorMessages[stage], code: `SIDE_${stage.toUpperCase()}_FAILED`, requestId }, { status: 500 });
  }
}
