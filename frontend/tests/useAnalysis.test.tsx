import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useAnalysis } from "../src/hooks/useAnalysis";
import { analyzeWebsite } from "../src/services/analyzeApi";
import { mockAnalysisResult } from "../src/mock/mockData";

vi.mock("../src/services/analyzeApi", () => ({ analyzeWebsite: vi.fn() }));
beforeEach(() => { sessionStorage.clear(); vi.mocked(analyzeWebsite).mockReset(); });

it("retains the attempted URL after a first failure and a failure following success", async () => {
  const { result } = renderHook(() => useAnalysis());
  vi.mocked(analyzeWebsite).mockRejectedValueOnce(new Error("Unavailable"));
  await act(() => result.current.analyze("https://first.example.com"));
  expect(result.current.status).toBe("error");
  expect(result.current.currentUrl).toBe("https://first.example.com");
  vi.mocked(analyzeWebsite).mockResolvedValueOnce(mockAnalysisResult);
  await act(() => result.current.analyze("https://success.example.com"));
  vi.mocked(analyzeWebsite).mockRejectedValueOnce(new Error("Unavailable"));
  await act(() => result.current.analyze("https://latest.example.com"));
  expect(result.current.status).toBe("error");
  expect(result.current.currentUrl).toBe("https://latest.example.com");
});
