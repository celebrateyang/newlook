import { expect, test } from "vitest";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createPollCollage } from "../src/lib/shares/collage";
test("comparison previews fit 2–6 complete portraits into a 1200×630 JPEG", async () => {
  const a = await readFile("public/images/hairstyles/catalog/french-bob-v1.webp");
  const b = await readFile("public/images/hairstyles/catalog/cornrows-v1.webp");
  await mkdir(".next/qa", { recursive: true });
  for (const count of [2, 3, 4, 5, 6]) {
    const image = await createPollCollage(Array.from({ length: count }, (_, index) => index % 2 ? b : a));
    const metadata = await sharp(image).metadata();
    expect(metadata).toMatchObject({ width: 1200, height: 630, format: "jpeg" });
    await writeFile(`.next/qa/poll-${count}.jpg`, image);
  }
  await expect(createPollCollage([a])).rejects.toThrow("Invalid collage size");
});
