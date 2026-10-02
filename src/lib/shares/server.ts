import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

export async function getPublicShare(token: string) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !/^[a-f0-9]{48}$/.test(token)) return null;
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL).query(api.shares.publicResult, { token });
}
