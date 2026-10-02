"use client";
import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";

export function SocialShare({ url, text }: { url: string; text: string }) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  async function copy(content: string) {
    try { await navigator.clipboard.writeText(content); setMessage(t("Copied. Paste it into your post or chat.")); }
    catch { setMessage(t("Copy the link and message below.")); }
  }
  async function share() {
    try { if (navigator.share) await navigator.share({ title: text, text, url }); else await copy(`${text}\n${url}`); }
    catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setMessage(t("Copy the link and message below.")); }
  }
  return <div className="mt-4 space-y-3">
    <label className="block text-xs font-bold">{t("Public sharing link")}<input value={url} readOnly onFocus={event => event.target.select()} className="mt-2 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm" /></label>
    <p className="text-sm leading-6 text-ink/65">{text}</p>
    <div className="flex flex-wrap gap-2"><button type="button" className="button-primary" onClick={() => void share()}>{t("Share")}</button><button type="button" className="button-secondary" onClick={() => void copy(url)}>{t("WeChat / Copy link")}</button><button type="button" className="button-secondary" onClick={() => void copy(`${text}\n${url}`)}>{t("Copy post text")}</button><a className="button-secondary" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a><a className="button-secondary" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">X</a></div>
    <p className="text-xs text-ink/50">{t("For Facebook, copy the post text and paste it into the share window.")}</p>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
