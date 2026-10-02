import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { ArrowDown, Scissors, Sparkles, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { StylistApplicationForm } from "@/components/stylist-application-form";
import { getTranslations } from "@/lib/i18n/server";
import Link from "@/components/localized-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("Join as a stylist"), description: t("Join newself's first stylist recruitment in mainland China. Help turn hairstyle ideas into a real salon plan.") };
}

export default async function StylistsPage() {
  const t = await getTranslations();
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const signedIn = configured && Boolean((await auth()).userId);
  const steps = [
    { icon: Sparkles, title: "See the hairstyle idea", copy: "Users explore hairstyles with AI previews and choose a look they like." },
    { icon: MessageCircle, title: "Confirm a practical plan", copy: "A stylist checks the real hair conditions and explains the cut, adjustments and care needed." },
    { icon: Scissors, title: "Bring the plan to the salon", copy: "The user and stylist agree on a plan before the service. The final result depends on real hair and technique." },
  ];
  return <main className="min-h-screen bg-ivory"><SiteHeader />
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <p className="eyebrow mb-6">{t("First recruitment · mainland China")}</p>
      <div className="grid items-end gap-8 lg:grid-cols-[1.3fr_1fr]"><h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">{t("A hairstyle you love.")}<br /><span className="text-coral">{t("A stylist to make it possible.")}</span></h1><div><p className="text-base leading-8 text-ink/65">{t("newself helps people see a hairstyle before they cut it. We are recruiting stylists in mainland China to help confirm what is achievable and shape a salon-ready plan.")}</p><a href="#apply" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white transition hover:bg-coral">{t("Apply to join")}<ArrowDown className="size-4" /></a></div></div>
      <p className="mt-10 rounded-2xl border border-coral/20 bg-coral/5 px-5 py-4 text-sm leading-7">{t("We are collecting applications. Stylist matching, appointments and order acceptance are not open yet. AI previews are a starting point; a stylist must assess the actual hair.")}</p>
      <div className="mt-12 grid gap-5 md:grid-cols-3">{steps.map(({ icon: Icon, title, copy }, index) => <div key={title} className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8"><div className="mb-6 flex items-center justify-between"><Icon className="size-6 text-coral" /><span className="font-mono text-xs text-ink/40">0{index + 1}</span></div><h2 className="text-lg font-bold">{t(title)}</h2><p className="mt-3 text-sm leading-7 text-ink/60">{t(copy)}</p></div>)}</div>
    </section>
    <section id="apply" className="scroll-mt-6 border-t border-ink/10 bg-white px-5 py-14 sm:px-8"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.7fr_1fr]"><div><p className="eyebrow mb-4">{t("For stylists")}</p><h2 className="font-display text-3xl font-bold">{t("Help turn a preview into a practical hairstyle.")}</h2><p className="mt-5 text-sm leading-7 text-ink/65">{t("Tell us where you work and what you do best. Applications are private and used for recruitment contact; no public profile is created automatically.")}</p><p className="mt-4 text-sm leading-7 text-ink/65">{t("We welcome stylists who listen to clients, explain what can be achieved and use real work to show their skills.")}</p><Link href="/upload" className="mt-6 inline-block text-sm font-bold underline underline-offset-4">{t("Explore hairstyle try-on")}</Link></div><div><h3 className="mb-5 text-xl font-bold">{t("Application details")}</h3><StylistApplicationForm signedIn={signedIn} available={configured && Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)} /></div></div></section>
  </main>;
}
