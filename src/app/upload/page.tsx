import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SelfieUploader } from "@/components/upload/selfie-uploader";

export const metadata: Metadata = { title: "Upload a selfie", description: "Start your personal hairstyle analysis." };

export default function UploadPage() {
  return <main className="min-h-screen bg-ivory"><SiteHeader /><div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:px-12 lg:py-20">
    <section><p className="eyebrow mb-5">STEP 1 OF 3</p><h1 className="font-display text-5xl leading-[.95] tracking-tight sm:text-6xl">Let&apos;s start with a clear selfie.</h1><p className="mt-6 max-w-md text-lg leading-8 text-ink/60">We&apos;ll use it to understand your face shape and current hair—never to change who you are.</p>
      <div className="mt-10 space-y-4 text-sm text-ink/65"><p className="flex gap-3"><span className="font-mono text-coral">01</span> Face the camera in natural light</p><p className="flex gap-3"><span className="font-mono text-coral">02</span> Keep hair, forehead and jaw visible</p><p className="flex gap-3"><span className="font-mono text-coral">03</span> Skip hats, filters and group photos</p></div>
    </section><SelfieUploader />
  </div></main>;
}
