"use client";
import { useI18n, useLocalizedFetch } from "@/components/i18n-provider";

import { useEffect, useState } from "react";

export function QuotaNotice({ refreshKey = "" }: { refreshKey?: string }) {
  const fetch = useLocalizedFetch();
  const { t } = useI18n();
  const [quota, setQuota] = useState<{ remaining: number; limit: number }>();
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return;
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/generations/quota", { cache: "no-store" });
        if (response.ok) { const next = await response.json(); if (!cancelled) setQuota(next); }
      } catch { /* The server still enforces the limit when the status cannot load. */ }
    }
    void load();
    window.addEventListener("focus", load);
    const timer = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.removeEventListener("focus", load); window.clearInterval(timer); };
  }, [refreshKey, fetch]);
  return <p role="status" className="mb-5 rounded-xl bg-clay/50 px-4 py-3 text-xs leading-5 text-ink/60">
    {quota ? t("{remaining} of {limit} generations left today.", { remaining: quota.remaining, limit: quota.limit }) : t("Up to 6 hairstyle generations per account each day.")} {" "}{t("Resets at midnight Beijing time (UTC+8). Reference and side views count toward this limit, including failed attempts.")}{" "}</p>;
}
