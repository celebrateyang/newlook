export const sideErrorMessages = {
  authenticate: "Could not load this result. Sign in again and retry.",
  configure: "Side generation is not configured. Please contact support.",
  reserve: "Could not start side generation. Please try again later.",
  read: "Could not read the side photo. Please upload it again.",
  generate: "The image service could not generate the side view. Please try again later.",
  store: "The side image was generated but could not be stored. Please contact support.",
  save: "The side image was generated but could not be saved to your result. Please contact support.",
  preview: "The side view was saved but its preview could not be loaded. Refresh this page.",
} as const;

export type SideGenerationStage = keyof typeof sideErrorMessages;
