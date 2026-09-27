import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { r2Env } from "@/lib/env";
import { createR2Client } from "@/lib/r2/client";

export type HomeHistory = {
  sourceUrl: string;
  sourceWidth?: number;
  sourceHeight?: number;
  resultUrl?: string;
  generationId?: string;
  styleName?: string;
  styleSlug?: string;
};

export async function getHomeHistory(): Promise<HomeHistory | undefined> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return undefined;
  const session = await auth();
  if (!session.userId) return undefined;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return undefined;
  const token = await session.getToken({ template: "convex" });
  if (!token) return undefined;

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);
  const history = await convex.query(api.generations.latestMine, {});
  if (!history?.upload) return undefined;

  const env = r2Env();
  const r2 = createR2Client();
  const sourceUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: history.upload.r2Key }),
    { expiresIn: 3600 },
  );
  const resultUrl = history.result
    ? await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: history.result.r2Key }), { expiresIn: 3600 })
    : undefined;

  return {
    sourceUrl,
    sourceWidth: history.upload.width,
    sourceHeight: history.upload.height,
    resultUrl,
    generationId: history.generation?._id,
    styleName: history.hairstyle?.nameEn,
    styleSlug: history.hairstyle?.slug,
  };
}
