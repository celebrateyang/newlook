export const MEDIA_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const MEDIA_REVIEW_MS = 7 * 24 * 60 * 60 * 1000;
export const MEDIA_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export type DeletionReason = "user_upload" | "user_generation" | "user_media" | "user_account" | "clerk_account" | "auto_expiry" | "superseded_side" | "legacy_queue";
export async function mediaHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
// Allow presigned uploads (5 minutes) and in-flight edits (up to 5 minutes) to finish
// before deleting their keys, so a late PUT cannot recreate a just-deleted file.
export const MEDIA_DELETE_GRACE_MS = 15 * 60 * 1000;
export function ownsMedia(clerkId: string, key: string) {
  const [folder, owner, filename, ...rest] = key.split("/");
  return ["uploads", "references", "generations"].includes(folder) && owner === `user_${clerkId}` && rest.length === 0 && /^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(filename ?? "");
}
