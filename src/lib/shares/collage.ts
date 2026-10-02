import sharp from "sharp";
import { collageText } from "./collage-text";
import type { Locale } from "../i18n/locale";

export function collageCopy(locale: Locale, count: number) {
  const end = String.fromCharCode(64 + count);
  return locale === "zh"
    ? { title: "哪款发型最适合我？", footer: `帮我选发型 · 给 A–${end} 评分` }
    : { title: "Which hairstyle suits me best?", footer: `Help me choose · Rate A–${end}` };
}

export async function createPollCollage(images: Uint8Array[], locale: Locale = "en", shape: "wide" | "square" = "wide") {
  if (images.length < 2 || images.length > 6) throw new Error("Invalid collage size");
  const cols = images.length <= 4 ? 2 : 3, rows = Math.ceil(images.length / cols);
  const width = 1200, height = shape === "square" ? 1200 : 630;
  const gap = 12, top = 78, bottom = shape === "square" ? 60 : 52;
  const tileWidth = Math.floor((width - 40 - gap * (cols - 1)) / cols);
  const tileHeight = Math.floor((height - top - bottom - gap * (rows - 1)) / rows);
  const labelHeight = shape === "square" ? 38 : 32;
  const imageHeight = tileHeight - labelHeight;
  const resized = await Promise.all(images.map(bytes => sharp(bytes).rotate()
    .resize(tileWidth, imageHeight, { fit: "inside" }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true })));
  const layers: { input: Buffer; left: number; top: number }[] = [];
  let labels = "";
  // Pack each row using actual portrait widths rather than padded wide tiles.
  // All selected images remain inside the square; source hairstyles are uncropped.
  for (let row = 0; row < rows; row++) {
    const items = resized.slice(row * cols, (row + 1) * cols);
    const rowWidth = items.reduce((sum, item) => sum + item.info.width, 0) + gap * (items.length - 1);
    let left = Math.floor((width - rowWidth) / 2);
    const rowTop = top + row * (tileHeight + gap);
    for (const [column, item] of items.entries()) {
      layers.push({ input: item.data, left, top: rowTop + Math.floor((imageHeight - item.info.height) / 2) });
      labels += collageText(String.fromCharCode(65 + row * cols + column), left + item.info.width / 2, rowTop + tileHeight - 8, shape === "square" ? 30 : 22, "middle");
      left += item.info.width + gap;
    }
  }
  const copy = collageCopy(locale, images.length);
  const text = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g fill="#26231e">${collageText(copy.title, 26, 46, 30)}${collageText("newself.", 1174, 46, 26, "end")}${labels}${collageText(copy.footer, 600, height - 20, 20, "middle")}</g></svg>`);
  return sharp({ create: { width, height, channels: 3, background: "#f8f5ef" } }).composite([...layers, { input: text, left: 0, top: 0 }]).jpeg({ quality: 90 }).toBuffer();
}
