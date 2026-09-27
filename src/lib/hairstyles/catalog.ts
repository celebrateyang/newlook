export const STARTER_HAIRSTYLES = [
  { slug: "soft-layered-cut", name: "Soft Layered Cut", category: "Medium to long", summary: "Natural face-framing layers with soft movement and balanced volume.", prompt: "a soft layered haircut with natural face-framing layers and balanced volume" },
  { slug: "french-bob", name: "French Bob", category: "Chin length", summary: "A polished jaw-length shape with a clean outline and soft texture.", prompt: "a polished French bob ending near the jaw, with soft natural texture" },
  { slug: "curtain-bangs", name: "Curtain Bangs", category: "Bangs", summary: "Long parted bangs that frame the cheekbones without changing your overall length.", prompt: "long curtain bangs that part naturally and frame the cheekbones" },
  { slug: "textured-crop", name: "Textured Crop", category: "Short", summary: "A compact short cut with natural texture and a softly tapered silhouette.", prompt: "a clean textured crop with natural movement and a softly tapered shape" },
  { slug: "side-part-taper", name: "Side Part with Taper", category: "Short", summary: "A classic, neat side part with controlled volume and softly tapered sides.", prompt: "a classic side part with softly tapered sides, balanced volume, and a neat professional finish" },
  { slug: "short-quiff", name: "Short Quiff", category: "Short", summary: "A short shape with controlled lift at the front and clean tapered sides.", prompt: "a short natural quiff with controlled height at the crown and clean softly tapered sides" },
] as const;

export type StarterHairstyleSlug = (typeof STARTER_HAIRSTYLES)[number]["slug"];

export function getStarterHairstyle(slug: string) {
  return STARTER_HAIRSTYLES.find((style) => style.slug === slug);
}
