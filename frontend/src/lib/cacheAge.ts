// formatCacheAge renders a cache entry's age in whole minutes. Anything under a
// minute is "moments" — a precise second count reads as noise at that scale.
export function formatCacheAge(seconds: number): string {
  if (seconds < 60) return "moments";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
