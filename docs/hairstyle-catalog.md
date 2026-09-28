# Hairstyle catalog production

The catalog is a newself-owned set of reviewed AI preview assets. Do not copy or hotlink competitor imagery.

## Pilot standard

- Version: `starter-catalog-v1`
- Preview prompt: `catalog-preview-v1`
- Output: 600 x 600 WebP for the product UI
- Composition: centered, front-facing head-and-shoulders salon portrait
- Background: warm ivory, evenly lit, no props
- Identity: fictional adult anchor models that do not represent a real public figure
- Review state: only `approved` previews may appear in the product
- Label: every preview is visibly identified as an AI preview

Two lossless anchor portraits live in `assets/hairstyles/catalog/`. They are the edit targets for future catalog expansion and are not shipped as public website assets. Product-facing previews are compressed WebP files in `public/images/hairstyles/catalog/`.

## Review checklist

1. The hairstyle matches its structured descriptor and common salon meaning.
2. Face, expression, pose, clothing, background, lighting, and framing remain stable.
3. The full hairstyle is visible and is not cropped at the top or sides.
4. Hairline, volume, texture, and length are physically plausible.
5. The image contains no text, watermark, logo, celebrity likeness, or accessory.
6. The preview and the user try-on prompt describe the same haircut.

Generate at least three candidates for new production styles and approve only the strongest candidate. The current six-style pilot is the first visual baseline; broader demographic and texture coverage should be added before the catalog is treated as complete.
