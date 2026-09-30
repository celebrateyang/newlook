import { IDENTITY_PRESERVATION } from "./identity";

export const HAIR_TRY_ON_PROMPT_VERSION = "hair-try-on-v3-high-fidelity";

export function buildHairTryOnPrompt(styleDescription: string) {
  return `Edit only the person's scalp hair so they have ${styleDescription}. ${IDENTITY_PRESERVATION} Use the original photograph as the source of truth, not as inspiration. Keep the result photorealistic and salon-realistic. Preserve the source image's exact aspect ratio, framing, crop, camera perspective, camera distance, head size, face and body proportions, shoulder position, background, lighting, clothing, and the subject's exact position and scale. Do not zoom, reframe, stretch, elongate, slim, widen, or reposition the person. Do not regenerate anything below the hairline; new hair may naturally overlap the forehead, ears, or shoulders, but the visible source pixels beneath and around it must remain unchanged. Do not add text, borders, accessories, or extra people.`;
}
