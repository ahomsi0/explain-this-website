import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeWebsite } from "../src/services/analyzeApi";

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
