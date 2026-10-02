import { getLocale, getTranslations } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
/* eslint-disable @next/next/no-img-element -- revocable public images bypass optimizer caching. */
import type { Metadata } from "next";
import Link from "@/components/localized-link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ShareRating } from "@/components/results/share-rating";
import { getPublicShare } from "@/lib/shares/server";

export const dynamic = "force-dynamic";
const loadShare = cache(getPublicShare);
type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();
  const { token } = await params;
  const share = await loadShare(token);
  if (!share) return { title: t("Share unavailable"), robots: { index: false, follow: false } };
  const title = `${locale === "zh" ? share.nameZh : share.name} — ${t("Rate my new look on newself!")}`;
  const description = t("Does this hairstyle suit me? Rate my newself hairstyle preview.");
  const image = `/api/shares/${token}/image`;
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, url: `/${locale}/share/${token}`, images: [{ url: image }], type: "website" }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export default async function SharePage({ params }: Props) {
  const t = await getTranslations();
  const locale = await getLocale();
  const { token } = await params;
  const share = await loadShare(token);
  if (!share) notFound();
  return <main className="mx-auto max-w-2xl px-5 py-10">
    <div className="flex items-center justify-between"><Link href="/" className="font-display text-3xl">newself<span className="text-coral">.</span></Link><LanguageSwitcher /></div>
    <p className="eyebrow mt-8">{t("A NEW LOOK, A LITTLE HELP FROM FRIENDS")}</p>
    <h1 className="mt-3 font-display text-4xl">{locale === "zh" ? share.nameZh : share.name}</h1>
    <img src={`/api/shares/${token}/image`} alt={t("{style} hairstyle preview", { style: locale === "zh" ? share.nameZh : share.name })} className="mt-6 max-h-[65vh] w-full rounded-3xl bg-white object-contain" />
    <p className="mt-3 text-center text-xs text-ink/50">{t("AI hairstyle preview")}</p>
    <ShareRating token={token} count={share.count} average={share.average} />
    <div className="mt-8 text-center"><h2 className="font-display text-2xl">{t("Find your own next look")}</h2><p className="mt-2 text-sm text-ink/55">{t("See it before you cut it.")}</p><Link href="/upload" className="button-primary mt-4">{t("Try my hairstyle")}</Link></div>
  </main>;
}
