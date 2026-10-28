import { z } from "zod";
export const ADVISOR_RULES_VERSION = "photo-discussion-v1";

export const advisorPreferencesSchema = z.object({
  lengthChange: z.enum(["keep", "moderate", "open"]).default("moderate"),
  perm: z.enum(["no", "open", "unsure"]).default("unsure"),
  dailyMinutes: z.enum(["5", "15", "30"]).default("15"),
});
export type AdvisorPreferences = z.infer<typeof advisorPreferencesSchema>;
export const defaultPreferences: AdvisorPreferences = { lengthChange: "moderate", perm: "unsure", dailyMinutes: "15" };

export const visibleHairSchema = z.object({
  hairLength: z.enum(["very short", "short", "medium", "long", "very long", "unclear"]),
  hairDensity: z.enum(["low", "medium", "high", "unclear"]),
  texture: z.enum(["straight", "wavy", "curly", "coily", "unclear"]),
  thickness: z.enum(["fine", "medium", "coarse", "unclear"]),
  hairline: z.enum(["low", "average", "high", "receding", "unclear"]),
  crownVolume: z.enum(["flat", "balanced", "voluminous", "unclear"]),
});
export type VisibleHair = z.infer<typeof visibleHairSchema>;

export const savedAnalysisSchema = visibleHairSchema.extend({
  faceShape: z.enum(["oval", "round", "square", "heart", "diamond", "oblong", "unclear"]),
  confidence: z.number().min(0).max(1),
  faceSummary: z.string().min(1).max(4000),
  recommendations: z.array(z.object({
    styleSlug: z.string().min(1).max(80), name: z.string().min(1).max(150),
    reason: z.string().min(1).max(2000), maintenance: z.enum(["low", "medium", "high"]),
  })).length(3),
  disclaimer: z.string().min(1).max(2000),
});

export function readAdvisorSnapshot(analysisJson?: string, preferencesJson?: string) {
  try {
    return { analysis: savedAnalysisSchema.parse(JSON.parse(analysisJson ?? "")), preferences: advisorPreferencesSchema.parse(JSON.parse(preferencesJson ?? "")) };
  } catch { return undefined; }
}
