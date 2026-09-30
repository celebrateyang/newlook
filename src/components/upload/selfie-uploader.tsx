"use client";

/* eslint-disable @next/next/no-img-element -- R2 result URLs are private, short-lived signatures and must bypass the image optimizer cache. */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, Eye, EyeOff, ImagePlus, ImageUp, LayoutGrid, LoaderCircle, LockKeyhole, RotateCcw, Sparkles, ZoomIn } from "lucide-react";
import type { HairAnalysis } from "@/lib/ai/hair-analysis";
import { STARTER_HAIRSTYLES, type StarterHairstyleSlug } from "@/lib/hairstyles/catalog";
import type { HomeHistory } from "@/lib/home/history";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 10 * 1024 * 1024;
const analysisCacheLifetimeMs = 12 * 60 * 60 * 1000;
type Stage = "idle" | "authorizing" | "uploading" | "saving" | "analyzing" | "complete";
type DiscoveryMode = "choose" | "recommend" | "browse" | "reference";

function readCachedAnalysis(uploadKey?: string) {
  if (!uploadKey) return undefined;
  try {
    const cacheKey = `newself:analysis:${uploadKey}`;
    const legacyCacheKey = `newlook:analysis:${uploadKey}`;
    const raw = sessionStorage.getItem(cacheKey) ?? sessionStorage.getItem(legacyCacheKey);
    if (!raw) return undefined;
    const cached = JSON.parse(raw) as { expiresAt?: number; analysis?: HairAnalysis };
    if (!cached.expiresAt || cached.expiresAt <= Date.now() || !cached.analysis?.recommendations?.length) {
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(legacyCacheKey);
      return undefined;
    }
    return cached.analysis;
  } catch {
    return undefined;
  }
}

