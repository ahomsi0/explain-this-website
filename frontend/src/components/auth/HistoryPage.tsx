import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearAudits,
  compareAudits,
  deleteAudit,
  fetchAuditsPage,
  fetchAuditsTrends,
  revokeShare as revokeAuditShare,
  type AuditComparison as AuditComparisonData,
  type AuditListItem,
  type AuditListPage,
  type AuditTrend,
} from "../../services/authApi";
import { useAuth } from "../../context/useAuth";
import { AuditComparison } from "./AuditComparison";
import { AuthModal } from "./AuthModal";
import { RowSkeleton } from "../ui/Skeletons";

type SortKey = "newest" | "oldest" | "score" | "url";
type DayWindow = 0 | 7 | 30;

const PAGE_SIZE = 20;

// Stale-while-revalidate page cache: a visited page renders instantly on
// return, and neighbor pages are prefetched so Next/Prev feel immediate.
// Component-scoped (useRef) so signing out can't leak rows across sessions.
function cacheKey(page: number, search: string, sort: SortKey, sharedOnly: boolean, days: DayWindow) {
  return `${page}|${search}|${sort}|${sharedOnly}|${days}`;
}

function scoreTone(score?: number): string {
  if (score === undefined) return "text-zinc-600";
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

// Full-page audit history: server-side search, sort, shared/date filters,
// per-row score chips, one-click re-run, and classic pagination.
export function HistoryPage() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [data, setData] = useState<AuditListPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [sharedOnly, setSharedOnly] = useState(false);
  const [days, setDays] = useState<DayWindow>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<AuditComparisonData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [trends, setTrends] = useState<AuditTrend[] | null>(null);
  const fetchSeqRef = useRef(0);
  const pageCacheRef = useRef(new Map<string, AuditListPage>());

  // Trends load once per visit; the backend computes them from the score cache.
  useEffect(() => {
    if (!user) return;
    fetchAuditsTrends().then(setTrends).catch(() => setTrends([]));
  }, [user]);

  // Debounce search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!user) return;
    const key = cacheKey(page, search, sort, sharedOnly, days);

    // Stale-while-revalidate: paint the cached page immediately, refresh anyway.
    const cached = pageCacheRef.current.get(key);
    if (cached) setData(cached);
    else setFetching(true);

    const seq = ++fetchSeqRef.current;
    setError(null);
    fetchAuditsPage({ page, limit: PAGE_SIZE, q: search || undefined, sort, shared: sharedOnly, days })
      .then((result) => {
        if (fetchSeqRef.current !== seq) return;
        pageCacheRef.current.set(key, result);
        setData(result);
        setFetching(false);
        // Prefetch neighbors so Next/Prev render instantly.
        const prefetch = (p: number) => {
          const k = cacheKey(p, search, sort, sharedOnly, days);
          if (pageCacheRef.current.has(k)) return;
          fetchAuditsPage({ page: p, limit: PAGE_SIZE, q: search || undefined, sort, shared: sharedOnly, days })
            .then((r) => pageCacheRef.current.set(k, r))
            .catch(() => {});
        };
        if (result.total > page * PAGE_SIZE) prefetch(page + 1);
        if (page > 1) prefetch(page - 1);
      })
      .catch((e) => { if (fetchSeqRef.current === seq) { setError(e instanceof Error ? e.message : "Failed to load history"); setFetching(false); } });
  }, [user, page, search, sort, sharedOnly, days]);

  // Land at the top of the list when the page changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Changing page/filter resets compare selection — ids may no longer be visible.
  const filterKey = `${page}|${search}|${sort}|${sharedOnly}|${days}`;
  useEffect(() => {
    setSelectedIds([]);
  }, [filterKey]);

  const pageNumbers = useMemo(() => {
    // Compact window: first, last, and current±1 (with ellipsis placeholders).
    const out: (number | "…")[] = [];
    const push = (n: number | "…") => { if (out[out.length - 1] !== n) out.push(n); };
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) push(p);
      else if (out[out.length - 1] !== "…") push("…");
    }
    return out;
  }, [page, totalPages]);

  async function remove(id: string) {
    if (!confirm("Delete this audit from your history?")) return;
    try {
      await deleteAudit(id);
      pageCacheRef.current.clear();
      setData((prev) => prev ? {
        ...prev,
        items: prev.items.filter((a) => a.id !== id),
        total: prev.total - 1,
      } : prev);
      setSelectedIds((prev) => prev.filter((selected) => selected !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function clearAll() {
    if (!confirm("Permanently delete all audits from your history? This cannot be undone.")) return;
    try {
      await clearAudits();
      pageCacheRef.current.clear();
      setData({ items: [], total: 0, page: 1, limit: PAGE_SIZE });
      setSelectedIds([]);
      setPage(1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Clear failed");
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((selected) => selected !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  async function compareSelected() {
    if (selectedIds.length !== 2) return;
    setCompareLoading(true);
    try {
      setComparison(await compareAudits(selectedIds[0], selectedIds[1]));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setCompareLoading(false);
    }
  }

  async function revokeShare(id: string) {
    if (!confirm("Revoke this public share link? The audit will remain in your history.")) return;
    try {
      await revokeAuditShare(id);
      pageCacheRef.current.clear();
      setData((prev) => prev ? {
        ...prev,
        items: prev.items.map((item) => item.id === id ? { ...item, shareable: false } : item),
      } : prev);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not revoke share link");
    }
  }

  if (loading) {
    return (
      <div className="flex-1 px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <RowSkeleton rows={5} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 px-4 sm:px-6 py-16">
        <div className="max-w-md mx-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
          <h2 className="text-lg font-semibold text-zinc-100">Sign in to see your history</h2>
          <p className="mt-2 text-sm text-zinc-400">Your saved audits, comparisons, and share links live here once you're signed in.</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white bg-violet-500 hover:bg-violet-400 transition-colors"
          >
            Sign in
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  const items = data?.items ?? [];
  const hasFilters = search !== "" || sort !== "newest" || sharedOnly || days !== 0;

  return (
    <div className="flex-1 px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Audit history</h1>
            <p className="mt-1 text-xs text-zinc-500">
              {data ? `${data.total} saved ${data.total === 1 ? "audit" : "audits"} · select two to compare changes over time` : "Loading…"}
            </p>
          </div>
          {data && data.total > 0 && (
            <button onClick={() => void clearAll()} className="text-[11px] font-medium text-zinc-500 hover:text-red-400 transition-colors">
              Clear history
            </button>
          )}
        </div>

        {trends && trends.length > 0 && <TrendsPanel trends={trends} />}

        {(data || hasFilters) && (
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[180px] flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 focus-within:border-violet-500/40 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title or URL…"
                aria-label="Search audit history"
                className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none min-w-0"
              />
              {searchInput && (
                <button onClick={() => setSearchInput("")} aria-label="Clear search" className="text-zinc-500 hover:text-zinc-300 text-xs leading-none">×</button>
              )}
            </div>

            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
              aria-label="Sort audits"
              className="px-2.5 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 outline-none focus:border-violet-500/40 transition-colors"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="score">Best score</option>
              <option value="url">URL A–Z</option>
            </select>

            <select
              value={days}
              onChange={(e) => { setDays(Number(e.target.value) as DayWindow); setPage(1); }}
              aria-label="Filter by date range"
              className="px-2.5 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 outline-none focus:border-violet-500/40 transition-colors"
            >
              <option value={0}>All time</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>

            <button
              onClick={() => { setSharedOnly(!sharedOnly); setPage(1); }}
              aria-pressed={sharedOnly}
              className={`px-3 py-2 rounded-md text-[11px] font-semibold border transition-colors ${sharedOnly ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"}`}
            >
              Shared only
            </button>

            <button
              onClick={() => void compareSelected()}
              disabled={selectedIds.length !== 2 || compareLoading}
              className="px-3 py-2 rounded-md text-[11px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {compareLoading ? "Comparing…" : selectedIds.length === 2 ? "Compare selected" : `Compare (${selectedIds.length}/2)`}
            </button>
          </div>
        )}

        <div className="mt-4">
          {!data && !error && <RowSkeleton rows={5} />}
          {fetching && data && <RowSkeleton rows={Math.min(data.items.length || 5, PAGE_SIZE)} />}
          {error && <div className="text-xs text-red-400 bg-red-950/50 border border-red-800/40 rounded px-3 py-2">{error}</div>}
          {!fetching && data && data.total === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-zinc-400">{hasFilters ? "No audits match your filters" : "No audits yet"}</p>
              <p className="mt-1 text-xs text-zinc-500">{hasFilters ? "Try clearing the search or filters." : "Run your first analysis to see it here."}</p>
              {!hasFilters && <a href="/" className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-md text-xs font-semibold text-white bg-violet-500 hover:bg-violet-400 transition-colors">Analyze a website</a>}
            </div>
          )}
          {!fetching && data && data.items.length === 0 && data.total > 0 && (
            <p className="text-xs text-zinc-500 text-center py-10">This page is empty — go back a page.</p>
          )}
          {!fetching && items.length > 0 && (
            <ul className="flex flex-col gap-1">
              {items.map((a) => (
                <HistoryRow
                  key={a.id}
                  audit={a}
                  selected={selectedIds.includes(a.id)}
                  onToggle={() => toggleSelection(a.id)}
                  onRevoke={() => void revokeShare(a.id)}
                  onDelete={() => void remove(a.id)}
                />
              ))}
            </ul>
          )}

          {data && data.items.length > 0 && (
            <div className="mt-4 flex justify-end">
              <ExportCsvButton />
            </div>
          )}
        </div>

        {data && data.total > PAGE_SIZE && (
          <nav aria-label="History pages" className="mt-6 flex items-center justify-center gap-1.5">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1.5 rounded-md text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-zinc-600">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`w-8 py-1.5 rounded-md text-xs font-semibold border transition-colors ${p === page ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"}`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1.5 rounded-md text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </nav>
        )}
      </div>
      {comparison && <AuditComparison comparison={comparison} onClose={() => setComparison(null)} />}
    </div>
  );
}

function HistoryRow({ audit, selected, onToggle, onRevoke, onDelete }: {
  audit: AuditListItem;
  selected: boolean;
  onToggle: () => void;
  onRevoke: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const host = (() => { try { return new URL(audit.url).hostname; } catch { return audit.url; } })();
  const s = audit.scores;

  async function copyShareLink() {
    const link = `${window.location.origin}/report/${audit.id}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API needs a secure context; fall back to a hidden textarea.
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="group flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors">
      <button type="button" onClick={onToggle} aria-pressed={selected} className={`shrink-0 w-16 rounded border px-2 py-1 text-[10px] font-semibold transition-colors ${selected ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"}`}>
        {selected ? "Selected" : "Compare"}
      </button>
      <a href={`/report/${audit.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100 truncate">{audit.title || host}</p>
        <p className="text-[11px] text-zinc-500 truncate">{host} · {new Date(audit.createdAt).toLocaleString()}</p>
      </a>
      {s && (
        <div className="hidden sm:flex items-center gap-1.5 shrink-0" title="Overall · SEO · UX · Performance · Conversion">
          <span className={`text-sm font-bold tabular-nums ${scoreTone(s.overall)}`}>{s.overall ?? "—"}</span>
          <span className="flex items-center gap-1">
            <ScoreChip label="SEO" value={s.seo} />
            <ScoreChip label="UX" value={s.ux} />
            <ScoreChip label="Perf" value={s.performance} />
            <ScoreChip label="CVR" value={s.conversion} />
          </span>
        </div>
      )}
      <button
        onClick={() => { window.location.href = `/?url=${encodeURIComponent(audit.url)}`; }}
        title={`Re-run analysis for ${host}`}
        aria-label={`Re-run analysis for ${host}`}
        className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-violet-300 transition-opacity px-1"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
      {audit.shareable && (
        <button
          onClick={() => void copyShareLink()}
          title="Copy public share link"
          className={`shrink-0 text-[10px] font-medium px-2 py-1 transition-colors ${copied ? "text-emerald-400" : "text-violet-400 hover:text-violet-300"}`}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      )}
      {audit.shareable && <button onClick={onRevoke} className="shrink-0 text-[10px] text-amber-400 hover:text-amber-300 px-2 py-1">Revoke share</button>}
      <button onClick={onDelete} className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-red-400 text-xs px-2 py-1 transition-opacity" aria-label={`Delete audit for ${host}`}>Delete</button>
    </li>
  );
}

function ScoreChip({ label, value }: { label: string; value?: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 rounded bg-zinc-800/70 px-1.5 py-0.5" title={`${label}: ${value ?? "no data"}`}>
      <span className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className={`text-[10px] font-semibold tabular-nums ${scoreTone(value)}`}>{value ?? "—"}</span>
    </span>
  );
}

// ExportCsvButton downloads the full history (all pages) as CSV, client-side.
function ExportCsvButton() {
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    try {
      const all: AuditListItem[] = [];
      let page = 1;
      for (;;) {
        const res = await fetchAuditsPage({ page, limit: 50, sort: "oldest" });
        all.push(...res.items);
        if (all.length >= res.total || res.items.length === 0) break;
        page++;
      }
      const esc = (v: string | number | undefined) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = [
        "url,title,analyzed_at,overall_score,seo_score,ux_score,performance_score,conversion_score,share_link",
        ...all.map((a) => [
          esc(a.url),
          esc(a.title || ""),
          esc(a.createdAt),
          esc(a.scores?.overall ?? ""),
          esc(a.scores?.seo ?? ""),
          esc(a.scores?.ux ?? ""),
          esc(a.scores?.performance ?? ""),
          esc(a.scores?.conversion ?? ""),
          esc(`${window.location.origin}/report/${a.id}`),
        ].join(",")),
      ];
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-history-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not export history");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={() => void exportCsv()}
      disabled={busy}
      className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
    >
      {busy ? "Preparing…" : "Export CSV"}
    </button>
  );
}

// TrendsPanel shows per-URL score movement across saved audits — the
// "72 → 81 in 3 months" retention hook.
function TrendsPanel({ trends }: { trends: AuditTrend[] }) {
  return (
    <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4" aria-label="Score trends">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Score trends</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {trends.map((t) => {
          const delta = t.latest.score - t.first.score;
          const host = (() => { try { return new URL(t.url).hostname.replace(/^www\./, ""); } catch { return t.url; } })();
          const tone = delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-zinc-500";
          const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
          return (
            <li key={t.url} className="flex items-center justify-between gap-3 text-xs">
              <a href={`/?url=${encodeURIComponent(t.url)}`} className="min-w-0 truncate text-zinc-300 hover:text-violet-300 transition-colors" title={`Re-run ${host}`}>
                {host}
              </a>
              <span className="shrink-0 flex items-center gap-2 tabular-nums text-zinc-500">
                <span>{t.first.score}</span>
                <span className={`font-semibold ${tone}`}>{arrow} {delta > 0 ? "+" : ""}{delta}</span>
                <span className="text-zinc-300 font-semibold">{t.latest.score}</span>
                <span className="text-[10px] text-zinc-600">({t.count} audits)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
