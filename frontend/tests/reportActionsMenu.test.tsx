import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReportActionsMenu } from "../src/components/ResultDashboard/ReportActionsMenu";
import { mockAnalysisResult } from "../src/mock/mockData";

it("keeps the menu open so share availability feedback is visible", () => {
  render(<ReportActionsMenu result={mockAnalysisResult} canShare={false} />);

  fireEvent.click(screen.getByRole("button", { name: "Report actions" }));
  fireEvent.click(screen.getByRole("button", { name: "Share report" }));

  expect(screen.getByRole("menu", { name: "Report actions menu" })).toBeVisible();
  expect(screen.getByText("Pro only")).toBeVisible();

  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole("menu", { name: "Report actions menu" })).not.toBeInTheDocument();
});
