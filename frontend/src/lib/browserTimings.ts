// Formatting and rating for load timings measured in the visitor's browser.

export type Rating = "good" | "needs-improvement" | "poor";

/** "850 ms" below a second, "1.8 s" above. */
export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// Google's Core Web Vitals thresholds.
export function rateLcp(ms: number): Rating {
  return ms <= 2500 ? "good" : ms <= 4000 ? "needs-improvement" : "poor";
}

export function rateCls(cls: number): Rating {
  return cls <= 0.1 ? "good" : cls <= 0.25 ? "needs-improvement" : "poor";
}

export function rateTtfb(ms: number): Rating {
  return ms <= 800 ? "good" : ms <= 1800 ? "needs-improvement" : "poor";
}

export const ratingText: Record<Rating, string> = {
  good: "text-emerald-400",
  "needs-improvement": "text-amber-400",
  poor: "text-red-400",
};

export const ratingLabel: Record<Rating, string> = {
  good: "GOOD",
  "needs-improvement": "SLOW",
  poor: "POOR",
};
