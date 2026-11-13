import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bookmarkletHref, bookmarkletSource, CAPTURE_MESSAGE, CAPTURE_READY_MESSAGE, readCaptureMessage,
} from "../src/lib/bookmarklet";

const SITE = "https://www.explainthiswebsite.com";
const PAGE = "https://app.example.com";

const message = (over: Record<string, unknown> = {}) => ({
  type: CAPTURE_MESSAGE,
  url: `${PAGE}/dashboard?tab=team`,
  title: "Team dashboard",
  html: "<!doctype html><html><body><h1>Team</h1></body></html>",
  headers: {},
  timings: {},
  ...over,
});

describe("readCaptureMessage", () => {
  it("accepts a page sent by its own origin", () => {
    const read = readCaptureMessage(message(), PAGE);
    expect(read).toMatchObject({ url: `${PAGE}/dashboard?tab=team`, title: "Team dashboard" });
  });

  it("rejects a page that claims to come from a different site than the sender", () => {
    expect(readCaptureMessage(message({ url: "https://bank.example.org/account" }), PAGE)).toBeNull();
  });

  it.each([
    ["no message", null],
    ["another kind of message", { type: "something-else", url: PAGE, html: "<p>x</p>" }],
    ["a missing page", message({ html: undefined })],
    ["an empty page", message({ html: "   " })],
    ["an address that is not a web page", message({ url: "javascript:alert(1)" })],
    ["an absurdly long address", message({ url: `${PAGE}/${"a".repeat(5000)}` })],
  ])("rejects %s", (_name, data) => {
    expect(readCaptureMessage(data, PAGE)).toBeNull();
  });

  it("keeps only the response headers the report uses", () => {
    const read = readCaptureMessage(message({
      headers: {
        "Strict-Transport-Security": "max-age=63072000",
        server: "nginx",
        "set-cookie": "session=secret",
        authorization: "Bearer token",
        "x-internal-trace": "abc",
        "x-frame-options": 42,
      },
    }), PAGE);
    expect(read?.headers).toEqual({ "strict-transport-security": "max-age=63072000", server: "nginx" });
  });

  it("drops timings that are not plausible numbers", () => {
    const read = readCaptureMessage(message({
      timings: { loadMs: 1800, lcpMs: -4, ttfbMs: "fast", cls: 0.03, hasCls: true, requests: Infinity },
    }), PAGE);
    expect(read?.timings).toEqual({ loadMs: 1800, cls: 0.03, hasCls: true });
  });
});

describe("the bookmark button", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it("is one self-contained javascript: link", () => {
    const href = bookmarkletHref(SITE);
    expect(href.startsWith("javascript:")).toBe(true);
    const source = decodeURIComponent(href.slice("javascript:".length));
    expect(source).toBe(bookmarkletSource(SITE));
    // It must parse on its own: no imports, no helpers from a bundle.
    expect(() => new Function(source)).not.toThrow();
  });

  it("opens the capture tab and hands over the page once that tab says it is ready", async () => {
    document.title = "Team dashboard";
    document.body.innerHTML = "<h1>Team</h1><p>Welcome back, Sam.</p>";

    const tab = { postMessage: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      headers: new Headers({
        "strict-transport-security": "max-age=63072000",
        "x-powered-by": "Express",
        "x-request-id": "private-trace",
      }),
    })));

    new Function(bookmarkletSource(SITE))();

    expect(open).toHaveBeenCalledWith(`${SITE}/capture`, "_blank");
    // Nothing is sent until the tab it opened asks for it.
    expect(tab.postMessage).not.toHaveBeenCalled();

    // A "ready" from anyone else is ignored.
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://evil.example", source: tab as unknown as Window, data: { type: CAPTURE_READY_MESSAGE },
    }));
    await Promise.resolve();
    expect(tab.postMessage).not.toHaveBeenCalled();

    window.dispatchEvent(new MessageEvent("message", {
      origin: SITE, source: tab as unknown as Window, data: { type: CAPTURE_READY_MESSAGE },
    }));
    await vi.waitFor(() => expect(tab.postMessage).toHaveBeenCalledTimes(1));

    const [sent, targetOrigin] = tab.postMessage.mock.calls[0];
    // Only this site may receive the page.
    expect(targetOrigin).toBe(SITE);
    expect(sent.type).toBe(CAPTURE_MESSAGE);
    expect(sent.url).toBe(window.location.href);
    expect(sent.title).toBe("Team dashboard");
    expect(sent.html).toContain("Welcome back, Sam.");
    expect(sent.headers).toEqual({ "strict-transport-security": "max-age=63072000", "x-powered-by": "Express" });

    // The page's own origin sent it, so this site accepts it.
    expect(readCaptureMessage(sent, window.location.origin)).not.toBeNull();
  });

  it("asks only for the page's headers, with a request that changes nothing", () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false, headers: new Headers() }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "open").mockReturnValue({ postMessage: vi.fn() } as unknown as Window);

    new Function(bookmarkletSource(SITE))();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(window.location.href, expect.objectContaining({ method: "HEAD" }));
  });

  it("explains itself when the browser blocks the new tab", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const alert = vi.fn();
    vi.stubGlobal("alert", alert);

    new Function(bookmarkletSource(SITE))();

    expect(alert).toHaveBeenCalledWith(expect.stringContaining("blocked the new tab"));
  });

  it("refuses to run on this site's own pages", () => {
    const open = vi.spyOn(window, "open");
    const alert = vi.fn();
    vi.stubGlobal("alert", alert);

    new Function(bookmarkletSource(window.location.origin))();

    expect(open).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining("Open the page you want to analyze first"));
  });
});
