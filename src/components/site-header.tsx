import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowUpRight } from "lucide-react";

async function AccountControl() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <Link className="hidden text-xs font-semibold sm:block" href="/sign-in">Sign in</Link>;
  }

  const { userId } = await auth();
  return userId
    ? <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
    : <Link className="hidden text-xs font-semibold sm:block" href="/sign-in">Sign in</Link>;
}

export function SiteHeader() {
  return <header className="relative z-20 border-b border-ink/10 px-5 sm:px-8 lg:px-12"><div className="mx-auto flex h-14 max-w-7xl items-center justify-between">
    <Link className="font-display text-xl font-bold tracking-[-.04em]" href="/">NewLook<span className="text-coral">.</span></Link>
    <nav className="hidden items-center gap-6 text-xs text-ink/60 md:flex"><Link className="hover:text-ink" href="/#how-it-works">Why NewLook</Link><Link className="hover:text-ink" href="/pricing">Pricing</Link></nav>
    <div className="flex items-center gap-3"><AccountControl /><Link className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3.5 py-2 text-xs font-bold text-white transition hover:bg-ink" href="/upload">Try free <ArrowUpRight className="size-3.5" /></Link></div>
  </div></header>;
}
