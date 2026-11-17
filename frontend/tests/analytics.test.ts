import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/serverEvents", () => ({ recordServerEvent: vi.fn() }));

const isArguments = (value: unknown) => Object.prototype.toString.call(value) === "[object Arguments]";

describe("Google Analytics", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    delete window.gtag;
    delete window.dataLayer;
    document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove());
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("loads nothing and queues nothing without consent", async () => {
    const { enableAnalytics, track } = await import("../src/lib/analytics");
    enableAnalytics();
    track("landing_view");

    expect(window.dataLayer).toBeUndefined();
    expect(document.head.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  // Google's script ignores plain arrays. Every command used to be queued as
  // an array, so the site never sent a single visit.
  it("queues commands in the form Google's script accepts", async () => {
    const { setAnalyticsConsent, track } = await import("../src/lib/analytics");
    setAnalyticsConsent("granted");
    track("analysis_started", { source: "landing" });

    expect(document.head.querySelector('script[src*="googletagmanager.com/gtag/js?id=G-"]')).not.toBeNull();
    const queued = window.dataLayer as unknown[];
    expect(queued).toHaveLength(3);
    for (const command of queued) expect(isArguments(command)).toBe(true);
    expect(Array.from(queued[0] as ArrayLike<unknown>)[0]).toBe("js");
    expect(Array.from(queued[1] as ArrayLike<unknown>).slice(0, 2)).toEqual(["config", expect.stringMatching(/^G-/)]);
    expect(Array.from(queued[2] as ArrayLike<unknown>)).toEqual(["event", "analysis_started", { source: "landing" }]);
  });
});
