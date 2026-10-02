"use client";
/* eslint-disable @next/next/no-img-element -- selected public outputs use revocation-checked endpoints. */
import { useEffect, useState } from "react";
import { useI18n, useLocalizedFetch } from "@/components/i18n-provider";
import { Star } from "lucide-react";

export type PollItem = { index: number; label: string; name: string; nameZh: string; view: string; count: number; average: number };
export function PollRating({ token, items: initialItems }: { token: string; items: PollItem[] }) {
  const { t, locale } = useI18n(), fetch = useLocalizedFetch();
  const [items, setItems] = useState(initialItems), [scores, setScores] = useState<Record<number, number>>({}), [busy, setBusy] = useState<number>(), [message, setMessage] = useState(""), [initializing, setInitializing] = useState(true);
  const ranking = [...items].filter(item => item.count > 0).sort((a, b) => b.average - a.average || b.count - a.count || a.index - b.index);
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/polls/${token}/rate`, { cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const body = await response.json();
      if (!cancelled) setScores(Object.fromEntries((body.scores as number[]).map((score, index) => [index, score])));
    }).catch(() => {}).finally(() => { if (!cancelled) setInitializing(false); });
    return () => { cancelled = true; };
  }, [fetch, token]);
  async function rate(index: number, score: number) {
    if (busy !== undefined || initializing) return;
    setBusy(index); setMessage("");
    try {
      const response = await fetch(`/api/polls/${token}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index, score }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not submit your rating.");
      setItems(current => current.map(item => item.index === index ? { ...item, count: body.count, average: body.average } : item));
      setScores(current => ({ ...current, [index]: score })); setMessage("Thanks! Your rating is saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not submit your rating."); }
    finally { setBusy(undefined); }
  }
  return <>
    <p className="mt-4 text-sm leading-6 text-ink/60">{t("Rate each look from 1–5. No sign-in needed; you can change your scores.")}</p>
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <section key={item.index} className="overflow-hidden rounded-3xl bg-white shadow-sm"><img src={`/api/polls/${token}/image?index=${item.index}`} alt={t("{style} hairstyle preview", { style: locale === "zh" ? item.nameZh : item.name })} className="aspect-[4/5] w-full bg-clay/40 object-contain" /><div className="p-5"><h2 className="text-lg font-bold"><span className="mr-2 text-coral">{item.label}</span>{locale === "zh" ? item.nameZh : item.name}</h2><p className="mt-1 text-xs text-ink/50">{t(item.view === "side" ? "Side" : "Front")}</p><p className="mt-3 text-sm">{item.count ? t("{average} / 5 · {count} ratings", { average: item.average.toFixed(1), count: item.count }) : t("Be the first to rate this look")}</p><div className="mt-4 flex gap-2" role="group" aria-label={`${item.label}: ${t("Rate this hairstyle from 1 to 5")}`}>{[1, 2, 3, 4, 5].map(score => <button key={score} type="button" disabled={busy !== undefined || initializing} aria-pressed={scores[item.index] === score} aria-label={t("Rate {score} out of 5", { score })} onClick={() => void rate(item.index, score)} className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center rounded-xl border transition hover:border-coral focus-visible:outline-2 focus-visible:outline-coral disabled:opacity-50 ${score <= (scores[item.index] ?? 0) ? "border-coral bg-coral/10 text-coral" : "border-ink/15 text-ink/50"}`}><Star className="size-4" fill={score <= (scores[item.index] ?? 0) ? "currentColor" : "none"} /><span className="text-xs">{score}</span></button>)}</div></div></section>)}</div>
    {message && <p role="status" className="mt-5 rounded-xl bg-white p-4 text-sm">{t(message)}</p>}
    <section className="mt-8 rounded-3xl bg-white p-6"><h2 className="font-display text-2xl">{t("Friends’ ranking")}</h2><p className="mt-2 text-xs text-ink/50">{t("Ranked by average score, then rating count. Unrated looks are not ranked.")}</p>{ranking.length ? <ol className="mt-4 space-y-3">{ranking.map((item, index) => <li key={item.index} className="flex items-center justify-between gap-3 border-b border-ink/10 pb-3"><span><span className="mr-3 text-coral">{index + 1}.</span>{item.label} · {locale === "zh" ? item.nameZh : item.name}</span><span className="text-sm font-bold">{item.average.toFixed(1)} / 5 <span className="text-xs font-normal text-ink/50">({item.count})</span></span></li>)}</ol> : <p className="mt-4 text-sm text-ink/55">{t("Waiting for your first rating")}</p>}</section>
    <p className="mt-4 text-xs leading-6 text-ink/50">{t("One saved score per browser and look. Clearing cookies or using another device may allow another rating. These are informal friend ratings.")}</p>
  </>;
}
