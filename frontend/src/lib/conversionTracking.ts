import { track } from "./analytics";

const ANALYSIS_COUNT_KEY = "etw_completed_analysis_count";

function readCount(): number {
  try {
    const value = Number(window.localStorage.getItem(ANALYSIS_COUNT_KEY) ?? "0");
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}
export function completedAnalysisCount(): number {
  return typeof window === "undefined" ? 0 : readCount();
}

export function isRepeatUser(): boolean {
  return completedAnalysisCount() > 0;
}

export function recordAnalysisCompleted(params: {
  signedIn: boolean;
  source: string;
  performanceAvailable: boolean;
}): void {
  const count = readCount() + 1;
  try {
    window.localStorage.setItem(ANALYSIS_COUNT_KEY, String(count));
  } catch {
    // Analytics still records the current conversion event if storage is blocked.
  }
  track("analysis_completed", {
    ...params,
    analysis_number: count,
    repeat_user: count > 1,
  });
  if (count > 1) track("repeat_usage", { analysis_number: count, source: params.source });
}
