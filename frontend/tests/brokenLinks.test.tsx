import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AnalysisResult, LinkCheckItem } from "../src/types/analysis";
import { computePriorityIssues } from "../src/utils/priorityIssues";
import { FixPlanCard } from "../src/components/cards/FixPlanCard";
import { LinkCheckCard } from "../src/components/cards/LinkCheckCard";

function resultWithLinks(items: LinkCheckItem[], unverified = 0): AnalysisResult {
  const broken = items.filter((i) => i.isBroken).length;
  return {
    linkCheck: { checked: items.length, ok: 0, broken, unverified, redirects: 0, items },
  } as unknown as AnalysisResult;
}

const gone: LinkCheckItem = {
  url: "https://old.example.org/page",
  status: 404,
  finalUrl: "https://old.example.org/page",
  isRedirect: false,
  isBroken: true,
  reason: "not_found",
  text: "Old docs",
};

describe("broken-links priority issue", () => {
  it("carries the broken URLs as links", () => {
    const issue = computePriorityIssues(resultWithLinks([gone])).find((i) => i.id === "broken-links");
    expect(issue).toBeDefined();
    expect(issue!.links).toEqual([{ url: gone.url, label: "Old docs (404)" }]);
  });

  it("is absent when nothing is broken, even if links are unverified", () => {
    const unverified: LinkCheckItem = { ...gone, status: 429, isBroken: false, reason: "blocked" };
    const issues = computePriorityIssues(resultWithLinks([unverified], 1));
    expect(issues.find((i) => i.id === "broken-links")).toBeUndefined();
  });

  it("caps the list at five and mentions the rest", () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ ...gone, url: `https://old.example.org/${i}`, text: "" }));
    const issue = computePriorityIssues(resultWithLinks(many)).find((i) => i.id === "broken-links")!;
    expect(issue.links).toHaveLength(5);
    expect(issue.howToFix).toContain("2 more");
  });
});

describe("FixPlanCard", () => {
  it("renders broken URLs as clickable external links when expanded", () => {
    const issue = computePriorityIssues(resultWithLinks([gone])).find((i) => i.id === "broken-links")!;
    render(<FixPlanCard issues={[issue]} />);
    fireEvent.click(screen.getByRole("button", { name: /Fix 1 broken link/ }));
    const link = screen.getByRole("link", { name: "Old docs (404)" });
    expect(link).toHaveAttribute("href", gone.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});

describe("LinkCheckCard", () => {
  it("links broken URLs, shows anchor text and a separate unverified group", () => {
    const limited: LinkCheckItem = {
      url: "https://busy.example.net/",
      status: 429,
      finalUrl: "https://busy.example.net/",
      isRedirect: false,
      isBroken: false,
      reason: "blocked",
    };
    const linkCheck = resultWithLinks([gone, limited], 1).linkCheck;
    render(<LinkCheckCard linkCheck={linkCheck} />);

    const brokenLink = screen.getByRole("link", { name: gone.url });
    expect(brokenLink).toHaveAttribute("href", gone.url);
    expect(brokenLink).toHaveAttribute("target", "_blank");
    expect(screen.getByText("Old docs")).toBeInTheDocument();

    expect(screen.getByText("Could not verify")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: limited.url })).toBeInTheDocument();
    expect(screen.getByText("1 broken")).toBeInTheDocument();
  });
});
