import Link from "next/link";

export default function ShareUnavailable() {
  return <main className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="font-display text-4xl">This share is unavailable</h1><p className="mt-4 text-ink/55">The link may have been turned off by its owner.<br />分享已关闭或链接不存在。</p><Link href="/" className="button-primary mt-6">Try your own hairstyle</Link></main>;
}
