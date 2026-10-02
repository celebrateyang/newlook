import { getTranslations } from "@/lib/i18n/server";
import Link from "@/components/localized-link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowUpRight } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";

export async function SiteHeader() {
  const t = await getTranslations();
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const userId = clerkConfigured ? (await auth()).userId : undefined;

  return <header className="relative z-20 border-b border-ink/10 px-5 sm:px-8 lg:px-12"><div className="mx-auto flex h-14 max-w-7xl items-center justify-between">
    <Link className="flex items-center gap-2 font-display text-xl font-bold tracking-[-.04em]" href="/">
      <Image alt="" aria-hidden="true" className="size-8" height={32} priority src="/brand/newself-mark.png" width={32} />
      <span>newself<span className="text-coral">.</span></span>
    </Link>
    <nav aria-label={t("Main navigation")} className="hidden items-center gap-6 text-xs text-ink/60 md:flex">{userId && <Link className="hover:text-ink" href="/looks">{t("My hairstyles")}</Link>}<Link className="hover:text-ink" href="/#how-it-works">{t("Why newself")}</Link><Link className="font-semibold text-ink hover:text-coral" href="/stylists">{t("Join as a stylist")}</Link></nav>
    <div className="flex items-center gap-2 sm:gap-3"><LanguageSwitcher />{userId ? <UserButton appearance={{ elements: { avatarBox: "size-8" } }} /> : <Link className="hidden text-xs font-semibold sm:block" href="/sign-in">{t("Sign in")}</Link>}<Link className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3.5 py-2 text-xs font-bold text-white transition hover:bg-ink" href={userId ? "/#discovery-heading" : "/upload"}>{userId ? t("New try-on") : t("Try free")} <ArrowUpRight className="size-3.5" /></Link></div>
  </div><nav aria-label={t("Main navigation")} className="mx-auto flex max-w-7xl flex-wrap gap-x-5 gap-y-2 pb-3 text-xs text-ink/60 md:hidden">{userId && <><Link href="/looks" className="font-semibold hover:text-coral">{t("My hairstyles")}</Link><Link href="/#try-on-preview" className="hover:text-coral">{t("My latest look")}</Link></>}<Link href="/stylists" className="font-semibold text-ink hover:text-coral">{t("Join as a stylist")}</Link></nav></header>;
}
