import "server-only";
import { api } from "../../../convex/_generated/api";
import { publicConvex } from "@/lib/convex/server";
export async function getPublicPoll(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token) || !process.env.NEXT_PUBLIC_CONVEX_URL) return null;
  return publicConvex().query(api.polls.publicPoll, { token });
}
