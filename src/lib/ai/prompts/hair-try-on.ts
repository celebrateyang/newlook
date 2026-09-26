import { IDENTITY_PRESERVATION } from "./identity";

export const HAIR_TRY_ON_PROMPT_VERSION = "hair-try-on-v1";

export function buildHairTryOnPrompt(styleDescription: string) {
  return `Edit this portrait so the person has ${styleDescription}. ${IDENTITY_PRESERVATION} Keep the result photorealistic and salon-realistic. Preserve the original image dimensions and composition. Do not add text, borders, accessories, or extra people.`;
}
