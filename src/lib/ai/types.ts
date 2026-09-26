export type GenerationTask = "hair_try_on" | "reference_transfer";

export interface ImageEditParams {
  task: GenerationTask;
  sourceImageUrl: string;
  prompt: string;
  referenceImageUrl?: string;
  count: number;
}

export interface ImageResult { bytes: Uint8Array; mimeType: "image/png" | "image/webp"; providerRequestId?: string; }
export interface ImageEditProvider { readonly name: "gemini" | "flux" | "openai"; generate(params: ImageEditParams): Promise<ImageResult[]>; }
