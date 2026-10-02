// Only page categories are sent: never resource IDs, tokens or query strings.
export function analyticsPath(pathname: string): string {
  const [locale, page] = pathname.split("/").filter(Boolean);
  const prefix = locale === "zh" ? "/zh" : "/en";
  if (!page) return `${prefix}/`;
  if (["upload", "looks", "pricing", "about", "privacy", "terms", "sign-in"].includes(page)) return `${prefix}/${page}`;
  if (["results", "share", "poll"].includes(page)) return `${prefix}/${page}/detail`;
  return `${prefix}/other`;
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-RFVZLETJDJ";
