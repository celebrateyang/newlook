"use client";

/* eslint-disable @next/next/no-img-element -- R2 result URLs are private, short-lived signatures and must bypass the Next image optimizer cache. */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, CheckCircle2, ImagePlus, LoaderCircle, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import type { HairAnalysis } from "@/lib/ai/hair-analysis";
import { STARTER_HAIRSTYLES, type StarterHairstyleSlug } from "@/lib/hairstyles/catalog";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 10 * 1024 * 1024;
type Stage = "idle" | "authorizing" | "uploading" | "saving" | "analyzing" | "complete";

async function responseError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  return `${fallback} (${response.status})`;
}

export function SelfieUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState<string>();
  const [stage, setStage] = useState<Stage>("idle");
  const [analysis, setAnalysis] = useState<HairAnalysis>();
  const [uploadedKey, setUploadedKey] = useState<string>();
  const [generatingStyle, setGeneratingStyle] = useState<StarterHairstyleSlug>();
  const [generatedResult, setGeneratedResult] = useState<{ url: string; styleName: string }>();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(next?: File) {
    setError(undefined); setAnalysis(undefined); setUploadedKey(undefined); setGeneratedResult(undefined); setStage("idle");
    if (!next) return;
    if (!acceptedTypes.includes(next.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (next.size > maxBytes) return setError("Your photo must be smaller than 10 MB.");
    if (preview) URL.revokeObjectURL(preview);
    setFile(next); setPreview(URL.createObjectURL(next));
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(undefined); setPreview(undefined); setAnalysis(undefined); setUploadedKey(undefined); setGeneratedResult(undefined); setError(undefined); setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyze() {
    if (!file || stage !== "idle") return;
    setError(undefined);
    try {
      setStage("authorizing");
      const authorization = await fetch("/api/r2/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "original", mimeType: file.type, size: file.size }) });
      if (authorization.status === 401) { router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`); return; }
      if (!authorization.ok) throw new Error(await responseError(authorization, "Could not authorize the upload"));
      const upload = await authorization.json() as { uploadUrl: string; key: string };

      setStage("uploading");
      const uploaded = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploaded.ok) throw new Error(`R2 upload failed (${uploaded.status}). Check the bucket CORS policy and token permissions.`);

      setStage("saving");
      const completed = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "original", key: upload.key, mimeType: file.type, size: file.size }),
      });
      if (!completed.ok) throw new Error(await responseError(completed, "Could not save the upload"));
      setUploadedKey(upload.key);

      setStage("analyzing");
      const analyzed = await fetch("/api/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: upload.key, mimeType: file.type }) });
      if (!analyzed.ok) throw new Error(await responseError(analyzed, "Analysis failed"));
      const result = await analyzed.json() as { analysis: HairAnalysis };
      setAnalysis(result.analysis); setStage("complete");
    } catch (cause) {
      setStage("idle"); setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    }
  }

  async function generate(styleSlug: StarterHairstyleSlug) {
    if (!uploadedKey || generatingStyle) return;
    setError(undefined); setGeneratedResult(undefined); setGeneratingStyle(styleSlug);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadKey: uploadedKey, styleSlug }),
      });
      if (!response.ok) throw new Error(await responseError(response, "Generation failed"));
      const result = await response.json() as { styleName: string; results: Array<{ url: string }> };
      const first = result.results[0];
      if (!first) throw new Error("The image provider returned no result");
      setGeneratedResult({ url: first.url, styleName: result.styleName });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed. Please try again.");
    } finally {
      setGeneratingStyle(undefined);
    }
  }

  const busy = stage !== "idle" && stage !== "complete";
  const status = stage === "authorizing" ? "Preparing secure upload…" : stage === "uploading" ? "Uploading privately to R2…" : stage === "saving" ? "Saving upload securely…" : stage === "analyzing" ? "Analyzing your face and hair…" : "Analyse my hair";

  return <section className="rounded-[2rem] bg-white p-4 shadow-[0_30px_90px_rgba(53,43,35,.12)] sm:p-6">
    <input ref={inputRef} type="file" accept={acceptedTypes.join(",")} className="sr-only" onChange={(event) => choose(event.target.files?.[0])} />
    {preview ? <div><div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-clay"><Image src={preview} alt="Selected selfie preview" fill className="object-cover" unoptimized /><button onClick={reset} disabled={busy} type="button" className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-bold shadow backdrop-blur disabled:opacity-50"><RotateCcw className="size-3.5" /> Replace</button></div>
      <div className="flex flex-col gap-4 px-2 pb-2 pt-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{file?.name}</p><p className="mt-1 text-xs text-ink/45">{stage === "complete" ? "Analysis complete" : "Ready for secure upload"}</p></div><button className="button-primary disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={busy || stage === "complete"} onClick={analyze}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : stage === "complete" ? <CheckCircle2 className="size-4" /> : null}{status}{stage === "idle" && <ArrowRight className="size-4" />}</button></div>
    </div> : <button type="button" onClick={() => inputRef.current?.click()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()} className="flex min-h-[520px] w-full flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-ink/20 bg-clay/45 px-6 text-center transition hover:border-coral hover:bg-clay/65">
      <span className="mb-6 grid size-20 place-items-center rounded-full bg-coral text-white"><ImagePlus className="size-8" /></span><span className="font-display text-3xl">Drop your selfie here</span><span className="mt-3 text-sm text-ink/50">or click to choose a photo</span><span className="mt-8 rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-semibold">JPG, PNG or WebP · max 10 MB</span>
    </button>}
    {error && <p role="alert" className="mx-2 mt-4 rounded-xl bg-butter/50 px-4 py-3 text-sm leading-6 text-ink/70">{error}</p>}
    {analysis && <AnalysisResult analysis={analysis} generatingStyle={generatingStyle} onGenerate={generate} />}
    {generatedResult && <div className="mx-2 mt-5 overflow-hidden rounded-[1.4rem] bg-clay/55 p-3"><div className="overflow-hidden rounded-xl bg-white"><img src={generatedResult.url} alt={`${generatedResult.styleName} hairstyle preview`} className="aspect-[2/3] w-full object-cover" /></div><div className="px-2 pb-2 pt-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-ink/45">AI try-on</p><h2 className="mt-1 font-display text-2xl">{generatedResult.styleName}</h2><p className="mt-2 text-xs leading-5 text-ink/45">AI preview only. Hair texture, growth pattern, and salon technique affect real-world results.</p></div></div>}
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-4 pt-5 text-xs text-ink/45"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="size-3.5" /> Private upload</span><span className="inline-flex items-center gap-1.5"><Camera className="size-3.5" /> No filters</span></div>
  </section>;
}

function AnalysisResult({ analysis, generatingStyle, onGenerate }: { analysis: HairAnalysis; generatingStyle?: StarterHairstyleSlug; onGenerate(style: StarterHairstyleSlug): void }) {
  const metrics = [["Face shape", analysis.faceShape], ["Hair length", analysis.hairLength], ["Density", analysis.hairDensity], ["Texture", analysis.texture], ["Thickness", analysis.thickness], ["Crown volume", analysis.crownVolume]];
  return <div className="mx-2 mt-5 rounded-[1.4rem] bg-clay/55 p-5 sm:p-6">
    <div className="flex items-center gap-2"><Sparkles className="size-5 text-coral" /><h2 className="font-display text-2xl">Your hair profile</h2></div><p className="mt-3 text-sm leading-6 text-ink/60">{analysis.faceSummary}</p>
    <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{metrics.map(([label, value]) => <div className="rounded-xl bg-white p-3" key={label}><dt className="text-[10px] font-bold uppercase tracking-wider text-ink/40">{label}</dt><dd className="mt-1 text-sm font-semibold capitalize">{value}</dd></div>)}</dl>
    <h3 className="mt-7 text-xs font-bold uppercase tracking-[.16em] text-ink/45">Top recommendations</h3><div className="mt-3 space-y-3">{analysis.recommendations.map((item) => <article className="rounded-xl bg-white p-4" key={item.name}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{item.name}</p><span className="rounded-full bg-sage/20 px-2.5 py-1 text-xs font-bold text-deep-sage">{item.matchScore}%</span></div><p className="mt-2 text-sm leading-6 text-ink/55">{item.reason}</p><p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink/40">{item.maintenance} maintenance</p></article>)}</div>
    <p className="mt-4 text-xs leading-5 text-ink/45">{analysis.disclaimer}</p>
    <h3 className="mt-7 text-xs font-bold uppercase tracking-[.16em] text-ink/45">Try a starter style</h3>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{STARTER_HAIRSTYLES.map((style) => <button key={style.slug} type="button" disabled={Boolean(generatingStyle)} onClick={() => onGenerate(style.slug)} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold transition hover:bg-coral hover:text-white disabled:cursor-wait disabled:opacity-60"><span>{style.name}</span>{generatingStyle === style.slug ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}</button>)}</div>
  </div>;
}
