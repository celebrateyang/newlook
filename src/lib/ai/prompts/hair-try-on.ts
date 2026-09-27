import { IDENTITY_PRESERVATION } from "./identity";

export const HAIR_TRY_ON_PROMPT_VERSION = "hair-try-on-v2";

export function buildHairTryOnPrompt(styleDescription: string) {
  return `Edit only the person's hairstyle so they have ${styleDescription}. ${IDENTITY_PRESERVATION} Keep the result photorealistic and salon-realistic. Preserve the source image's aspect ratio, framing, crop, camera perspective, camera distance, head size, face and body proportions, shoulder position, background, lighting, clothing, and the subject's exact position and scale. Do not zoom, reframe, stretch, elongate, slim, widen, or reposition the person. Do not change anything below the hairline unless required for natural hair overlap. Do not add text, borders, accessories, or extra people.`;
}
