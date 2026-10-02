export const locales = ["en", "zh"] as const;
export type Locale = typeof locales[number];
export const LOCALE_COOKIE = "newself-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}

export function preferredLocale(cookie: string | undefined, acceptLanguage = ""): Locale {
  if (isLocale(cookie)) return cookie;
  const languages = acceptLanguage.split(",").map((entry, index) => {
    const [tag, ...options] = entry.trim().toLowerCase().split(";");
    const quality = options.find(option => option.trim().startsWith("q="));
    return { tag: tag.split("-")[0], quality: quality ? Number(quality.trim().slice(2)) : 1, index };
  }).filter(item => isLocale(item.tag) && item.quality > 0).sort((a, b) => b.quality - a.quality || a.index - b.index);
  return (languages[0]?.tag as Locale | undefined) ?? "en";
}

export function localizedPath(href: string, locale: Locale) {
  const pathname = href.split(/[?#]/)[0];
  if (!href.startsWith("/") || href.startsWith("//") || /^\/(api|_next)(\/|$)/.test(href) || /\.[a-z0-9]+$/i.test(pathname)) return href;
  const path = href.replace(/^\/(en|zh)(?=\/|[?#]|$)/, "");
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}
