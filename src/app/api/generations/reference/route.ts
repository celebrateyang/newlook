import { quotaErrorResponse } from "@/lib/generations/quota";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { OpenAIImageEditProvider } from "@/lib/ai/providers/openai";
import { buildReferenceTransferPrompt, REFERENCE_TRANSFER_PROMPT_VERSION } from "@/lib/ai/prompts/reference-transfer";
import type { ImageInput } from "@/lib/ai/types";
import { imageGenerationEnv } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  uploadKey: z.string().min(1).max(500),
  referenceUploadKey: z.string().min(1).max(500),
  copyHairColor: z.boolean().default(false),
});

const supportedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

function imageInput(bytes: Uint8Array, contentType: string, name: string): ImageInput {
  const mimeType = supportedMimeTypes.find((value) => value === contentType);
  if (!mimeType) throw new Error(`${name} image is unavailable or unsupported`);
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  return { bytes, mimeType, filename: `${name}.${extension}` };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let generationId: Id<"generations"> | undefined;
  let convex: ConvexHttpClient | undefined;
  let refreshConvexAuth: (() => Promise<void>) | undefined;
  try {
    const session = await auth();
    if (!session.userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Invalid reference transfer request" }, { status: 400 });
    if (!body.data.uploadKey.startsWith(`uploads/user_${session.userId}/original_`)) return NextResponse.json({ error: "Source upload ownership check failed" }, { status: 403 });
    if (!body.data.referenceUploadKey.startsWith(`references/user_${session.userId}/reference_`)) return NextResponse.json({ error: "Reference upload ownership check failed" }, { status: 403 });

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
    generationId = await convex.mutation(api.generations.startReference, {
      uploadKey: body.data.uploadKey,
      referenceUploadKey: body.data.referenceUploadKey,
      provider: "openai",
      model: env.OPENAI_IMAGE_MODEL,
      promptVersion: REFERENCE_TRANSFER_PROMPT_VERSION,
    });

    const r2 = createR2Client();
    const [sourceObject, referenceObject] = await Promise.all([
      r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: body.data.uploadKey })),
      r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: body.data.referenceUploadKey })),
    ]);
    if (!sourceObject.Body || !sourceObject.ContentType) throw new Error("Source image is unavailable");
    if (!referenceObject.Body || !referenceObject.ContentType) throw new Error("Reference image is unavailable");
    const [sourceBytes, referenceBytes] = await Promise.all([
      sourceObject.Body.transformToByteArray(),
      referenceObject.Body.transformToByteArray(),
    ]);

    const provider = new OpenAIImageEditProvider(env.OPENAI_API_KEY, env.OPENAI_IMAGE_MODEL);
    const results = await provider.generate({
      task: "reference_transfer",
      sourceImage: imageInput(sourceBytes, sourceObject.ContentType, "selfie"),
      referenceImage: imageInput(referenceBytes, referenceObject.ContentType, "reference"),
      prompt: buildReferenceTransferPrompt(body.data.copyHairColor),
      count: 1,
    });

    const keys: string[] = [];
    for (const result of results) {
      const key = `generations/user_${session.userId}/gen_${generationId}_${randomUUID()}.webp`;
      await r2.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, Body: result.bytes, ContentType: result.mimeType }));
      keys.push(key);
    }
    await refreshConvexAuth();
    await convex.mutation(api.generations.complete, {
      generationId,
      r2Keys: keys,
      view: "front",
      durationMs: Date.now() - startedAt,
      providerRequestId: results[0]?.providerRequestId,
      taskType: "reference_transfer",
    });
    const urls = await Promise.all(keys.map((key) => getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }), { expiresIn: 3600 })));
    return NextResponse.json({ generationId, styleName: "Reference Hairstyle", results: urls.map((url, index) => ({ url, key: keys[index] })) });
  } catch (error) {
    const quotaResponse = quotaErrorResponse(error);
    if (quotaResponse) return quotaResponse;
    console.error("Reference hairstyle generation failed", error);
    if (convex && generationId) {
      await refreshConvexAuth?.().catch((refreshError) => console.error("Could not refresh Convex authentication", refreshError));
      await convex.mutation(api.generations.fail, {
        generationId,
        durationMs: Date.now() - startedAt,
        errorCode: "reference_transfer_failed",
        taskType: "reference_transfer",
      }).catch((failure) => console.error("Could not record reference transfer failure", failure));
    }
    const message = error instanceof Error ? error.message : "Reference transfer failed";
    return NextResponse.json({ error: process.env.NODE_ENV === "development" ? message : "Could not transfer this hairstyle. Please try again." }, { status: 500 });
  }
}
