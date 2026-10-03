import Link from "next/link";
import { chineseFaqs, chineseOverview, chineseSteps } from "@/lib/seo/chinese-content";
import { absoluteUrl } from "@/lib/seo/site";

export function ChineseHairstyleInfo() {
  const pageUrl = absoluteUrl("/zh");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${absoluteUrl("/")}#organization`, name: "newself", url: absoluteUrl("/"), logo: absoluteUrl("/brand/newself-mark.png") },
      { "@type": "WebSite", "@id": `${absoluteUrl("/")}#website`, name: "newself", url: absoluteUrl("/"), inLanguage: ["en", "zh-CN"], publisher: { "@id": `${absoluteUrl("/")}#organization` } },
      { "@type": "WebPage", "@id": `${pageUrl}#webpage`, url: pageUrl, name: "AI 发型设计与换发型：上传照片试发型 | newself", description: chineseOverview, inLanguage: "zh-CN", isPartOf: { "@id": `${absoluteUrl("/")}#website` }, mainEntity: { "@id": `${pageUrl}#faq` } },
      { "@type": "SoftwareApplication", "@id": `${pageUrl}#application`, name: "newself AI 发型顾问", url: pageUrl, applicationCategory: "LifestyleApplication", operatingSystem: "Web browser", description: chineseOverview, inLanguage: ["zh-CN", "en"], offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "免费早期体验，每个登录账号每天最多 6 次生成", url: absoluteUrl("/zh/pricing") } },
      { "@type": "HowTo", "@id": `${pageUrl}#how-to`, name: "AI 发型设计，从试发型到理发师沟通", description: chineseOverview, inLanguage: "zh-CN", step: chineseSteps.map(({ title, text }, index) => ({ "@type": "HowToStep", position: index + 1, name: title, text, url: `${pageUrl}#step-${index + 1}` })) },
      { "@type": "FAQPage", "@id": `${pageUrl}#faq`, inLanguage: "zh-CN", mainEntity: chineseFaqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ],
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <section aria-labelledby="hairstyle-advisor-heading" className="border-t border-ink/10 px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="eyebrow mb-4">剪发前，先把想法看清楚</p>
        <h2 id="hairstyle-advisor-heading" className="font-display text-3xl font-bold leading-tight sm:text-4xl">AI 发型设计，从试发型到理发师沟通</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-ink/65">{chineseOverview}</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{chineseSteps.map(({ title, text }, index) => <li id={`step-${index + 1}`} key={title} className="scroll-mt-6 rounded-3xl border border-ink/10 bg-white/50 p-6"><span aria-hidden="true" className="font-mono text-sm text-coral">0{index + 1}</span><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-ink/60">{text}</p></li>)}</ol>
        <nav aria-label="发型服务详情" className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold underline underline-offset-4"><Link href="/zh/about">了解 newself</Link><Link href="/zh/pricing">免费体验与每日额度</Link><Link href="/zh/stylists">理发师入驻</Link></nav>
      </div>
    </section>
    <section id="faq" aria-labelledby="hairstyle-faq-heading" className="bg-clay/40 px-5 py-16 sm:px-8 lg:px-12 lg:py-20"><div className="mx-auto max-w-4xl"><h2 id="hairstyle-faq-heading" className="font-display text-3xl font-bold sm:text-4xl">AI 发型推荐与换发型常见问题</h2><div className="mt-8 divide-y divide-ink/10">{chineseFaqs.map(({ question, answer }, index) => <article id={`faq-${index + 1}`} key={question} className="scroll-mt-6 py-6"><h3 className="text-lg font-bold">{question}</h3><p className="mt-3 text-sm leading-7 text-ink/65">{answer}</p></article>)}</div><p className="mt-4 text-sm leading-7 text-ink/60">了解照片与分享的处理方式，请阅读<Link href="/zh/privacy" className="font-bold underline underline-offset-4">隐私政策</Link>和<Link href="/zh/terms" className="font-bold underline underline-offset-4">服务条款</Link>。</p></div></section>
  </>;
}
