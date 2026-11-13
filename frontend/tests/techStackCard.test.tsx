import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TechItem } from "../src/types/analysis";
import { TechStackCard } from "../src/components/cards/TechStackCard";

describe("TechStackCard", () => {
  it("shows confidence badges and disclaimer", () => {
    const techStack: TechItem[] = [
      { name: "Google Tag Manager", category: "analytics", confidence: "high" },
      { name: "Vite", category: "framework", confidence: "medium" },
      { name: "WordPress", category: "cms", confidence: "low" },
    ];

    render(<TechStackCard techStack={techStack} />);

    expect(screen.getByText("Google Tag Manager")).toBeInTheDocument();
    expect(screen.getByText("Vite")).toBeInTheDocument();
    expect(screen.getByText("WordPress")).toBeInTheDocument();

    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Detected")).toBeInTheDocument();
    expect(screen.getByText("Possible")).toBeInTheDocument();

    expect(
      screen.getByText("Detection reads the page source, the server's response headers and cookie names, and Lighthouse network analysis. Verified entries have explicit signals; Detected ones are likely correct based on partial signals."),
    ).toBeInTheDocument();
  });
});

describe("tech descriptions", () => {
  it("describes a server-side framework as what it is, not as a JavaScript library", async () => {
    const { getTechDescription, getTechRoleLabel } = await import("../src/lib/techMeta");
    const laravel = { name: "Laravel", category: "framework", confidence: "medium" } as const;
    expect(getTechDescription(laravel)).toMatch(/PHP web framework/);
    expect(getTechDescription({ name: "Some Unknown Server", category: "framework", confidence: "high" })).not.toMatch(/JavaScript/);
    expect(getTechRoleLabel({ name: "Heroku", category: "cdn", confidence: "high" })).toBe("Hosting and CDN");
  });
});
