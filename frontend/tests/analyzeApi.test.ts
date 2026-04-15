import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeWebsite, waitForServerSignal } from "../src/services/analyzeApi";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

describe("analyzeWebsite", () => {
  it("returns parsed data on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://example.com", seoChecks: [] }),
    });

    const result = await analyzeWebsite("https://example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.url).toBe("https://example.com");
  });

  it("throws backend error message on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: "url is required" }),
    });

    await expect(analyzeWebsite("")).rejects.toThrow("url is required");
  });
});

describe("waitForServerSignal", () => {
  it("resolves when health endpoint returns OK", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
    });

    await expect(waitForServerSignal(100)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when health endpoint returns non-OK", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(waitForServerSignal(100)).rejects.toThrow("Analysis server is unavailable (503)");
  });

  it("throws a clear timeout error when health check hangs", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
    );

    await expect(waitForServerSignal(1)).rejects.toThrow("Analysis server did not respond in time.");
  });
});
