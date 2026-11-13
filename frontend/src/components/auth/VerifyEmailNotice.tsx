import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import { ResendVerification } from "./ResendVerification";
import { dismissVerifyNotice, isVerifyNoticeDismissed } from "../../lib/verifyNotice";

/**
 * A quiet bar under the site header for signed-in accounts whose email is
 * not verified yet. It never blocks anything: verification is encouraged,
 * not required.
 */
export function VerifyEmailNotice() {
  const { user } = useAuth();
  // Read on every render, not once: the sign-up page dismisses the bar after
  // this component has already mounted. The state only forces a re-render
  // when Dismiss is clicked here.
  const [, setDismissedHere] = useState(false);

  if (!user || user.emailVerifiedAt || isVerifyNoticeDismissed()) return null;

  return (
    <div role="status" className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 text-xs text-zinc-400">
        <p className="min-w-0">
          Your email is not verified yet. We sent a link to{" "}
          <span className="font-medium text-zinc-200 break-all">{user.email}</span>.{" "}
          <ResendVerification label="Send a new link" />
        </p>
        <button
          type="button"
          onClick={() => { dismissVerifyNotice(); setDismissedHere(true); }}
          className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
