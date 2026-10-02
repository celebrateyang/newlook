import { expect, test } from "vitest";
import { localizedPath, preferredLocale } from "../src/lib/i18n/locale";
import { translator } from "../src/lib/i18n/translate";
import { getSalonGuide } from "../src/lib/hairstyles/salon-guides";
import { buildHairAnalysisPrompt } from "../src/lib/ai/prompts/hair-analysis";

test("language preference respects saved choice and weighted browser languages", () => {
  expect(preferredLocale("zh", "en-US")).toBe("zh");
  expect(preferredLocale("en", "zh-CN")).toBe("en");
  expect(preferredLocale(undefined, "zh-TW,en;q=0.5")).toBe("zh");
  expect(preferredLocale(undefined, "zh;q=0.1,en-US;q=0.9")).toBe("en");
  expect(preferredLocale("invalid", "fr-FR,de")).toBe("en");
  expect(preferredLocale(undefined, "zh;q=0,en;q=0.5")).toBe("en");
});

test("local links preserve page, query and hash without altering resources", () => {
  expect(localizedPath("/en/results/result-123?view=side#image", "zh")).toBe("/zh/results/result-123?view=side#image");
  expect(localizedPath("/upload?redirect_url=https://example.com", "zh")).toBe("/zh/upload?redirect_url=https://example.com");
  expect(localizedPath("/", "en")).toBe("/en/");
  expect(localizedPath("/api/generations", "zh")).toBe("/api/generations");
  expect(localizedPath("/images/photo.webp", "zh")).toBe("/images/photo.webp");
  expect(localizedPath("https://example.com/zh", "zh")).toBe("https://example.com/zh");
  expect(localizedPath("//example.com", "zh")).toBe("//example.com");
});

test("translations cover dynamic counts, hairstyle names and English fallback", () => {
  const zh = translator("zh");
  expect(zh("{remaining} of {limit} generations left today.", { remaining: 2, limit: 6 })).toBe("今天还剩 2 次生成额度，共 6 次。");
  expect(zh("French Bob")).toBe("法式波波头");
  expect(zh("unknown translation")).toBe("unknown translation");
  expect(translator("en")("Generating {style}", { style: "French Bob" })).toBe("Generating French Bob");
});

test("Chinese salon guidance retains measurements and English export default", () => {
  const english = getSalonGuide("french-bob");
  const chinese = getSalonGuide("french-bob", "zh");
  expect(chinese.overview).toMatch(/波波头/);
  expect(chinese.instructions).toHaveLength(english.instructions.length);
  expect(chinese.dailyStylingMinutes).toBe(english.dailyStylingMinutes);
  expect(chinese.maintenanceWeeks).toBe(english.maintenanceWeeks);
  expect(english.overview).toContain("bob");
  expect(getSalonGuide("unknown-style", "zh").instructions[0].label).toBe("沟通");
});

test("localized AI prompts preserve technical identifiers and identity constraints", () => {
  const chinese = buildHairAnalysisPrompt("zh");
  const english = buildHairAnalysisPrompt("en");
  expect(chinese).toContain("Simplified Chinese");
  expect(chinese).toContain("french-bob: 法式波波头");
  expect(english).toContain("french-bob: French Bob");
  expect(chinese).toContain("Keep all enum values and styleSlug identifiers exactly");
  expect(chinese).toContain("Do not infer identity");
});
