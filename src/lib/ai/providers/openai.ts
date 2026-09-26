import "server-only";
import { z } from "zod";
import type { ImageEditParams, ImageEditProvider, ImageResult } from "../types";

const responseSchema = z.object({
  data: z.array(z.object({ b64_json: z.string().min(1) })).min(1),
});

function filePart(input: ImageEditParams["sourceImage"]) {
  return new Blob([Buffer.from(input.bytes)], { type: input.mimeType });
}

export class OpenAIImageEditProvider implements ImageEditProvider {
  readonly name = "openai" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model = "gpt-image-2.5-sunburst",
  ) {}

  async generate(params: ImageEditParams): Promise<ImageResult[]> {
    const form = new FormData();
    form.append("model", this.model);
    form.append("prompt", params.prompt);
    form.append("image[]", filePart(params.sourceImage), params.sourceImage.filename);
    if (params.referenceImage) form.append("image[]", filePart(params.referenceImage), params.referenceImage.filename);
    form.append("n", String(Math.min(Math.max(params.count, 1), 4)));
    form.append("size", "1024x1536");
    form.append("quality", "low");
    form.append("output_format", "webp");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = z.object({ error: z.object({ message: z.string(), code: z.string().optional() }) }).safeParse(payload);
      throw new Error(error.success ? error.data.error.message : `OpenAI image edit failed (${response.status})`);
    }
    const parsed = responseSchema.parse(payload);
    const requestId = response.headers.get("x-request-id") ?? undefined;
    return parsed.data.map((image) => ({
      bytes: Uint8Array.from(Buffer.from(image.b64_json, "base64")),
      mimeType: "image/webp" as const,
      providerRequestId: requestId,
    }));
  }
}
