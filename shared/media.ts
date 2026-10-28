export const MEDIA_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
// Allow presigned uploads (5 minutes) and in-flight edits (up to 5 minutes) to finish
// before deleting their keys, so a late PUT cannot recreate a just-deleted file.
export const MEDIA_DELETE_GRACE_MS = 15 * 60 * 1000;
export function ownsMedia(clerkId: string, key: string) {
  const [folder, owner, filename, ...rest] = key.split("/");
  return ["uploads", "references", "generations"].includes(folder) && owner === `user_${clerkId}` && rest.length === 0 && /^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(filename ?? "");
}
