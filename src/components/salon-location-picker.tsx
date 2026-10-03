"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { locationFromDevice, type SalonLocation } from "../../shared/salon-location";
import type { MapStatus } from "./salon-location-map";

const LocationMap = dynamic(() => import("./salon-location-map"), { ssr: false });
const actionClass = "rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold transition hover:border-coral hover:text-coral disabled:opacity-50";

export function SalonLocationPicker({ value, onChange, disabled }: {
  value: SalonLocation | null; onChange: (pin: SalonLocation | null) => void; disabled: boolean;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<SalonLocation | null>(value);
  const [showMap, setShowMap] = useState(false);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requestId = useRef(0);
  const onPick = useCallback((pin: SalonLocation) => { requestId.current += 1; setLocating(false); setError(""); setDraft(pin); setPending(true); }, []);
  useEffect(() => () => { requestId.current += 1; }, []);

  function locate() {
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) { setError(t("Location is unavailable in this browser. Choose a point on the map or save your address first.")); return; }
    const id = ++requestId.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      if (id !== requestId.current) return;
      setLocating(false);
      try { setDraft(locationFromDevice(position.coords)); setPending(true); setShowMap(true); }
      catch { setError(t("Could not read a valid location. Choose a point on the map or save your address first.")); }
    }, failure => {
      if (id !== requestId.current) return;
      setLocating(false);
      setError(t(failure.code === 1 ? "Location permission was denied. You can choose a point on the map or save your address first." : "Location could not be obtained. Try near the salon entrance, choose a point on the map or save your address first."));
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
  }

  return <div className="space-y-4 rounded-xl border border-ink/10 bg-ivory/50 p-4" aria-busy={locating} inert={disabled}>
    <div><h4 className="text-sm font-semibold">{t("Pin your salon location (optional)")}</h4><p className="mt-2 text-xs leading-6 text-ink/60">{t("At the salon, use your phone location or open the map and mark the entrance. Confirm the point before submitting. You can save your address first and add a location later.")}</p></div>
    <p className="text-xs leading-6 text-ink/60">{t("Opening the map connects to OpenStreetMap and shares your IP and the map area being viewed. Device location is requested only when you press the location button.")}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={disabled || locating} className={actionClass} onClick={locate}>{locating ? t("Getting your location…") : t("I am at the salon · locate me")}</button>
      <button type="button" disabled={disabled} className={actionClass} onClick={() => setShowMap(current => !current)}>{showMap ? t("Close map") : t("Open free map")}</button>
    </div>
    {error && <p role="alert" className="text-sm leading-6 text-red-700">{error}</p>}
    {showMap && <>
      <LocationMap value={draft} onPick={onPick} onStatus={setMapStatus} />
      {mapStatus !== "ready" && <p role="status" className="text-xs leading-6 text-ink/60">{t(mapStatus === "loading" ? "Loading map…" : "Map tiles could not be fully loaded. You can still confirm your device location or save your address first.")}</p>}
    </>}
    {draft && <div className="space-y-3">
      <p role="status" className="text-sm leading-6">{t(pending ? "Selected point · awaiting confirmation" : "Confirmed salon location")}<br /><span className="font-mono text-xs">{t("Latitude")}: {draft.latitude.toFixed(6)} · {t("Longitude")}: {draft.longitude.toFixed(6)}</span>{draft.accuracyMeters !== undefined && <><br /><span className="text-xs text-ink/60">{t("Device location accuracy: approximately {meters} m", { meters: Math.ceil(draft.accuracyMeters) })}</span></>}</p>
      {draft.accuracyMeters !== undefined && draft.accuracyMeters > 100 && <p className="text-xs leading-6 text-ink/60">{t("This location is approximate. Try again near the entrance or adjust the pin on the map.")}</p>}
      {pending && <button type="button" disabled={disabled || (draft.source === "map" && mapStatus !== "ready")} className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-coral disabled:opacity-50" onClick={() => { onChange(draft); setPending(false); }}>{t("Confirm this is my salon entrance")}</button>}
      <button type="button" disabled={disabled} className="ml-3 text-xs font-semibold underline underline-offset-4" onClick={() => { requestId.current += 1; setLocating(false); setDraft(null); setPending(false); setShowMap(false); onChange(null); }}>{t("Remove location")}</button>
    </div>}
    {pending && <p className="text-xs leading-6 text-ink/60">{t("The new point is not confirmed. Only your previously confirmed location, if any, will be saved with the application.")}</p>}
    <p className="text-xs leading-6 text-ink/60">{t("Changing the salon region or street address clears the confirmed location. Confirm it again after editing the address.")}</p>
  </div>;
}
