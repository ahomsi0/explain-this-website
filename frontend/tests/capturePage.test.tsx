import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const auth = vi.hoisted(() => ({ user: null as null | { email: string }, loading: false }));
vi.mock("../src/context/useAuth", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));

const api = vi.hoisted(() => ({ analyzeCapture: vi.fn() }));
vi.mock("../src/services/analyzeApi", () => ({ analyzeCapture: api.analyzeCapture }));

import { CapturePage } from "../src/components/capture/CapturePage";
import { CAPTURE_MESSAGE, CAPTURE_READY_MESSAGE } from "../src/lib/bookmarklet";

const PAGE = "https://app.example.com";
const html = "<!doctype html><html><body><h1>Team</h1></body></html>";

function setOpener(opener: unknown) {
  Object.defineProperty(window, "opener", { value: opener, configurable: true, writable: true });
}

describe("CapturePage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.analyzeCapture.mockReset();
    auth.user = { email: "sam@example.com" };
    auth.loading = false;
    setOpener(null);
  });
  afterEach(() => { vi.restoreAllMocks(); setOpener(null); });

  it("offers the paste fallback when the tab was opened without a page", () => {
    render(<CapturePage />);
    expect(screen.getByRole("heading", { name: "No page arrived" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set up the bookmark" })).toHaveAttribute("href", "/behind-login");
  });

  it("asks the opener for the page, then waits for the visitor to confirm before sending anything", async () => {
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    render(<CapturePage />);

    expect(screen.getByRole("heading", { name: "Waiting for your page" })).toBeInTheDocument();
    expect(opener.postMessage).toHaveBeenCalledWith({ type: CAPTURE_READY_MESSAGE }, "*");

    act(() => {
      window.dispatchEvent(new MessageEvent("message", {
        origin: PAGE,
        source: opener as unknown as Window,
        data: { type: CAPTURE_MESSAGE, url: `${PAGE}/team`, title: "Team dashboard", html, headers: { server: "nginx" }, timings: { loadMs: 1800 } },
      }));
    });

    expect(await screen.findByRole("heading", { name: "Analyze this page?" })).toBeInTheDocument();
    expect(screen.getByText("Team dashboard")).toBeInTheDocument();
    expect(screen.getByText("app.example.com/team")).toBeInTheDocument();
    // Arriving is not consent: nothing has gone to the API yet.
    expect(api.analyzeCapture).not.toHaveBeenCalled();

    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, configurable: true });
    api.analyzeCapture.mockResolvedValueOnce({ reportId: "a".repeat(32) });

    await userEvent.click(screen.getByRole("button", { name: "Analyze this page" }));

    expect(api.analyzeCapture).toHaveBeenCalledWith({
      url: `${PAGE}/team`, html, source: "browser", headers: { server: "nginx" }, timings: { loadMs: 1800 },
    });
    expect(assign).toHaveBeenCalledWith(`/report/${"a".repeat(32)}`);
  });

  it("ignores a page posted by anything other than the tab that opened it", () => {
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    render(<CapturePage />);

    act(() => {
      window.dispatchEvent(new MessageEvent("message", {
        origin: PAGE, source: window, data: { type: CAPTURE_MESSAGE, url: `${PAGE}/team`, title: "x", html },
      }));
    });

    expect(screen.queryByRole("heading", { name: "Analyze this page?" })).not.toBeInTheDocument();
  });

  it("keeps the page across the trip to sign in, and sends signed-out visitors there", () => {
    auth.user = null;
    sessionStorage.setItem("etw_pending_capture", JSON.stringify({ url: `${PAGE}/team`, title: "Team dashboard", html, source: "browser" }));
    render(<CapturePage />);

    expect(screen.getByRole("heading", { name: "Analyze this page?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyze this page" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to analyze" })).toHaveAttribute("href", "/login?next=%2Fcapture");
  });

  it("shows the server's reason when the analysis fails, and allows another try", async () => {
    sessionStorage.setItem("etw_pending_capture", JSON.stringify({ url: `${PAGE}/team`, title: "", html, source: "browser" }));
    api.analyzeCapture.mockRejectedValueOnce(new Error("this page is too large to analyze: the limit is 5 MB of HTML"));
    render(<CapturePage />);

    await userEvent.click(screen.getByRole("button", { name: "Analyze this page" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("too large to analyze");
    expect(screen.getByRole("button", { name: "Analyze this page" })).toBeEnabled();
  });

  it("takes pasted source for an internal address the analyzer could never fetch", async () => {
    render(<CapturePage />);

    fireEvent.change(screen.getByLabelText("Page address"), { target: { value: "localhost:3000/admin#top" } });
    fireEvent.change(screen.getByLabelText("Page source"), { target: { value: html } });
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Analyze this page?" })).toBeInTheDocument();
    expect(screen.getByText("Page source you pasted")).toBeInTheDocument();

    api.analyzeCapture.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole("button", { name: "Analyze this page" }));
    expect(api.analyzeCapture).toHaveBeenCalledWith(expect.objectContaining({ url: "https://localhost:3000/admin", source: "paste" }));
  });
});
