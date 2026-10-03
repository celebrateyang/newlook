import type { MetadataRoute } from "next";
import { languageAlternates, publicPageUrls } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPageUrls().map(({ url, route }) => ({ url, alternates: { languages: languageAlternates(route) } }));
}
