import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "@/components/localized-link";
import { SiteHeader } from "@/components/site-header";
import { hairstyleTopic, HAIRSTYLE_TOPICS } from "@/lib/hairstyles/topics";
import { getStarterHairstyle } from "@/lib/hairstyles/catalog";
import { isLocale } from "@/lib/i18n/locale";

export default async function HairstyleTopicPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const topic = hairstyleTopic(slug), style = getStarterHairstyle(slug);
  if (!topic || !style) notFound();
  const copy = topic[locale], zh = locale === "zh";
  return <main className="min-h-screen bg-ivory"><SiteHeader /><article className="mx-auto max-w-5xl px-5 py-12 sm:px-8"><p className="eyebrow">{zh ? "剪发前的沟通参考" : "BEFORE YOUR SALON VISIT"}</p><h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{copy.title}</h1><div className="mt-8 grid gap-8 md:grid-cols-[.8fr_1.2fr]"><figure><Image src={style.previewImage} alt={style.previewAlt} width={768} height={768} className="w-full rounded-3xl" /><figcaption className="mt-3 text-xs leading-6 text-ink/60">{zh ? "AI 发型库虚构模特，仅用于展示发型，不代表顾客或理发店案例。" : "AI catalog image of a fictional model. An illustration of the style, not a customer or salon result."}</figcaption></figure><div className="space-y-6 text-base leading-8 text-ink/70"><p>{copy.intro}</p><h2 className="font-display text-2xl font-bold text-ink">{zh ? "需要确认什么" : "What to check"}</h2><ul className="list-disc space-y-3 pl-5">{copy.considerations.map(item => <li key={item}>{item}</li>)}</ul><h2 className="font-display text-2xl font-bold text-ink">{zh ? "问理发师" : "Ask your stylist"}</h2><p>{copy.ask}</p><p className="text-sm">{zh ? "这些是一般沟通建议。照片无法确认真实发量、干发回缩或烫染历史；现场评估后再决定。" : "These are general consultation notes. A photo cannot establish actual density, dry shrinkage or chemical history; decide after an in-person assessment."}</p><Link href="/upload" className="button-primary">{zh ? "上传照片试发型" : "Try a hairstyle on my photo"}</Link></div></div><nav aria-label={zh ? "其他发型参考" : "More hairstyle guides"} className="mt-12 flex flex-wrap gap-5 border-t border-ink/10 pt-6 text-sm font-bold underline">{HAIRSTYLE_TOPICS.filter(other => other.slug !== slug).map(other => <Link key={other.slug} href={`/hairstyles/${other.slug}`}>{other[locale].title}</Link>)}</nav></article></main>;
}
