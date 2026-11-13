import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const auth = vi.hoisted(() => ({ user: null as null | { email: string }, loading: false }));
vi.mock("../src/context/useAuth", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));

const api = vi.hoisted(() => ({ analyzeCapture: vi.fn() }));
vi.mock("../src/services/analyzeApi", () => ({ analyzeCapture: api.analyzeCapture }));

import { CapturePage } from "../src/components/capture/CapturePage";

const PAGE = "https://app.example.com";
const html = "<!doctype html><html><body><h1>Team</h1></body></html>";

function paste(address: string, source: string) {
  fireEvent.change(screen.getByLabelText("Page address"), { target: { value: address } });
  fireEvent.change(screen.getByLabelText("Page source"), { target: { value: source } });
}

describe("CapturePage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.analyzeCapture.mockReset();
    auth.user = { email: "sam@example.com" };
    auth.loading = false;
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("opens on the paste form, with a link to the explanation", () => {
    render(<CapturePage />);
    expect(screen.getByRole("heading", { name: "Analyze a page behind a login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How this works" })).toHaveAttribute("href", "/behind-login");
  });

  it("shows what is about to be sent and waits for a yes before anything reaches the API", async () => {
    render(<CapturePage />);
    paste("app.example.com/team#members", html);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Analyze this page?" })).toBeInTheDocument();
    expect(screen.getByText("app.example.com/team")).toBeInTheDocument();
    expect(screen.getByText("Page source you pasted")).toBeInTheDocument();
    expect(api.analyzeCapture).not.toHaveBeenCalled();

    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, configurable: true });
    api.analyzeCapture.mockResolvedValueOnce({ reportId: "a".repeat(32) });

    await userEvent.click(screen.getByRole("button", { name: "Analyze this page" }));

    expect(api.analyzeCapture).toHaveBeenCalledWith(expect.objectContaining({ url: `${PAGE}/team`, html, source: "paste" }));
    expect(assign).toHaveBeenCalledWith(`/report/${"a".repeat(32)}`);
  });

  it("asks for both the address and the source", async () => {
    render(<CapturePage />);

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the page's address");

    paste("app.example.com", "   ");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Paste the page source first.");
  });

  it("keeps the pasted page across the trip to sign in, and sends signed-out visitors there", () => {
    auth.user = null;
    sessionStorage.setItem("etw_pending_capture", JSON.stringify({ url: `${PAGE}/team`, title: "", html, source: "paste" }));
    render(<CapturePage />);

    expect(screen.getByRole("heading", { name: "Analyze this page?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyze this page" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to analyze" })).toHaveAttribute("href", "/login?next=%2Fcapture");
  });

  it("lets the visitor discard what they pasted and start over", async () => {
    sessionStorage.setItem("etw_pending_capture", JSON.stringify({ url: `${PAGE}/team`, title: "", html, source: "paste" }));
    render(<CapturePage />);

    await userEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.getByLabelText("Page source")).toHaveValue("");
    expect(sessionStorage.getItem("etw_pending_capture")).toBeNull();
  });

  it("shows the server's reason when the analysis fails, and allows another try", async () => {
    sessionStorage.setItem("etw_pending_capture", JSON.stringify({ url: `${PAGE}/team`, title: "", html, source: "paste" }));
    api.analyzeCapture.mockRejectedValueOnce(new Error("this page is too large to analyze: the limit is 5 MB of HTML"));
    render(<CapturePage />);

    await userEvent.click(screen.getByRole("button", { name: "Analyze this page" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("too large to analyze");
    expect(screen.getByRole("button", { name: "Analyze this page" })).toBeEnabled();
  });

  it("takes an internal address the analyzer could never fetch", async () => {
    render(<CapturePage />);
    paste("localhost:3000/admin#top", html);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    api.analyzeCapture.mockResolvedValueOnce({});
    await userEvent.click(screen.getByRole("button", { name: "Analyze this page" }));
    expect(api.analyzeCapture).toHaveBeenCalledWith(expect.objectContaining({ url: "https://localhost:3000/admin", source: "paste" }));
  });
});
