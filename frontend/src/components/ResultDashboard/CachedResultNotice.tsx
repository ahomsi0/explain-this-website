// Results are served from a short-TTL server cache, so a re-run shortly after
// fixing something can hand back the pre-fix analysis. A silent cache hit looks
// exactly like "my fix did nothing", so say it out loud and offer the way out.

import { useState } from "react";
import { currentCacheAge, formatCacheAge } from "../../lib/cacheAge";
import { useNow } from "../../hooks/useNow";

export function CachedResultNotice({ ageSeconds, receivedAt, onRerun }: {
  /** Age of the cached result when the API answered. */
  ageSeconds?: number;
  /** When that answer arrived (ms). Falls back to when this notice first showed. */
  receivedAt?: number;
  onRerun?: () => void;
}) {
  // The age keeps counting while the report stays open: a notice that still
  // says "9 minutes" a quarter of an hour later is simply wrong.
  const now = useNow();
  const [shownAt] = useState(() => Date.now());
  if (!ageSeconds) return null;

  const age = currentCacheAge(ageSeconds, receivedAt ?? shownAt, now);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-2 sm:px-6">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-400" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
      <p className="text-xs text-amber-200/90">
        Cached result from {formatCacheAge(age)} ago. Any changes you made since then aren&rsquo;t reflected here.
      </p>
      {onRerun && (
        <button
          onClick={onRerun}
          className="text-xs font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-100 transition-colors"
        >
          Re-run fresh
        </button>
      )}
    </div>
  );
}
