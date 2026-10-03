"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "@/components/i18n-provider";
import { locationFromMap, type SalonLocation } from "../../shared/salon-location";
import { regionMapView } from "../../shared/regions/map-view";
import type { RegionSelection } from "../../shared/regions";

export type MapStatus = "loading" | "ready" | "error";

export default function SalonLocationMap({ value, region, onPick, onStatus }: {
  value: SalonLocation | null; onPick: (pin: SalonLocation) => void; onStatus: (status: MapStatus) => void;
  region: RegionSelection;
}) {
  const { t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const currentValue = useRef(value);
  const { provinceCode, cityCode, districtCode } = region;
  const initialView = useMemo(() => regionMapView({ provinceCode, cityCode, districtCode }), [provinceCode, cityCode, districtCode]);

  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    let loadingTimer: ReturnType<typeof setTimeout> | undefined;
    onStatus("loading");
    void import("leaflet").then(L => {
      if (cancelled || !container.current) return;
      const pin = currentValue.current;
      const view = initialView;
      const map = L.map(container.current, { scrollWheelZoom: false, attributionControl: true, worldCopyJump: true, zoomControl: false })
        .setView(pin ? [pin.latitude, pin.longitude] : view ? [view.latitude, view.longitude] : [35, 105], pin ? 18 : view?.zoom ?? 4);
      mapRef.current = map;
      L.control.zoom({ position: "topright", zoomInTitle: t("Zoom in"), zoomOutTitle: t("Zoom out") }).addTo(map);
      const tiles = L.tileLayer(process.env.NEXT_PUBLIC_OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, minZoom: 3, keepBuffer: 0, updateWhenIdle: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      });
      let failures = 0;
      tiles.on("loading", () => {
        failures = 0; clearTimeout(loadingTimer);
        if (!cancelled) onStatus("loading");
        loadingTimer = setTimeout(() => { if (!cancelled) onStatus("error"); }, 15_000);
      });
      tiles.on("load", () => { clearTimeout(loadingTimer); if (!cancelled) onStatus(failures ? "error" : "ready"); });
      tiles.on("tileerror", () => { failures += 1; if (!cancelled) onStatus("error"); });
      tiles.addTo(map);
      const marker = L.marker(pin ? [pin.latitude, pin.longitude] : [35, 105], {
        draggable: true, keyboard: true, title: t("Salon entrance"), alt: t("Salon entrance"),
        icon: L.divIcon({ className: "", html: '<span class="salon-map-pin" aria-hidden="true"></span>', iconSize: [28, 36], iconAnchor: [14, 36] }),
      });
      markerRef.current = marker;
      if (pin) marker.addTo(map);
      map.on("click", event => {
        if (map.getZoom() < 16) { map.setView(event.latlng, 16); return; }
        onPick(locationFromMap(event.latlng.lat, event.latlng.lng));
      });
      marker.on("dragend", () => { const point = marker.getLatLng(); onPick(locationFromMap(point.lat, point.lng)); });
      resize = new ResizeObserver(() => map.invalidateSize());
      resize.observe(container.current);
    }).catch(() => { if (!cancelled) onStatus("error"); });
    return () => { cancelled = true; clearTimeout(loadingTimer); resize?.disconnect(); mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  }, [initialView, onPick, onStatus, t]);

  useEffect(() => {
    currentValue.current = value;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!value) { marker.remove(); return; }
    marker.setLatLng([value.latitude, value.longitude]).addTo(map);
    if (!map.getBounds().contains(marker.getLatLng()) || (value.source === "geolocation" && map.getZoom() < 16)) {
      map.setView(marker.getLatLng(), 18);
    }
  }, [value]);

  return <div className="space-y-3">
    {!value && initialView && <p role="status" className="text-xs leading-6 text-ink/60">{t("Map starts near {region}. Zoom in and choose your salon entrance; this area center is not a saved location.", { region: initialView.name })}</p>}
    <div ref={container} role="region" aria-label={t("Choose your salon location on the map")} aria-describedby="salon-map-instructions" className="relative z-0 h-72 w-full rounded-xl border border-ink/15 bg-clay sm:h-80" />
    <p id="salon-map-instructions" className="text-xs leading-6 text-ink/60">{t("Zoom in to street level, then tap the salon entrance or drag the pin. With a keyboard, focus the map, use arrow keys to move and + / - to zoom, then choose the map center.")}</p>
    <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => {
      const map = mapRef.current;
      if (!map) return;
      if (map.getZoom() < 16) { map.setZoom(16); return; }
      const center = map.getCenter();
      onPick(locationFromMap(center.lat, center.lng));
    }}>{t("Choose map center")}</button>
  </div>;
}
