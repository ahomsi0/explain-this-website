/** Set when the failure is the daily analysis limit, not a problem with the site. */
export type QuotaState = "signed-out" | "free" | "pro";

interface ErrorBannerProps {
  message: string;
  isBotProtectionError: boolean;
  onTryAgain?: () => void;
  onTryAnotherUrl: () => void;
  /** Daily limit reached. Retrying cannot work, so the actions change to the
   *  one thing that does: signing in, or upgrading. */
  quota?: QuotaState;
  onSignIn?: () => void;
}

const primaryButton =
  "px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors border border-violet-500";
const secondaryButton =
  "px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors border border-zinc-700";

export function ErrorBanner({ message, isBotProtectionError, onTryAgain, onTryAnotherUrl, quota, onSignIn }: ErrorBannerProps) {
  if (quota) {
    return (
      <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-screen px-4 gap-4">
        <p className="text-sm font-medium text-zinc-200">Daily limit reached</p>
        <p className="text-sm text-zinc-600 max-w-sm text-center leading-relaxed">{message}</p>
        <div className="mt-2 flex items-center gap-2">
          {quota === "signed-out" && onSignIn && (
            <button type="button" onClick={onSignIn} className={primaryButton}>
              Sign in
            </button>
          )}
          {quota === "free" && (
            <a href="/go-pro" className={primaryButton}>
              See Pro plans
            </a>
          )}
          {quota === "pro" && (
            <button type="button" onClick={onTryAnotherUrl} className={secondaryButton}>
              Back to home
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-screen px-4 gap-4">
      <p className="text-sm font-medium text-zinc-200">Analysis failed</p>
      {isBotProtectionError ? (
        <p className="text-sm text-zinc-600 max-w-md text-center leading-relaxed">
          This website appears to have strong bot protection and blocked the request. Sometimes retrying works.
        </p>
      ) : (
        <p className="text-sm text-zinc-600 max-w-sm text-center leading-relaxed">{message}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {onTryAgain && (
          <button onClick={onTryAgain} className={primaryButton}>
            Try again
          </button>
        )}
        <button onClick={onTryAnotherUrl} className={secondaryButton}>
          Try another URL
        </button>
      </div>
    </div>
  );
}
