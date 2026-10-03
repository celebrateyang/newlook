import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, zhCN } from "@clerk/localizations";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { I18nProvider } from "@/components/i18n-provider";
import { GoogleAnalytics } from "@/components/google-analytics";
import { isLocale } from "@/lib/i18n/locale";
import { pageMetadata } from "@/lib/seo/site";
import { DM_Mono, Manrope, Playfair_Display } from "next/font/google";
import "../globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pathname = (await headers()).get("x-newself-path") ?? `/${locale}/`;
  return pageMetadata(locale, pathname);
}

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const localized = <I18nProvider locale={locale}>{children}</I18nProvider>;
  const content = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider localization={locale === "zh" ? zhCN : enUS} signInUrl={`/${locale}/sign-in`} signInFallbackRedirectUrl={`/${locale}/`} signUpFallbackRedirectUrl={`/${locale}/`}>{localized}</ClerkProvider> : localized;
  return <html lang={locale === "zh" ? "zh-CN" : "en"} className={`${sans.variable} ${display.variable} ${mono.variable}`}><body>{content}<GoogleAnalytics /></body></html>;
}
