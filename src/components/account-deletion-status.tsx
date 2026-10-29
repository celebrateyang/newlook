"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "./i18n-provider";
import Link from "./localized-link";

type Status = { appDataRemoved: boolean; clerkStatus: "pending" | "deleted"; pendingFiles: number; retryingFiles: number; complete: boolean };
const subscribe = (listener: () => void) => {
  window.addEventListener("storage", listener); window.addEventListener("hashchange", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("hashchange", listener); };
};
function savedReceipt() {
  const fragment = window.location.hash.slice(1);
  if (/^[a-f0-9]{64}$/.test(fragment)) return fragment;
  try { return sessionStorage.getItem("newself:deletion:receipt") ?? ""; } catch { return ""; }
}
export function AccountDeletionStatus() {
  const { locale } = useI18n(), zh = locale === "zh";
  const storedReceipt = useSyncExternalStore(subscribe, savedReceipt, () => "");
  const [editedReceipt, setReceipt] = useState<string>();
  const receipt = editedReceipt ?? storedReceipt;
  const [status, setStatus] = useState<Status>(), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(fragment)) {
      try {
        sessionStorage.setItem("newself:deletion:receipt", fragment);
        window.history.replaceState(null, "", window.location.pathname);
        window.dispatchEvent(new Event("storage"));
      } catch { /* Keep the fragment when storage is blocked so reload still works. */ }
    }
  }, []);
  const load = useCallback(async () => {
    setBusy(true); setError(""); setStatus(undefined);
    try {
      const r = await fetch("/api/privacy/account-status", { headers: { Authorization: `Bearer ${receipt}` }, cache: "no-store" });
      if (!r.ok) throw Error();
      setStatus(await r.json());
    } catch { setError(zh ? "暂时无法查询，请检查回执后重试。" : "Status unavailable. Check your receipt and retry."); } finally { setBusy(false); }
  }, [receipt, zh]);
  useEffect(() => {
    if (!/^[a-f0-9]{64}$/.test(receipt)) return;
    const controller = new AbortController();
    void fetch("/api/privacy/account-status", { headers: { Authorization: `Bearer ${receipt}` }, cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw Error(); return response.json(); })
      .then(value => { if (!controller.signal.aborted) { setStatus(value); setError(""); } })
      .catch(() => { if (!controller.signal.aborted) { setStatus(undefined); setError(zh ? "暂时无法查询，请检查回执后重试。" : "Status unavailable. Check your receipt and retry."); } });
    return () => controller.abort();
  }, [receipt, zh]);
  return <section className="mx-auto max-w-2xl space-y-6 px-5 py-12"><h1 className="font-display text-4xl">{zh ? "账户删除进度" : "Account deletion progress"}</h1><p className="leading-7 text-ink/65">{zh ? "退出登录后仍可使用私密回执查询 30 天。回执只允许查询状态，请妥善保存，勿公开分享。" : "Your private receipt can check progress for 30 days, including after sign-out. It only grants status access; save it privately."}</p><label className="block text-sm font-bold">{zh ? "私密删除回执" : "Private deletion receipt"}<input className="mt-2 block w-full rounded-xl border border-ink/20 p-3 font-mono text-xs" autoComplete="off" value={receipt} onChange={e => setReceipt(e.target.value.trim())} /></label><button type="button" className="button-primary disabled:opacity-50" disabled={busy || !/^[a-f0-9]{64}$/.test(receipt)} onClick={() => void load()}>{zh ? "刷新删除进度" : "Refresh deletion progress"}</button>{error && <p role="alert">{error}</p>}{status && <div role="status" className="space-y-3 rounded-2xl border border-ink/15 p-5"><p className="font-bold">{status.complete ? zh ? "账户及存储文件已删除" : "Account and stored files deleted" : zh ? "删除处理中" : "Deletion in progress"}</p><p>{zh ? "应用资料及分享：已移除" : "Application data and sharing: removed"}</p><p>{zh ? "登录账户：" : "Sign-in account: "}{status.clerkStatus === "deleted" ? zh ? "已删除" : "deleted" : zh ? "等待删除或确认，可返回照片管理重试" : "awaiting deletion or confirmation; return to photo settings to retry"}</p><p>{zh ? "等待清理文件：" : "Files pending cleanup: "}{status.pendingFiles}</p><p>{zh ? "重试中的文件：" : "Files retrying: "}{status.retryingFiles}</p></div>}<p className="text-sm leading-6 text-ink/60">{zh ? "如持续未完成，请携带删除回执联系 hello@newself.cc。" : "If deletion remains pending, contact hello@newself.cc with your receipt."}</p><Link href="/settings/privacy" className="underline">{zh ? "返回照片管理" : "Return to photo settings"}</Link></section>;
}
