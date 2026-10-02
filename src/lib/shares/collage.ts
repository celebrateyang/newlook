import sharp from "sharp";
import { collageText } from "./collage-text";
import type { Locale } from "../i18n/locale";

export function collageCopy(locale: Locale, count: number) {
  const end = String.fromCharCode(64 + count);
  return locale === "zh"
    ? { title: "哪款发型最适合我？", footer: `帮我选发型 · 给 A–${end} 评分` }
    : { title: "Which hairstyle suits me best?", footer: `Help me choose · Rate A–${end}` };
}

export async function createPollCollage(images: Uint8Array[], locale: Locale = "en") {
  if (images.length < 2 || images.length > 6) throw new Error("Invalid collage size");
  const cols = images.length <= 4 ? 2 : 3, rows = Math.ceil(images.length / cols);
  const tileWidth = Math.floor(1160 / cols), tileHeight = Math.floor(500 / rows);
  const layers = await Promise.all(images.map(async (bytes, index) => ({
    input: await sharp(bytes).rotate().resize(tileWidth - 12, tileHeight - 32, { fit: "contain", background: "#eee8df" }).jpeg({ quality: 85 }).toBuffer(),
    left: 20 + (index % cols) * tileWidth + 6, top: 78 + Math.floor(index / cols) * tileHeight,
  })));
  const labels = images.map((_, index) => collageText(String.fromCharCode(65 + index), 20 + (index % cols) * tileWidth + tileWidth / 2, 78 + Math.floor(index / cols) * tileHeight + tileHeight - 10, 22, "middle")).join("");
  const copy = collageCopy(locale, images.length);
  const text = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><g fill="#26231e">${collageText(copy.title, 26, 46, 30)}${collageText("newself.", 1174, 46, 26, "end")}${labels}${collageText(copy.footer, 600, 610, 20, "middle")}</g></svg>`);
  return sharp({ create: { width: 1200, height: 630, channels: 3, background: "#f8f5ef" } }).composite([...layers, { input: text, left: 0, top: 0 }]).jpeg({ quality: 90 }).toBuffer();
}
