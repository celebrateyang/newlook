"use client";

/* eslint-disable @next/next/no-img-element -- R2 result URLs are private, short-lived signatures and must bypass the image optimizer cache. */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Check, CheckCircle2, ImagePlus, ImageUp, LayoutGrid, LoaderCircle, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import type { HairAnalysis } from "@/lib/ai/hair-analysis";
import { STARTER_HAIRSTYLES, type StarterHairstyleSlug } from "@/lib/hairstyles/catalog";
import type { HomeHistory } from "@/lib/home/history";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 10 * 1024 * 1024;
type Stage = "idle" | "authorizing" | "uploading" | "saving" | "analyzing" | "complete";
type DiscoveryMode = "choose" | "recommend" | "browse" | "reference";

async function responseError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  return `${fallback} (${response.status})`;
}

export function SelfieUploader({ initialHistory }: { initialHistory?: HomeHistory }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | undefined>(undefined);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string | undefined>(initialHistory?.sourceUrl);
  const [imageAspectRatio, setImageAspectRatio] = useState(
    initialHistory?.sourceWidth && initialHistory.sourceHeight
      ? initialHistory.sourceWidth / initialHistory.sourceHeight
      : 4 / 5,
  );
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>();
  const [error, setError] = useState<string>();
  const [stage, setStage] = useState<Stage>("idle");
  const [analysis, setAnalysis] = useState<HairAnalysis>();
  const [mode, setMode] = useState<DiscoveryMode>("choose");
  const [uploadedKey, setUploadedKey] = useState<string | undefined>(initialHistory?.sourceKey);
  const [sourceMimeType, setSourceMimeType] = useState<(typeof acceptedTypes)[number] | undefined>(initialHistory?.sourceMimeType);
  const [generatingStyle, setGeneratingStyle] = useState<StarterHairstyleSlug>();
  const [referenceFile, setReferenceFile] = useState<File>();
  const [referencePreview, setReferencePreview] = useState<string>();
  const [referenceDimensions, setReferenceDimensions] = useState<{ width: number; height: number }>();
  const [referenceUploadedKey, setReferenceUploadedKey] = useState<string>();
  const [copyHairColor, setCopyHairColor] = useState(false);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceStatus, setReferenceStatus] = useState<string>();
  const [generatedResult, setGeneratedResult] = useState<{ url: string; styleName: string; styleSlug?: StarterHairstyleSlug; generationId: string } | undefined>(
    initialHistory?.resultUrl && initialHistory.generationId
      ? {
          url: initialHistory.resultUrl,
          styleName: initialHistory.styleName ?? "Your latest hairstyle",
          styleSlug: STARTER_HAIRSTYLES.find((style) => style.slug === initialHistory.styleSlug)?.slug,
          generationId: initialHistory.generationId,
        }
      : undefined,
  );

  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (referencePreview?.startsWith("blob:")) URL.revokeObjectURL(referencePreview); }, [referencePreview]);

  function choose(next?: File) {
    setError(undefined); setAnalysis(undefined); setMode("choose"); setUploadedKey(undefined); setSourceMimeType(undefined); setGeneratedResult(undefined); setStage("idle");
    if (!next) return;
    if (!acceptedTypes.includes(next.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (next.size > maxBytes) return setError("Your photo must be smaller than 10 MB.");
    if (preview) URL.revokeObjectURL(preview);
    selectedFileRef.current = next;
    setImageAspectRatio(4 / 5);
    setImageDimensions(undefined);
    setFile(next); setPreview(URL.createObjectURL(next));
    void createImageBitmap(next).then((bitmap) => {
      if (selectedFileRef.current === next && bitmap.width > 0 && bitmap.height > 0) {
        setImageAspectRatio(bitmap.width / bitmap.height);
        setImageDimensions({ width: bitmap.width, height: bitmap.height });
      }
      bitmap.close();
    }).catch(() => undefined);
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    selectedFileRef.current = undefined;
    if (referencePreview?.startsWith("blob:")) URL.revokeObjectURL(referencePreview);
    setFile(undefined); setPreview(undefined); setImageAspectRatio(4 / 5); setImageDimensions(undefined); setAnalysis(undefined); setMode("choose"); setUploadedKey(undefined); setSourceMimeType(undefined); setGeneratedResult(undefined); setError(undefined); setStage("idle");
    setReferenceFile(undefined); setReferencePreview(undefined); setReferenceDimensions(undefined); setReferenceUploadedKey(undefined); setCopyHairColor(false); setReferenceStatus(undefined);
    if (inputRef.current) inputRef.current.value = "";
    if (referenceInputRef.current) referenceInputRef.current.value = "";
  }

  function chooseReference(next?: File) {
    setError(undefined);
    if (!next) return;
    if (!acceptedTypes.includes(next.type)) return setError("Choose a JPG, PNG or WebP reference image.");
    if (next.size > maxBytes) return setError("Your reference image must be smaller than 10 MB.");
    if (referencePreview?.startsWith("blob:")) URL.revokeObjectURL(referencePreview);
    setReferenceFile(next); setReferencePreview(URL.createObjectURL(next)); setReferenceDimensions(undefined); setReferenceUploadedKey(undefined);
    void createImageBitmap(next).then((bitmap) => {
      if (bitmap.width > 0 && bitmap.height > 0) setReferenceDimensions({ width: bitmap.width, height: bitmap.height });
      bitmap.close();
    }).catch(() => undefined);
  }

  async function ensureUploaded() {
    if (uploadedKey && sourceMimeType) return { key: uploadedKey, mimeType: sourceMimeType };
    if (!file) throw new Error("Choose a selfie before continuing.");

    setStage("authorizing");
    const authorization = await fetch("/api/r2/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "original", mimeType: file.type, size: file.size }) });
    if (authorization.status === 401) { router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`); return undefined; }
    if (!authorization.ok) throw new Error(await responseError(authorization, "Could not authorize the upload"));
    const upload = await authorization.json() as { uploadUrl: string; key: string };

    setStage("uploading");
    const uploaded = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!uploaded.ok) throw new Error(`R2 upload failed (${uploaded.status}). Check the bucket CORS policy and token permissions.`);

    setStage("saving");
    const completed = await fetch("/api/uploads/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "original", key: upload.key, mimeType: file.type, size: file.size, ...imageDimensions }) });
    if (!completed.ok) throw new Error(await responseError(completed, "Could not save the upload"));
    setUploadedKey(upload.key);
    setSourceMimeType(file.type);
    return { key: upload.key, mimeType: file.type };
  }

  async function recommend() {
    if (!preview || busy) return;
    setError(undefined); setAnalysis(undefined); setMode("recommend");
    try {
      const source = await ensureUploaded();
      if (!source) return;
      setStage("analyzing");
      const analyzed = await fetch("/api/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(source) });
      if (!analyzed.ok) throw new Error(await responseError(analyzed, "Analysis failed"));
      const result = await analyzed.json() as { analysis: HairAnalysis };
      setAnalysis(result.analysis); setStage("complete");
      requestAnimationFrame(() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (cause) {
      setStage("idle"); setMode("choose"); setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    }
  }

  async function browse() {
    if (!preview || busy) return;
    setError(undefined); setAnalysis(undefined); setMode("browse");
    try {
      const source = await ensureUploaded();
      if (!source) return;
      setStage("complete");
      requestAnimationFrame(() => document.getElementById("hairstyle-library")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (cause) {
      setStage("idle"); setMode("choose"); setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    }
  }

  async function reference() {
    if (!preview || busy || referenceBusy) return;
    setError(undefined); setAnalysis(undefined); setMode("reference");
    try {
      const source = await ensureUploaded();
      if (!source) return;
      setStage("complete");
      requestAnimationFrame(() => document.getElementById("reference-transfer")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (cause) {
      setStage("idle"); setMode("choose"); setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    }
  }

  async function generateReference() {
    if (!uploadedKey || !referenceFile || referenceBusy) return;
    setError(undefined); setReferenceBusy(true); setGeneratedResult(undefined);
    try {
      let referenceUploadKey = referenceUploadedKey;
      if (!referenceUploadKey) {
        setReferenceStatus("Preparing the reference upload…");
        const authorization = await fetch("/api/r2/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "reference", mimeType: referenceFile.type, size: referenceFile.size }) });
        if (!authorization.ok) throw new Error(await responseError(authorization, "Could not authorize the reference upload"));
        const upload = await authorization.json() as { uploadUrl: string; key: string };

        setReferenceStatus("Uploading the reference privately…");
        const uploaded = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": referenceFile.type }, body: referenceFile });
        if (!uploaded.ok) throw new Error(`Reference upload failed (${uploaded.status}). Check the bucket CORS policy.`);

        setReferenceStatus("Securing the reference photo…");
        const completed = await fetch("/api/uploads/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "reference", key: upload.key, mimeType: referenceFile.type, size: referenceFile.size, ...referenceDimensions }) });
        if (!completed.ok) throw new Error(await responseError(completed, "Could not save the reference upload"));
        referenceUploadKey = upload.key;
        setReferenceUploadedKey(upload.key);
      }

      setReferenceStatus("Applying the reference hairstyle…");
      const response = await fetch("/api/generations/reference", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadKey: uploadedKey, referenceUploadKey, copyHairColor }) });
      if (!response.ok) throw new Error(await responseError(response, "Reference transfer failed"));
      const result = await response.json() as { generationId: string; styleName: string; results: Array<{ url: string }> };
      const first = result.results[0];
      if (!first) throw new Error("The image provider returned no result");
      setGeneratedResult({ url: first.url, styleName: result.styleName, generationId: result.generationId });
      requestAnimationFrame(() => document.getElementById("try-on-preview")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Reference transfer failed. Please try again.");
    } finally {
      setReferenceBusy(false); setReferenceStatus(undefined);
    }
  }

  async function generate(styleSlug: StarterHairstyleSlug) {
    if (!uploadedKey || generatingStyle) return;
    setError(undefined); setGeneratedResult(undefined); setGeneratingStyle(styleSlug);
    try {
      const response = await fetch("/api/generations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadKey: uploadedKey, styleSlug }) });
      if (!response.ok) throw new Error(await responseError(response, "Generation failed"));
      const result = await response.json() as { generationId: string; styleName: string; results: Array<{ url: string }> };
      const first = result.results[0];
      if (!first) throw new Error("The image provider returned no result");
      setGeneratedResult({ url: first.url, styleName: result.styleName, styleSlug, generationId: result.generationId });
      requestAnimationFrame(() => document.getElementById("try-on-preview")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed. Please try again.");
    } finally {
      setGeneratingStyle(undefined);
    }
  }

  const busy = stage !== "idle" && stage !== "complete";
  const status = stage === "authorizing" ? "Preparing your upload…" : stage === "uploading" ? "Uploading privately…" : stage === "saving" ? "Securing your photo…" : stage === "analyzing" ? "Finding your best matches…" : undefined;

  return <section aria-label="Hairstyle advisor" className="advisor-workspace">
    <input ref={inputRef} type="file" accept={acceptedTypes.join(",")} className="sr-only" onChange={(event) => choose(event.target.files?.[0])} />
    <input ref={referenceInputRef} type="file" accept={acceptedTypes.join(",")} className="sr-only" onChange={(event) => chooseReference(event.target.files?.[0])} />
    <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
      <div id="try-on-preview" className="scroll-mt-4 rounded-[1.6rem] bg-white p-4 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-5">
        <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-ink/40">{preview && !file ? "Your latest photo" : "Step 1"}</p><h2 className="mt-1 text-lg font-bold">{preview && !file ? "Continue with your saved selfie" : "Upload one clear selfie"}</h2></div>{preview && <button onClick={reset} disabled={busy} type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/50 hover:text-ink disabled:opacity-50"><RotateCcw className="size-3.5" /> {file ? "Replace" : "Use a new photo"}</button>}</div>
        {preview ? <div className="relative overflow-hidden rounded-[1.2rem] bg-ink/[.06]" style={{ aspectRatio: imageAspectRatio }}><Image src={preview} alt="Selected selfie preview" fill className="object-contain object-center" unoptimized /></div> : <button type="button" onClick={() => inputRef.current?.click()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()} className="group flex min-h-80 w-full flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-ink/20 bg-clay/35 px-5 text-center transition hover:border-coral hover:bg-clay/60 lg:min-h-[360px]">
          <span className="mb-5 grid size-16 place-items-center rounded-full bg-coral text-white transition group-hover:scale-105"><ImagePlus className="size-7" /></span><span className="text-lg font-bold">Choose your photo</span><span className="mt-2 text-sm text-ink/50">or drop it here</span><span className="mt-5 text-xs text-ink/40">JPG, PNG or WebP · Max 10 MB</span>
        </button>}
        {status && <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-clay px-4 py-3 text-sm font-bold text-ink/65"><LoaderCircle className="size-4 animate-spin" /> {status}</div>}
        {!preview && <div className="mt-4 grid gap-2 text-xs text-ink/55"><span className="inline-flex items-center gap-2"><Check className="size-3.5 text-deep-sage" /> Face and hair clearly visible</span><span className="inline-flex items-center gap-2"><Check className="size-3.5 text-deep-sage" /> Front-facing, natural light, no filter</span></div>}
      </div>

      <div className="rounded-[1.6rem] bg-white p-4 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-ink/40">{generatedResult ? "Your try-on" : "Example result"}</p><h2 className="mt-1 text-lg font-bold">{generatedResult?.styleName ?? "See the change before the cut"}</h2></div>{generatedResult && <div className="flex items-center gap-2"><span className="hidden rounded-full bg-sage/15 px-3 py-1.5 text-xs font-bold text-deep-sage sm:block">AI preview</span><button type="button" onClick={() => router.push(`/results/${generatedResult.generationId}`)} className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-2 text-xs font-bold text-white hover:bg-ink">Open result <ArrowRight className="size-3.5" /></button></div>}</div>
        {generatedResult ? <div className="grid overflow-hidden rounded-[1.2rem] bg-ink/[.06] sm:grid-cols-2"><div className="relative border-b border-white/70 sm:border-b-0 sm:border-r" style={{ aspectRatio: imageAspectRatio }}>{preview && <Image src={preview} alt="Original selfie" fill className="object-contain object-center" unoptimized />}<ImageLabel>Original</ImageLabel></div><button type="button" onClick={() => router.push(`/results/${generatedResult.generationId}`)} className="group relative cursor-zoom-in" style={{ aspectRatio: imageAspectRatio }} aria-label="Open full result"><img src={generatedResult.url} alt={`${generatedResult.styleName} hairstyle preview`} className="size-full object-contain object-center" /><ImageLabel>Preview</ImageLabel><span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink opacity-0 shadow-sm transition group-hover:opacity-100">View details</span></button></div> : <div className="relative overflow-hidden rounded-[1.2rem] bg-clay"><Image src="/example-before-after.png" alt="Example showing the same person before and after a realistic layered haircut" width={1536} height={1024} priority className="aspect-[3/2] w-full object-cover" /><div className="pointer-events-none absolute inset-0 grid grid-cols-2"><div className="relative"><ImageLabel>Before</ImageLabel></div><div className="relative"><ImageLabel>After</ImageLabel></div></div></div>}
        <div className="mt-4 grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-3"><ProofPoint title="Personal matches" copy="Based on your face and hair" /><ProofPoint title="Identity preserved" copy="Only the hairstyle changes" /><ProofPoint title="Salon realistic" copy="Built for achievable cuts" /></div>
      </div>
    </div>

    {error && <p role="alert" className="mt-4 rounded-xl bg-butter/55 px-4 py-3 text-sm leading-6 text-ink/70">{error}</p>}
    {preview && <DiscoveryChoices mode={mode} busy={busy || referenceBusy || Boolean(generatingStyle)} onRecommend={recommend} onBrowse={browse} onReference={reference} />}
    {mode === "recommend" && analysis && <AnalysisResult analysis={analysis} generatingStyle={generatingStyle} selectedStyle={generatedResult?.styleSlug} onGenerate={generate} />}
    {mode === "browse" && uploadedKey && !busy && <BrowseCatalog generatingStyle={generatingStyle} selectedStyle={generatedResult?.styleSlug} onGenerate={generate} />}
    {mode === "reference" && uploadedKey && !busy && <ReferenceTransferPanel preview={referencePreview} copyHairColor={copyHairColor} busy={referenceBusy} status={referenceStatus} onChoose={() => referenceInputRef.current?.click()} onDrop={chooseReference} onCopyHairColor={setCopyHairColor} onGenerate={generateReference} />}
    <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink/45"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="size-3.5" /> Private by default</span><span className="inline-flex items-center gap-1.5"><Camera className="size-3.5" /> One selfie is enough</span><span>One free preview</span></div>
  </section>;
}

function DiscoveryChoices({ mode, busy, onRecommend, onBrowse, onReference }: { mode: DiscoveryMode; busy: boolean; onRecommend(): void; onBrowse(): void; onReference(): void }) {
  return <section className="mt-6 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7" aria-labelledby="discovery-heading">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Step 2</p><h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl" id="discovery-heading">How do you want to find your look?</h2></div><p className="max-w-md text-sm leading-6 text-ink/50">Not sure? Start with a personal recommendation. You can switch paths at any time.</p></div>
    <div className="mt-5 grid gap-3 lg:grid-cols-3">
      <button type="button" disabled={busy} onClick={onRecommend} className={`group flex min-h-48 flex-col rounded-2xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-60 ${mode === "recommend" ? "border-coral bg-coral/[.08]" : "border-coral/30 bg-clay/45 hover:-translate-y-0.5 hover:border-coral"}`}>
        <span className="grid size-10 place-items-center rounded-full bg-coral text-white"><Sparkles className="size-5" /></span><h3 className="mt-5 text-lg font-bold">Recommend styles for me</h3><p className="mt-2 text-sm leading-6 text-ink/55">Analyse my face and current hair, then explain which styles suit me and why.</p><span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-bold text-coral">{mode === "recommend" && busy ? <><LoaderCircle className="size-3.5 animate-spin" /> Analysing</> : <>Find my matches <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></>}</span>
      </button>
      <button type="button" disabled={busy} onClick={onBrowse} className={`group flex min-h-48 flex-col rounded-2xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-60 ${mode === "browse" ? "border-coral bg-coral/[.08]" : "border-ink/10 bg-clay/25 hover:-translate-y-0.5 hover:border-coral/55"}`}>
        <span className="grid size-10 place-items-center rounded-full bg-ink text-white"><LayoutGrid className="size-5" /></span><h3 className="mt-5 text-lg font-bold">Browse styles myself</h3><p className="mt-2 text-sm leading-6 text-ink/55">Explore the starter hairstyle library and choose exactly which look to try.</p><span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-bold text-coral">{mode === "browse" && busy ? <><LoaderCircle className="size-3.5 animate-spin" /> Preparing</> : <>Browse hairstyles <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></>}</span>
      </button>
      <button type="button" disabled={busy} onClick={onReference} className={`group flex min-h-48 flex-col rounded-2xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-60 ${mode === "reference" ? "border-coral bg-coral/[.08]" : "border-ink/10 bg-clay/25 hover:-translate-y-0.5 hover:border-coral/55"}`}>
        <span className="grid size-10 place-items-center rounded-full bg-clay text-ink/60"><ImageUp className="size-5" /></span><h3 className="mt-5 text-lg font-bold">Use a reference photo</h3><p className="mt-2 text-sm leading-6 text-ink/55">Upload a celebrity, social, or salon photo. NewLook copies only the hairstyle—not the person.</p><span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-bold text-coral">{mode === "reference" && busy ? <><LoaderCircle className="size-3.5 animate-spin" /> Preparing</> : <>Add a reference <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></>}</span>
      </button>
    </div>
  </section>;
}

function ReferenceTransferPanel({ preview, copyHairColor, busy, status, onChoose, onDrop, onCopyHairColor, onGenerate }: { preview?: string; copyHairColor: boolean; busy: boolean; status?: string; onChoose(): void; onDrop(file?: File): void; onCopyHairColor(value: boolean): void; onGenerate(): void }) {
  return <section className="mt-6 scroll-mt-4 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7" id="reference-transfer" aria-labelledby="reference-heading">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Reference transfer</p><h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl" id="reference-heading">Bring a hairstyle you already love</h2></div><p className="max-w-md text-sm leading-6 text-ink/50">Use a celebrity, social, or salon photo. We use only its hairstyle as the reference.</p></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <div>
        {preview ? <div className="relative overflow-hidden rounded-2xl bg-clay/45"><img src={preview} alt="Selected hairstyle reference" className="max-h-[440px] min-h-72 w-full object-contain" /><span className="absolute bottom-3 left-3 rounded-full bg-ink/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-white">Hairstyle reference</span></div> : <button type="button" onClick={onChoose} onDrop={(event) => { event.preventDefault(); onDrop(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()} className="group flex min-h-80 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-clay/30 px-6 text-center transition hover:border-coral hover:bg-clay/55">
          <span className="grid size-14 place-items-center rounded-full bg-coral text-white"><ImageUp className="size-6" /></span><span className="mt-5 text-lg font-bold">Choose a reference photo</span><span className="mt-2 text-sm text-ink/50">or drop it here</span><span className="mt-5 text-xs text-ink/40">JPG, PNG or WebP · Max 10 MB</span>
        </button>}
        {preview && <button type="button" disabled={busy} onClick={onChoose} className="button-secondary mt-3 w-full disabled:opacity-50"><RotateCcw className="size-4" /> Replace reference</button>}
      </div>
      <div className="flex flex-col rounded-2xl bg-clay/35 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-ink/40">What NewLook transfers</p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-ink/65"><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-deep-sage" /> Silhouette, length, bangs, layering, parting, volume and texture</li><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-deep-sage" /> Your face, expression, body, clothes and background stay unchanged</li><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-deep-sage" /> The person in the reference photo is never copied</li></ul>
        <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink/10 bg-white p-4"><span><span className="block text-sm font-bold">Copy hair color</span><span className="mt-1 block text-xs leading-5 text-ink/45">Off by default. Leave this off to keep your current color.</span></span><input type="checkbox" checked={copyHairColor} disabled={busy} onChange={(event) => onCopyHairColor(event.target.checked)} className="size-5 accent-coral" /></label>
        <button type="button" disabled={!preview || busy} onClick={onGenerate} className="button-primary mt-auto w-full disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{status ?? "Try this reference hairstyle"}</button>
        <p className="mt-3 text-center text-xs leading-5 text-ink/40">AI previews can differ from the reference. Your stylist should assess what is achievable with your current hair.</p>
      </div>
    </div>
  </section>;
}

function BrowseCatalog({ generatingStyle, selectedStyle, onGenerate }: { generatingStyle?: StarterHairstyleSlug; selectedStyle?: StarterHairstyleSlug; onGenerate(style: StarterHairstyleSlug): void }) {
  return <section className="mt-6 scroll-mt-4 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7" id="hairstyle-library" aria-labelledby="library-heading">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Hairstyle library</p><h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl" id="library-heading">Choose a style to try on</h2></div><p className="max-w-md text-sm leading-6 text-ink/50">These starter styles cover different lengths and silhouettes. Select one to generate it on your photo.</p></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{STARTER_HAIRSTYLES.map((style, index) => {
      const isGenerating = generatingStyle === style.slug;
      const isSelected = selectedStyle === style.slug;
      return <button type="button" key={style.slug} disabled={Boolean(generatingStyle)} onClick={() => onGenerate(style.slug)} className={`group flex min-h-56 flex-col rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:border-coral/55 hover:shadow-[0_16px_40px_rgba(224,102,78,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:hover:translate-y-0 ${isSelected ? "border-coral bg-coral/[.06]" : "border-ink/10 bg-clay/30"}`} aria-label={`Generate a ${style.name} preview`}>
        <div className="flex w-full items-center justify-between gap-3"><span className="font-mono text-xs text-ink/30">0{index + 1}</span><span className="rounded-full bg-ink/[.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink/45">{style.category}</span></div>
        <h3 className="mt-6 font-display text-2xl">{style.name}</h3><p className="mt-2 text-sm leading-6 text-ink/55">{style.summary}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-bold text-coral">{isGenerating ? <><LoaderCircle className="size-3.5 animate-spin" /> Generating</> : isSelected ? <><CheckCircle2 className="size-3.5" /> Preview shown</> : <>Try this style <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></>}</span>
      </button>;
    })}</div>
  </section>;
}

function ImageLabel({ children }: { children: React.ReactNode }) {
  return <span className="absolute bottom-3 left-3 rounded-full bg-ink/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-white backdrop-blur">{children}</span>;
}

function ProofPoint({ title, copy }: { title: string; copy: string }) {
  return <div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-ink/45">{copy}</p></div>;
}

function AnalysisResult({ analysis, generatingStyle, selectedStyle, onGenerate }: { analysis: HairAnalysis; generatingStyle?: StarterHairstyleSlug; selectedStyle?: StarterHairstyleSlug; onGenerate(style: StarterHairstyleSlug): void }) {
  const metrics = [["Face shape", analysis.faceShape], ["Hair length", analysis.hairLength], ["Density", analysis.hairDensity], ["Texture", analysis.texture], ["Thickness", analysis.thickness], ["Crown volume", analysis.crownVolume]];
  return <div className="mt-6 scroll-mt-4 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7" id="recommendations">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Your results</p><h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Hairstyles worth trying first</h2></div><p className="max-w-md text-sm leading-6 text-ink/50">We considered your visible face proportions and current hair—not just what is trending.</p></div>
    <p className="mt-4 text-xs font-semibold text-ink/45">Select a match to generate its preview.</p>
    <div className="mt-3 grid gap-3 lg:grid-cols-3">{analysis.recommendations.map((item, index) => {
      const styleSlug = item.styleSlug ?? STARTER_HAIRSTYLES.find((style) => style.name === item.name)?.slug;
      const isGenerating = Boolean(styleSlug && generatingStyle === styleSlug);
      const isSelected = Boolean(styleSlug && selectedStyle === styleSlug);
      return <button type="button" disabled={Boolean(generatingStyle) || !styleSlug} onClick={() => { if (styleSlug) onGenerate(styleSlug); }} className="group flex min-h-64 flex-col rounded-2xl border border-transparent bg-clay/45 p-5 text-left transition hover:-translate-y-0.5 hover:border-coral/55 hover:bg-coral/[.06] hover:shadow-[0_16px_40px_rgba(224,102,78,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:hover:translate-y-0" key={styleSlug ?? item.name} aria-label={`Generate a ${item.name} preview`}>
        <div className="flex w-full items-center justify-between gap-3"><span className="font-mono text-xs text-ink/35">0{index + 1}</span><span className="rounded-full bg-sage/15 px-2.5 py-1 text-xs font-bold text-deep-sage">{item.matchScore}% match</span></div>
        <h3 className="mt-7 font-display text-2xl">{item.name}</h3><p className="mt-2 text-sm leading-6 text-ink/55">{item.reason}</p>
        <div className="mt-auto flex w-full items-end justify-between gap-3 pt-5"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/35">{item.maintenance} maintenance</span><span className="inline-flex items-center gap-1.5 text-xs font-bold text-coral">{isGenerating ? <><LoaderCircle className="size-3.5 animate-spin" /> Generating</> : isSelected ? <><CheckCircle2 className="size-3.5" /> Preview shown</> : <>Try this style <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></>}</span></div>
      </button>;
    })}</div>
    <details className="mt-6 border-t border-ink/10 pt-5"><summary className="cursor-pointer text-sm font-bold">View my hair profile</summary><p className="mt-4 max-w-3xl text-sm leading-6 text-ink/55">{analysis.faceSummary}</p><dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{metrics.map(([label, value]) => <div className="rounded-xl bg-clay/45 p-3" key={label}><dt className="text-[9px] font-bold uppercase tracking-wider text-ink/35">{label}</dt><dd className="mt-1 text-sm font-bold capitalize">{value}</dd></div>)}</dl><p className="mt-4 text-xs leading-5 text-ink/40">{analysis.disclaimer}</p></details>
  </div>;
}
