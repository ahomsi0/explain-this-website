import { describe, expect, it } from "vitest";
import { guideForIssue } from "../src/guides/guides";

describe("guideForIssue", () => {
  it("maps the international readiness check to the hreflang guide", () => {
    expect(guideForIssue("seo-warn-international")?.slug).toBe("hreflang");
    expect(guideForIssue("seo-fail-international")?.slug).toBe("hreflang");
  });

  it("covers the lang attribute and og:locale in the hreflang guide", () => {
    const steps = guideForIssue("seo-warn-international")?.steps.join(" ") ?? "";
    expect(steps).toContain("<html lang");
    expect(steps).toContain("og:locale");
  });
});
