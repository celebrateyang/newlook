"use client";
import { useI18n, useLocalizedFetch } from "@/components/i18n-provider";

import { useEffect, useState } from "react";
import { Copy, Share2, Star } from "lucide-react";
import { localizedPath } from "@/lib/i18n/locale";

type Share = { token: string; active: boolean; count: number; average: number };

export function ShareControls({ generationId, resultId }: { generationId: string; resultId: string }) {
  const fetch = useLocalizedFetch();
  const { locale, t } = useI18n();
  const endpoint = `/api/generations/${generationId}/share?resultId=${encodeURIComponent(resultId)}`;
  const [share, setShare] = useState<Share | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(endpoint, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(t("Could not load sharing settings."));
      const next = await response.json() as Share | null;
      if (!cancelled) { setShare(next); setUrl(next?.active ? `${window.location.origin}${localizedPath(`/share/${next.token}`, locale)}` : ""); setMessage(""); }
    }).catch(cause => { if (!cancelled) setMessage(cause instanceof Error ? cause.message : t("Sharing unavailable.")); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [endpoint, locale, t, fetch]);

  async function update(method: "POST" | "DELETE") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method });
      if (!response.ok) throw new Error(t("Could not update sharing. Please try again."));
      const next = await response.json() as Share;
      setShare(next); setUrl(next.active ? `${window.location.origin}${localizedPath(`/share/${next.token}`, locale)}` : "");
      setMessage(next.active ? t("Your public link is ready.") : t("Sharing is off. The previous link is no longer available."));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : t("Sharing unavailable.")); }
    finally { setBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage(t("Link copied. Paste it into WeChat or send it to friends.")); }
    catch { setMessage(t("Select the link below and copy it to share.")); }
  }

  async function nativeShare() {
    try {
      if (navigator.share) await navigator.share({ title: t("How does this hairstyle suit me?"), text: t("Rate my new look on newself!"), url });
      else await copy();
    } catch (cause) { if (!(cause instanceof Error && cause.name === "AbortError")) setMessage(t("Use Copy link to share this look.")); }
  }

  return <section className="mt-6 rounded-2xl border border-ink/10 bg-clay/30 p-5" aria-label={t("Share this hairstyle")}>
    <h2 className="flex items-center gap-2 text-lg font-bold"><Share2 className="size-5 text-coral" /> {" "}{t("Ask friends: does this suit me?")}</h2>
    <p className="mt-2 text-sm leading-6 text-ink/55">{t("Create a public link to this view and let friends rate it from 1–5. Your original selfie stays private. Anyone with the link can see and save this image.")}</p>
    {share?.active && url ? <>
      <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><Star className="size-4 text-coral" /> {share.count ? t("{average} / 5 · {count} ratings", { average: share.average.toFixed(1), count: share.count }) : t("Waiting for your first rating")}</p>
      <label className="mt-4 block text-xs font-bold" htmlFor={`share-link-${resultId}`}>{t("Public sharing link")}</label>
      <input id={`share-link-${resultId}`} value={url} readOnly onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm" />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="button-primary" onClick={() => void nativeShare()} disabled={busy}><Share2 className="size-4" /> {" "}{t("Share")}</button>
        <button type="button" className="button-secondary" onClick={() => void copy()} disabled={busy}><Copy className="size-4" /> {" "}{t("WeChat / Copy link")}</button>
        <a className="button-secondary" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</a>
        <a className="button-secondary" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(t("How does this hairstyle suit me? Rate my new look!"))}`}>X</a>
      </div>
      <button type="button" disabled={busy} onClick={() => void update("DELETE")} className="mt-4 text-sm font-semibold text-ink/55 underline hover:text-ink disabled:opacity-50">{t("Turn off sharing")}</button>
    </> : <button type="button" disabled={busy} onClick={() => void update("POST")} className="button-primary mt-4 disabled:opacity-50">{busy ? t("Loading…") : t("Create public rating link")}</button>}
    {message && <p role="status" className="mt-3 text-sm text-ink/60">{t(message)}</p>}
  </section>;
}
