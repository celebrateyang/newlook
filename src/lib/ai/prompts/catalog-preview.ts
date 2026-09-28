export const CATALOG_PREVIEW_PROMPT_VERSION = "catalog-preview-v1";

export function buildCatalogAnchorPrompt(presentation: "feminine" | "masculine") {
  const appearance = presentation === "feminine"
    ? "a feminine presentation, medium warm skin tone, balanced oval face, and natural dark-brown straight hair pulled cleanly back so the face shape and hairline are visible"
    : "a masculine presentation, medium tan skin tone, balanced oval-to-square face, and natural dark-brown hair combed away from the forehead so the face shape and hairline are visible";
  return `Use case: photorealistic-natural
Asset type: newself hairstyle catalog anchor portrait
Primary request: Create an original fictional adult model with ${appearance}. The model must not resemble a real celebrity or public figure.
Scene/backdrop: seamless warm ivory studio background, no props.
Style/medium: highly realistic professional salon catalog photography with natural skin texture and no beauty filter.
Composition/framing: centered square head-and-shoulders portrait, straight-on eye-level view, full head and all hair visible with generous margin, shoulders level, neutral relaxed expression, eyes toward camera.
Lighting/mood: soft even diffused studio lighting, gentle natural shadow, accurate neutral color.
Clothing: plain dark charcoal crew-neck salon cape or top, no logos.
Constraints: one adult person only; no text, logo, watermark, jewelry, glasses, hat, hands, accessories, dramatic makeup, cropped hair, or cut-off head.`;
}

export function buildCatalogPreviewPrompt(styleDescription: string) {
  return `Use case: identity-preserve
Asset type: newself hairstyle catalog preview
Input images: Image 1 is the fixed fictional catalog model and edit target.
Primary request: Change only the scalp hair into ${styleDescription}. Keep the original natural hair color unless the style definition explicitly requires otherwise. The finish must be photorealistic, wearable, and salon-realistic.
Composition/framing: preserve the exact square, centered, straight-on head-and-shoulders composition; keep the entire hairstyle visible with margin above and at both sides.
Constraints: preserve the exact same fictional person's face, facial proportions, skin texture, expression, gaze, ears, shoulders, dark salon top, warm ivory background, lighting, camera angle, crop, and image quality. Change only the scalp hair. Do not alter facial hair or eyebrows. No beautification, makeup changes, jewelry, text, logo, watermark, accessories, extra people, or cropped-off hair.`;
}
