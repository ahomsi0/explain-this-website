const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID ?? "G-7GDKBRCPKM";
const CONSENT_KEY = "etw_analytics_consent";
const CONSENT_EVENT = "etw-analytics-consent-change";

type AnalyticsConsent = "granted" | "denied";
type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function storageValue(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  return storageValue();
}

export function hasAnalyticsConsent(): boolean {
  return storageValue() === "granted";
}

export function enableAnalytics(): void {
  if (typeof window === "undefined" || !MEASUREMENT_ID || !hasAnalyticsConsent()) return;
  if (!window.gtag) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    document.head.appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
  }
}

export function setAnalyticsConsent(consent: AnalyticsConsent): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // A blocked storage implementation should not prevent the app from working.
  }
  if (consent === "granted") enableAnalytics();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function onAnalyticsConsentChange(listener: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, listener);
  return () => window.removeEventListener(CONSENT_EVENT, listener);
}

export function track(eventName: string, params: EventParams = {}): void {
  if (!hasAnalyticsConsent()) return;
  enableAnalytics();
  window.gtag?.("event", eventName, params);
}

export function trackOnce(eventName: string, key = eventName): void {
  if (!hasAnalyticsConsent()) return;
  try {
    const storageKey = `etw_tracked_${key}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Continue with the event when session storage is unavailable.
  }
  track(eventName);
}
