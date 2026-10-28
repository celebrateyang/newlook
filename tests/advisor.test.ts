import { expect, test } from "vitest";
import { assessFeasibility } from "../src/lib/hairstyles/feasibility";
import { getAssessedSalonGuide, getSalonGuide } from "../src/lib/hairstyles/salon-guides";
import { defaultPreferences, type VisibleHair } from "../shared/advisor";
import { buildHairAnalysisPrompt } from "../src/lib/ai/prompts/hair-analysis";
const hair: VisibleHair = { hairLength: "long", hairDensity: "low", texture: "straight", thickness: "fine", hairline: "average", crownVolume: "flat" };
test("insufficient visible length produces a growth discussion without invented dates", () => {
  const result = assessFeasibility("soft-layered-cut", { ...hair, hairLength: "short" }, defaultPreferences, "en")!;
  expect(result.status).toBe("grow");
  expect(result.nextSteps.join(" ")).toContain("cannot establish a reliable growth date");
  expect(result.nextSteps.join(" ")).not.toMatch(/\d+[-–]\d+ weeks/);
});
test("keeping length, avoiding perms and limited styling time change the advice", () => {
  const constrained = assessFeasibility("french-bob", hair, { ...defaultPreferences, lengthChange: "keep", dailyMinutes: "5" }, "en")!;
  expect(constrained.status).toBe("discuss");
  expect(constrained.reasons.join(" ")).toContain("more length than your stated preference");
  expect(constrained.reasons.join(" ")).toContain("styling budget");
  const curls = assessFeasibility("loose-curls", hair, { ...defaultPreferences, perm: "no" }, "zh")!;
  expect(curls.nextSteps.join(" ")).toContain("只剪不烫");
});
test("unclear and curly hair do not receive an unqualified feasibility claim", () => {
  expect(assessFeasibility("long-bob", { ...hair, hairLength: "unclear" }, defaultPreferences, "en")?.status).toBe("discuss");
  expect(assessFeasibility("french-bob", { ...hair, texture: "coily" }, { ...defaultPreferences, lengthChange: "open" }, "en")?.reasons.join(" ")).toContain("shrinkage");
});
test("old results get labelled general guides and reference transfer gets no fabricated plan", () => {
  expect(getAssessedSalonGuide("french-bob")?.personalized).toBe(false);
  expect(getAssessedSalonGuide("french-bob", "en", { analysisJson: "broken", preferencesJson: "{}" })?.personalized).toBe(false);
  expect(getAssessedSalonGuide("reference-transfer")).toBeUndefined();
});
test("analysis prompt receives explicit user preferences and prohibits pseudo-precision", () => {
  const prompt = buildHairAnalysisPrompt("en", { lengthChange: "keep", perm: "no", dailyMinutes: "5" });
  expect(prompt).toContain("length change=keep"); expect(prompt).toContain("perm=no"); expect(prompt).toContain("Do not output match percentages");
});

test("broad short-hair categories do not falsely require growth for a chin-length bob", () => {
  const result = assessFeasibility("french-bob", { ...hair, hairLength: "short" }, { ...defaultPreferences, dailyMinutes: "30" }, "en")!;
  expect(result.status).toBe("discuss");
  expect(result.reasons.join(" ")).toContain("overlaps");
  expect(result.reasons.join(" ")).not.toContain("need more length");
});

test("bangs require a front-length check and preview cards lead with styling constraints", () => {
  const result = assessFeasibility("curtain-bangs", hair, { ...defaultPreferences, dailyMinutes: "5" }, "en")!;
  expect(result.status).toBe("discuss");
  expect(result.reasons.join(" ")).toContain("front sections");
  expect(result.reasons[0]).toContain("styling budget");
  expect(getSalonGuide("curtain-bangs", "en").dailyStylingMinutes).toBe(10);
  expect(getSalonGuide("curtain-bangs", "zh").dailyStylingMinutes).toBe(10);
  expect(buildHairAnalysisPrompt("en")).toContain("french-bob: French Bob — general maintenance=medium");
});
