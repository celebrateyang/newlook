import { expect, test } from "vitest";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createPollCollage, collageCopy } from "../src/lib/shares/collage";
import { collageText } from "../src/lib/shares/collage-text";
test("preview copy renders as visible distinct outlines without SVG font lookup", async () => {
  async function render(text: string) {
    const paths = collageText(text, 10, 50, 40);
    expect(paths).toContain("<path");
    expect(paths).not.toMatch(/<text|font-family/);
    return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="white"/><g fill="black">${paths}</g></svg>`)).removeAlpha().raw().toBuffer();
  }
  const a = await render("A"), b = await render("B");
  expect(a.some(value => value < 100)).toBe(true);
  expect(a.equals(b)).toBe(false);
  const chinese = await render("哪"), otherChinese = await render("款");
  expect(chinese.some(value => value < 100)).toBe(true);
  expect(chinese.equals(otherChinese)).toBe(false);
  await expect(render("中")).rejects.toThrow("Unsupported collage character");
});
test("preview copy follows language and omits sign-in messages", () => {
  for (const count of [2, 3, 4, 5, 6]) {
    expect(collageCopy("zh", count).title).toBe("哪款发型最适合我？");
    expect(collageCopy("en", count).title).toBe("Which hairstyle suits me best?");
    for (const locale of ["zh", "en"] as const) {
      const copy = collageCopy(locale, count);
      expect(copy.footer).toContain(`A–${String.fromCharCode(64 + count)}`);
      expect(`${copy.title} ${copy.footer}`).not.toMatch(/sign.?in|登录/i);
      // All localized preview copy must have bundled glyphs.
      expect(() => collageText(`${copy.title} ${copy.footer}`, 0, 40, 20)).not.toThrow();
    }
  }
});
test("comparison previews fit 2–6 complete portraits into a 1200×630 JPEG", async () => {
  const a = await readFile("public/images/hairstyles/catalog/french-bob-v1.webp");
  const b = await readFile("public/images/hairstyles/catalog/cornrows-v1.webp");
  await mkdir(".next/qa", { recursive: true });
  for (const count of [2, 3, 4, 5, 6]) {
    for (const locale of ["en", "zh"] as const) {
    const image = await createPollCollage(Array.from({ length: count }, (_, index) => index % 2 ? b : a), locale);
    const metadata = await sharp(image).metadata();
    expect(metadata).toMatchObject({ width: 1200, height: 630, format: "jpeg" });
    await writeFile(`.next/qa/poll-${count}-${locale}.jpg`, image);
    }
  }
  await expect(createPollCollage([a])).rejects.toThrow("Invalid collage size");
});
