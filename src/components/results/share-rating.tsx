"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function ShareRating({ token, count: initialCount, average: initialAverage }: { token: string; count: number; average: number }) {
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
      if (response.status === 401) { setNeedsSignIn(true); setMessage("Sign in to submit your rating. / 登录后即可评分。"); return; }
      if (!response.ok) throw new Error(body.error ?? "Could not submit your rating.");
      setScore(value); setSummary(body); setNeedsSignIn(false); setMessage("Thanks! Your rating is saved. / 评分已保存，谢谢！");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not submit your rating."); }
    finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-2xl bg-white p-6 text-center">
    <h2 className="font-display text-2xl">Does this look suit me? / 这个发型适合我吗？</h2>
    <p className="mt-2 text-sm text-ink/55">{summary.count ? `${summary.average.toFixed(1)} / 5 · ${summary.count} ratings` : "Be the first to rate this look / 来打第一个分吧"}</p>
    <div className="mt-5 flex justify-center gap-2" role="group" aria-label="Rate this hairstyle from 1 to 5">
      {[1, 2, 3, 4, 5].map(value => <button type="button" key={value} disabled={busy} aria-pressed={score === value} aria-label={`Rate ${value} out of 5`} onClick={() => void rate(value)} className={`flex size-12 flex-col items-center justify-center rounded-xl border transition hover:border-coral focus-visible:outline-2 focus-visible:outline-coral disabled:opacity-50 ${score && value <= score ? "border-coral bg-coral/10 text-coral" : "border-ink/15 text-ink/50"}`}><Star className="size-5" fill={score && value <= score ? "currentColor" : "none"} /><span className="text-xs">{value}</span></button>)}
    </div>
    <p className="mt-4 text-xs leading-5 text-ink/45">1 = not quite · 5 = love it. One rating per signed-in account; you can change your score.<br />1 分不太适合，5 分非常喜欢。每个账号一份评分，可以修改。</p>
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    {needsSignIn && <a className="button-primary mt-4" href={`/sign-in?redirect_url=${encodeURIComponent(`/share/${token}`)}`}>Sign in to rate / 登录评分</a>}
  </section>;
}
