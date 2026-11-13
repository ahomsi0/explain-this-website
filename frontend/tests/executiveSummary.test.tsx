import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ExecutiveSummaryCard } from "../src/components/cards/ExecutiveSummaryCard";
import { computeInsights } from "../src/utils/insights";
import { mockAnalysisResult } from "../src/mock/mockData";

const insights = computeInsights(mockAnalysisResult);

describe("ExecutiveSummaryCard", () => {
  it("shows First impression on the page itself, out of 10, with its explanation", () => {
    const firstImpression = { score: 7, label: "Good", explanation: "Clear headline and a visible CTA." };
    render(<ExecutiveSummaryCard insights={insights} firstImpression={firstImpression} />);

    const label = screen.getByText("First impression");
    const stat = label.closest("div")!;
    expect(stat).toHaveTextContent("7/ 10");

    fireEvent.click(screen.getByRole("button", { name: "First impression score explanation" }));
    expect(screen.getByText("Good. Clear headline and a visible CTA.")).toBeInTheDocument();
    // It has no generic "what to do next" advice, so that heading is not shown for it.
    expect(screen.queryByText("What to do next")).not.toBeInTheDocument();
  });

  it("keeps the four-score layout for older reports that have no first impression", () => {
    render(<ExecutiveSummaryCard insights={insights} />);
    expect(screen.queryByText("First impression")).not.toBeInTheDocument();
    for (const name of ["SEO", "UX", "Conversion"]) expect(screen.getByText(name)).toBeInTheDocument();
  });

  it("still gives the other scores both parts of their explanation", () => {
    render(<ExecutiveSummaryCard insights={insights} />);
    fireEvent.click(screen.getByRole("button", { name: "SEO score explanation" }));
    expect(screen.getByText("What this means")).toBeInTheDocument();
    expect(screen.getByText("What to do next")).toBeInTheDocument();
  });
});
