import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ReportActionsMenu } from "../src/components/ResultDashboard/ReportActionsMenu";
import { mockAnalysisResult } from "../src/mock/mockData";

it("keeps the menu open so share availability feedback is visible", () => {
  // No reportId: the link cannot be built, and the menu must stay open to say so.
  render(<ReportActionsMenu result={mockAnalysisResult} />);

  fireEvent.click(screen.getByRole("button", { name: "Report actions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Share report" }));

  expect(screen.getByRole("menu", { name: "Report actions menu" })).toBeVisible();
  expect(screen.getByText("Not available")).toBeVisible();

  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole("menu", { name: "Report actions menu" })).not.toBeInTheDocument();
});

it("copies the report link for any visitor, with no plan check", async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  const reportId = "0123456789abcdef0123456789abcdef";
  render(<ReportActionsMenu result={{ ...mockAnalysisResult, reportId }} />);

  fireEvent.click(screen.getByRole("button", { name: "Report actions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Share report" }));

  expect(await screen.findByText("Link copied")).toBeVisible();
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/report/${reportId}`);
});
