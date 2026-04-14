import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TechItem } from "../src/types/analysis";
import { TechStackCard } from "../src/components/cards/TechStackCard";

describe("TechStackCard", () => {
  it("shows confidence badges, tooltip text, and disclaimer", () => {
    const techStack: TechItem[] = [
      { name: "Google Tag Manager", category: "analytics", confidence: "high" },
      { name: "Vite", category: "framework", confidence: "medium" },
      { name: "WordPress", category: "cms", confidence: "low" },
    ];

    render(<TechStackCard techStack={techStack} />);

    expect(screen.getByText("Google Tag Manager")).toBeInTheDocument();
    expect(screen.getByText("Vite")).toBeInTheDocument();
    expect(screen.getByText("WordPress")).toBeInTheDocument();

    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Possible")).toBeInTheDocument();

    expect(
      screen.getByText("Technology detection is heuristic-based and may not always be 100% accurate, especially for large or custom-built websites."),
    ).toBeInTheDocument();

    const tooltip = "Confidence indicates how certain the system is about this detection based on available signals.";
    expect(screen.getAllByTitle(tooltip).length).toBeGreaterThan(0);
  });
});
