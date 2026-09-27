import "server-only";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export async function getOwnedGeneration(generationId: string) {
  const session = await auth();
  if (!session.userId) return { status: 401 as const };
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("Convex is not configured: NEXT_PUBLIC_CONVEX_URL");
  const token = await session.getToken({ template: "convex" });
  if (!token) throw new Error("Could not create a Convex authentication token");
  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);
  const data = await convex.query(api.generations.getMine, { generationId: generationId as Id<"generations"> });
  if (!data?.hairstyle || !data.upload) return { status: 404 as const };
  return { status: 200 as const, session, convex, data: { ...data, hairstyle: data.hairstyle, upload: data.upload } };
}

export function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "newlook-result";
}
