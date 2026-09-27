export const hairstyleCatalog = {
  "soft-layered-cut": { name: "Soft Layered Cut", nameZh: "柔和层次长发", category: "layers", length: "long", texture: ["straight", "wavy"], maintenance: "medium", minHairLength: "shoulder", preview: "/images/hairstyles/catalog/soft-layered-cut-v1.webp" },
  "french-bob": { name: "French Bob", nameZh: "法式波波头", category: "bob", length: "chin", texture: ["straight", "wavy"], maintenance: "medium", minHairLength: "jaw", preview: "/images/hairstyles/catalog/french-bob-v1.webp" },
  "curtain-bangs": { name: "Curtain Bangs", nameZh: "八字刘海", category: "bangs", length: "medium", texture: ["straight", "wavy"], maintenance: "medium", minHairLength: "cheekbone", preview: "/images/hairstyles/catalog/curtain-bangs-v1.webp" },
  "textured-crop": { name: "Textured Crop", nameZh: "纹理短碎发", category: "short", length: "short", texture: ["straight", "wavy", "curly"], maintenance: "low", minHairLength: "short", preview: "/images/hairstyles/catalog/textured-crop-v1.webp" },
  "side-part-taper": { name: "Side Part with Taper", nameZh: "侧分渐层短发", category: "short", length: "short", texture: ["straight", "wavy"], maintenance: "low", minHairLength: "short", preview: "/images/hairstyles/catalog/side-part-taper-v1.webp" },
  "short-quiff": { name: "Short Quiff", nameZh: "短款飞机头", category: "short", length: "short", texture: ["straight", "wavy"], maintenance: "medium", minHairLength: "short", preview: "/images/hairstyles/catalog/short-quiff-v1.webp" },
} as const;

export const previewMetadata = {
  previewPromptVersion: "catalog-preview-v1",
  previewModel: "openai-imagegen-built-in",
  reviewStatus: "approved" as const,
};

export function catalogDocument(slug: keyof typeof hairstyleCatalog) {
  const style = hairstyleCatalog[slug];
  return {
    slug,
    nameEn: style.name,
    nameZh: style.nameZh,
    gender: "unisex",
    category: style.category,
    length: style.length,
    texture: [...style.texture],
    maintenanceLevel: style.maintenance,
    requiresPerm: false,
    requiresColor: false,
    minHairLength: style.minHairLength,
    recommendedFaceShapes: [] as string[],
    notRecommendedFaceShapes: [] as string[],
    recommendedDensity: [] as string[],
    recommendedTexture: [] as string[],
    referenceImages: [] as string[],
    previewImages: [style.preview],
    ...previewMetadata,
    promptTemplate: slug,
    active: true,
  };
}
