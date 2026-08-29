import { useState, useRef, type FormEvent } from "react";
import { useAuth } from "../../context/useAuth";
import { compareLive, type AuditComparison } from "../../services/authApi";
import { normalizeInputUrl } from "../../lib/urls";
import { AuthModal } from "../auth/AuthModal";
import { AuditComparison as AuditComparisonView } from "../auth/AuditComparison";

function SiteField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <label htmlFor={id} className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="example.com"
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 transition-colors disabled:opacity-50"
      />
    </div>
  );
}

// ComparePage runs fresh analyses of two sites head-to-head. Requires a
// session because each comparison doubles analysis cost.
export function ComparePage() {
  const { user } = useAuth();
  const [yours, setYours] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<AuditComparison | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const mountedRef = useRef(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setAuthOpen(true);
      return;
    }
    const yoursUrl = normalizeInputUrl(yours);
    const compUrl = normalizeInputUrl(competitor);
    if (!yoursUrl) { setError("Enter your site's URL, e.g. example.com"); return; }
    if (!compUrl) { setError("Enter the competitor's URL, e.g. competitor.com"); return; }
    if (yoursUrl.replace(/^https?:\/\//i, "") === compUrl.replace(/^https?:\/\//i, "")) {
      setError("The two URLs must be different");
      return;
    }

    setBusy(true);
    try {
      const result = await compareLive(yoursUrl, compUrl);
      if (mountedRef.current) setComparison(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Comparison failed — please try again");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const handleCancel = () => {
    mountedRef.current = false;
    setBusy(false);
    mountedRef.current = true;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Head to head</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Compare two sites</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Run fresh audits of your site and a competitor's in parallel and see exactly where you lead or lag —
          SEO scores, performance, conversion readiness, trust signals, and more.
        </p>

        {!user && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400 shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <p className="text-xs text-zinc-300">
              Comparisons run two full audits at once, so they require an account.
              {" "}
              <button onClick={() => setAuthOpen(true)} className="font-medium text-violet-300 hover:text-violet-200 underline underline-offset-2">
                Sign in
              </button>{" "}
              to continue — it's free.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <SiteField id="compare-yours" label="Your site" value={yours} onChange={(v) => { setYours(v); setError(null); }} disabled={busy} />
            <div className="flex h-10 items-center justify-center text-zinc-600 font-semibold sm:px-1">vs</div>
            <SiteField id="compare-competitor" label="Competitor" value={competitor} onChange={(v) => { setCompetitor(v); setError(null); }} disabled={busy} />
          </div>
          {error && (
            <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-md bg-violet-500 hover:bg-violet-400 active:bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Auditing both sites…
              </>
            ) : (
              "Compare sites"
            )}
          </button>
          {busy && (
            <div className="mt-3 flex items-center gap-3">
              <p className="text-xs text-zinc-600">
                Two full analyses run in parallel — this usually takes 20–60 seconds per site.
              </p>
              <button
                type="button"
                onClick={handleCancel}
                className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </form>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            ["Every metric that matters", "SEO scores, Lighthouse performance, conversion readiness, trust signals, broken links, and security headers."],
            ["Fresh data, not cached", "Both sites are re-audited live so the comparison reflects today's state of each site."],
            ["Actionable output", "Each metric is shown with direction and delta, so the gap tells you what to fix next."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
              <h2 className="text-xs font-semibold text-zinc-200">{title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{body}</p>
            </div>
          ))}
        </section>
      </main>

      {comparison && (
        <AuditComparisonView
          comparison={comparison}
          onClose={() => setComparison(null)}
          leftLabel="Yours"
          rightLabel="Competitor"
          title="Head-to-head results"
          subtitle="Your site on the left, the competitor on the right. Green bars mark the winner on each metric."
        />
      )}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
