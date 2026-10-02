"use client";

import { createContext, useContext, useMemo, useCallback } from "react";
import { translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/locale";

const LocaleContext = createContext<Locale>("en");
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
export function useI18n() {
  const locale = useContext(LocaleContext);
  const t = useMemo(() => translator(locale), [locale]);
  return { locale, t };
}

export function useLocalizedFetch() {
  const { locale } = useI18n();
  return useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      const requestHeaders = new Headers(init?.headers);
      requestHeaders.set("x-newself-language", locale);
      return fetch(input, { ...init, headers: requestHeaders });
    }
    return fetch(input, init);
  }, [locale]);
}
