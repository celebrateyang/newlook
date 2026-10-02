"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, type ComponentProps } from "react";
import { useI18n } from "./i18n-provider";
import { localizedPath } from "@/lib/i18n/locale";

export default function LocalizedLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n();
  return <NextLink {...props} href={typeof href === "string" ? localizedPath(href, locale) : { ...href, pathname: href.pathname ? localizedPath(href.pathname, locale) : href.pathname }} />;
}

export function useLocalizedRouter() {
  const router = useRouter();
  const { locale } = useI18n();
  return useMemo(() => ({ ...router, push: (href: string) => router.push(localizedPath(href, locale)), replace: (href: string) => router.replace(localizedPath(href, locale)) }), [router, locale]);
}
