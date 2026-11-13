import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const authApi = vi.hoisted(() => ({
  fetchMe: vi.fn(() => new Promise<never>(() => {})),
  fetchUsage: vi.fn(() => new Promise<never>(() => {})),
}));

vi.mock("../src/services/authApi", async (importOriginal) => ({
  ...(await importOriginal()),
  ...authApi,
}));

const analysisApi = vi.hoisted(() => ({
  analyzeWebsite: vi.fn<(url: string) => Promise<unknown>>(() => new Promise<never>(() => {})),
  fetchReport: vi.fn<(id: string) => Promise<unknown>>(() => new Promise<never>(() => {})),
}));
vi.mock("../src/services/analyzeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  ...analysisApi,
}));
import { mockAnalysisResult } from "../src/mock/mockData";
import App from "../src/App";

describe("App", () => {
  beforeEach(() => {
    analysisApi.analyzeWebsite.mockClear();
    analysisApi.fetchReport.mockClear();
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("starts a history rerun even when a previous report is persisted", async () => {
    sessionStorage.setItem("explain_current_analysis", JSON.stringify({
      result: mockAnalysisResult, url: "https://old.example.com",
    }));
    window.history.replaceState({}, "", "/?url=https%3A%2F%2Fnew.example.com");
    render(<App />);
    await waitFor(() => expect(analysisApi.analyzeWebsite).toHaveBeenCalledTimes(1));
    expect(analysisApi.analyzeWebsite.mock.calls[0]?.[0]).toBe("https://new.example.com");
    expect(window.location.search).toBe("");
    expect(screen.getByRole("button", { name: "Cancel analysis" })).toBeInTheDocument();
  });

  it("renders the landing page while session restoration is pending", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Explain this website\s*in seconds\./ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  const REPORT_ID = "0123456789abcdef0123456789abcdef";
  // The report view is a lazy chunk; its first import can take longer than
  // the default 1 s wait when the suite runs in parallel.
  const findNewAudit = () => screen.findByRole("button", { name: "New Audit" }, { timeout: 5000 });
  const landingHeading = () => screen.queryByRole("heading", { name: /Explain this website\s*in seconds\./ });

  it("moves a finished report to its own address and keeps the landing page at /", async () => {
    analysisApi.analyzeWebsite.mockResolvedValueOnce({ ...mockAnalysisResult, reportId: REPORT_ID });
    render(<App />);

    fireEvent.change(screen.getByLabelText("Website URL to analyze"), { target: { value: "example.com" } });
    fireEvent.submit(screen.getByRole("form", { name: "Website analyzer" }));

    expect(await findNewAudit()).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/report/${REPORT_ID}`);
    // The tab already holds this report, so it must not be fetched again.
    expect(analysisApi.fetchReport).not.toHaveBeenCalled();

    // Back returns to the landing page instead of leaving the site.
    act(() => {
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(landingHeading()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Audit" })).not.toBeInTheDocument();
  });

  it("shows the landing page at / even when a finished report is stored for this tab", () => {
    sessionStorage.setItem("explain_current_analysis", JSON.stringify({
      result: { ...mockAnalysisResult, reportId: REPORT_ID }, url: "https://old.example.com",
    }));
    render(<App />);

    expect(landingHeading()).toBeInTheDocument();
  });

  it("restores this tab's report at its address after a reload, without refetching", async () => {
    sessionStorage.setItem("explain_current_analysis", JSON.stringify({
      result: { ...mockAnalysisResult, reportId: REPORT_ID }, url: "https://old.example.com",
    }));
    window.history.replaceState({}, "", `/report/${REPORT_ID}`);
    render(<App />);

    expect(await findNewAudit()).toBeInTheDocument();
    expect(analysisApi.fetchReport).not.toHaveBeenCalled();
  });

  it("fetches a report opened from someone else's link and lets the visitor start their own", async () => {
    analysisApi.fetchReport.mockResolvedValueOnce({ ...mockAnalysisResult, reportId: REPORT_ID });
    window.history.replaceState({}, "", `/report/${REPORT_ID}`);
    render(<App />);

    fireEvent.click(await findNewAudit());
    expect(analysisApi.fetchReport).toHaveBeenCalledWith(REPORT_ID);
    expect(window.location.pathname).toBe("/");
    expect(landingHeading()).toBeInTheDocument();
  });

  it("offers sign-in, not a retry, when a signed-out visitor is out of free analyses", async () => {
    analysisApi.analyzeWebsite.mockRejectedValueOnce(
      new Error("You've used your 5 free analyses for today. Sign in to save history and upgrade to Pro for 50 analyses a day."),
    );
    render(<App />);

    fireEvent.change(screen.getByLabelText("Website URL to analyze"), { target: { value: "example.com" } });
    fireEvent.submit(screen.getByRole("form", { name: "Website analyzer" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Daily limit reached")).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(within(alert).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(within(alert).queryByRole("button", { name: "Try another URL" })).not.toBeInTheDocument();
  });

  it("keeps the retry actions for an ordinary failed analysis", async () => {
    analysisApi.analyzeWebsite.mockRejectedValueOnce(new Error("could not fetch URL: timeout"));
    render(<App />);

    fireEvent.change(screen.getByLabelText("Website URL to analyze"), { target: { value: "example.com" } });
    fireEvent.submit(screen.getByRole("form", { name: "Website analyzer" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Analysis failed")).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Try another URL" })).toBeInTheDocument();
  });

  it("renders a not-found page for unknown paths", async () => {
    window.history.replaceState({}, "", "/no-such-page");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
