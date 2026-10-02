"use client";
import { useI18n, useLocalizedFetch } from "@/components/i18n-provider";

import { useState } from "react";
import { Star } from "lucide-react";
import Link from "@/components/localized-link";
import { localizedPath } from "@/lib/i18n/locale";

export function ShareRating({ token, count: initialCount, average: initialAverage }: { token: string; count: number; average: number }) {
  const fetch = useLocalizedFetch();
  const { locale, t } = useI18n();
  const [summary, setSummary] = useState({ count: initialCount, average: initialAverage });
  const [score, setScore] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);

  async function rate(value: number) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/shares/${token}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score: value }) });
      const body = await response.json();
      if (response.status === 401) { setNeedsSignIn(true); setMessage(t("Sign in to submit your rating.")); return; }
      if (!response.ok) throw new Error(body.error ?? t("Could not submit your rating."));
      setScore(value); setSummary(body); setNeedsSignIn(false); setMessage(t("Thanks! Your rating is saved."));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t("Could not submit your rating.")); }
    finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-2xl bg-white p-6 text-center">
    <h2 className="font-display text-2xl">{t("Does this look suit me?")}</h2>
    <p className="mt-2 text-sm text-ink/55">{summary.count ? t("{average} / 5 · {count} ratings", { average: summary.average.toFixed(1), count: summary.count }) : t("Be the first to rate this look")}</p>
    <div className="mt-5 flex justify-center gap-2" role="group" aria-label={t("Rate this hairstyle from 1 to 5")}>
      {[1, 2, 3, 4, 5].map(value => <button type="button" key={value} disabled={busy} aria-pressed={score === value} aria-label={t("Rate {score} out of 5", { score: value })} onClick={() => void rate(value)} className={`flex size-12 flex-col items-center justify-center rounded-xl border transition hover:border-coral focus-visible:outline-2 focus-visible:outline-coral disabled:opacity-50 ${score && value <= score ? "border-coral bg-coral/10 text-coral" : "border-ink/15 text-ink/50"}`}><Star className="size-5" fill={score && value <= score ? "currentColor" : "none"} /><span className="text-xs">{value}</span></button>)}
    </div>
    <p className="mt-4 text-xs leading-5 text-ink/45">{t("1 = not quite · 5 = love it. One rating per signed-in account; you can change your score.")}</p>
    {message && <p role="status" className="mt-4 text-sm">{t(message)}</p>}
    {needsSignIn && <Link className="button-primary mt-4" href={`/sign-in?redirect_url=${encodeURIComponent(localizedPath(`/share/${token}`, locale))}`}>{t("Sign in to rate")}</Link>}
  </section>;
}
