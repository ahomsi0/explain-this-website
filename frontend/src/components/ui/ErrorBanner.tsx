interface ErrorBannerProps {
  message: string;
  isBotProtectionError: boolean;
  onTryAgain?: () => void;
  onTryAnotherUrl: () => void;
}

export function ErrorBanner({ message, isBotProtectionError, onTryAgain, onTryAnotherUrl }: ErrorBannerProps) {
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
          <button
            onClick={onTryAgain}
            className="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors border border-violet-500"
          >
            Try again
          </button>
        )}
        <button
          onClick={onTryAnotherUrl}
          className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors border border-zinc-700"
        >
          Try another URL
        </button>
      </div>
    </div>
  );
}
