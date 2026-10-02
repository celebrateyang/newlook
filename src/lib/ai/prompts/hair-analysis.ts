import { STARTER_HAIRSTYLES } from "../../hairstyles/catalog";
import type { Locale } from "../../i18n/locale";

export const HAIR_ANALYSIS_PROMPT_VERSION = "hair-analysis-v2-localized";

export function buildHairAnalysisPrompt(locale: Locale) {
  const approvedStyles = STARTER_HAIRSTYLES.map(style => `${style.slug}: ${locale === "zh" ? style.nameZh : style.name} — ${style.prompt}`).join("\n");
  return `Analyze only visible face proportions and current hair characteristics for hairstyle advice. Do not infer identity, ethnicity, health, attractiveness, age, or other sensitive traits. If a feature is not visible, use 'unclear'. Recommend exactly three realistic hairstyles from the approved catalog below. Return the exact styleSlug and name shown in the catalog, rank them by fit, and explain each briefly. Do not recommend a style outside this catalog. This is visual styling guidance, not a medical assessment. Write faceSummary, recommendation reasons, and disclaimer in ${locale === "zh" ? "Simplified Chinese" : "English"}. Keep all enum values and styleSlug identifiers exactly as specified in the schema.\n\nApproved catalog:\n${approvedStyles}`;
}
