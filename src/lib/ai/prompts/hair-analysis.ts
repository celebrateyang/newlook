import { STARTER_HAIRSTYLES } from "../../hairstyles/catalog";
import type { Locale } from "../../i18n/locale";
import { defaultPreferences, type AdvisorPreferences } from "../../../../shared/advisor";

export const HAIR_ANALYSIS_PROMPT_VERSION = "hair-analysis-v3-preferences";

export function buildHairAnalysisPrompt(locale: Locale, preferences: AdvisorPreferences = defaultPreferences) {
  const approvedStyles = STARTER_HAIRSTYLES.map(style => `${style.slug}: ${locale === "zh" ? style.nameZh : style.name} — ${style.prompt}`).join("\n");
  const constraints = `User-stated preferences: length change=${preferences.lengthChange} (keep means retain overall length; moderate means a small change; open means any length), perm=${preferences.perm}, daily styling budget=${preferences.dailyMinutes} minutes. Respect these preferences. If the available photo or catalog cannot satisfy them, explain the tradeoff instead of claiming a fit. Do not output match percentages, attractiveness scores, or a guaranteed outcome. Do not infer chemical history or precise growth times from a photo.`;
  return `Analyze only visible face proportions and current hair characteristics for hairstyle advice. Do not infer identity, ethnicity, health, attractiveness, age, or other sensitive traits. If a feature is not visible, use 'unclear'. Recommend exactly three realistic hairstyles from the approved catalog below. Return the exact styleSlug and name shown in the catalog, rank them by fit, and explain each briefly. Do not recommend a style outside this catalog. This is visual styling guidance, not a medical assessment. ${constraints} Write faceSummary, recommendation reasons, and disclaimer in ${locale === "zh" ? "Simplified Chinese" : "English"}. Keep all enum values and styleSlug identifiers exactly as specified in the schema.\n\nApproved catalog:\n${approvedStyles}`;
}
