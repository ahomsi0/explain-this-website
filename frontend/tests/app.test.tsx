import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const authApi = vi.hoisted(() => ({
  fetchMe: vi.fn(() => new Promise<never>(() => {})),
  fetchUsage: vi.fn(() => new Promise<never>(() => {})),
}));

vi.mock("../src/services/authApi", async (importOriginal) => ({
  ...(await importOriginal()),
  ...authApi,
}));

const analysisApi = vi.hoisted(() => ({ analyzeWebsite: vi.fn<(url: string) => Promise<never>>(() => new Promise<never>(() => {})) }));
vi.mock("../src/services/analyzeApi", async (importOriginal) => ({
  ...(await importOriginal()),
  ...analysisApi,
}));
import { mockAnalysisResult } from "../src/mock/mockData";
import App from "../src/App";

describe("App", () => {
  beforeEach(() => {
    analysisApi.analyzeWebsite.mockClear();
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

    expect(screen.getByRole("heading", { name: /Understand any website\s*in seconds\./ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
