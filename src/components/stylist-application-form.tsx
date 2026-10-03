"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "@/components/localized-link";
import { useI18n, useLocalizedFetch } from "@/components/i18n-provider";
import { stylistApplicationSchema, stylistSpecialties, type StylistApplicationInput } from "../../convex/stylistApplicationFields";
import { changeRegion, citiesForProvince, provinces, resolveLegacyRegion } from "../../shared/regions";
import { SalonLocationPicker } from "./salon-location-picker";

const specialtyLabels = { cut: "Precision cuts", short: "Short hair", layers: "Layered cuts", perm: "Perms", color: "Hair color", men: "Men's hair", curly: "Natural curls" };
const empty: StylistApplicationInput = { name: "", phone: "", wechat: "", provinceCode: "", cityCode: "", districtCode: "", salon: "", address: "", location: null, experienceYears: 0, specialties: [], portfolioUrl: "", introduction: "", consent: true };
const inputClass = "mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/20";
const buttonClass = "rounded-full bg-coral px-6 py-3 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-wait disabled:opacity-50";

export function StylistApplicationForm({ signedIn, available }: { signedIn: boolean; available: boolean }) {
  const { t, locale } = useI18n();
  const fetch = useLocalizedFetch();
  const [data, setData] = useState(empty);
  const [consent, setConsent] = useState(false);
  const [hasApplication, setHasApplication] = useState(false);
  const [loading, setLoading] = useState(signedIn && available);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const load = useCallback((signal?: AbortSignal) => {
    return fetch("/api/stylist-application", { cache: "no-store", signal }).then(async response => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then(({ application }) => {
      if (signal?.aborted) return;
      setHasApplication(Boolean(application));
      setData(application ? { ...empty, ...application, ...(!application.provinceCode ? resolveLegacyRegion(application.city, application.district) : {}) } : empty);
      setConsent(Boolean(application));
    }).catch(() => {
      if (!signal?.aborted) setLoadFailed(true);
    }).finally(() => { if (!signal?.aborted) setLoading(false); });
  }, [fetch]);
  useEffect(() => {
    if (!signedIn || !available) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [signedIn, available, load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage("");
    const parsed = stylistApplicationSchema.safeParse({ ...data, consent });
    if (!parsed.success) { setError(t("Check your details, select at least one specialty and agree to the application notice.")); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/stylist-application", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!response.ok) throw new Error();
      const { application } = await response.json();
      setData(application); setHasApplication(true); setConfirmWithdraw(false);
      setMessage(t("Application saved. You can return here to update or withdraw it."));
      statusRef.current?.focus();
    } catch { setError(t("Could not save your application. Your entries are still here. Please try again.")); }
    finally { setBusy(false); }
  }

  async function withdraw() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/stylist-application", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setData(empty); setConsent(false); setHasApplication(false); setConfirmWithdraw(false);
      setMessage(t("Application withdrawn and your application details deleted."));
      statusRef.current?.focus();
    } catch { setError(t("Could not withdraw your application. Please try again.")); }
    finally { setBusy(false); }
  }

  if (!available) return <p role="status" className="rounded-2xl bg-clay p-6 text-sm leading-7">{t("Applications are temporarily unavailable. Please return later.")}</p>;
  if (!signedIn) return <div className="rounded-2xl bg-clay p-6"><p className="mb-5 text-sm leading-7">{t("Sign in to submit your application and manage your details privately.")}</p><Link href={`/sign-in?redirect_url=${encodeURIComponent(`/${locale}/stylists`)}`} className={buttonClass}>{t("Sign in to apply")}</Link></div>;
  if (loading) return <p role="status" className="py-6 text-sm">{t("Loading your application…")}</p>;
  if (loadFailed) return <div role="alert" className="rounded-2xl bg-clay p-6"><p className="mb-4 text-sm">{t("Could not load your application. Please try again.")}</p><button type="button" className={buttonClass} onClick={() => { setLoading(true); setLoadFailed(false); void load(); }}>{t("Retry")}</button></div>;

  const fields = [
    ["name", "Your name", "text", 50, true], ["phone", "Mainland China mobile number", "tel", 11, true],
    ["wechat", "WeChat ID (optional)", "text", 50, false], ["portfolioUrl", "Portfolio link (optional, HTTPS)", "url", 500, false],
  ] as const;
  const cities = citiesForProvince(data.provinceCode);
  const districts = cities.find(city => city.code === data.cityCode)?.children ?? [];
  const regionFields = [
    { key: "provinceCode", label: "Province / municipality", placeholder: "Select province / municipality", options: provinces, disabled: false },
    { key: "cityCode", label: "Service city", placeholder: "Select city", options: cities, disabled: !data.provinceCode },
    { key: "districtCode", label: "District / county / town", placeholder: "Select district / county / town", options: districts, disabled: !data.cityCode },
  ] as const;
  return <form onSubmit={submit} className="space-y-6" aria-busy={busy}>
    <p ref={statusRef} tabIndex={-1} role="status" className="rounded-xl bg-clay p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-coral">{message || (hasApplication ? t("Application received · recruitment stage") : t("First recruitment · mainland China"))}</p>
    <fieldset disabled={busy} className="space-y-6">
      <legend className="sr-only">{t("Application details")}</legend>
      <div className="grid gap-5 sm:grid-cols-2">{fields.map(([key, label, type, maxLength, required]) => <label key={key} className="block text-sm font-semibold" htmlFor={`stylist-${key}`}>{t(label)}{required && <span aria-hidden="true" className="ml-1 text-coral">*</span>}<input id={`stylist-${key}`} name={key} type={type} required={required} maxLength={maxLength} value={data[key]} pattern={key === "phone" ? "1[3-9][0-9]{9}" : undefined} autoComplete={key === "name" ? "name" : key === "phone" ? "tel-national" : "off"} className={inputClass} onChange={event => setData(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
      <fieldset aria-describedby="stylist-location-help" className="space-y-4">
        <legend className="text-sm font-semibold">{t("Salon location")}</legend>
        <p id="stylist-location-help" className="text-xs leading-6 text-ink/60">{t("Select the region where your salon is located, then enter the street and building number. This helps us identify your service location accurately.")}</p>
        <div className="grid gap-5 sm:grid-cols-3">{regionFields.map(({ key, label, placeholder, options, disabled }) => <label key={key} htmlFor={`stylist-${key}`} className="min-w-0 text-sm font-semibold">{t(label)}<span aria-hidden="true" className="ml-1 text-coral">*</span><select id={`stylist-${key}`} name={key} required disabled={disabled} value={data[key]} className={`${inputClass} disabled:bg-ivory disabled:text-ink/40`} onChange={event => setData(current => ({ ...current, ...changeRegion(current, key, event.target.value), location: null }))}><option value="">{t(placeholder)}</option>{options.map(option => <option key={option.code} value={option.code} lang="zh-CN">{option.name}</option>)}</select></label>)}</div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label htmlFor="stylist-salon" className="block text-sm font-semibold">{t("Salon name")}<span aria-hidden="true" className="ml-1 text-coral">*</span><input id="stylist-salon" name="salon" required maxLength={100} value={data.salon} className={inputClass} onChange={event => setData(current => ({ ...current, salon: event.target.value }))} /></label>
          <label htmlFor="stylist-address" className="block text-sm font-semibold">{t("Street address and building number")}<span aria-hidden="true" className="ml-1 text-coral">*</span><input id="stylist-address" name="address" required maxLength={200} autoComplete="street-address" placeholder={t("Street, building number, floor / unit")} value={data.address} className={inputClass} onChange={event => setData(current => ({ ...current, address: event.target.value, location: null }))} /></label>
        </div>
      </fieldset>
      <SalonLocationPicker key={`${data.provinceCode}:${data.cityCode}:${data.districtCode}:${data.address}`} value={data.location ?? null} disabled={busy} onChange={location => setData(current => ({ ...current, location }))} />
      <label className="block text-sm font-semibold" htmlFor="stylist-experience">{t("Years of experience")}<input id="stylist-experience" name="experienceYears" type="number" min={0} max={60} step={1} required value={Number.isNaN(data.experienceYears) ? "" : data.experienceYears} className={inputClass} onChange={event => setData(current => ({ ...current, experienceYears: event.target.value === "" ? NaN : Number(event.target.value) }))} /></label>
      <fieldset><legend className="mb-3 text-sm font-semibold">{t("Specialties (select at least one)")}</legend><div className="flex flex-wrap gap-3">{stylistSpecialties.map(value => <label key={value} className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm"><input type="checkbox" className="size-4 accent-coral" checked={data.specialties.includes(value)} onChange={event => setData(current => ({ ...current, specialties: event.target.checked ? [...current.specialties, value] : current.specialties.filter(item => item !== value) }))} />{t(specialtyLabels[value])}</label>)}</div></fieldset>
      <label htmlFor="stylist-introduction" className="block text-sm font-semibold">{t("Tell us about your work (optional)")}<textarea id="stylist-introduction" name="introduction" rows={4} maxLength={1000} value={data.introduction} className={inputClass} onChange={event => setData(current => ({ ...current, introduction: event.target.value }))} /></label>
      <p className="text-xs leading-6 text-ink/60">{t("Only share portfolio links you have permission to share. Do not include private client photos or identity documents.")}</p>
      <div className="rounded-xl bg-ivory p-4 text-sm leading-7"><label className="flex items-start gap-3"><input required type="checkbox" checked={consent} className="mt-1.5 size-4 shrink-0 accent-coral" onChange={event => setConsent(event.target.checked)} /><span>{t("I confirm these details are accurate and agree that newself may store them and contact me about stylist recruitment. Submitting does not mean approval or guarantee orders.")}</span></label><Link href="/privacy" className="ml-7 underline underline-offset-4">{t("Privacy Policy")}</Link></div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center gap-4"><button type="submit" disabled={busy} className={buttonClass}>{busy ? t("Saving…") : hasApplication ? t("Update application") : t("Submit application")}</button>{hasApplication && <button type="button" disabled={busy} onClick={() => setConfirmWithdraw(true)} className="text-sm font-semibold underline underline-offset-4">{t("Withdraw application")}</button>}</div>
    {confirmWithdraw && <div className="rounded-xl border border-ink/15 p-4"><p className="mb-3 text-sm leading-6">{t("Withdraw and delete your application details? You can apply again later.")}</p><div className="flex gap-5"><button type="button" disabled={busy} onClick={() => void withdraw()} className="text-sm font-bold text-red-700">{t("Confirm withdrawal")}</button><button type="button" disabled={busy} onClick={() => setConfirmWithdraw(false)} className="text-sm font-semibold">{t("Keep application")}</button></div></div>}
  </form>;
}
