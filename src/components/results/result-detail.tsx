"use client";

/* eslint-disable @next/next/no-img-element -- private signed R2 URLs must bypass the public image optimizer cache. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Download, Expand, FileDown, ImagePlus, LoaderCircle, Minus, Package, Plus, RotateCcw, Scissors, X } from "lucide-react";
import type { SalonGuide } from "@/lib/hairstyles/salon-guides";

type ResultView = { id: string; view: "front" | "side"; url: string };
type ResultData = {
  generationId: string;
  status: string;
  style: { slug: string; name: string };
  source: { width?: number; height?: number };
  reference?: { url: string };
  views: ResultView[];
  guide?: SalonGuide;
};

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 10 * 1024 * 1024;

async function errorMessage(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  return body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : fallback;
}

export function ResultDetail({ generationId }: { generationId: string }) {
  const router = useRouter();
  const sideInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const [data, setData] = useState<ResultData>();
  const [activeView, setActiveView] = useState<"front" | "side">("front");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sideBusy, setSideBusy] = useState(false);
  const [error, setError] = useState<string>();

  const fetchResult = useCallback(async () => {
    const response = await fetch(`/api/generations/${generationId}`, { cache: "no-store" });
    if (response.status === 401) { router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`); return undefined; }
    if (!response.ok) throw new Error(await errorMessage(response, "Could not load this result"));
    return await response.json() as ResultData;
  }, [generationId, router]);

  const load = useCallback(async () => {
    const result = await fetchResult();
    if (result) setData(result);
  }, [fetchResult]);

  useEffect(() => {
    let cancelled = false;
    void fetchResult().then((result) => { if (!cancelled && result) setData(result); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this result"); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchResult]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setLightboxOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [lightboxOpen]);

  const active = data?.views.find((view) => view.view === activeView) ?? data?.views[0];

  function openLightbox() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLightboxOpen(true);
  }

  function changeZoom(next: number) {
    const value = Math.min(4, Math.max(.75, next));
    setZoom(value);
    if (value <= 1) setPan({ x: 0, y: 0 });
  }

  async function addSidePhoto(file?: File) {
    if (!file || sideBusy) return;
    setError(undefined);
    if (!acceptedTypes.includes(file.type)) return setError("Choose a JPG, PNG or WebP side photo.");
    if (file.size > maxBytes) return setError("The side photo must be smaller than 10 MB.");
    setSideBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      const authorization = await fetch("/api/r2/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "side", mimeType: file.type, size: file.size }) });
      if (!authorization.ok) throw new Error(await errorMessage(authorization, "Could not authorize the side upload"));
      const upload = await authorization.json() as { uploadUrl: string; key: string };
      const uploaded = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploaded.ok) throw new Error("The side photo could not be uploaded. Check the R2 CORS policy.");
      const completed = await fetch("/api/uploads/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "side", key: upload.key, mimeType: file.type, size: file.size, ...dimensions }) });
      if (!completed.ok) throw new Error(await errorMessage(completed, "Could not save the side photo"));
      const generated = await fetch(`/api/generations/${generationId}/side`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadKey: upload.key }) });
      if (!generated.ok) throw new Error(await errorMessage(generated, "Could not generate the side preview"));
      await load();
      setActiveView("side"); setZoom(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the side preview");
    } finally {
      setSideBusy(false);
      if (sideInputRef.current) sideInputRef.current.value = "";
    }
  }

  if (loading) return <div className="grid min-h-[70vh] place-items-center"><div className="flex items-center gap-3 text-sm font-semibold text-ink/55"><LoaderCircle className="size-5 animate-spin" /> Loading your result…</div></div>;
  if (!data || error && !active) return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-4xl">Result unavailable</h1><p className="mt-4 text-ink/55">{error ?? "This result could not be found."}</p><Link href="/" className="button-primary mt-7">Return home</Link></div>;

  const hasSide = data.views.some((view) => view.view === "side");
  const isReferenceTransfer = Boolean(data.reference);
  return <><div className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-12">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
      <Link href="/#discovery-heading" className="order-1 inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/45 transition hover:text-ink focus-visible:text-ink lg:order-2 lg:mb-3 lg:ml-auto"><ArrowLeft className="size-4" /> Back to styles</Link>
      <div className="order-2 lg:order-1"><p className="eyebrow mb-2">YOUR SELECTED LOOK</p><h1 className="font-display text-4xl tracking-tight sm:text-5xl">{data.style.name}</h1></div>
      {!isReferenceTransfer && <a href={`/api/generations/${generationId}/bundle`} className="button-primary order-3 lg:mb-0 lg:ml-3"><Package className="size-4" /> Download salon pack</a>}
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-butter/60 px-4 py-3 text-sm text-ink/70">{error}</p>}

    <div className="mt-7 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
      <section className="rounded-[1.6rem] bg-white p-4 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-full bg-clay/60 p-1"><ViewTab active={activeView === "front"} onClick={() => { setActiveView("front"); setZoom(1); }}>Front</ViewTab><ViewTab active={activeView === "side"} disabled={!hasSide} onClick={() => { setActiveView("side"); setZoom(1); }}>Side</ViewTab></div>{active && <a className="inline-flex items-center gap-2 text-sm font-bold text-coral hover:text-ink" href={`/api/generations/${generationId}/download?resultId=${encodeURIComponent(active.id)}`}><Download className="size-4" /> Download this view (JPG)</a>}</div>
        {active ? <button type="button" onClick={openLightbox} className="group relative h-[min(68vh,720px)] min-h-[420px] w-full cursor-zoom-in overflow-hidden rounded-[1.2rem] bg-ink/[.06]" aria-label="Open image in full-screen viewer"><img src={active.url} alt={`${data.style.name} ${active.view} preview`} className="size-full object-contain object-center" /><span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-ink shadow-sm backdrop-blur transition group-hover:bg-coral group-hover:text-white"><Expand className="size-3.5" /> Open full screen</span></button> : <div className="grid min-h-[420px] place-items-center rounded-[1.2rem] bg-clay/40 text-sm text-ink/45">No image is available.</div>}

        {!isReferenceTransfer && <div className="mt-6 border-t border-ink/10 pt-6">
          <input ref={sideInputRef} type="file" accept={acceptedTypes.join(",")} className="sr-only" onChange={(event) => void addSidePhoto(event.target.files?.[0])} />
          <div className="flex flex-col justify-between gap-4 rounded-2xl bg-clay/45 p-5 sm:flex-row sm:items-center"><div><p className="font-bold">{hasSide ? "Replace the side view" : "Add an accurate side view"}</p><p className="mt-1 max-w-xl text-sm leading-6 text-ink/50">Upload a real side photo and we’ll apply this hairstyle from the same angle. Optional, but more useful for your stylist.</p></div><button type="button" disabled={sideBusy} onClick={() => sideInputRef.current?.click()} className="button-secondary shrink-0 disabled:cursor-wait disabled:opacity-60">{sideBusy ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{sideBusy ? "Creating side view…" : hasSide ? "Replace photo" : "Add side photo"}</button></div>
        </div>}
      </section>

      <aside className="rounded-[1.6rem] bg-ink p-6 text-ivory shadow-[0_24px_70px_rgba(53,43,35,.14)] sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">SALON GUIDE</p><h2 className="mt-2 font-display text-3xl">What to ask for</h2></div><span className="grid size-10 place-items-center rounded-full bg-white/10"><Scissors className="size-4" /></span></div>
        {data.guide ? <><p className="mt-5 text-sm leading-6 text-ivory/65">{data.guide.overview}</p><div className="mt-6 space-y-5">{data.guide.instructions.map((item) => <div key={item.label}><p className="text-xs font-bold uppercase tracking-wider text-ivory/40">{item.label}</p><p className="mt-1 text-sm leading-6 text-ivory/80">{item.detail}</p></div>)}</div><div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5"><div><p className="text-xs text-ivory/40">Daily styling</p><p className="mt-1 font-bold">~{data.guide.dailyStylingMinutes} minutes</p></div><div><p className="text-xs text-ivory/40">Maintenance</p><p className="mt-1 font-bold">Every {data.guide.maintenanceWeeks} weeks</p></div></div><div className="mt-6 rounded-xl bg-white/[.07] p-4 text-xs leading-5 text-ivory/55"><Check className="mr-1 inline size-3.5 text-sage" /> AI reference only. Your stylist should adjust measurements after assessing your actual hair.</div><a href={`/api/generations/${generationId}/guide`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-bold transition hover:bg-white hover:text-ink"><FileDown className="size-4" /> Download guide PDF</a></> : data.reference ? <><p className="mt-5 text-sm leading-6 text-ivory/60">This result transferred the hairstyle from your reference photo. A technical salon guide will require a later feasibility analysis.</p><div className="mt-5 overflow-hidden rounded-xl bg-white/10"><img src={data.reference.url} alt="Uploaded hairstyle reference" className="max-h-72 w-full object-contain" /></div><p className="mt-3 text-xs leading-5 text-ivory/45">Reference hairstyle only—the person in this image was not copied.</p></> : <p className="mt-5 text-sm text-ivory/60">The salon guide is unavailable for this style.</p>}
      </aside>
    </div>
  </div>
  {lightboxOpen && active && createPortal(<div role="dialog" aria-modal="true" aria-label={`${data.style.name} full-screen image viewer`} className="fixed left-0 top-0 z-[100] flex h-dvh w-screen flex-col overflow-hidden bg-[#11110f] text-white">
    <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-wider text-white/45">{active.view} preview</p><p className="font-bold">{data.style.name}</p></div><div className="flex items-center gap-2"><a href={`/api/generations/${generationId}/download?resultId=${encodeURIComponent(active.id)}`} className="hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold hover:bg-white hover:text-ink sm:inline-flex"><Download className="size-4" /> Download JPG</a><button type="button" onClick={() => setLightboxOpen(false)} aria-label="Close full-screen viewer" className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white hover:text-ink"><X className="size-5" /></button></div></div>
    <div className="relative min-h-0 flex-1 touch-none cursor-grab select-none overflow-hidden active:cursor-grabbing" onWheel={(event) => { event.preventDefault(); changeZoom(zoom + (event.deltaY < 0 ? .1 : -.1)); }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { active: true, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y }; }} onPointerMove={(event) => { const drag = dragRef.current; if (drag.active && zoom > 1) setPan({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }); }} onPointerUp={(event) => { dragRef.current.active = false; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { dragRef.current.active = false; }}><img draggable={false} src={active.url} alt={`${data.style.name} ${active.view} preview enlarged`} className="pointer-events-none absolute inset-0 size-full object-contain object-center will-change-transform" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, transformOrigin: "center" }} /></div>
    <div className="flex h-16 shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-black/20 px-4"><DarkIconButton label="Zoom out" onClick={() => changeZoom(zoom - .25)}><Minus /></DarkIconButton><span className="min-w-16 text-center text-xs font-bold text-white/65">{Math.round(zoom * 100)}%</span><DarkIconButton label="Zoom in" onClick={() => changeZoom(zoom + .25)}><Plus /></DarkIconButton><DarkIconButton label="Reset zoom" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw /></DarkIconButton></div>
  </div>, document.body)}
  </>;
}

function ViewTab({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick(): void; children: React.ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-full px-4 py-2 text-xs font-bold transition ${active ? "bg-white text-ink shadow-sm" : "text-ink/45 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"}`}>{children}</button>;
}

function DarkIconButton({ label, onClick, children }: { label: string; onClick(): void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:bg-white hover:text-ink [&>svg]:size-4">{children}</button>;
}
