import { z } from "zod";

const serverSchema = z.object({
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
});

const analysisSchema = serverSchema.extend({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_ANALYSIS_MODEL: z.string().min(1).default("gpt-4.1-mini"),
});

const imageGenerationSchema = serverSchema.extend({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_IMAGE_MODEL: z.string().min(1).default("gpt-image-2.5-sunburst"),
  NEXT_PUBLIC_CONVEX_URL: z.url(),
});

export function r2Env() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) throw new Error(`R2 is not configured: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  return result.data;
}

export function analysisEnv() {
  const result = analysisSchema.safeParse(process.env);
  if (!result.success) throw new Error(`Analysis is not configured: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  return result.data;
}

export function imageGenerationEnv() {
  const result = imageGenerationSchema.safeParse(process.env);
  if (!result.success) throw new Error(`Image generation is not configured: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  return result.data;
}
