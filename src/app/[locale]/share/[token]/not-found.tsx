import { getTranslations } from "@/lib/i18n/server";
import Link from "@/components/localized-link";

export default async function ShareUnavailable() {
  const t = await getTranslations();
  return <main className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-4xl">{t("This share is unavailable")}</h1><p className="mt-4 text-ink/55">{t("The link may have been turned off by its owner.")}</p><Link href="/" className="button-primary mt-6">{t("Try your own hairstyle")}</Link></main>;
}
