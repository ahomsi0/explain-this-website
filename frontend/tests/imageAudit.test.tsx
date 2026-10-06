import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnalysisResult, ImageFormatAudit } from "../src/types/analysis";
import { computePriorityIssues } from "../src/utils/priorityIssues";
import { ImageAuditCard } from "../src/components/cards/ImageAuditCard";

const base: ImageFormatAudit = {
  total: 0, webp: 0, avif: 0, jpg: 0, png: 0, gif: 0, svg: 0,
  missingDims: 0, missingLazy: 0, modernPct: 0,
};

function issueIds(audit: ImageFormatAudit): string[] {
  const result = { imageAudit: audit } as unknown as AnalysisResult;
  return computePriorityIssues(result).map((i) => i.id);
}

describe("image-format fix plan rule", () => {
  it("is not raised when the page has no images at all (the Reddit report)", () => {
    expect(issueIds({ ...base, raster: 0, total: 0, modernPct: 0 })).not.toContain("image-format");
  });

  it("is not raised for SVG-only pages", () => {
    expect(issueIds({ ...base, total: 2, svg: 2, raster: 0, modernPct: 0 })).not.toContain("image-format");
  });

  it("is not raised when the only bitmap is already AVIF", () => {
    expect(issueIds({ ...base, total: 1, avif: 1, raster: 1, modernPct: 100 })).not.toContain("image-format");
  });

  it("is raised when most bitmaps are legacy formats", () => {
    expect(issueIds({ ...base, total: 3, jpg: 2, png: 1, raster: 3, modernPct: 0 })).toContain("image-format");
  });

  it("falls back to total for older saved reports without `raster`", () => {
    expect(issueIds({ ...base, total: 3, jpg: 3, modernPct: 0 })).toContain("image-format");
    expect(issueIds({ ...base, total: 0, modernPct: 0 })).not.toContain("image-format");
  });
});

describe("ImageAuditCard", () => {
  it("explains there is nothing to convert instead of showing 0%", () => {
    render(<ImageAuditCard audit={{ ...base, total: 1, svg: 1, raster: 0, modernPct: 0 }} />);
    expect(screen.getByText(/No bitmap images/)).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("shows the percentage when there are bitmaps", () => {
    render(<ImageAuditCard audit={{ ...base, total: 2, avif: 1, jpg: 1, raster: 2, modernPct: 50 }} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
