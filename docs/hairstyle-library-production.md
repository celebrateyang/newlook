# Hairstyle Library Production

The launch library contains 50 styles. Every style was produced from a consistent fictional catalog portrait, received three generated candidates, passed visual review, and publishes one 768x768 WebP main image. Generated candidates remain in the image-generation workspace; selected full-resolution masters live in `assets/hairstyles/catalog/masters/`.

## Production rules

- Preserve pose, crop, background, lighting, clothing, and natural hair color within each candidate set.
- Change only the hairstyle; do not add accessories, text, logos, or watermarks.
- Review at full size and thumbnail size for hairstyle recognition, clean hairlines, symmetry, realistic strands, and identity stability.
- Public filenames use `<slug>-v1.webp`. A later replacement increments the version instead of silently overwriting an approved image.
- Add a style to the application catalog only after its selected image exists.

## 30 core cuts

### Feminine presentation (15)

- [x] Soft Layered Cut — `soft-layered-cut`
- [x] French Bob — `french-bob`
- [x] Curtain Bangs — `curtain-bangs`
- [x] Blunt Bob — `blunt-bob`
- [x] Long Bob — `long-bob`
- [x] Italian Bob — `italian-bob`
- [x] Pixie Cut — `pixie-cut`
- [x] Butterfly Cut — `butterfly-cut`
- [x] Bixie Cut — `bixie-cut`
- [x] Wolf Cut — `wolf-cut`
- [x] Shag Cut — `shag-cut`
- [x] Hime Cut — `hime-cut`
- [x] Collarbone Cut — `collarbone-cut`
- [x] Shoulder-Length Layers — `shoulder-length-layers`
- [x] Wispy Bangs — `wispy-bangs`

### Masculine presentation (15)

- [x] Textured Crop — `textured-crop`
- [x] Side Part with Taper — `side-part-taper`
- [x] Short Quiff — `short-quiff`
- [x] Buzz Cut — `buzz-cut`
- [x] Crew Cut — `crew-cut`
- [x] French Crop — `french-crop`
- [x] Caesar Cut — `caesar-cut`
- [x] Ivy League — `ivy-league`
- [x] Undercut — `undercut`
- [x] Two Block — `two-block`
- [x] Curtains — `curtains`
- [x] Middle Part — `middle-part`
- [x] Comb-Over Taper — `comb-over-taper`
- [x] Modern Mullet — `modern-mullet`
- [x] Faux Hawk — `faux-hawk`

## 10 curls and texture variations

### Feminine presentation (5)

- [x] Beach Waves — `beach-waves`
- [x] Loose Curls — `loose-curls`
- [x] Defined Curls — `defined-curls`
- [x] Coily Afro — `coily-afro`
- [x] Wet-Look Waves — `wet-look-waves`

### Masculine presentation (5)

- [x] Wavy Undercut — `wavy-undercut`
- [x] Curly Fringe — `curly-fringe`
- [x] Textured Pompadour — `textured-pompadour`
- [x] Natural Afro — `natural-afro`
- [x] Curly Taper — `curly-taper`

## 10 braids, updos, and styling looks

### Feminine presentation (5)

- [x] Sleek Ponytail — `sleek-ponytail`
- [x] High Bun — `high-bun`
- [x] Low Chignon — `low-chignon`
- [x] Crown Braid — `crown-braid`
- [x] Box Braids — `box-braids`

### Masculine presentation (5)

- [x] Man Bun — `man-bun`
- [x] Slick Back — `slick-back`
- [x] Cornrows — `cornrows`
- [x] Box Braids — `male-box-braids`
- [x] Locs — `locs`

## Final count

- Target: 50 styles / 150 generated candidates / 50 approved main images.
- Approved and wired into the product: 50 styles.
- Public preview coverage: 50 of 50.
