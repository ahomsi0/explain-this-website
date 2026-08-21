const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type EventValue = string | number | boolean | undefined;

// Best-effort first-party funnel storage. Analytics remains consent-gated in
// analytics.ts; this helper is only called after that consent check succeeds.
export function recordServerEvent(
  event: string,
  source = "",
  properties: Record<string, EventValue> = {},
): void {
  void fetch(`${API_URL}/api/events`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, source, properties }),
  }).catch(() => {
    // Tracking must never block or surface an application error.
  });
}
