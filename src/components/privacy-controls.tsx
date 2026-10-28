"use client";
/* eslint-disable @next/next/no-img-element -- owner-only thumbnails use short-lived private signatures. */
import { useCallback, useEffect, useState } from "react";
import { useI18n, useLocalizedFetch } from "./i18n-provider";
import Link, { useLocalizedRouter } from "./localized-link";

type Scope = "upload" | "generation" | "media" | "account";
export function DeleteMediaButton({ scope, id, onDeleted }: { scope: Scope; id?: string; onDeleted?(): void }) {
  const { t } = useI18n(), fetch = useLocalizedFetch(), router = useLocalizedRouter();
  const [confirming, setConfirming] = useState(false), [confirmation, setConfirmation] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function remove() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/privacy", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, id, confirm: confirmation }) });
      const data = await response.json();
      if (response.status === 401) { router.push("/sign-in"); return; }
      if (!response.ok) throw new Error(data.error ?? "Could not request deletion.");
      // Remove this browser's cached face/hair assessments and signed media state.
      try { for (const key of Object.keys(sessionStorage)) if (key.startsWith("newself:analysis:") || key.startsWith("newlook:analysis:")) sessionStorage.removeItem(key); } catch { /* Private browsing can block storage; deletion has already been accepted. */ }
      setMessage(data.accountDeleted ? "Your account was deleted. Stored-file cleanup is queued." : "Access and sharing were removed. Stored-file cleanup is queued.");
      setConfirming(false); setConfirmation(""); onDeleted?.(); router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not request deletion."); }
    finally { setBusy(false); }
  }
  const label = scope === "account" ? "Delete account and data" : scope === "media" ? "Delete all photos and results" : scope === "generation" ? "Delete this hairstyle" : "Delete photo and related results";
  return <div className="text-sm"><button type="button" className="font-semibold text-red-800 underline underline-offset-4 disabled:opacity-50" disabled={busy} onClick={() => setConfirming(true)}>{t(label)}</button>{confirming && <div className="mt-3 space-y-3 rounded-xl border border-red-800/20 bg-white p-4 text-ink"><p>{t("This permanently removes the selected data from your account and turns off affected sharing links. Copies saved elsewhere cannot be recalled. Stored-file cleanup may take longer; existing signed links can work until cleanup or expiry.")}</p><label className="block">{t("Type DELETE to confirm")}<input autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 block w-full rounded-lg border border-ink/20 p-2" /></label><div className="flex flex-wrap gap-4"><button type="button" className="rounded-full bg-red-800 px-4 py-2 font-bold text-white disabled:opacity-40" disabled={busy || confirmation !== "DELETE"} onClick={() => void remove()}>{t(busy ? "Requesting deletion…" : "Confirm deletion")}</button><button type="button" disabled={busy} className="font-semibold underline" onClick={() => { setConfirming(false); setConfirmation(""); }}>{t("Cancel")}</button></div></div>}{message && <p role="status" className="mt-3 leading-6">{t(message)}</p>}</div>;
}

export function PrivacyControls() {
  const { t, locale } = useI18n(), fetch = useLocalizedFetch();
  const [data, setData] = useState<{ uploads: { id: string; type: string; createdAt: number; url?: string }[]; pendingFiles: number; retryingFiles: number }>(), [error, setError] = useState("");
  const load = useCallback((signal?: AbortSignal) => fetch("/api/privacy", { cache: "no-store", signal }).then(async response => {
    if (response.status === 401) throw new Error("Sign in to manage your photos and results.");
    if (!response.ok) throw new Error("Could not load photo privacy settings.");
    return response.json();
  }).then(value => { if (!signal?.aborted) { setData(value); setError(""); } }).catch(cause => { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Could not load photo privacy settings."); }), [fetch]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  return <section className="mx-auto max-w-3xl space-y-7 px-5 py-12"><div><h1 className="font-display text-4xl">{t("Photo privacy and deletion")}</h1><p className="mt-4 leading-7 text-ink/65">{t("Manage original selfies, reference photos, side photos and saved results. Deleting a photo also removes results that depend on it. Deleting a hairstyle keeps your original photo and other hairstyles.")}</p></div>{error && <div role="alert"><p>{t(error)}</p><Link href="/sign-in" className="underline">{t("Sign in")}</Link><button type="button" className="ml-4 underline" onClick={() => void load()}>{t("Try again")}</button></div>}{data && <><p role="status">{t("{count} stored files pending cleanup", { count: data.pendingFiles })}</p>{data.retryingFiles > 0 && <p role="status" className="rounded-xl bg-butter/50 p-4">{t("Some file deletions are retrying. Refresh to check progress; contact hello@newself.cc if they remain pending.")}</p>}<ul className="space-y-3">{data.uploads.map(upload => <li key={upload.id} className="space-y-3 rounded-xl border border-ink/10 bg-white p-4">{upload.url && <img src={upload.url} alt={t("Private uploaded photo")} loading="lazy" className="h-36 w-28 rounded-lg bg-clay/30 object-contain" />}<p className="font-semibold">{t(upload.type === "original" ? "Original selfie" : upload.type === "side" ? "Side photo" : "Reference photo")} · {new Date(upload.createdAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}</p><DeleteMediaButton scope="upload" id={upload.id} onDeleted={() => void load()} /></li>)}</ul><div className="space-y-4 border-t border-ink/15 pt-6"><DeleteMediaButton scope="media" onDeleted={() => void load()} /><DeleteMediaButton scope="account" /></div><button type="button" onClick={() => void load()} className="font-semibold underline">{t("Refresh cleanup status")}</button></>}<p className="text-sm leading-6 text-ink/60">{t("Unused uploads and unfinished files are scheduled for cleanup after 7 days. Photos supporting a saved result stay until you delete them or the result no longer needs them.")}</p><Link href="/privacy" className="text-sm underline">{t("Privacy Policy")}</Link></section>;
}
