import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ user: null as null | { email: string }, loading: false }));
vi.mock("../src/context/useAuth", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));

const api = vi.hoisted(() => ({ analyzeCapture: vi.fn() }));
vi.mock("../src/services/analyzeApi", () => ({ analyzeCapture: api.analyzeCapture }));

import { CapturePage } from "../src/components/capture/CapturePage";
import { readExtensionCapture } from "../src/lib/extensionHandover";

const ORIGIN = "http://localhost:3000";
const html = "<!doctype html><html><body><h1>Team</h1></body></html>";
const capture = {
  url: "https://app.example.com/team",
  title: "Team",
  html,
  headers: { "x-frame-options": "DENY", "set-cookie": "session=abc" },
  timings: { loadMs: 1200, lcpMs: 900, cls: 0.02, hasCls: true },
};

const assign = vi.fn();
let replaceState: ReturnType<typeof vi.spyOn>;

/** What the extension's script on this page sends back. */
function extensionAnswers(payload: unknown, from: { source?: unknown; origin?: string } = {}) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", {
      data: { type: "etw-capture", capture: payload },
      origin: from.origin ?? ORIGIN,
      source: (from.source === undefined ? window : from.source) as MessageEventSource | null,
    }));
  });
}

describe("CapturePage opened by the extension", () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.analyzeCapture.mockReset();
    assign.mockReset();
    auth.user = { email: "sam@example.com" };
    auth.loading = false;
    Object.defineProperty(window, "location", {
      value: { search: "?from=extension", pathname: "/capture", origin: ORIGIN, assign },
      configurable: true,
    });
    replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("waits for the page and drops the marker from the address", () => {
    render(<CapturePage />);
    expect(screen.getByRole("status")).toHaveTextContent("Getting the page from the extension");
    expect(screen.queryByLabelText("Page source")).not.toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith({}, "", "/capture");
  });

  it("analyzes the page straight away for a signed-in visitor", async () => {
    api.analyzeCapture.mockResolvedValueOnce({ reportId: "b".repeat(32) });
    render(<CapturePage />);
    extensionAnswers(capture);

    await waitFor(() => expect(assign).toHaveBeenCalledWith(`/report/${"b".repeat(32)}`));
    expect(api.analyzeCapture).toHaveBeenCalledTimes(1);
    expect(api.analyzeCapture).toHaveBeenCalledWith({
      url: capture.url,
      html,
      source: "browser",
      // Only the headers the report uses are passed on.
      headers: { "x-frame-options": "DENY" },
      timings: expect.objectContaining({ loadMs: 1200, lcpMs: 900, cls: 0.02, hasCls: true }),
    });
  });

  it("waits until the account is known before it starts", async () => {
    auth.loading = true;
    api.analyzeCapture.mockResolvedValueOnce({ reportId: "b".repeat(32) });
    const view = render(<CapturePage />);
    extensionAnswers(capture);
    expect(api.analyzeCapture).not.toHaveBeenCalled();

    auth.loading = false;
    view.rerender(<CapturePage />);
    await waitFor(() => expect(api.analyzeCapture).toHaveBeenCalledTimes(1));
  });

  it("asks a signed-out visitor to sign in, and keeps the page for when they return", () => {
    auth.user = null;
    render(<CapturePage />);
    extensionAnswers(capture);

    expect(screen.getByRole("heading", { name: "Analyze this page?" })).toBeInTheDocument();
    expect(screen.getByText("The page as your browser shows it")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to analyze" })).toHaveAttribute("href", "/login?next=%2Fcapture");
    expect(api.analyzeCapture).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem("etw_pending_capture")!).url).toBe(capture.url);
  });

  it("ignores a page posted by another window or another site", () => {
    render(<CapturePage />);
    extensionAnswers(capture, { source: null });
    extensionAnswers(capture, { origin: "https://evil.example" });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(api.analyzeCapture).not.toHaveBeenCalled();
  });

  it("falls back to pasting when the extension has nothing for this tab", () => {
    render(<CapturePage />);
    extensionAnswers(null);

    expect(screen.getByRole("alert")).toHaveTextContent("Nothing arrived from the extension.");
    expect(screen.getByLabelText("Page source")).toBeInTheDocument();
  });

  it("falls back to pasting when no answer comes at all", () => {
    vi.useFakeTimers();
    render(<CapturePage />);
    act(() => { vi.advanceTimersByTime(4000); });

    expect(screen.getByRole("alert")).toHaveTextContent("Nothing arrived from the extension.");
    expect(screen.getByLabelText("Page source")).toBeInTheDocument();
  });
});

describe("readExtensionCapture", () => {
  it("tells apart other messages, an empty answer and a page", () => {
    expect(readExtensionCapture({ type: "etw-capture-request" })).toBeUndefined();
    expect(readExtensionCapture("hello")).toBeUndefined();
    expect(readExtensionCapture({ type: "etw-capture", capture: null })).toBeNull();
    expect(readExtensionCapture({ type: "etw-capture", capture })?.source).toBe("browser");
  });

  it("refuses a page with no HTML or an address that is not a web address", () => {
    expect(readExtensionCapture({ type: "etw-capture", capture: { ...capture, html: "  " } })).toBeNull();
    expect(readExtensionCapture({ type: "etw-capture", capture: { ...capture, url: "javascript:alert(1)" } })).toBeNull();
    expect(readExtensionCapture({ type: "etw-capture", capture: { ...capture, url: "not a url" } })).toBeNull();
  });

  it("drops timings that are not sensible numbers", () => {
    const read = readExtensionCapture({ type: "etw-capture", capture: { ...capture, timings: { loadMs: -5, lcpMs: "fast", ttfbMs: 80 } } });
    expect(read?.timings).toEqual({ ttfbMs: 80 });
  });
});