function cacheAnalysis(uploadKey: string, analysis: HairAnalysis) {
  try {
    sessionStorage.setItem(`newself:analysis:${uploadKey}`, JSON.stringify({ expiresAt: Date.now() + analysisCacheLifetimeMs, analysis }));
  } catch {
    // Recommendation rendering should still work when browser storage is unavailable.
  }
}

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
  const [photosVisible, setPhotosVisible] = useState(true);
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
    setFile(next); setPreview(URL.createObjectURL(next)); setPhotosVisible(true);
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
    setPhotosVisible(true);
    if (inputRef.current) inputRef.current.value = "";
    if (referenceInputRef.current) referenceInputRef.current.value = "";
  }

  function restoreSavedLook() {
    if (!initialHistory) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    selectedFileRef.current = undefined;
    setFile(undefined);
    setPreview(initialHistory.sourceUrl);
    setImageAspectRatio(initialHistory.sourceWidth && initialHistory.sourceHeight ? initialHistory.sourceWidth / initialHistory.sourceHeight : 4 / 5);
    setImageDimensions(initialHistory.sourceWidth && initialHistory.sourceHeight ? { width: initialHistory.sourceWidth, height: initialHistory.sourceHeight } : undefined);
    setUploadedKey(initialHistory.sourceKey);
    setSourceMimeType(initialHistory.sourceMimeType);
    setGeneratedResult(initialHistory.resultUrl && initialHistory.generationId ? {
      url: initialHistory.resultUrl,
      styleName: initialHistory.styleName ?? "Your latest hairstyle",
      styleSlug: STARTER_HAIRSTYLES.find((style) => style.slug === initialHistory.styleSlug)?.slug,
      generationId: initialHistory.generationId,
    } : undefined);
    setAnalysis(undefined);
    setMode("choose");
    setError(undefined);
    setStage("idle");
    setPhotosVisible(true);
    if (inputRef.current) inputRef.current.value = "";
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
    const cached = analysis ?? readCachedAnalysis(uploadedKey);
    setError(undefined); setMode("recommend");
    if (cached) {
      setAnalysis(cached); setStage("complete");
      requestAnimationFrame(() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    setStage("analyzing");
    requestAnimationFrame(() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    try {
      const source = await ensureUploaded();
      if (!source) return;
      setStage("analyzing");
      const analyzed = await fetch("/api/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(source) });
      if (!analyzed.ok) throw new Error(await responseError(analyzed, "Analysis failed"));
      const result = await analyzed.json() as { analysis: HairAnalysis };
      cacheAnalysis(source.key, result.analysis);
      setAnalysis(result.analysis); setStage("complete");
      requestAnimationFrame(() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (cause) {
      setStage("idle"); setMode("choose"); setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    }
  }

  async function browse() {
    if (!preview || busy) return;
    setError(undefined); setMode("browse");
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
    setError(undefined); setMode("reference");
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
    setError(undefined); setReferenceBusy(true);
    requestAnimationFrame(() => document.getElementById("try-on-preview")?.scrollIntoView({ behavior: "smooth", block: "center" }));
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
    setError(undefined); setGeneratingStyle(styleSlug);
    requestAnimationFrame(() => document.getElementById("try-on-preview")?.scrollIntoView({ behavior: "smooth", block: "center" }));
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
  const returningUser = Boolean(initialHistory?.sourceUrl && !file);
  const generationInProgress = Boolean(generatingStyle || referenceBusy);
  const workspaceBusy = busy || generationInProgress;
  const pendingStyleName = generatingStyle ? STARTER_HAIRSTYLES.find((style) => style.slug === generatingStyle)?.name ?? "hairstyle" : "reference hairstyle";
  const compactWorkspace = Boolean(preview && (returningUser || generatedResult || generationInProgress));
  const scrollToChoices = () => document.getElementById("discovery-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return <section aria-label="Hairstyle advisor" className="advisor-workspace">
    <input ref={inputRef} aria-label="Upload your selfie" type="file" accept={acceptedTypes.join(",")} className="sr-only" onChange={(event) => choose(event.target.files?.[0])} />
    <input ref={referenceInputRef} aria-label="Upload a hairstyle reference photo" type="file" accept={acceptedTypes.join(",")} className="sr-only" onChange={(event) => chooseReference(event.target.files?.[0])} />
    {compactWorkspace ? <div id="try-on-preview" className="scroll-mt-4 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7">
      <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-coral">{generationInProgress ? "Creating your preview" : returningUser ? "Welcome back" : "Your current look"}</p>
          <h2 className="mt-2 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{generationInProgress ? `Generating ${pendingStyleName}` : generatedResult ? generatedResult.styleName : "Continue with your saved selfie"}</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-ink/55">{generationInProgress ? "newself is changing only the hairstyle while preserving your face, expression, clothes and background." : generatedResult ? "Your latest preview is ready. Keep exploring with the same selfie or open the full result." : "Your selfie is ready. Choose how you want to find your next hairstyle."}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {generationInProgress ? <span role="status" aria-live="polite" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white"><LoaderCircle className="size-4 animate-spin" /> Generating preview…</span> : <button type="button" onClick={scrollToChoices} className="button-primary">Continue exploring <ArrowRight className="size-4" /></button>}
            {generatedResult && !generationInProgress && <button type="button" onClick={() => router.push(`/results/${generatedResult.generationId}`)} className="button-secondary">View full result</button>}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-ink/50">
            <button type="button" onClick={() => setPhotosVisible((visible) => !visible)} className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">{photosVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {photosVisible ? "Hide photos" : "Reveal photos"}</button>
            <button type="button" onClick={reset} disabled={workspaceBusy} className="inline-flex items-center gap-1.5 transition-colors hover:text-ink disabled:opacity-50"><RotateCcw className="size-3.5" /> Change selfie</button>
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs leading-5 text-ink/40"><LockKeyhole className="size-3.5 shrink-0" /> Stored privately and shown only through signed access.</p>
        </div>
        <div className={`relative grid overflow-hidden rounded-[1.25rem] bg-ink/[.06] ${generatedResult || generationInProgress ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="relative aspect-[4/3] overflow-hidden" aria-label="Original selfie">
            {preview && <Image src={preview} alt="Original selfie" fill className={`object-contain object-center transition duration-300 ${photosVisible ? "" : "scale-105 blur-xl"}`} unoptimized />}
            <ImageLabel>Original</ImageLabel>
          </div>
          {generationInProgress ? <div className="relative aspect-[4/3] overflow-hidden border-l border-white/70 bg-clay" role="status" aria-live="polite" aria-label={`Generating ${pendingStyleName} preview`}>
            {generatedResult && <img src={generatedResult.url} alt="" className="size-full scale-105 object-contain object-center opacity-20 blur-md" />}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(242,222,163,.75),rgba(233,223,211,.92)_58%,rgba(247,244,237,.98))]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-coral text-white shadow-[0_12px_30px_rgba(232,102,80,.3)]"><LoaderCircle className="size-6 animate-spin" /></span>
              <span className="mt-3 rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-coral shadow-sm">AI is working</span>
              <p className="mt-2 font-display text-lg leading-tight text-ink sm:text-2xl">Creating {pendingStyleName}</p>
              <p className="mt-1 hidden max-w-xs text-xs leading-5 text-ink/50 sm:block">Preserving your identity and applying only the hairstyle.</p>
              <div className="mt-3 h-1.5 w-3/4 max-w-56 overflow-hidden rounded-full bg-white/80"><span className="generation-progress block h-full w-1/2 rounded-full bg-coral" /></div>
              <p className="mt-2 text-[10px] font-semibold text-ink/40">Usually about one minute</p>
            </div>
            <ImageLabel>Generating</ImageLabel>
          </div> : generatedResult && <button type="button" onClick={() => router.push(`/results/${generatedResult.generationId}`)} className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden border-l border-white/70 focus-visible:outline-none" aria-label={`Open ${generatedResult.styleName} full result with zoom, comparison and salon details`}>
            <img src={generatedResult.url} alt={`${generatedResult.styleName} hairstyle preview`} className={`size-full object-contain object-center transition duration-500 ease-out group-hover:scale-[1.035] group-focus-visible:scale-[1.035] ${photosVisible ? "" : "scale-105 blur-xl"}`} />
            <span className="result-mobile-sheen pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent sm:hidden" />
            <span className="result-mobile-cue pointer-events-none absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-2 text-[10px] font-bold text-white shadow-[0_8px_24px_rgba(232,102,80,.35)] sm:hidden"><ZoomIn className="size-3.5" /> Tap to explore</span>
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/15 to-transparent opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
            <span className="pointer-events-none absolute inset-2 rounded-[.9rem] border border-white/0 transition duration-300 group-hover:border-coral/80 group-hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)] group-focus-visible:border-coral/80" />
            <span className="pointer-events-none absolute inset-0 flex translate-y-3 flex-col items-center justify-center px-3 text-center text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
              <span className="grid size-11 place-items-center rounded-full bg-white/95 text-coral shadow-[0_12px_30px_rgba(37,35,31,.25)]"><ZoomIn className="size-5" /></span>
              <span className="mt-3 text-sm font-bold sm:text-base">Open full result</span>
              <span className="mt-1 hidden text-[10px] font-medium text-white/75 sm:block">Zoom · Compare · Salon details</span>
            </span>
            <ImageLabel>Latest result</ImageLabel>
          </button>}
          {!photosVisible && !generationInProgress && <button type="button" onClick={() => setPhotosVisible(true)} className="absolute inset-0 z-10 m-auto h-fit w-fit rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-ink shadow-lg"><Eye className="mr-1.5 inline size-3.5" /> Reveal photos</button>}
        </div>
      </div>
    </div> : <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
      <div id="try-on-preview" className="scroll-mt-4 rounded-[1.6rem] bg-white p-4 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-ink/40">{preview && !file ? "Your latest photo" : "Step 1"}</p><h2 className="mt-1 text-lg font-bold">{preview && !file ? "Continue with your saved selfie" : initialHistory ? "Upload a new selfie" : "Upload one clear selfie"}</h2></div>{preview ? <button onClick={reset} disabled={busy} type="button" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/50 hover:text-ink disabled:opacity-50"><RotateCcw className="size-3.5" /> {file ? "Replace" : "Use a new photo"}</button> : initialHistory && <button onClick={restoreSavedLook} type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-3 py-2 text-xs font-bold text-ink/60 transition hover:border-coral hover:text-coral"><ArrowLeft className="size-3.5" /> Back to saved look</button>}</div>
        {!preview && initialHistory && <div className="mb-4 flex items-start gap-3 rounded-xl bg-sage/10 px-4 py-3 text-sm leading-6 text-ink/60"><ArrowLeft className="mt-1 size-4 shrink-0 text-deep-sage" /><p>Changed your mind? Return to your saved selfie and latest result without uploading again.</p></div>}
        {preview ? <div className="relative overflow-hidden rounded-[1.2rem] bg-ink/[.06]" style={{ aspectRatio: imageAspectRatio }}><Image src={preview} alt="Selected selfie preview" fill className="object-contain object-center" unoptimized /></div> : <button type="button" onClick={() => inputRef.current?.click()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()} className="group flex min-h-80 w-full flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-ink/20 bg-clay/35 px-5 text-center transition hover:border-coral hover:bg-clay/60 lg:min-h-[360px]">
          <span className="mb-5 grid size-16 place-items-center rounded-full bg-coral text-white transition group-hover:scale-105"><ImagePlus className="size-7" /></span><span className="text-lg font-bold">Choose your photo</span><span className="mt-2 text-sm text-ink/50">or drop it here</span><span className="mt-5 text-xs text-ink/40">JPG, PNG or WebP · Max 10 MB</span>
        </button>}
        {status && <div role="status" aria-live="polite" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-clay px-4 py-3 text-sm font-bold text-ink/65"><LoaderCircle className="size-4 animate-spin" /> {status}</div>}
        {!preview && <div className="mt-4 grid gap-2 text-xs text-ink/55"><span className="inline-flex items-center gap-2"><Check className="size-3.5 text-deep-sage" /> Face and hair clearly visible</span><span className="inline-flex items-center gap-2"><Check className="size-3.5 text-deep-sage" /> Front-facing, natural light, no filter</span></div>}
      </div>

      <div className="rounded-[1.6rem] bg-white p-4 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-ink/40">{generatedResult ? "Your try-on" : "Example result"}</p><h2 className="mt-1 text-lg font-bold">{generatedResult?.styleName ?? "See the change before the cut"}</h2></div>{generatedResult && <div className="flex items-center gap-2"><span className="hidden rounded-full bg-sage/15 px-3 py-1.5 text-xs font-bold text-deep-sage sm:block">AI preview</span><button type="button" onClick={() => router.push(`/results/${generatedResult.generationId}`)} className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-2 text-xs font-bold text-white hover:bg-ink">Open result <ArrowRight className="size-3.5" /></button></div>}</div>
        <div className="relative overflow-hidden rounded-[1.2rem] bg-clay"><Image src="/example-before-after.png" alt="Example showing the same person before and after a realistic layered haircut" width={1536} height={1024} priority className="aspect-[3/2] w-full object-cover" /><div className="pointer-events-none absolute inset-0 grid grid-cols-2"><div className="relative"><ImageLabel>Before</ImageLabel></div><div className="relative"><ImageLabel>After</ImageLabel></div></div></div>
        <div className="mt-4 grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-3"><ProofPoint title="Personal matches" copy="Based on your face and hair" /><ProofPoint title="Identity preserved" copy="Only the hairstyle changes" /><ProofPoint title="Salon realistic" copy="Built for achievable cuts" /></div>
      </div>
    </div>}

    {error && <p role="alert" className="mt-4 rounded-xl bg-butter/55 px-4 py-3 text-sm leading-6 text-ink/70">{error}</p>}
    {preview && <DiscoveryChoices mode={mode} busy={busy || referenceBusy || Boolean(generatingStyle)} guideNextStep={Boolean(file)} onRecommend={recommend} onBrowse={browse} onReference={reference} />}
    {mode === "recommend" && !analysis && busy && <RecommendationLoading status={status ?? "Finding your best matches…"} />}
    {mode === "recommend" && analysis && <AnalysisResult analysis={analysis} generatingStyle={generatingStyle} selectedStyle={generatedResult?.styleSlug} onGenerate={generate} />}
    {mode === "browse" && uploadedKey && !busy && <BrowseCatalog generatingStyle={generatingStyle} selectedStyle={generatedResult?.styleSlug} onGenerate={generate} />}
    {mode === "reference" && uploadedKey && !busy && <ReferenceTransferPanel preview={referencePreview} copyHairColor={copyHairColor} busy={referenceBusy} status={referenceStatus} onChoose={() => referenceInputRef.current?.click()} onDrop={chooseReference} onCopyHairColor={setCopyHairColor} onGenerate={generateReference} />}
    <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink/45"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="size-3.5" /> Private by default</span><span className="inline-flex items-center gap-1.5"><Camera className="size-3.5" /> One selfie is enough</span><span>One free preview</span></div>
  </section>;
}

function DiscoveryChoices({ mode, busy, guideNextStep, onRecommend, onBrowse, onReference }: { mode: DiscoveryMode; busy: boolean; guideNextStep: boolean; onRecommend(): void; onBrowse(): void; onReference(): void }) {
  return <section className="mt-6 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7" aria-labelledby="discovery-heading">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Choose your path</p><h2 className="mt-2 scroll-mt-20 font-display text-3xl tracking-tight sm:text-4xl" id="discovery-heading">What would you like to do next?</h2></div><p className="max-w-md text-sm leading-6 text-ink/50">Not sure? Start with a personal recommendation. You can switch methods without changing your selfie.</p></div>
    {mode === "choose" ? <div className="mt-5 grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
      <button type="button" disabled={busy} onClick={onRecommend} className={`group flex min-h-56 flex-col rounded-2xl border border-coral/35 bg-coral/[.08] p-5 text-left transition hover:-translate-y-0.5 hover:border-coral hover:shadow-[0_16px_40px_rgba(224,102,78,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-60 sm:p-6 ${guideNextStep ? "discovery-choice-guide discovery-choice-guide-first" : ""}`}>
        <div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-full bg-coral text-white"><Sparkles className="size-5" /></span><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-coral">Recommended</span></div>
        <h3 className="mt-6 font-display text-3xl tracking-tight">Recommend styles for me</h3><p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">Best when you are not sure what suits you. We analyse your visible face and current hair, then explain the strongest matches.</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-6"><span className="text-xs text-ink/40">Analysis included · About one minute</span><span className="inline-flex items-center gap-1.5 text-sm font-bold text-coral">Find my matches <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span></div>
      </button>
      <div className="grid gap-3">
        <button type="button" disabled={busy} onClick={onBrowse} className={`group flex items-center gap-4 rounded-2xl border border-ink/10 bg-clay/25 p-5 text-left transition hover:border-coral/55 hover:bg-clay/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-60 ${guideNextStep ? "discovery-choice-guide discovery-choice-guide-second" : ""}`}><span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white"><LayoutGrid className="size-5" /></span><span><span className="block font-bold">Browse styles myself</span><span className="mt-1 block text-xs leading-5 text-ink/50">I already know the kind of look I want.</span></span><ArrowRight className="ml-auto size-4 shrink-0 text-coral" /></button>
        <button type="button" disabled={busy} onClick={onReference} className={`group flex items-center gap-4 rounded-2xl border border-ink/10 bg-clay/25 p-5 text-left transition hover:border-coral/55 hover:bg-clay/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-60 ${guideNextStep ? "discovery-choice-guide discovery-choice-guide-third" : ""}`}><span className="grid size-10 shrink-0 place-items-center rounded-full bg-clay text-ink/60"><ImageUp className="size-5" /></span><span><span className="block font-bold">Use a reference photo</span><span className="mt-1 block text-xs leading-5 text-ink/50">I have a celebrity, social or salon photo.</span></span><ArrowRight className="ml-auto size-4 shrink-0 text-coral" /></button>
      </div>
    </div> : <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-clay/55 p-1" role="group" aria-label="Change hairstyle discovery method">
      <button type="button" disabled={busy} onClick={onRecommend} aria-pressed={mode === "recommend"} className={`rounded-xl px-2 py-3 text-xs font-bold transition sm:text-sm ${mode === "recommend" ? "bg-white text-coral shadow-sm" : "text-ink/50 hover:bg-white/60 hover:text-ink"}`}>{mode === "recommend" && busy ? <span className="inline-flex items-center gap-1.5"><LoaderCircle className="size-3.5 animate-spin" /> Analysing…</span> : "Recommend"}</button>
      <button type="button" disabled={busy} onClick={onBrowse} aria-pressed={mode === "browse"} className={`rounded-xl px-2 py-3 text-xs font-bold transition sm:text-sm ${mode === "browse" ? "bg-white text-coral shadow-sm" : "text-ink/50 hover:bg-white/60 hover:text-ink"}`}>Browse library</button>
      <button type="button" disabled={busy} onClick={onReference} aria-pressed={mode === "reference"} className={`rounded-xl px-2 py-3 text-xs font-bold transition sm:text-sm ${mode === "reference" ? "bg-white text-coral shadow-sm" : "text-ink/50 hover:bg-white/60 hover:text-ink"}`}>Reference photo</button>
    </div>}
  </section>;
}

function ReferenceTransferPanel({ preview, copyHairColor, busy, status, onChoose, onDrop, onCopyHairColor, onGenerate }: { preview?: string; copyHairColor: boolean; busy: boolean; status?: string; onChoose(): void; onDrop(file?: File): void; onCopyHairColor(value: boolean): void; onGenerate(): void }) {
  return <section className="mt-6 scroll-mt-4 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7" id="reference-transfer" aria-labelledby="reference-heading">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Reference transfer</p><h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl" id="reference-heading">Bring a hairstyle you already love</h2></div><div className="max-w-md"><p className="text-sm leading-6 text-ink/50">Use a celebrity, social, or salon photo. We use only its hairstyle as the reference.</p><a href="#discovery-heading" className="mt-2 inline-flex text-xs font-bold text-coral hover:text-ink">Change method ↑</a></div></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <div>
        {preview ? <div className="relative overflow-hidden rounded-2xl bg-clay/45"><img src={preview} alt="Selected hairstyle reference" className="max-h-[440px] min-h-72 w-full object-contain" /><span className="absolute bottom-3 left-3 rounded-full bg-ink/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-white">Hairstyle reference</span></div> : <button type="button" onClick={onChoose} onDrop={(event) => { event.preventDefault(); onDrop(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()} className="group flex min-h-80 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-clay/30 px-6 text-center transition hover:border-coral hover:bg-clay/55">
          <span className="grid size-14 place-items-center rounded-full bg-coral text-white"><ImageUp className="size-6" /></span><span className="mt-5 text-lg font-bold">Choose a reference photo</span><span className="mt-2 text-sm text-ink/50">or drop it here</span><span className="mt-5 text-xs text-ink/40">JPG, PNG or WebP · Max 10 MB</span>
        </button>}
        {preview && <button type="button" disabled={busy} onClick={onChoose} className="button-secondary mt-3 w-full disabled:opacity-50"><RotateCcw className="size-4" /> Replace reference</button>}
      </div>
      <div className="flex flex-col rounded-2xl bg-clay/35 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-ink/40">What newself transfers</p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-ink/65"><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-deep-sage" /> Silhouette, length, bangs, layering, parting, volume and texture</li><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-deep-sage" /> Your face, expression, body, clothes and background stay unchanged</li><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-deep-sage" /> The person in the reference photo is never copied</li></ul>
        <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink/10 bg-white p-4"><span><span className="block text-sm font-bold">Copy hair color</span><span className="mt-1 block text-xs leading-5 text-ink/45">Off by default. Leave this off to keep your current color.</span></span><input type="checkbox" checked={copyHairColor} disabled={busy} onChange={(event) => onCopyHairColor(event.target.checked)} className="size-5 accent-coral" /></label>
        <button type="button" disabled={!preview || busy} onClick={onGenerate} className="button-primary mt-auto w-full disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{status ?? "Try this reference hairstyle"}</button>
        <p className="mt-3 text-center text-xs font-semibold text-ink/45">Uses 1 preview · Usually about one minute</p>
        <p className="mt-2 text-center text-xs leading-5 text-ink/40">AI previews can differ from the reference. Your stylist should assess what is achievable with your current hair.</p>
      </div>
    </div>
  </section>;
}

function BrowseCatalog({ generatingStyle, selectedStyle, onGenerate }: { generatingStyle?: StarterHairstyleSlug; selectedStyle?: StarterHairstyleSlug; onGenerate(style: StarterHairstyleSlug): void }) {
  const [presentation, setPresentation] = useState<"feminine" | "masculine">("feminine");
  const visibleStyles = STARTER_HAIRSTYLES.filter((style) => style.presentation === presentation);
  return <section className="mt-6 scroll-mt-4 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7" id="hairstyle-library" aria-labelledby="library-heading">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Hairstyle library</p><h2 className="mt-1 font-display text-3xl tracking-tight" id="library-heading">Choose a style</h2></div><div className="max-w-md"><p className="text-sm leading-6 text-ink/50">Pick a look to preview on your photo. You can switch collections at any time.</p><a href="#discovery-heading" className="mt-2 inline-flex text-xs font-bold text-coral hover:text-ink">Change method ↑</a></div></div>
    <div className="mt-5 max-w-xl" role="group" aria-label="Choose hairstyle collection"><p className="mb-2 text-xs font-bold text-ink/55">Collection</p><div className="grid grid-cols-2 rounded-2xl bg-clay/55 p-1">
      <button type="button" onClick={() => setPresentation("feminine")} aria-pressed={presentation === "feminine"} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${presentation === "feminine" ? "bg-coral text-white shadow-sm" : "text-ink/55 hover:text-ink"}`}>Female</button>
      <button type="button" onClick={() => setPresentation("masculine")} aria-pressed={presentation === "masculine"} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${presentation === "masculine" ? "bg-coral text-white shadow-sm" : "text-ink/55 hover:text-ink"}`}>Male</button>
    </div></div>
    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm font-bold">Hairstyle <span className="ml-1 rounded-full bg-clay/65 px-2 py-1 text-[10px] text-ink/45">{visibleStyles.length} styles</span></p><p className="text-xs text-ink/35">Scroll to explore →</p></div>
    <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pr-8 [scrollbar-color:rgba(53,43,35,.25)_transparent] [scrollbar-width:thin]">{visibleStyles.map((style) => {
      const isGenerating = generatingStyle === style.slug;
      const isSelected = selectedStyle === style.slug;
      return <button type="button" key={style.slug} disabled={Boolean(generatingStyle)} onClick={() => onGenerate(style.slug)} className={`group w-[42%] shrink-0 snap-start overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:border-coral/55 hover:shadow-[0_12px_30px_rgba(224,102,78,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:hover:translate-y-0 sm:w-40 ${isSelected ? "border-coral ring-1 ring-coral/20" : "border-ink/10"}`} aria-label={`Generate a ${style.name} preview. Uses one preview and usually takes about one minute.`}>
        <div className="relative aspect-square overflow-hidden bg-clay"><Image src={style.previewImage} alt={style.previewAlt} fill sizes="160px" className="object-cover transition duration-500 group-hover:scale-[1.035]" />{isGenerating && <span className="absolute inset-0 grid place-items-center bg-ink/45 text-white"><LoaderCircle className="size-5 animate-spin" /></span>}{isSelected && !isGenerating && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-coral text-white shadow-sm"><Check className="size-3.5" /></span>}</div>
        <div className="p-3"><h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5">{style.name}</h3><p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink/40">{style.category}</p><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-coral">{isGenerating ? "Generating…" : isSelected ? "Preview shown" : "Try this style"}</span><span className="mt-1 block text-[9px] text-ink/35">1 preview · ~1 min</span></div>
      </button>;
    })}</div><p className="mt-1 text-xs leading-5 text-ink/40">AI catalog previews use fictional models. Female and Male organize the visual collection; any style can still be tried on your photo.</p>
  </section>;
}

function ImageLabel({ children }: { children: React.ReactNode }) {
  return <span className="absolute bottom-3 left-3 rounded-full bg-ink/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-white backdrop-blur">{children}</span>;
}

function ProofPoint({ title, copy }: { title: string; copy: string }) {
  return <div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-ink/45">{copy}</p></div>;
}

function RecommendationLoading({ status }: { status: string }) {
  return <section id="recommendations" role="status" aria-live="polite" className="mt-6 scroll-mt-4 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7">
    <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-coral text-white"><LoaderCircle className="size-5 animate-spin" /></span><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Personal recommendation</p><h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Analysing your face and hair</h2><p className="mt-2 text-sm leading-6 text-ink/50">{status} Please keep this page open. Your result will be saved for this selfie so switching methods will not run the analysis again.</p></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-hidden="true">{[0, 1, 2].map((item) => <div className="overflow-hidden rounded-2xl border border-ink/5 bg-clay/30" key={item}><div className="aspect-[4/3] animate-pulse bg-clay/75" /><div className="space-y-3 p-4"><div className="h-3 w-1/3 animate-pulse rounded-full bg-ink/10" /><div className="h-5 w-2/3 animate-pulse rounded-full bg-ink/10" /><div className="h-3 w-full animate-pulse rounded-full bg-ink/[.07]" /><div className="h-3 w-4/5 animate-pulse rounded-full bg-ink/[.07]" /></div></div>)}</div>
  </section>;
}

function AnalysisResult({ analysis, generatingStyle, selectedStyle, onGenerate }: { analysis: HairAnalysis; generatingStyle?: StarterHairstyleSlug; selectedStyle?: StarterHairstyleSlug; onGenerate(style: StarterHairstyleSlug): void }) {
  const metrics = [["Face shape", analysis.faceShape], ["Hair length", analysis.hairLength], ["Density", analysis.hairDensity], ["Texture", analysis.texture], ["Thickness", analysis.thickness], ["Crown volume", analysis.crownVolume]];
  return <div className="mt-6 scroll-mt-4 rounded-[1.6rem] bg-white p-5 shadow-[0_24px_70px_rgba(53,43,35,.1)] sm:p-7" id="recommendations">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-coral">Your results</p><h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Hairstyles worth trying first</h2></div><div className="max-w-md"><p className="text-sm leading-6 text-ink/50">We considered your visible face proportions and current hair—not just what is trending.</p><a href="#discovery-heading" className="mt-2 inline-flex text-xs font-bold text-coral hover:text-ink">Change method ↑</a></div></div>
    <p className="mt-4 text-xs font-semibold text-ink/45">Saved for this selfie · Switching methods will not rerun the analysis.</p>
    <p className="mt-2 text-xs text-ink/45">Select a match to generate its preview.</p>
    <div className="mt-3 grid gap-3 lg:grid-cols-3">{analysis.recommendations.map((item, index) => {
      const catalogStyle = STARTER_HAIRSTYLES.find((style) => style.slug === item.styleSlug || style.name === item.name);
      const styleSlug = item.styleSlug ?? catalogStyle?.slug;
      const isGenerating = Boolean(styleSlug && generatingStyle === styleSlug);
      const isSelected = Boolean(styleSlug && selectedStyle === styleSlug);
      return <button type="button" disabled={Boolean(generatingStyle) || !styleSlug} onClick={() => { if (styleSlug) onGenerate(styleSlug); }} className="group flex overflow-hidden rounded-2xl border border-transparent bg-clay/45 text-left transition hover:-translate-y-0.5 hover:border-coral/55 hover:bg-coral/[.06] hover:shadow-[0_16px_40px_rgba(224,102,78,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:cursor-wait disabled:hover:translate-y-0" key={styleSlug ?? item.name} aria-label={`Generate a ${item.name} preview. Uses one preview and usually takes about one minute.`}>
        <div className="flex w-full flex-col">{catalogStyle && <div className="relative aspect-[4/3] overflow-hidden bg-clay"><Image src={catalogStyle.previewImage} alt={catalogStyle.previewAlt} fill sizes="(min-width: 1024px) 30vw, 90vw" className="object-cover object-[center_32%] transition duration-500 group-hover:scale-[1.025]" /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-ink/60 shadow-sm backdrop-blur">AI preview</span></div>}
        <div className="flex flex-1 flex-col p-5"><div className="flex w-full items-center justify-between gap-3"><span className="font-mono text-xs text-ink/35">0{index + 1}</span><span className="rounded-full bg-sage/15 px-2.5 py-1 text-xs font-bold text-deep-sage">{item.matchScore}% match</span></div>
        <h3 className="mt-5 font-display text-2xl">{item.name}</h3><p className="mt-2 text-sm leading-6 text-ink/55">{item.reason}</p>
        <div className="mt-auto flex w-full items-end justify-between gap-3 pt-5"><span><span className="block text-[10px] font-bold uppercase tracking-[.14em] text-ink/35">{item.maintenance} maintenance</span><span className="mt-1 block text-[9px] text-ink/35">1 preview · ~1 min</span></span><span className="inline-flex items-center gap-1.5 text-xs font-bold text-coral">{isGenerating ? <><LoaderCircle className="size-3.5 animate-spin" /> Generating</> : isSelected ? <><CheckCircle2 className="size-3.5" /> Preview shown</> : <>Try this style <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></>}</span></div></div></div>
      </button>;
    })}</div>
    <details className="mt-6 border-t border-ink/10 pt-5"><summary className="cursor-pointer text-sm font-bold">View my hair profile</summary><p className="mt-4 max-w-3xl text-sm leading-6 text-ink/55">{analysis.faceSummary}</p><dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{metrics.map(([label, value]) => <div className="rounded-xl bg-clay/45 p-3" key={label}><dt className="text-[9px] font-bold uppercase tracking-wider text-ink/35">{label}</dt><dd className="mt-1 text-sm font-bold capitalize">{value}</dd></div>)}</dl><p className="mt-4 text-xs leading-5 text-ink/40">{analysis.disclaimer}</p></details>
  </div>;
}
