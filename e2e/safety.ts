import { readFile } from "node:fs/promises";
export const statePath = "e2e/.state/users.json";
export type TestUser = { id: string; email: string };
export type TestState = { runId: string; users: TestUser[] };
export function guard() {
  if (process.env.E2E_LIVE !== "1" || process.env.E2E_ALLOW_TEST_DATA !== "1") throw Error("Explicit development test-data opt-in required");
  if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) throw Error("Only Clerk development instances allowed");
  if (!process.env.CONVEX_DEPLOYMENT?.startsWith("dev:")) throw Error("Only an explicitly named Convex development deployment allowed");
  const expected = process.env.E2E_CONVEX_URL;
  if (!expected || expected !== process.env.NEXT_PUBLIC_CONVEX_URL) throw Error("Explicit development Convex URL must match the application");
  if (expected !== `https://${process.env.CONVEX_DEPLOYMENT.slice(4)}.convex.cloud`) throw Error("Convex URL must match the named development deployment");
}
export async function clerkApi(path: string, method = "GET", body?: unknown) {
  guard();
  const response = await fetch(`https://api.clerk.com/v1${path}`, { method, headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (response.status === 404) return null;
  if (!response.ok) throw Error(`Clerk test API failed (${response.status})`);
  return response.json();
}
export async function state(): Promise<TestState> { return JSON.parse(await readFile(statePath, "utf8")); }
export async function removeTestUser(user: TestUser, runId: string) {
  const record = await clerkApi(`/users/${encodeURIComponent(user.id)}`);
  if (!record) return;
  if (record.private_metadata?.newselfE2ERun !== runId || !record.email_addresses?.some((e: { email_address: string }) => e.email_address === user.email)) throw Error("Refusing to delete an unmarked account");
  await clerkApi(`/users/${encodeURIComponent(user.id)}`, "DELETE");
}
