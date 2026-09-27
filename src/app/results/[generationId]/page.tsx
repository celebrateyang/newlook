import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ResultDetail } from "@/components/results/result-detail";

export const metadata: Metadata = { title: "Your hairstyle result", description: "Review, download, and take your NewLook result to the salon." };

export default async function ResultPage({ params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  return <main className="min-h-screen bg-ivory text-ink"><SiteHeader /><ResultDetail generationId={generationId} /></main>;
}
