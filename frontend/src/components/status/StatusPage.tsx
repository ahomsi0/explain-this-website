import { useEffect, useState } from "react";
import { fetchSiteStatus, type SiteStatus } from "../../services/authApi";

const LABELS: Record<string, string> = {
  database: "Database",
  groq: "AI summaries (Groq)",
  pagespeed: "Performance data (PageSpeed)",
  resend: "Email delivery (Resend)",
};

function dotTone(state?: string): string {
  if (state === "ok") return "bg-emerald-500";
  if (state === "down") return "bg-red-500";
  return "bg-zinc-600"; // idle = no recent data, not a failure
}

// /status — public, human-readable view of /api/status for visitors and for
// linking from an external uptime monitor.
export function StatusPage() {
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetchSiteStatus().then(setStatus).catch(() => setError("Could not reach the status endpoint."));
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const allOk = status?.status === "ok";

  return (
    <div className="flex-1 px-4 sm:px-6 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-bold text-zinc-100">System status</h1>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {!status && !error && <p className="mt-3 text-sm text-zinc-500">Checking…</p>}
        {status && (
          <>
            <div className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${allOk ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
              {allOk ? "All systems operational" : "Some systems are degraded — analyses may be slower or partially unavailable."}
            </div>
            <ul className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/60">
              {Object.entries(status.checks).map(([key, state]) => (
                <li key={key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-xs text-zinc-300">{LABELS[key] ?? key}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 capitalize">{state === "idle" ? "no recent data" : state}</span>
                    <span className={`w-2 h-2 rounded-full ${dotTone(state)}`} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-zinc-600">
              Last checked {new Date(status.time).toLocaleTimeString()} · auto-refreshes every minute
            </p>
          </>
        )}
      </div>
    </div>
  );
}
