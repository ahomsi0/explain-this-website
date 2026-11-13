import { fireEvent, render, screen, within } from "@testing-library/react";
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

it("puts the same actions in the header as buttons, and reports the outcome next to the one clicked", async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  const reportId = "0123456789abcdef0123456789abcdef";
  render(<ReportActionsMenu result={{ ...mockAnalysisResult, reportId }} />);

  const toolbar = screen.getByRole("group", { name: "Report actions" });
  for (const name of ["Share report", "Download report as PDF", "Copy report", "Copy embeddable score badge"]) {
    expect(within(toolbar).getByRole("button", { name })).toBeInTheDocument();
  }

  fireEvent.click(within(toolbar).getByRole("button", { name: "Share report" }));
  expect(await within(toolbar).findByRole("status")).toHaveTextContent("Link copied");
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/report/${reportId}`);
});

it("offers no share link or public badge for a page captured from behind a login", () => {
  render(<ReportActionsMenu result={{ ...mockAnalysisResult, capture: { source: "browser", hasHeaders: true } }} />);

  const toolbar = screen.getByRole("group", { name: "Report actions" });
  expect(within(toolbar).queryByRole("button", { name: "Share report" })).not.toBeInTheDocument();
  expect(within(toolbar).queryByRole("button", { name: "Copy embeddable score badge" })).not.toBeInTheDocument();
  // The owner can still keep a copy for themselves.
  expect(within(toolbar).getByRole("button", { name: "Download report as PDF" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Report actions" }));
  expect(screen.queryByRole("menuitem", { name: "Share report" })).not.toBeInTheDocument();
});
