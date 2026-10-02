import { getTranslations } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ResultDetail } from "@/components/results/result-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("Your hairstyle result"), description: t("Review, download, and take your newself result to the salon.") };
}

export default async function ResultPage({ params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  return <main className="min-h-screen bg-ivory text-ink"><SiteHeader /><ResultDetail generationId={generationId} /></main>;
}
