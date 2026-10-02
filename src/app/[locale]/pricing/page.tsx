import { getTranslations } from "@/lib/i18n/server";
import Link from "@/components/localized-link";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default async function PricingPage() {
  const t = await getTranslations();
  return <main className="min-h-screen bg-ivory"><SiteHeader /><section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-24">
    <p className="eyebrow mb-5">{t("EARLY ACCESS")}</p><h1 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">{t("Find your next look, free.")}</h1>
    <p className="mt-6 text-lg leading-8 text-ink/60">{t("During early access, each signed-in account can generate up to 6 hairstyle previews per day. Credits and membership plans are coming later.")}</p>
    <article className="mt-10 rounded-3xl border border-ink/10 bg-white p-7"><h2 className="text-sm font-bold">{t("Free early access")}</h2><p className="mt-5 font-display text-5xl">$0</p>
      <ul className="my-7 space-y-3 text-sm">{[t("6 generation attempts per day, shared across try-on, reference transfer and side views"), t("Resets at midnight Beijing time (UTC+8); failed attempts count"), t("Saved previews and available salon guides"), t("Optional public sharing and friend ratings")].map(item => <li className="flex items-start gap-2" key={item}><Check className="mt-0.5 size-4 shrink-0 text-coral" />{item}</li>)}</ul>
      <Link href="/upload" className="button-primary">{t("Try newself")}</Link>
    </article>
  </section></main>;
}
