import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LooksGallery } from "@/components/results/looks-gallery";
import { getTranslations } from "@/lib/i18n/server";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations(); return { title: t("My hairstyles"), robots: { index: false, follow: false } };
}
export default function LooksPage() { return <main className="min-h-screen bg-ivory"><SiteHeader /><LooksGallery /></main>; }
