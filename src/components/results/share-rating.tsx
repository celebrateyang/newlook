"use client";
import { useI18n, useLocalizedFetch } from "@/components/i18n-provider";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

export function ShareRating({ token, count: initialCount, average: initialAverage }: { token: string; count: number; average: number }) {
  const fetch = useLocalizedFetch();
  const { t } = useI18n();
  const [summary, setSummary] = useState({ count: initialCount, average: initialAverage });
  const [score, setScore] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/shares/${token}/rate`, { cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const body = await response.json();
      if (!cancelled) setScore(body.score ?? undefined);
    }).catch(() => {}).finally(() => { if (!cancelled) setInitializing(false); });
    return () => { cancelled = true; };
  }, [fetch, token]);

  async function rate(value: number) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/shares/${token}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score: value }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? t("Could not submit your rating."));
      setScore(value); setSummary(body); setMessage(t("Thanks! Your rating is saved."));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t("Could not submit your rating.")); }
    finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-2xl bg-white p-6 text-center">
    <h2 className="font-display text-2xl">{t("Does this look suit me?")}</h2>
    <p className="mt-2 text-sm text-ink/55">{summary.count ? t("{average} / 5 · {count} ratings", { average: summary.average.toFixed(1), count: summary.count }) : t("Be the first to rate this look")}</p>
    <div className="mt-5 flex justify-center gap-2" role="group" aria-label={t("Rate this hairstyle from 1 to 5")}>
      {[1, 2, 3, 4, 5].map(value => <button type="button" key={value} disabled={busy || initializing} aria-pressed={score === value} aria-label={t("Rate {score} out of 5", { score: value })} onClick={() => void rate(value)} className={`flex size-12 flex-col items-center justify-center rounded-xl border transition hover:border-coral focus-visible:outline-2 focus-visible:outline-coral disabled:opacity-50 ${score && value <= score ? "border-coral bg-coral/10 text-coral" : "border-ink/15 text-ink/50"}`}><Star className="size-5" fill={score && value <= score ? "currentColor" : "none"} /><span className="text-xs">{value}</span></button>)}
    </div>
    <p className="mt-4 text-xs leading-5 text-ink/45">{t("Rate each look from 1–5. No sign-in needed; you can change your scores.")}</p>
    <p className="mt-2 text-xs leading-5 text-ink/45">{t("One saved score per browser and look. Clearing cookies or using another device may allow another rating. These are informal friend ratings.")}</p>
    {message && <p role="status" className="mt-4 text-sm">{t(message)}</p>}
  </section>;
}
