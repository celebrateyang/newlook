import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "./site-header";

export function InfoPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-ivory"><SiteHeader /><article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-24"><p className="eyebrow mb-5">{eyebrow}</p><h1 className="font-display text-5xl leading-none tracking-tight sm:text-6xl">{title}</h1><div className="mt-10 space-y-6 text-base leading-8 text-ink/65">{children}</div><Link href="/" className="mt-12 inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft className="size-4" /> Back home</Link></article></main>;
}
