import { internalMutation, query } from "./_generated/server";
import { catalogDocument, hairstyleCatalog } from "./hairstyleCatalog";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const styles = await ctx.db.query("hairstyles").collect();
    const activeBySlug = new Map(styles.filter((style) => style.active && style.reviewStatus === "approved").map((style) => [style.slug, style]));
    return Object.keys(hairstyleCatalog).flatMap((slug) => {
      const style = activeBySlug.get(slug);
      return style ? [style] : [];
    });
  },
});

export const seedStarterCatalog = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;
    for (const slug of Object.keys(hairstyleCatalog) as Array<keyof typeof hairstyleCatalog>) {
      const existing = await ctx.db.query("hairstyles").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
      const document = catalogDocument(slug);
      if (existing) {
        await ctx.db.patch(existing._id, { ...document, updatedAt: Date.now() });
        updated += 1;
      } else {
        await ctx.db.insert("hairstyles", { ...document, createdAt: Date.now() });
        inserted += 1;
      }
    }
    return { inserted, updated, total: Object.keys(hairstyleCatalog).length };
  },
});
