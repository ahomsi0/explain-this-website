// formatCacheAge renders a cache entry's age in whole minutes, then whole hours
// once it passes an hour. Anything under a minute is "moments": a precise
// second count reads as noise at that scale.
export function formatCacheAge(seconds: number): string {
  if (seconds < 60) return "moments";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/**
 * How old a cached result is right now. The API reports the age at the moment
 * it answered; the report can stay open long after that, so the time since the
 * answer arrived is added on top. Both readings come from this device's clock,
 * so a wrong clock cannot skew the result.
 */
export function currentCacheAge(ageSecondsAtReceipt: number, receivedAt: number, now: number): number {
  return ageSecondsAtReceipt + Math.max(0, Math.floor((now - receivedAt) / 1000));
}
