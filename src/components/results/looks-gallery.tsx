"use client";
/* eslint-disable @next/next/no-img-element -- private R2 images use short-lived owner-only signed URLs. */
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Check, Share2 } from "lucide-react";
import Link, { useLocalizedRouter } from "@/components/localized-link";
import { useI18n, useLocalizedFetch } from "@/components/i18n-provider";
import { localizedPath } from "@/lib/i18n/locale";
import { SocialShare } from "./social-share";

type Look = { resultId: string; generationId: string; name: string; nameZh: string; view: string; createdAt: number; url: string };
type Poll = { token: string; active: boolean; title: string; count: number; createdAt: number };
export function LooksGallery() {
  const { t, locale } = useI18n(), fetch = useLocalizedFetch(), router = useLocalizedRouter();
  const [looks, setLooks] = useState<Look[]>([]), [selected, setSelected] = useState<string[]>([]), [polls, setPolls] = useState<Poll[]>([]);
  const [loadError, setLoadError] = useState(""), [settingsError, setSettingsError] = useState("");
  const [cursor, setCursor] = useState<string | null>(null), [done, setDone] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [title, setTitle] = useState(""), [shared, setShared] = useState(""), [origin, setOrigin] = useState("");
  const load = useCallback((nextCursor: string | null, signal?: AbortSignal) => {
    return fetch(`/api/looks${nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ""}`, { cache: "no-store", signal }).then(async response => {
      if (response.status === 401) { router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`); return undefined; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load your hairstyles.");
      return data as { items: Look[]; cursor: string; isDone: boolean };
    }).then(data => {
      if (!data || signal?.aborted) return;
      setLoadError(""); setOrigin(window.location.origin);
      setLooks(previous => nextCursor ? [...previous, ...data.items.filter(item => !previous.some(old => old.resultId === item.resultId))] : data.items);
      setCursor(data.cursor); setDone(data.isDone);
    }).catch(error => { if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : "Could not load your hairstyles."); })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }, [fetch, router]);
  const loadPolls = useCallback((signal?: AbortSignal) => {
    return fetch("/api/polls", { cache: "no-store", signal }).then(async response => {
      if (!response.ok) throw new Error("Could not load sharing settings.");
      return await response.json() as Poll[];
    }).then(data => { if (!signal?.aborted) { setPolls(data); setSettingsError(""); } });
  }, [fetch]);
  useEffect(() => {
    const controller = new AbortController();
    void load(null, controller.signal);
    void loadPolls(controller.signal).catch(error => { if (!controller.signal.aborted) setSettingsError(error.message); });
    return () => controller.abort();
  }, [load, loadPolls]);
  function toggle(id: string) {
    setMessage("");
    if (selected.includes(id)) setSelected(previous => previous.filter(item => item !== id));
    else if (selected.length < 6) setSelected(previous => [...previous, id]);
    else setMessage("Select up to 6 looks.");
  }
  async function create() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/polls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resultIds: selected, title }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create your sharing page.");
      setShared(data.token); setSelected([]);
      await loadPolls();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create your sharing page."); }
    finally { setBusy(false); }
  }
  async function disable(token: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/polls/${token}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not turn off sharing.");
      if (shared === token) setShared("");
      await loadPolls(); setMessage("Sharing is off. The previous link is no longer available.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not turn off sharing."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{t("YOUR SAVED LOOKS")}</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">{t("My hairstyles")}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">{t("Browse all your saved results. Select 2–6 looks and ask friends to help you choose.")}</p></div><Link href="/upload" className="button-secondary">{t("New try-on")}</Link></div>
    <section className="mt-7 rounded-3xl border border-ink/10 bg-white p-5 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><Share2 className="size-5 text-coral" />{t("Help me choose a hairstyle")}</h2><p className="mt-2 text-sm leading-6 text-ink/60">{t("Only selected generated images become public. Anyone with the link can view and save them; original photos stay private.")}</p><label className="mt-4 block text-xs font-bold">{t("Question for your friends (optional)")}<input maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder={t("Which hairstyle suits me best?")} className="mt-2 w-full rounded-xl border border-ink/15 p-3 text-sm" /></label><div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void create()} disabled={selected.length < 2 || busy} className="button-primary disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Share2 className="size-4" />}{t("Create comparison link")} ({selected.length}/6)</button><button type="button" className="text-sm font-semibold underline disabled:opacity-40" disabled={!selected.length || busy} onClick={() => setSelected([])}>{t("Clear selection")}</button></div></section>
    {shared && <section className="mt-5 rounded-3xl bg-white p-5"><h2 className="text-lg font-bold">{t("Your sharing page is ready")}</h2><img src={`/api/polls/${shared}/image?locale=${locale}&shape=square`} alt={t("Hairstyle comparison preview")} className="mt-4 w-full max-w-xl rounded-xl" /><SocialShare url={`${origin}${localizedPath(`/poll/${shared}`, locale)}`} text={t("I tried a few hairstyles on newself. Which suits me best? Rate each look and help me choose!")} /><Link href={`/poll/${shared}`} className="mt-4 inline-block text-sm font-bold text-coral underline">{t("Open rating page")}</Link></section>}
    {loadError && <div role="alert" className="mt-5 rounded-xl bg-butter/60 p-4 text-sm"><p>{t(loadError)}</p><button type="button" className="mt-2 font-bold underline" disabled={loading} onClick={() => { setLoading(true); void load(cursor); }}>{t("Try again")}</button></div>}
    {settingsError && <p role="status" className="mt-5 rounded-xl bg-butter/60 p-4 text-sm">{t(settingsError)}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-butter/60 p-4 text-sm">{t(message)}</p>}
    <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{looks.map(look => <article key={look.resultId} className="overflow-hidden rounded-2xl border border-ink/10 bg-white"><button type="button" disabled={busy} aria-pressed={selected.includes(look.resultId)} aria-label={t("Select {style}", { style: locale === "zh" ? look.nameZh : look.name })} onClick={() => toggle(look.resultId)} className="group relative block w-full focus-visible:outline-2 focus-visible:outline-coral"><img src={look.url} loading="lazy" alt={locale === "zh" ? look.nameZh : look.name} className="aspect-[4/5] w-full bg-clay/30 object-contain" /><span className={`absolute right-3 top-3 grid size-7 place-items-center rounded-full border shadow-sm ${selected.includes(look.resultId) ? "border-coral bg-coral text-white" : "border-ink/25 bg-white"}`}>{selected.includes(look.resultId) && <Check className="size-4" />}</span>{selected.includes(look.resultId) && <span className="absolute left-3 top-3 rounded-full bg-white px-2 py-1 text-xs font-bold">{String.fromCharCode(65 + selected.indexOf(look.resultId))}</span>}</button><div className="p-4"><h2 className="text-sm font-bold">{locale === "zh" ? look.nameZh : look.name}</h2><p className="mt-1 text-xs text-ink/50">{t(look.view === "side" ? "Side" : "Front")} · {new Date(look.createdAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}</p><Link href={`/results/${look.generationId}`} className="mt-3 inline-block text-xs font-bold text-coral underline">{t("View full result")}</Link></div></article>)}</div>
    {loading ? <p role="status" className="mt-7 flex items-center justify-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin" />{t("Loading…")}</p> : !looks.length && !loadError ? <div className="py-12 text-center"><p>{t("No saved hairstyles yet.")}</p><Link href="/upload" className="button-primary mt-5">{t("Try my hairstyle")}</Link></div> : !done && !loadError && <button type="button" className="button-secondary mx-auto mt-7 flex" onClick={() => { setLoading(true); setMessage(""); void load(cursor); }}>{t("Load more")}</button>}
    {!!polls.length && <section className="mt-12"><h2 className="font-display text-3xl">{t("My sharing pages")}</h2><div className="mt-5 space-y-3">{polls.map(poll => <div key={poll.token} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5"><div><p className="font-bold">{poll.title || t("Which hairstyle suits me best?")}</p><p className="mt-1 text-xs text-ink/50">{t("{count} looks", { count: poll.count })} · {t(poll.active ? "Sharing on" : "Sharing off")}</p></div>{poll.active && <div className="flex flex-wrap gap-3"><button className="text-sm font-bold text-coral underline" type="button" onClick={() => { setShared(poll.token); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("Share")}</button><Link className="text-sm font-bold text-coral underline" href={`/poll/${poll.token}`}>{t("View ratings")}</Link><button type="button" className="text-sm underline disabled:opacity-50" disabled={busy} onClick={() => void disable(poll.token)}>{t("Turn off sharing")}</button></div>}</div>)}</div></section>}
  </div>;
}
