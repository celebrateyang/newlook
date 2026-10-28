"use client";
/* eslint-disable @next/next/no-img-element -- original and generated images use private signed access. */
import { useEffect, useState } from "react";
import { useI18n, useLocalizedFetch } from "../i18n-provider";
import Link from "../localized-link";
export function PreviewQuality({ generationId, resultId, sourceUrl, resultUrl }: { generationId: string; resultId: string; sourceUrl?: string; resultUrl: string }) {
  const { t } = useI18n(), fetch = useLocalizedFetch();
  const [verdict, setVerdict] = useState<string>(), [compare, setCompare] = useState(false), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { const controller = new AbortController(); void fetch(`/api/generations/${generationId}/quality?resultId=${encodeURIComponent(resultId)}`, { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(data => { if (!controller.signal.aborted) setVerdict(data?.verdict); }).catch(() => undefined); return () => controller.abort(); }, [fetch, generationId, resultId]);
  async function save(value: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/generations/${generationId}/quality`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resultId, verdict: value }) });
      if (!response.ok) throw new Error();
      setVerdict(value); setMessage("Your review was saved. This is your feedback, not an automatic quality certification.");
    } catch { setMessage("Could not save your review. Please retry."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-2xl border border-ink/10 p-4"><h3 className="font-bold">{t("Check this preview before using it")}</h3><p className="mt-2 text-sm leading-6 text-ink/60">{t("Compare eyes, nose, jaw, expression and hairline with your original. AI can change facial details or invent hair volume; we do not automatically certify identity or salon feasibility.")}</p>{sourceUrl && <><button type="button" className="mt-3 text-sm font-bold text-coral underline" aria-expanded={compare} onClick={() => setCompare(!compare)}>{t(compare ? "Hide original comparison" : "Compare with original")}</button>{compare && <div className="mt-4 grid grid-cols-2 gap-3"><figure><img src={sourceUrl} alt={t("Original selfie")} className="aspect-[4/5] w-full rounded-xl bg-clay/30 object-contain" /><figcaption className="mt-2 text-xs">{t("Original")}</figcaption></figure><figure><img src={resultUrl} alt={t("AI hairstyle preview")} className="aspect-[4/5] w-full rounded-xl bg-clay/30 object-contain" /><figcaption className="mt-2 text-xs">{t("AI preview")}</figcaption></figure></div>}</>}<div className="mt-4 flex flex-wrap gap-2">{[["usable", "Looks usable to me"], ["face_changed", "My face changed"], ["hair_unrealistic", "The hair looks unrealistic"]].map(([value, label]) => <button key={value} type="button" disabled={busy} aria-pressed={verdict === value} onClick={() => void save(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${verdict === value ? "border-coral bg-coral/10" : "border-ink/15"}`}>{t(label)}</button>)}</div>{verdict && verdict !== "usable" && <p className="mt-4 text-sm leading-6">{t("Use a clearer photo or try another preview. A new generation uses one daily attempt.")} <Link href="/#discovery-heading" className="font-bold text-coral underline">{t("Try another preview")}</Link></p>}{message && <p role="status" className="mt-3 text-xs leading-5 text-ink/65">{t(message)}</p>}</section>;
}
