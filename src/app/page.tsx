import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Clock3, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const recommendations = [
  { name: "French bob", score: "96%", note: "Balances your proportions" },
  { name: "Soft layers", score: "92%", note: "Works with natural texture" },
  { name: "Curtain bangs", score: "89%", note: "Frames the cheekbones" },
];

const steps = [
  ["01", "Share one clear selfie", "A front-facing photo is enough to begin."],
  ["02", "Get your hair profile", "We assess face shape, length, density and texture."],
  ["03", "See what truly suits you", "Try realistic options and take a precise guide to your stylist."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-ivory text-ink">
      <SiteHeader />
      <section className="relative border-b border-ink/10 px-5 pb-16 pt-12 sm:px-8 lg:px-12 lg:pb-24 lg:pt-20">
        <div className="sun-glow" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
          <div className="relative z-10">
            <p className="eyebrow mb-6">AI HAIRSTYLE ADVISOR</p>
            <h1 className="max-w-3xl font-display text-[clamp(3.4rem,7.2vw,7.1rem)] leading-[.88] tracking-[-.055em]">
              A better cut<br />starts <em className="font-normal text-coral">before</em><br />the salon.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-ink/65 sm:text-xl">
              Discover hairstyles shaped around your face, your hair and your real life—then see the result before you commit.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="button-primary group" href="/upload">Find my hairstyle <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
              <a className="button-secondary" href="#how-it-works">See how it works</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/55">
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-sage" /> One free recommendation</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-sage" /> Private by default</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[620px]">
            <div className="portrait-frame">
              <div className="portrait-art" aria-label="Abstract hairstyle preview"><div className="face-shape" /><div className="hair-shape" /><div className="ear-shape" /><div className="neck-shape" /></div>
              <div className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold tracking-wide shadow-sm backdrop-blur">YOUR HAIR PROFILE</div>
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur sm:left-auto sm:w-72">
                <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Top matches</p><Sparkles className="size-4 text-coral" /></div>
                <div className="space-y-3">{recommendations.map((item) => <div className="grid grid-cols-[1fr_auto] items-center gap-2" key={item.name}><div><p className="text-sm font-semibold">{item.name}</p><p className="text-[11px] text-ink/50">{item.note}</p></div><span className="rounded-full bg-sage/15 px-2 py-1 text-xs font-bold text-deep-sage">{item.score}</span></div>)}</div>
              </div>
            </div>
            <div className="absolute -right-2 top-16 hidden rotate-3 rounded-xl bg-butter px-4 py-3 text-sm font-semibold shadow-lg sm:block">Built for real hair ✦</div>
          </div>
        </div>
      </section>
      <section className="bg-ink px-5 py-6 text-ivory sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 text-sm"><p className="font-display text-2xl tracking-tight">Not just a new look. A sound decision.</p><div className="flex flex-wrap gap-x-7 gap-y-3 text-ivory/65"><span>Face + hair analysis</span><span>Realistic try-on</span><span>Salon-ready guide</span></div></div></section>
      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28" id="how-it-works">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 border-b border-ink/15 pb-10 lg:grid-cols-2"><div><p className="eyebrow mb-5">HOW IT WORKS</p><h2 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">Personal advice,<br />made visual.</h2></div><p className="max-w-xl self-end text-lg leading-8 text-ink/60 lg:justify-self-end">NewLook connects what looks good in a generated image with what your stylist can actually create.</p></div>
          <div className="grid lg:grid-cols-3">{steps.map(([number, title, copy]) => <article className="group border-b border-ink/15 py-9 lg:border-b-0 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0" key={number}><div className="mb-16 flex items-center justify-between"><span className="font-mono text-xs text-ink/45">{number}</span><ChevronRight className="size-5 text-ink/25 transition-transform group-hover:translate-x-1" /></div><h3 className="font-display text-3xl tracking-tight">{title}</h3><p className="mt-3 max-w-sm leading-7 text-ink/55">{copy}</p></article>)}</div>
        </div>
      </section>
      <section className="bg-clay px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.86fr_1.14fr]">
        <div><p className="eyebrow mb-5">BEYOND THE IMAGE</p><h2 className="font-display text-5xl leading-[.95] tracking-tight sm:text-6xl">Can your stylist<br />actually create it?</h2><p className="mt-7 max-w-md text-lg leading-8 text-ink/60">Every result includes a real-world check based on your current length, density and natural texture.</p></div>
        <div className="rounded-[2rem] bg-ivory p-6 shadow-[0_30px_80px_rgba(53,43,35,.12)] sm:p-9">
          <div className="flex flex-col justify-between gap-5 border-b border-ink/10 pb-7 sm:flex-row sm:items-center"><div><p className="text-xs font-bold tracking-[.16em] text-ink/40">REAL-WORLD FEASIBILITY</p><p className="mt-2 font-display text-4xl">French bob</p></div><span className="w-fit rounded-full bg-sage/20 px-4 py-2 text-sm font-bold text-deep-sage">HIGH MATCH</span></div>
          <div className="grid gap-7 py-7 sm:grid-cols-2"><div><p className="metric-label">Cut</p><p className="metric-value"><Scissors className="size-5" /> Jaw-length bob</p></div><div><p className="metric-label">Daily styling</p><p className="metric-value"><Clock3 className="size-5" /> 5–10 minutes</p></div><div><p className="metric-label">Perm</p><p className="metric-value"><Check className="size-5" /> Optional</p></div><div><p className="metric-label">Maintenance</p><p className="metric-value"><Check className="size-5" /> Every 6–8 weeks</p></div></div>
          <div className="rounded-2xl bg-butter/55 p-5 text-sm leading-6 text-ink/65">Your current length and density can support this shape. Ask for a softly graduated perimeter and avoid excessive thinning.</div>
        </div>
      </div></section>
      <section className="px-5 py-20 text-center sm:px-8 lg:py-28"><p className="eyebrow mb-5">READY WHEN YOU ARE</p><h2 className="mx-auto max-w-4xl font-display text-5xl leading-[.95] tracking-tight sm:text-7xl">Meet the haircut that feels like you.</h2><Link className="button-primary mt-9" href="/upload">Find my hairstyle <ArrowRight className="size-4" /></Link></section>
      <footer className="border-t border-ink/10 px-5 py-8 text-sm text-ink/50 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row"><p>© {new Date().getFullYear()} NewLook. Hair decisions, made clearer.</p><div className="flex gap-6"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@newlook.ai">Contact</a></div></div></footer>
    </main>
  );
}
