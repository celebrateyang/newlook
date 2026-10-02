import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getPublicPoll } from "@/lib/shares/polls";
import { getTranslations, getLocale } from "@/lib/i18n/server";
import Link from "@/components/localized-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PollRating } from "@/components/results/poll-rating";
const loadPoll = cache(getPublicPoll);
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ token: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations(), { token } = await params, poll = await loadPoll(token);
  const title = poll?.title || t("Which hairstyle suits me best?");
  const description = t("Help me choose my next hairstyle. Rate these looks without signing in.");
  const image = `/api/polls/${token}/image?locale=${await getLocale()}`;
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, images: [{ url: `${image}&shape=square`, width: 1200, height: 1200, type: "image/jpeg", alt: t("Hairstyle comparison preview") }] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}
export default async function PollPage({ params }: Props) {
  const t = await getTranslations(), { token } = await params, poll = await loadPoll(token);
  if (!poll) notFound();
  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><div className="flex items-center justify-between"><Link href="/" className="font-display text-3xl font-bold">newself<span className="text-coral">.</span></Link><LanguageSwitcher /></div><p className="eyebrow mt-10">{t("A LITTLE HELP FROM FRIENDS")}</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">{poll.title || t("Which hairstyle suits me best?")}</h1><PollRating token={token} items={poll.items.map(({ r2Key, ...item }) => { void r2Key; return item; })} /><div className="mt-10 rounded-3xl bg-coral/10 p-7 text-center"><h2 className="font-display text-3xl">{t("Find your own next look")}</h2><p className="mt-3 text-sm text-ink/60">{t("See it before you cut it.")}</p><Link href="/upload" className="button-primary mt-5">{t("Try my hairstyle")}</Link></div></main>;
}
