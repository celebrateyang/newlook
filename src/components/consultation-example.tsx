"use client";
import Image from "next/image";
import Link from "./localized-link";
import { useI18n } from "./i18n-provider";
import { useState } from "react";
import { getStarterHairstyle } from "@/lib/hairstyles/catalog";
import { assessFeasibility } from "@/lib/hairstyles/feasibility";
import type { VisibleHair } from "../../shared/advisor";

const sample: VisibleHair = { hairLength: "long", hairDensity: "low", texture: "straight", thickness: "fine", hairline: "average", crownVolume: "flat" };
export function ConsultationExample() {
  const { locale } = useI18n(), [slug, setSlug] = useState("long-bob");
  const zh = locale === "zh", say = (en: string, cn: string) => zh ? cn : en;
  const style = getStarterHairstyle(slug)!, assessment = assessFeasibility(slug, sample, { lengthChange: "open", perm: "no", dailyMinutes: "5" }, locale)!;
  return <section id="example-consultation" className="border-t border-ink/10 bg-clay/30 px-5 py-16 sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl"><p className="eyebrow">{say("EXPLORE AN EXAMPLE", "先看一个沟通示例")}</p><h2 className="mt-3 font-display text-3xl sm:text-4xl">{say("What does the advice actually tell you?", "建议具体会告诉你什么？")}</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-ink/65">{say("Fictional scenario: long, straight, fine hair with lower visible density. Open to a shorter cut, no perm, up to 5 minutes of daily styling. Images are AI catalog models; this is an illustrative consultation, not a customer result or a verified salon outcome.", "虚构情境：长直发、发丝细、可见发量偏少；接受剪短、不烫发、每天最多打理 5 分钟。图片为 AI 发型库虚构模特；本区演示沟通逻辑，不是真实顾客案例或已验证的理发效果。")}</p><div className="mt-5 flex flex-wrap gap-2">{["long-bob", "french-bob", "curtain-bangs"].map(id => <button key={id} type="button" aria-pressed={slug === id} onClick={() => setSlug(id)} className={`rounded-full border px-4 py-2 text-sm font-bold ${slug === id ? "border-coral bg-coral text-white" : "border-ink/15 bg-white"}`}>{zh ? getStarterHairstyle(id)!.nameZh : getStarterHairstyle(id)!.name}</button>)}</div><div className="mt-6 grid overflow-hidden rounded-3xl border border-ink/10 bg-white md:grid-cols-[.7fr_1.3fr]"><figure className="p-5"><Image src={style.previewImage} width={768} height={768} alt={style.previewAlt} className="aspect-square w-full rounded-2xl object-cover" /><figcaption className="mt-3 text-xs text-ink/55">{say("AI catalog image · fictional model", "AI 发型库示意图 · 虚构模特")}</figcaption></figure><div className="p-6"><h3 className="text-xl font-bold">{assessment.title}</h3><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-ink/70">{assessment.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p className="mt-5 text-sm font-bold">{say("Ask your stylist", "带给理发师的问题")}</p><p className="mt-2 text-sm leading-7 text-ink/65">{assessment.nextSteps[0]}</p><p className="mt-4 text-xs leading-6 text-ink/50">{assessment.limitations}</p><Link href="/upload" className="button-primary mt-6">{say("Try with my own photo", "用我的照片试发型")}</Link></div></div></div></section>;
}
