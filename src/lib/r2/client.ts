import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { r2Env } from "@/lib/env";

export function createR2Client() {
  const env = r2Env();
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
}
