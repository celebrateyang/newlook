import "server-only";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
export function publicConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error("Convex is not configured");
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
}
export async function ownedConvex() {
  const session = await auth();
  if (!session.userId) return null;
  const token = await session.getToken({ template: "convex" });
  if (!token) throw new Error("Authentication unavailable");
  const client = publicConvex(); client.setAuth(token); return client;
}
