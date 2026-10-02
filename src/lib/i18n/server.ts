import "server-only";
import { headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, preferredLocale } from "./locale";
import { translator } from "./translate";

export async function getLocale() {
  const requestHeaders = await headers();
  const explicit = requestHeaders.get("x-newself-locale");
  if (isLocale(explicit)) return explicit;
  const cookie = requestHeaders.get("cookie")?.split(";").map(item => item.trim()).find(item => item.startsWith(`${LOCALE_COOKIE}=`))?.slice(LOCALE_COOKIE.length + 1);
  return preferredLocale(cookie, requestHeaders.get("accept-language") ?? "");
}

export async function getTranslations() { return translator(await getLocale()); }
