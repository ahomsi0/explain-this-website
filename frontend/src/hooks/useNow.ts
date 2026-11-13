import { useEffect, useState } from "react";

/**
 * The current time, refreshed on an interval, for text such as "9 minutes ago"
 * that has to keep moving while a page stays open. It also refreshes the moment
 * the tab becomes visible again, because browsers slow timers in hidden tabs.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);

  return now;
}
