export const STARTER_HAIRSTYLES = [
  {
    slug: "soft-layered-cut", name: "Soft Layered Cut", nameZh: "柔和层次长发", presentation: "feminine", category: "Medium to long",
    length: "Long", maintenance: "Medium", tags: ["Face-framing", "Natural volume"],
    summary: "Natural face-framing layers with soft movement and balanced volume.",
    prompt: "long dark-brown hair below the shoulders with a center part, seamless face-framing layers beginning near the cheekbones, soft feathered ends, balanced natural volume, and gentle movement",
    previewImage: "/images/hairstyles/catalog/soft-layered-cut-v1.webp", previewAlt: "AI catalog model wearing a soft long layered haircut",
  },
  {
    slug: "french-bob", name: "French Bob", nameZh: "法式波波头", presentation: "feminine", category: "Chin length",
    length: "Chin", maintenance: "Medium", tags: ["Soft fringe", "Clean outline"],
    summary: "A polished jaw-length shape with a clean outline and an airy French fringe.",
    prompt: "a dark-brown French bob cut at jaw length with a compact rounded silhouette, softly textured perimeter, subtle inward bend at the ends, and a short airy French fringe above the eyebrows",
    previewImage: "/images/hairstyles/catalog/french-bob-v1.webp", previewAlt: "AI catalog model wearing a jaw-length French bob",
  },
  {
    slug: "curtain-bangs", name: "Curtain Bangs", nameZh: "八字刘海", presentation: "feminine", category: "Bangs",
    length: "Medium", maintenance: "Medium", tags: ["Center part", "Cheekbone framing"],
    summary: "Long parted bangs that frame the cheekbones without changing your overall length.",
    prompt: "long airy curtain bangs opening at the center and sweeping symmetrically toward the cheekbones, with soft face-framing pieces and smooth natural dark-brown hair",
    previewImage: "/images/hairstyles/catalog/curtain-bangs-v1.webp", previewAlt: "AI catalog model wearing long center-parted curtain bangs",
  },
  {
    slug: "textured-crop", name: "Textured Crop", nameZh: "纹理短碎发", presentation: "masculine", category: "Short",
    length: "Short", maintenance: "Low", tags: ["Forward texture", "Soft taper"],
    summary: "A compact short cut with natural texture and a softly tapered silhouette.",
    prompt: "a short dark-brown textured crop with visibly separated natural texture, compact forward movement, a softly irregular short fringe, low controlled volume, and neatly tapered sides without a skin fade",
    previewImage: "/images/hairstyles/catalog/textured-crop-v1.webp", previewAlt: "AI catalog model wearing a short textured crop",
  },
  {
    slug: "side-part-taper", name: "Side Part with Taper", nameZh: "侧分渐层短发", presentation: "masculine", category: "Short",
    length: "Short", maintenance: "Low", tags: ["Side part", "Professional"],
    summary: "A classic, neat side part with controlled volume and softly tapered sides.",
    prompt: "dark-brown hair with a clearly defined natural side part, controlled combed volume on top, neat direction across the crown, and softly tapered sides with a conservative gradual blend and no skin fade",
    previewImage: "/images/hairstyles/catalog/side-part-taper-v1.webp", previewAlt: "AI catalog model wearing a classic side part with tapered sides",
  },
  {
    slug: "short-quiff", name: "Short Quiff", nameZh: "短款飞机头", presentation: "masculine", category: "Short",
    length: "Short", maintenance: "Medium", tags: ["Front lift", "Soft taper"],
    summary: "A short shape with controlled lift at the front and clean tapered sides.",
    prompt: "a short natural dark-brown quiff with controlled lift at the front, gently swept upward and slightly back, moderate textured volume on top, a compact crown, and clean softly tapered sides",
    previewImage: "/images/hairstyles/catalog/short-quiff-v1.webp", previewAlt: "AI catalog model wearing a short natural quiff",
  },
] as const;

export const STARTER_CATALOG_VERSION = "starter-catalog-v1";
export const STARTER_CATALOG_REVIEW_STATUS = "approved" as const;

export type StarterHairstyleSlug = (typeof STARTER_HAIRSTYLES)[number]["slug"];

export function getStarterHairstyle(slug: string) {
  return STARTER_HAIRSTYLES.find((style) => style.slug === slug);
}
