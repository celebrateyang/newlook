import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE, preferredLocale } from "@/lib/i18n/locale";

export default clerkMiddleware((_auth, request) => {
  const { pathname } = request.nextUrl;
  if (["/robots.txt", "/sitemap.xml", "/llms.txt"].includes(pathname)) return NextResponse.next();
  const segment = pathname.split("/")[1];
  const isApi = /^\/(api|trpc)(\/|$)/.test(pathname);
  const apiLocale = request.headers.get("x-newself-language");
  const locale = isLocale(segment) ? segment : isApi && isLocale(apiLocale) ? apiLocale : preferredLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language") ?? "");
  if (!isApi && !isLocale(segment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-newself-locale", locale);
  requestHeaders.set("x-newself-path", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!isApi) response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31_536_000, sameSite: "lax", secure: request.nextUrl.protocol === "https:" });
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
