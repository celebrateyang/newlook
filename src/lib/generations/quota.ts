import { ConvexError } from "convex/values";
import { NextResponse } from "next/server";

export function quotaErrorResponse(error: unknown) {
  if (error instanceof ConvexError && error.data && typeof error.data === "object" && "code" in error.data && error.data.code === "DAILY_GENERATION_LIMIT") {
    const resetAt = Number(error.data.resetAt);
    return NextResponse.json({ code: "DAILY_GENERATION_LIMIT", error: "You've used today's 6 hairstyle generations. Try again after midnight Beijing time (UTC+8).", resetAt }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))) } });
  }
  return null;
}
