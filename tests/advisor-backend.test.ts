import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { getAssessedSalonGuide } from "../src/lib/hairstyles/salon-guides";
const modules = {
  "../convex/_generated/server.js": () => import("../convex/_generated/server"),
  "../convex/advisor.ts": () => import("../convex/advisor"),
  "../convex/generations.ts": () => import("../convex/generations"),
};
const analysis = { faceShape: "oval", confidence: 0.6, faceSummary: "Visible cues only", hairLength: "short", hairDensity: "low", texture: "straight", thickness: "fine", hairline: "average", crownVolume: "flat", recommendations: ["soft-layered-cut", "french-bob", "curtain-bangs"].map(styleSlug => ({ styleSlug, name: styleSlug, reason: "Discuss length", maintenance: "medium" })), disclaimer: "Photo cues can be wrong" };
test("saved assessments are bound to their owner's exact photo and survive result reload", async () => {
  const t = convexTest(schema, modules), owner = t.withIdentity({ subject: "owner" }), other = t.withIdentity({ subject: "other" });
  await t.run(async ctx => { for (const clerkId of ["owner", "other"]) { const userId = await ctx.db.insert("users", { clerkId, locale: "en", credits: 0, createdAt: Date.now() }); await ctx.db.insert("uploads", { userId, type: "original", r2Key: `${clerkId}-key`, mimeType: "image/jpeg", size: 100, createdAt: Date.now() }); } });
  const args = { key: "owner-key", analysisJson: JSON.stringify(analysis), preferencesJson: JSON.stringify({ lengthChange: "keep", perm: "no", dailyMinutes: "5" }), locale: "en" as const, model: "test", promptVersion: "test", durationMs: 1 };
  await expect(other.mutation(api.advisor.save, args)).rejects.toThrow("Upload not found");
  const advisorSessionId = await owner.mutation(api.advisor.save, args);
  await expect(other.mutation(api.generations.start, { uploadKey: "other-key", styleSlug: "french-bob", advisorSessionId, provider: "test", model: "test", promptVersion: "test" })).rejects.toThrow("Assessment not found");
  const generationId = await owner.mutation(api.generations.start, { uploadKey: "owner-key", styleSlug: "soft-layered-cut", advisorSessionId, provider: "test", model: "test", promptVersion: "test" });
  const saved = await owner.query(api.generations.getMine, { generationId });
  const guide = getAssessedSalonGuide("soft-layered-cut", "en", saved?.assessment);
  expect(guide?.personalized).toBe(true); expect(guide?.assessment?.status).toBe("grow");
  expect(guide?.instructions[0].detail).toContain("up to 5 minutes");
  expect(await other.query(api.generations.getMine, { generationId })).toBeNull();
});
