import "server-only";
import { z } from "zod";
import { analysisEnv } from "@/lib/env";

export const hairAnalysisSchema = z.object({
  faceShape: z.enum(["oval", "round", "square", "heart", "diamond", "oblong", "unclear"]),
  confidence: z.number().min(0).max(1),
  faceSummary: z.string().min(1),
  hairLength: z.enum(["very short", "short", "medium", "long", "very long", "unclear"]),
  hairDensity: z.enum(["low", "medium", "high", "unclear"]),
  texture: z.enum(["straight", "wavy", "curly", "coily", "unclear"]),
  thickness: z.enum(["fine", "medium", "coarse", "unclear"]),
  hairline: z.enum(["low", "average", "high", "receding", "unclear"]),
  crownVolume: z.enum(["flat", "balanced", "voluminous", "unclear"]),
  recommendations: z.array(z.object({
    name: z.string().min(1),
    matchScore: z.number().int().min(0).max(100),
    reason: z.string().min(1),
    maintenance: z.enum(["low", "medium", "high"]),
  })).min(3).max(3),
  disclaimer: z.string().min(1),
});

export type HairAnalysis = z.infer<typeof hairAnalysisSchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    faceShape: { type: "string", enum: ["oval", "round", "square", "heart", "diamond", "oblong", "unclear"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    faceSummary: { type: "string" },
    hairLength: { type: "string", enum: ["very short", "short", "medium", "long", "very long", "unclear"] },
    hairDensity: { type: "string", enum: ["low", "medium", "high", "unclear"] },
    texture: { type: "string", enum: ["straight", "wavy", "curly", "coily", "unclear"] },
    thickness: { type: "string", enum: ["fine", "medium", "coarse", "unclear"] },
    hairline: { type: "string", enum: ["low", "average", "high", "receding", "unclear"] },
    crownVolume: { type: "string", enum: ["flat", "balanced", "voluminous", "unclear"] },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          matchScore: { type: "integer", minimum: 0, maximum: 100 },
          reason: { type: "string" },
          maintenance: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["name", "matchScore", "reason", "maintenance"],
      },
    },
    disclaimer: { type: "string" },
  },
  required: ["faceShape", "confidence", "faceSummary", "hairLength", "hairDensity", "texture", "thickness", "hairline", "crownVolume", "recommendations", "disclaimer"],
} as const;

function outputText(payload: unknown) {
  const parsed = z.object({
    output: z.array(z.object({
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    })).optional(),
  }).safeParse(payload);
  if (!parsed.success) return undefined;
  return parsed.data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
}

export async function analyzeHairImage(bytes: Uint8Array, mimeType: string): Promise<HairAnalysis> {
  const env = analysisEnv();
  const imageUrl = `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_ANALYSIS_MODEL,
      store: false,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Analyze only visible face proportions and current hair characteristics for hairstyle advice. Do not infer identity, ethnicity, health, attractiveness, age, or other sensitive traits. If a feature is not visible, use 'unclear'. Recommend exactly three realistic hairstyles and explain each briefly. This is visual styling guidance, not a medical assessment." },
          { type: "input_image", image_url: imageUrl, detail: "high" },
        ],
      }],
      text: { format: { type: "json_schema", name: "hair_analysis", strict: true, schema: jsonSchema } },
    }),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = z.object({ error: z.object({ message: z.string() }) }).safeParse(payload);
    throw new Error(message.success ? message.data.error.message : `OpenAI request failed (${response.status})`);
  }
  const text = outputText(payload);
  if (!text) throw new Error("OpenAI returned no analysis text");
  return hairAnalysisSchema.parse(JSON.parse(text));
}
