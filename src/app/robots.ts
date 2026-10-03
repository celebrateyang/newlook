import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Public search/AI crawlers share this policy. Crawl page HTML to see noindex;
    // disallowing private page paths here would prevent reading that directive.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/trpc/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
