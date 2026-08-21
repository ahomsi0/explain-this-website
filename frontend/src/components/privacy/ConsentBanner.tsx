import { useEffect, useState } from "react";
import {
  enableAnalytics,
  getAnalyticsConsent,
  setAnalyticsConsent,
  track,
} from "../../lib/analytics";

export function ConsentBanner() {
  const [consent, setConsent] = useState(getAnalyticsConsent);

  useEffect(() => {
    if (consent === "granted") enableAnalytics();
  }, [consent]);

  if (consent) return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-relaxed text-zinc-300">
          We use privacy-friendly analytics to understand the path from landing page to analysis, signup, and repeat use. No analytics runs unless you allow it. Read our <a className="text-violet-300 underline underline-offset-2" href="/privacy">Privacy Policy</a>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => { setAnalyticsConsent("denied"); setConsent("denied"); }}
            className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Decline
          </button>
          <button
            type="button"
          onClick={() => { setAnalyticsConsent("granted"); setConsent("granted"); track("analytics_consent_granted"); }}
            className="rounded-md bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-400"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}
