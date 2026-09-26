import "server-only";
import type { GenerationTask, ImageEditProvider } from "./types";

export interface ProviderRegistry { gemini?: ImageEditProvider; flux?: ImageEditProvider; openai?: ImageEditProvider; }

export function selectProvider(task: GenerationTask, providers: ProviderRegistry): ImageEditProvider {
  const preferred = task === "reference_transfer"
    ? [providers.openai, providers.flux, providers.gemini]
    : [providers.openai, providers.gemini, providers.flux];
  const provider = preferred.find(Boolean);
  if (!provider) throw new Error("No image provider is configured");
  return provider;
}
