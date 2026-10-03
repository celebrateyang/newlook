import { getLocale, getTranslations } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo/site";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SelfieUploader } from "@/components/upload/selfie-uploader";

export async function generateMetadata(): Promise<Metadata> {
  if (await getLocale() === "zh") return pageMetadata("zh", "/zh/upload");
  const t = await getTranslations();
  return { title: t("Upload a selfie"), description: t("Start your personal hairstyle analysis.") };
}

export default async function UploadPage() {
  const t = await getTranslations();
  return <main className="min-h-screen bg-ivory"><SiteHeader /><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16"><div className="mx-auto mb-10 max-w-3xl text-center"><p className="eyebrow mb-4">{t("YOUR PERSONAL ADVISOR")}</p><h1 className="font-display text-5xl leading-[.95] tracking-tight sm:text-6xl">{t("Find your best next haircut.")}</h1><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-ink/60">{t("One clear selfie is enough to analyse your current hair and start finding realistic matches.")}</p></div><SelfieUploader /></div></main>;
}
