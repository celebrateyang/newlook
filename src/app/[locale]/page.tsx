import { getTranslations } from "@/lib/i18n/server";
import Link from "@/components/localized-link";
import { connection } from "next/server";
import { ArrowRight, Check, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SelfieUploader } from "@/components/upload/selfie-uploader";
import { getHomeHistory } from "@/lib/home/history";

export default async function Home() {
  const t = await getTranslations();
  await connection();
  const history = await getHomeHistory().catch((error) => {
    console.error("Could not load homepage history", error);
    return undefined;
  });
  return <main className="min-h-screen overflow-hidden bg-ivory text-ink" id="top">
    <SiteHeader />
    <section className="relative px-5 pb-16 pt-5 sm:px-8 lg:px-12 lg:pb-20 lg:pt-6">
      <div className="sun-glow" />
      <div className="relative mx-auto max-w-7xl">
        {history ? <div className="mx-auto max-w-3xl text-center"><p className="eyebrow mb-2">{t("YOUR HAIRSTYLE WORKSPACE")}</p><h1 className="font-display text-[clamp(2.15rem,3.2vw,3.25rem)] leading-[.98] tracking-[-.04em]">{t("Ready for your")}{" "}<em className="font-normal text-coral">{t("next look?")}</em></h1><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/55">{t("Continue with your saved selfie, revisit your latest result, or try a new direction.")}</p></div> : <div className="mx-auto max-w-6xl text-center"><p className="eyebrow mb-2">{t("AI HAIRSTYLE ADVISOR")}</p><h1 className="font-display text-[clamp(2.4rem,4vw,4rem)] leading-[.95] tracking-[-.05em]">{t("Find a hairstyle that")}{" "}<em className="font-normal text-coral">{t("actually suits you.")}</em></h1><p className="mx-auto mt-2 max-w-2xl text-base leading-7 text-ink/60">{t("Upload one selfie to get personal matches, realistic try-ons, and salon-ready guidance.")}</p><div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-ink/50"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-deep-sage" /> {" "}{t("6 free generations daily")}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-deep-sage" /> {" "}{t("Private by default")}</span><span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5 text-deep-sage" /> {" "}{t("About one minute")}</span></div></div>}
        <div className="mt-5"><SelfieUploader initialHistory={history} /></div>
      </div>
    </section>
    <section className="bg-ink px-5 py-7 text-ivory sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center"><p className="font-display text-2xl tracking-tight">{t("Not more choices. Better reasons.")}</p><div className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-ivory/60"><span>{t("Face + hair analysis")}</span><span>{t("Realistic try-on")}</span><span>{t("Salon-ready plan")}</span></div></div></section>
    <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28" id="how-it-works"><div className="mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr]"><div><p className="eyebrow mb-5">{t("WHY NEWSELF")}</p><h2 className="font-display text-5xl leading-[.96] tracking-tight sm:text-6xl">{t("A preview is useful.")}<br />{t("A decision is better.")}</h2><p className="mt-6 max-w-md text-lg leading-8 text-ink/55">{t("newself explains why a style suits you and whether your current hair can realistically achieve it.")}</p></div><div className="grid gap-4 sm:grid-cols-3"><ValueCard icon={<Sparkles />} number="01" title={t("Understand")} copy={t("We read visible face proportions, length, density and texture.")} /><ValueCard icon={<Scissors />} number="02" title={t("Try")} copy={t("Preview the styles most worth considering while keeping your identity intact.")} /><ValueCard icon={<ArrowRight />} number="03" title={t("Take action")} copy={t("Know what to ask for, how to maintain it, and what is realistic now.")} /></div></div></div></section>
    <section className="bg-clay px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><div><p className="eyebrow mb-5">{t("BEYOND THE IMAGE")}</p><h2 className="font-display text-5xl leading-[.96] tracking-tight sm:text-6xl">{t("Made for the salon,")}<br />{t("not just the screen.")}</h2></div><div className="rounded-[1.8rem] bg-ivory p-6 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-8"><div className="flex items-center justify-between border-b border-ink/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-ink/35">{t("Real-world fit")}</p><p className="mt-2 font-display text-3xl">{t("Collarbone layers")}</p></div><span className="rounded-full bg-sage/20 px-3 py-2 text-xs font-bold text-deep-sage">{t("HIGH")}</span></div><p className="mt-5 leading-7 text-ink/60">{t("Your current length and density can support this shape. Ask for soft face-framing layers and avoid excessive thinning.")}</p><div className="mt-5 grid grid-cols-3 gap-3 text-sm"><div><p className="text-ink/40">{t("Perm")}</p><p className="mt-1 font-bold">{t("Optional")}</p></div><div><p className="text-ink/40">{t("Daily styling")}</p><p className="mt-1 font-bold">{t("5–10 min")}</p></div><div><p className="text-ink/40">{t("Maintenance")}</p><p className="mt-1 font-bold">{t("6–8 weeks")}</p></div></div></div></div></section>
    <section className="px-5 py-20 text-center sm:px-8 lg:py-24"><p className="eyebrow mb-5">{t("ONE SELFIE IS ENOUGH")}</p><h2 className="mx-auto max-w-4xl font-display text-5xl leading-[.95] tracking-tight sm:text-7xl">{t("See the cut before you commit.")}</h2><a className="button-primary mt-8" href="#top">{t("Start with my selfie")}{" "}<ArrowRight className="size-4" /></a></section>
    <footer className="border-t border-ink/10 px-5 py-8 text-sm text-ink/50 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row"><p>© {new Date().getFullYear()} {" "}{t("newself. Hair decisions, made clearer.")}</p><div className="flex gap-6"><Link href="/privacy">{t("Privacy")}</Link><Link href="/terms">{t("Terms")}</Link><a href="mailto:hello@newself.cc">{t("Contact")}</a></div></div></footer>
  </main>;
}

function ValueCard({ icon, number, title, copy }: { icon: React.ReactNode; number: string; title: string; copy: string }) {
  return <article className="rounded-[1.5rem] border border-ink/10 bg-white/45 p-5"><div className="flex items-center justify-between text-coral"><span className="grid size-10 place-items-center rounded-full bg-coral/10 [&>svg]:size-4">{icon}</span><span className="font-mono text-xs text-ink/30">{number}</span></div><h3 className="mt-10 font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-ink/50">{copy}</p></article>;
}
