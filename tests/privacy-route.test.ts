import { beforeEach, expect, test, vi } from "vitest";
const mock = vi.hoisted(() => ({ owned: vi.fn(), query: vi.fn(), mutation: vi.fn(), auth: vi.fn(), deleteUser: vi.fn() }));
vi.mock("@/lib/convex/server", () => ({ ownedConvex: mock.owned }));
vi.mock("@/lib/shares/anonymous", () => ({ sameOrigin: (r: Request) => r.headers.get("origin") === new URL(r.url).origin && r.headers.get("sec-fetch-site") !== "cross-site" }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mock.auth, clerkClient: async () => ({ users: { deleteUser: mock.deleteUser } }) }));
vi.mock("@/lib/r2/client", () => ({ createR2Client: () => ({}) }));
vi.mock("@/lib/env", () => ({ r2Env: () => ({ R2_BUCKET_NAME: "test" }) }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: async () => "https://storage.example/owner-preview" }));
import { GET, DELETE, PATCH } from "../src/app/api/privacy/route";
beforeEach(() => { vi.resetAllMocks(); mock.owned.mockResolvedValue({ query: mock.query, mutation: mock.mutation }); mock.auth.mockResolvedValue({ userId: "owner" }); mock.mutation.mockResolvedValue({ pendingFiles: 2 }); mock.deleteUser.mockResolvedValue({}); });
function request(body: unknown, origin = "https://example.com") { return new Request("https://example.com/api/privacy", { method: "DELETE", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) }); }
test("deletion requires same origin, authentication and explicit scope confirmation", async () => {
  expect((await DELETE(request({ scope: "account", confirm: "DELETE" }, "https://other.example"))).status).toBe(403);
  expect(mock.mutation).not.toHaveBeenCalled();
  expect((await DELETE(request({ scope: "media" }))).status).toBe(400);
  expect((await DELETE(request({ scope: "generation", confirm: "DELETE" }))).status).toBe(400);
  mock.owned.mockResolvedValue(null);
  expect((await DELETE(request({ scope: "media", confirm: "DELETE" }))).status).toBe(401);
  expect((await GET()).status).toBe(401);
  expect(mock.deleteUser).not.toHaveBeenCalled();
});
test("a pending storage cleanup is acknowledged, never reported as finished", async () => {
  const response = await DELETE(request({ scope: "media", confirm: "DELETE" }));
  expect(response.status).toBe(202); expect(await response.json()).toEqual({ pendingFiles: 2, accountDeleted: false }); expect(mock.deleteUser).not.toHaveBeenCalled();
});
test("Clerk failure leaves an explicit retriable account status after app data revocation", async () => {
  mock.deleteUser.mockRejectedValue(new Error("private detail"));
  const response = await DELETE(request({ scope: "account", confirm: "DELETE" }));
  expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ accountPending: true, pendingFiles: 2 });
  expect(mock.mutation.mock.invocationCallOrder[0]).toBeLessThan(mock.deleteUser.mock.invocationCallOrder[0]);
});
test("photo management returns private thumbnails without exposing storage keys", async () => {
  mock.query.mockResolvedValue({ uploads: [{ id: "photo", type: "original", createdAt: 1, r2Key: "uploads/user_owner/original_test.jpg" }], pendingFiles: 0, retryingFiles: 0 });
  const response = await GET(), data = await response.json();
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(data.uploads[0]).toEqual({ id: "photo", type: "original", createdAt: 1, url: "https://storage.example/owner-preview" });
});
test("retrying an already deleted Clerk account completes idempotently", async () => {
  mock.deleteUser.mockRejectedValue({ status: 404 });
  const response = await DELETE(request({ scope: "account", confirm: "DELETE" }));
  expect(response.status).toBe(202); expect(await response.json()).toMatchObject({ accountDeleted: true });
});

test("keeping a photo checks origin, session and ownership failures", async () => {
  expect((await PATCH(request({ uploadId: "photo" }, "https://other.example"))).status).toBe(403);
  mock.owned.mockResolvedValue(null);
  expect((await PATCH(request({ uploadId: "photo" }))).status).toBe(401);
  mock.owned.mockRejectedValue(Error("offline"));
  expect((await PATCH(request({ uploadId: "photo" }))).status).toBe(503);
  mock.owned.mockResolvedValue({ mutation: mock.mutation });
  expect((await PATCH(request({}))).status).toBe(400);
  mock.mutation.mockRejectedValue(Error("other owner"));
  expect((await PATCH(request({ uploadId: "photo" }))).status).toBe(404);
  mock.mutation.mockResolvedValue(null);
  expect((await PATCH(request({ uploadId: "photo" }))).status).toBe(200);
});
