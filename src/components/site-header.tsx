import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteHeader() {
  return <header className="relative z-20 border-b border-ink/10 px-5 sm:px-8 lg:px-12"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between">
    <Link className="font-display text-2xl font-bold tracking-[-.04em]" href="/">NewLook<span className="text-coral">.</span></Link>
    <nav className="hidden items-center gap-8 text-sm text-ink/60 md:flex"><Link className="hover:text-ink" href="/#how-it-works">How it works</Link><Link className="hover:text-ink" href="/pricing">Pricing</Link><Link className="hover:text-ink" href="/about">About</Link></nav>
    <div className="flex items-center gap-3"><Link className="hidden text-sm font-semibold sm:block" href="/sign-in">Sign in</Link><Link className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink" href="/upload">Try free <ArrowUpRight className="size-4" /></Link></div>
  </div></header>;
}
