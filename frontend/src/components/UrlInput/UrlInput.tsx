import { useState, type FormEvent } from "react";
import { normalizeInputUrl } from "../../lib/urls";

export function URLInput({
  onAnalyze,
  isLoading,
  deepScan,
  onDeepScanToggle,
}: {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  deepScan?: boolean;
  onDeepScanToggle?: () => void;
}) {
  const [value, setValue]   = useState("");
  const [error, setError]   = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed)             { setError("Enter a URL to analyze"); return; }
    const normalized = normalizeInputUrl(trimmed);
    if (!normalized)           { setError("Enter a valid URL, e.g. example.com"); return; }
    setError("");
    onAnalyze(normalized);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Website analyzer">
      {/* Visually hidden label keeps the input accessible to screen readers */}
      <label htmlFor="url-input" className="sr-only">Website URL to analyze</label>
      <div className={`flex items-center rounded-lg border transition-colors ${
        error ? "border-red-500/50" : "border-zinc-700 focus-within:border-zinc-500"
      } bg-zinc-900`}>
        <svg className="ml-3.5 shrink-0 text-zinc-600" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <input
          id="url-input"
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          placeholder="Enter a URL to analyze..."
          disabled={isLoading}
          aria-invalid={!!error}
          aria-describedby={error ? "url-error" : undefined}
          className="flex-1 px-3 py-3.5 text-[16px] sm:text-sm bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none disabled:opacity-50 [&:-webkit-autofill]:![background-color:transparent] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_theme(colors.zinc.900)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:theme(colors.zinc.100)]"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
        {onDeepScanToggle && (
          <>
            <div className="w-px h-5 bg-zinc-800 shrink-0" aria-hidden="true" />
            <button
              type="button"
              role="switch"
              aria-checked={deepScan}
              onClick={onDeepScanToggle}
              title="Also audit up to 4 key subpages (pricing, about, contact…)"
              className={`flex items-center gap-1.5 px-3 py-1 mr-1 text-[11px] font-medium transition-colors shrink-0 ${
                deepScan
                  ? "text-violet-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill={deepScan ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span className="hidden sm:inline">Deep scan</span>
            </button>
          </>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="m-1.5 px-4 py-2.5 sm:py-2 rounded-md bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? "Analyzing…" : "Analyze"}
        </button>
      </div>
      {error && <p id="url-error" role="alert" className="mt-2 text-xs text-red-400 pl-1">{error}</p>}
    </form>
  );
}
