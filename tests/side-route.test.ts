import { beforeEach, expect, test, vi } from "vitest";
import { ConvexError } from "convex/values";

const mocks = vi.hoisted(() => ({
  owned: vi.fn(), mutation: vi.fn(), setAuth: vi.fn(), token: vi.fn(),
  send: vi.fn(), generate: vi.fn(), sign: vi.fn(),
}));
vi.mock("@/lib/generations/server", () => ({ getOwnedGeneration: mocks.owned }));
vi.mock("@/lib/env", () => ({ imageGenerationEnv: () => ({ R2_BUCKET_NAME: "test", OPENAI_API_KEY: "fake", OPENAI_IMAGE_MODEL: "test" }) }));
vi.mock("@/lib/r2/client", () => ({ createR2Client: () => ({ send: mocks.send }) }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mocks.sign }));
vi.mock("@/lib/ai/providers/openai", () => ({ OpenAIImageEditProvider: class { generate = mocks.generate; } }));
import { POST } from "../src/app/api/generations/[generationId]/side/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.owned.mockResolvedValue({ status: 200, session: { userId: "owner", getToken: mocks.token }, convex: { mutation: mocks.mutation, setAuth: mocks.setAuth }, data: { hairstyle: { slug: "cornrows" }, generation: { _id: "generation" } } });
  mocks.token.mockResolvedValue("fake-refreshed-token");
  mocks.mutation.mockResolvedValueOnce(undefined).mockResolvedValueOnce("side-result");
  mocks.send.mockResolvedValueOnce({ ContentType: "image/jpeg", Body: { transformToByteArray: async () => new Uint8Array([1]) } }).mockResolvedValueOnce({});
  mocks.generate.mockResolvedValue([{ bytes: new Uint8Array([2]), mimeType: "image/webp", providerRequestId: "provider-test" }]);
  mocks.sign.mockResolvedValue("https://example.com/side.webp");
});

function request(uploadKey = "uploads/user_owner/side_photo.jpg") {
  return POST(new Request("https://example.com/api/generations/generation/side", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadKey }) }), { params: Promise.resolve({ generationId: "generation" }) });
}

test("cornrows side generation uploads and persists output before returning a usable view", async () => {
  const response = await request();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ id: "side-result", view: "side", url: "https://example.com/side.webp" });
  expect(mocks.generate.mock.calls[0][0].prompt).toContain("cornrows");
  expect(mocks.generate.mock.calls[0][0].prompt).toContain("side-view camera angle");
  expect(mocks.mutation.mock.calls[1][1]).toMatchObject({ generationId: "generation", uploadKey: "uploads/user_owner/side_photo.jpg", providerRequestId: "provider-test" });
  expect(mocks.setAuth).toHaveBeenCalledWith("fake-refreshed-token");
});

test("side requests reject another user's photo before consuming quota or calling AI", async () => {
  expect((await request("uploads/user_other/side_photo.jpg")).status).toBe(400);
  expect(mocks.mutation).not.toHaveBeenCalled();
  expect(mocks.generate).not.toHaveBeenCalled();
});

test("exhausted quota returns 429 without calling the image provider", async () => {
  mocks.mutation.mockReset().mockRejectedValue(new ConvexError({ code: "DAILY_GENERATION_LIMIT", resetAt: Date.now() + 1000 }));
  expect((await request()).status).toBe(429);
  expect(mocks.generate).not.toHaveBeenCalled();
});

test.each(["generate", "save"] as const)("%s failures return a safe stage code instead of exposing service details", async stage => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    if (stage === "generate") mocks.generate.mockRejectedValue(new Error("private provider detail"));
    else mocks.mutation.mockReset().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("private database detail"));
    const response = await request();
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.code).toBe(`SIDE_${stage.toUpperCase()}_FAILED`);
    expect(body.requestId).toBeTruthy();
    expect(body.error).not.toContain("private");
  } finally { log.mockRestore(); }
});
