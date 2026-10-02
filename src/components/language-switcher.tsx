"use client";

import { usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { LOCALE_COOKIE, localizedPath, type Locale } from "@/lib/i18n/locale";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    router.push(`${localizedPath(pathname, next)}${window.location.search}${window.location.hash}`);
  }
  return <label className="inline-flex items-center gap-1.5 text-xs font-semibold"><Languages className="size-4 text-ink/50" aria-hidden="true" /><span className="sr-only">{locale === "zh" ? "网站语言" : "Website language"}</span><select className="max-w-20 cursor-pointer rounded-lg border border-ink/15 bg-transparent px-1 py-1.5 focus-visible:outline-2 focus-visible:outline-coral" value={locale} onChange={event => change(event.target.value as Locale)}><option value="en">English</option><option value="zh">中文</option></select></label>;
}
