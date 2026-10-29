"use client";
import { useState } from "react";
import { useI18n, useLocalizedFetch } from "./i18n-provider";

export type PhotoRetention = { reviewUntil?: number; retentionReason?: string; expiresAt?: number };
export type CleanupEntry = { id: string; reason: string; status: string; attempts: number; createdAt: number; completedAt?: number };
export function RetentionControl({ id, retention, onKept }: { id: string; retention: PhotoRetention; onKept(): void }) {
  const { locale } = useI18n(), fetch = useLocalizedFetch();
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const say = (en: string, zh: string) => locale === "zh" ? zh : en;
  const reason = retention.retentionReason;
  const descriptions: Record<string, [string, string]> = {
    legacy_unknown: ["Older photo: retained because its usage links may be incomplete.", "旧照片的使用关联可能不完整，已保守保留。"],
    saved_result: ["Retained for a saved preview or an active generation.", "已保留：照片用于保存的效果图或正在进行的生成。"],
    kept_by_owner: ["You chose to keep this photo until you delete it.", "你已选择保留此照片，直到你主动删除。"],
    unused_grace: ["No saved preview currently uses this photo. Automatic cleanup is pending; you can keep it below.", "当前没有保存的效果图使用此照片，已进入可撤回的自动清理阶段。你可以选择保留。"],
  };
  const copy = descriptions[reason ?? ""] ?? ["Unused new photos are reviewed after 7 days, followed by a 7-day cancellation window.", "新照片闲置 7 天后进入待清理阶段，再保留 7 天供你取消清理。"];
  async function keep() {
    setBusy(true); setError(false);
    try { const r = await fetch("/api/privacy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: id }) }); if (!r.ok) throw Error(); onKept(); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <div className="space-y-2 text-sm leading-6 text-ink/65"><p>{say(...copy as [string, string])}</p>{retention.reviewUntil && <p>{say("Automatic cleanup after: ", "自动清理时间不早于：")}{new Date(retention.reviewUntil).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</p>}{reason !== "kept_by_owner" && <button disabled={busy} type="button" className="font-bold text-deep-sage underline disabled:opacity-50" onClick={() => void keep()}>{say("Keep this photo", "保留此照片，取消自动清理")}</button>}{error && <p role="alert">{say("Could not keep this photo. Refresh and retry.", "保留失败，请刷新后重试。")}</p>}</div>;
}

export function CleanupHistory({ entries }: { entries: CleanupEntry[] }) {
  const { locale } = useI18n(), zh = locale === "zh";
  const reasons: Record<string, string[]> = {
    user_upload: ["Photo and dependent previews", "删除照片及关联效果"], user_generation: ["Selected hairstyle", "删除指定发型"], user_media: ["All photos and previews", "删除全部照片和效果"], user_account: ["Account deletion", "主动删除账户"], clerk_account: ["Clerk account deletion", "登录账户删除回调"], auto_expiry: ["Unused-file expiry after review", "闲置文件经过可撤回阶段后清理"], superseded_side: ["Replaced side preview", "清理被替换的侧面效果"],
  };
  const states: Record<string, string[]> = { queued: ["Waiting", "等待清理"], retrying: ["Retrying", "正在重试"], deleted: ["File removed", "文件已删除"] };
  return <section className="space-y-3 border-t border-ink/15 pt-6" aria-label={zh ? "文件清理记录" : "File cleanup history"}><h2 className="text-xl font-bold">{zh ? "文件清理记录" : "File cleanup history"}</h2><p className="text-xs leading-6 text-ink/60">{zh ? "保留最近 30 天的操作原因、时间和执行状态。记录不包含照片内容或存储链接。" : "Reasons, times and execution status for the last 30 days. Records contain no photo contents or storage links."}</p>{entries.length ? <ul className="space-y-3">{entries.map(entry => <li key={entry.id} className="rounded-xl border border-ink/10 p-3 text-sm"><p>{(reasons[entry.reason] ?? ["Legacy cleanup", "旧清理任务"])[zh ? 1 : 0]} · {(states[entry.status] ?? states.queued)[zh ? 1 : 0]}</p><p className="mt-1 text-xs text-ink/55">{new Date(entry.createdAt).toLocaleString(zh ? "zh-CN" : "en-US")} · {zh ? "执行次数" : "Attempts"}: {entry.attempts}</p></li>)}</ul> : <p className="text-sm">{zh ? "暂无新的清理记录。" : "No new cleanup records."}</p>}</section>;
}
