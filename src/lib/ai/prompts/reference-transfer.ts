import { IDENTITY_PRESERVATION } from "./identity";

export const REFERENCE_TRANSFER_PROMPT_VERSION = "reference-transfer-v2-high-fidelity";

export function buildReferenceTransferPrompt(copyHairColor: boolean) {
  const colorInstruction = copyHairColor
    ? "Also transfer the reference hairstyle's overall hair color, while keeping it natural for the lighting in Image 1."
    : "Keep the person in Image 1's original hair color; do not copy hair color from Image 2.";
  return `Edit Image 1, using Image 2 only as a hairstyle reference. Transfer the hairstyle silhouette, length, bangs, layering, volume, parting, and texture from Image 2 onto the person in Image 1. ${colorInstruction} Do not copy the person, face, facial features, skin, makeup, expression, pose, clothes, accessories, background, lighting, camera angle, or framing from Image 2. ${IDENTITY_PRESERVATION} Preserve Image 1's exact aspect ratio, crop, camera perspective, head size, body proportions, shoulder position, background, lighting, clothing, and subject position. Keep the result photorealistic and salon-realistic. Do not zoom, reframe, reshape, beautify, add text, add borders, or add extra people.`;
}
