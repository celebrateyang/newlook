import Link from "next/link";
import { chineseFaqs, chineseOverview, chineseSteps } from "@/lib/seo/chinese-content";
import { englishFaqs, englishOverview, englishSteps } from "@/lib/seo/english-content";
import { absoluteUrl } from "@/lib/seo/site";
import type { Locale } from "@/lib/i18n/locale";
import { HAIRSTYLE_TOPICS } from "@/lib/hairstyles/topics";

export function PublicHairstyleInfo({ locale }: { locale: Locale }) {
  const zh = locale === "zh", lang = zh ? "zh-CN" : "en";
  const say = (en: string, cn: string) => zh ? cn : en;
  const overview = zh ? chineseOverview : englishOverview, steps = zh ? chineseSteps : englishSteps, faqs = zh ? chineseFaqs : englishFaqs;
  const pageUrl = absoluteUrl(`/${locale}`), title = say("AI hairstyle advice, from preview to salon discussion", "AI 发型设计，从试发型到理发师沟通");
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "newself", url: absoluteUrl("/"), logo: absoluteUrl("/brand/newself-mark.png") },
    { "@type": "WebSite", "@id": `${absoluteUrl("/")}#website`, name: "newself", url: absoluteUrl("/"), inLanguage: ["en", "zh-CN"], publisher: { "@id": `${absoluteUrl("/")}#organization` } },
    { "@type": "WebPage", "@id": `${pageUrl}#webpage`, url: pageUrl, name: title, description: overview, inLanguage: lang, isPartOf: { "@id": `${absoluteUrl("/")}#website` }, mainEntity: { "@id": `${pageUrl}#faq` } },
    { "@type": "SoftwareApplication", "@id": `${pageUrl}#application`, name: say("newself AI Hairstyle Advisor", "newself AI 发型顾问"), url: pageUrl, applicationCategory: "LifestyleApplication", operatingSystem: "Web browser", description: overview, inLanguage: ["en", "zh-CN"], offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: say("Free early access, up to 6 generation attempts per signed-in account daily", "免费早期体验，每个登录账号每天最多 6 次生成"), url: absoluteUrl(`/${locale}/pricing`) } },
    { "@type": "HowTo", "@id": `${pageUrl}#how-to`, name: title, description: overview, inLanguage: lang, step: steps.map(({ title, text }, index) => ({ "@type": "HowToStep", position: index + 1, name: title, text, url: `${pageUrl}#step-${index + 1}` })) },
    { "@type": "FAQPage", "@id": `${pageUrl}#faq`, inLanguage: lang, mainEntity: faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
  ] };
  return <>
    <nav aria-label={say("Haircut discussion guides", "发型沟通参考")} className="mx-auto flex max-w-7xl flex-wrap gap-5 px-5 py-8 text-sm font-bold underline">{HAIRSTYLE_TOPICS.map(topic => <Link key={topic.slug} href={`/${locale}/hairstyles/${topic.slug}`}>{topic[locale].title}</Link>)}</nav>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <section aria-labelledby="hairstyle-advisor-heading" className="border-t border-ink/10 px-5 py-16 sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl"><p className="eyebrow mb-4">{say("Before you cut", "剪发前，先把想法看清楚")}</p><h2 id="hairstyle-advisor-heading" className="font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h2><p className="mt-5 max-w-3xl text-base leading-8 text-ink/65">{overview}</p><ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{steps.map(({ title, text }, index) => <li id={`step-${index + 1}`} key={title} className="scroll-mt-6 rounded-3xl border border-ink/10 bg-white/50 p-6"><span aria-hidden="true" className="font-mono text-sm text-coral">0{index + 1}</span><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-ink/60">{text}</p></li>)}</ol><nav aria-label={say("Hairstyle service details", "发型服务详情")} className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold underline underline-offset-4"><Link href={`/${locale}/about`}>{say("About newself", "了解 newself")}</Link><Link href={`/${locale}/pricing`}>{say("Free access and daily quota", "免费体验与每日额度")}</Link><Link href={`/${locale}/settings/privacy`}>{say("Photo privacy and deletion", "照片隐私与删除")}</Link></nav></div></section>
    <section id="faq" aria-labelledby="hairstyle-faq-heading" className="bg-clay/40 px-5 py-16 sm:px-8 lg:px-12"><div className="mx-auto max-w-4xl"><h2 id="hairstyle-faq-heading" className="font-display text-3xl font-bold sm:text-4xl">{say("AI hairstyle advice and try-on FAQs", "AI 发型推荐与换发型常见问题")}</h2><div className="mt-8 divide-y divide-ink/10">{faqs.map(({ question, answer }, index) => <article id={`faq-${index + 1}`} key={question} className="scroll-mt-6 py-6"><h3 className="text-lg font-bold">{question}</h3><p className="mt-3 text-sm leading-7 text-ink/65">{answer}</p></article>)}</div><p className="mt-4 text-sm leading-7 text-ink/60"><Link href={`/${locale}/privacy`} className="font-bold underline underline-offset-4">{say("Privacy Policy", "隐私政策")}</Link> · <Link href={`/${locale}/terms`} className="font-bold underline underline-offset-4">{say("Terms", "服务条款")}</Link></p></div></section>
  </>;
}
