/* eslint-disable @next/next/no-img-element -- revocable public images bypass optimizer caching. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ShareRating } from "@/components/results/share-rating";
import { getPublicShare } from "@/lib/shares/server";

export const dynamic = "force-dynamic";
const loadShare = cache(getPublicShare);
type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const share = await loadShare(token);
  if (!share) return { title: "Share unavailable", robots: { index: false, follow: false } };
  const title = `${share.name} — rate my new look`;
  const description = "Does this hairstyle suit me? Rate my newself hairstyle preview. / 帮我看看这个发型适合吗？";
  const image = `/api/shares/${token}/image`;
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, url: `/share/${token}`, images: [{ url: image }], type: "website" }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const share = await loadShare(token);
  if (!share) notFound();
  return <main className="mx-auto max-w-2xl px-5 py-10">
    <Link href="/" className="font-display text-3xl">newself<span className="text-coral">.</span></Link>
    <p className="eyebrow mt-8">A NEW LOOK, A LITTLE HELP FROM FRIENDS</p>
    <h1 className="mt-3 font-display text-4xl">{share.name} <span className="text-xl text-ink/50">{share.nameZh}</span></h1>
    <img src={`/api/shares/${token}/image`} alt={`${share.name} hairstyle preview`} className="mt-6 max-h-[65vh] w-full rounded-3xl bg-white object-contain" />
    <p className="mt-3 text-center text-xs text-ink/50">AI hairstyle preview / AI 发型效果参考</p>
    <ShareRating token={token} count={share.count} average={share.average} />
    <div className="mt-8 text-center"><h2 className="font-display text-2xl">Find your own next look / 也试试你的新发型</h2><p className="mt-2 text-sm text-ink/55">See it before you cut it.</p><Link href="/upload" className="button-primary mt-4">Try my hairstyle / 试试我的发型</Link></div>
  </main>;
}
