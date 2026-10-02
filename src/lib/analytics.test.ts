import { describe, expect, it } from "vitest";
import { analyticsPath } from "./analytics";

describe("analytics page categories", () => {
  it("preserves language and public page categories", () => {
    expect(analyticsPath("/en/")).toBe("/en/");
    expect(analyticsPath("/zh/upload")).toBe("/zh/upload");
  });
  it("excludes resource IDs, sharing tokens and authentication subpaths", () => {
    expect(analyticsPath("/en/share/secret-token")).toBe("/en/share/detail");
    expect(analyticsPath("/zh/poll/private-token")).toBe("/zh/poll/detail");
    expect(analyticsPath("/en/results/private-id")).toBe("/en/results/detail");
    expect(analyticsPath("/en/sign-in/sso-callback")).toBe("/en/sign-in");
    expect(analyticsPath("/en/unrecognized-secret")).toBe("/en/other");
  });
});
