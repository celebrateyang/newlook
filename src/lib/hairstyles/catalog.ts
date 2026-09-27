export const STARTER_HAIRSTYLES = [
  { slug: "soft-layered-cut", name: "Soft Layered Cut", prompt: "a soft layered haircut with natural face-framing layers and balanced volume" },
  { slug: "french-bob", name: "French Bob", prompt: "a polished French bob ending near the jaw, with soft natural texture" },
  { slug: "curtain-bangs", name: "Curtain Bangs", prompt: "long curtain bangs that part naturally and frame the cheekbones" },
  { slug: "textured-crop", name: "Textured Crop", prompt: "a clean textured crop with natural movement and a softly tapered shape" },
  { slug: "side-part-taper", name: "Side Part with Taper", prompt: "a classic side part with softly tapered sides, balanced volume, and a neat professional finish" },
  { slug: "short-quiff", name: "Short Quiff", prompt: "a short natural quiff with controlled height at the crown and clean softly tapered sides" },
] as const;

export type StarterHairstyleSlug = (typeof STARTER_HAIRSTYLES)[number]["slug"];

export function getStarterHairstyle(slug: string) {
  return STARTER_HAIRSTYLES.find((style) => style.slug === slug);
}
