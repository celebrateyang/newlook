export type GenerationTask = "hair_try_on" | "reference_transfer";

export interface ImageInput {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  filename: string;
}

export interface ImageEditParams {
  task: GenerationTask;
  sourceImage: ImageInput;
  prompt: string;
  referenceImage?: ImageInput;
  count: number;
}

export interface ImageResult { bytes: Uint8Array; mimeType: "image/png" | "image/webp"; providerRequestId?: string; }
export interface ImageEditProvider { readonly name: "gemini" | "flux" | "openai"; generate(params: ImageEditParams): Promise<ImageResult[]>; }
