import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import { getOwnedGeneration } from "@/lib/generations/server";

async function handle(request: Request, params: Promise<{ generationId: string }>, method: "GET" | "POST" | "DELETE") {
  try {
    const { generationId } = await params;
    const owned = await getOwnedGeneration(generationId);
    if (owned.status !== 200) return NextResponse.json({ error: "Result unavailable" }, { status: owned.status });
    const resultId = new URL(request.url).searchParams.get("resultId");
    const result = owned.data.results.find(item => item._id === resultId);
    if (!result) return NextResponse.json({ error: "Choose a saved result" }, { status: 400 });
    if (method === "DELETE") {
      await owned.convex.mutation(api.shares.disable, { resultId: result._id });
      return NextResponse.json({ active: false });
    }
    if (method === "POST") await owned.convex.mutation(api.shares.enable, { resultId: result._id, token: randomBytes(24).toString("hex") });
    const share = await owned.convex.query(api.shares.mine, { resultId: result._id });
    return NextResponse.json(share, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Share management failed", error);
    return NextResponse.json({ error: "Could not update sharing. Please try again." }, { status: 500 });
  }
}

type Context = { params: Promise<{ generationId: string }> };
export async function GET(request: Request, { params }: Context) { return handle(request, params, "GET"); }
export async function POST(request: Request, { params }: Context) { return handle(request, params, "POST"); }
export async function DELETE(request: Request, { params }: Context) { return handle(request, params, "DELETE"); }
