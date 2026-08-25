import { useEffect, useMemo, useState } from "react";
import {
  clearAudits,
  compareAudits,
  deleteAudit,
  fetchAudits,
  revokeShare as revokeAuditShare,
  type AuditComparison as AuditComparisonData,
  type AuditListItem,
} from "../../services/authApi";
import { useAuth } from "../../context/useAuth";
import { AuditComparison } from "./AuditComparison";
import { AuthModal } from "./AuthModal";
import { RowSkeleton } from "../ui/Skeletons";

// Full-page audit history — replaces the old HistoryModal. Adds search over
// title/URL, keeps compare-two, delete, clear-all, and share revocation.
export function HistoryPage() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [items, setItems] = useState<AuditListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<AuditComparisonData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setError(null);
    fetchAudits()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load history"));
  }, [user]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) =>
      (a.title || "").toLowerCase().includes(q) || a.url.toLowerCase().includes(q),
    );
  }, [items, search]);

  async function remove(id: string) {
    if (!confirm("Delete this audit from your history?")) return;
    try {
      await deleteAudit(id);
      setItems((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
      setSelectedIds((prev) => prev.filter((selected) => selected !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function clearAll() {
    if (!confirm("Permanently delete all audits from your history? This cannot be undone.")) return;
    try {
      await clearAudits();
      setItems([]);
      setSelectedIds([]);
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
      setItems((prev) => prev?.map((item) => item.id === id ? { ...item, shareable: false } : item) ?? prev);
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

  return (
    <div className="flex-1 px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Audit history</h1>
            <p className="mt-1 text-xs text-zinc-500">
              {items === null ? "Loading…" : `${items.length} saved ${items.length === 1 ? "audit" : "audits"} · select two to compare changes over time`}
            </p>
          </div>
          {items && items.length > 0 && (
            <button onClick={() => void clearAll()} className="text-[11px] font-medium text-zinc-500 hover:text-red-400 transition-colors">
              Clear history
            </button>
          )}
        </div>

        {items && items.length > 0 && (
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 focus-within:border-violet-500/40 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or URL…"
                aria-label="Search audit history"
                className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="text-zinc-500 hover:text-zinc-300 text-xs leading-none">×</button>
              )}
            </div>
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
          {!items && !error && <RowSkeleton rows={5} />}
          {error && <div className="text-xs text-red-400 bg-red-950/50 border border-red-800/40 rounded px-3 py-2">{error}</div>}
          {items && items.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-zinc-400">No audits yet</p>
              <p className="mt-1 text-xs text-zinc-500">Run your first analysis to see it here.</p>
              <a href="/" className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-md text-xs font-semibold text-white bg-violet-500 hover:bg-violet-400 transition-colors">Analyze a website</a>
            </div>
          )}
          {items && items.length > 0 && filtered.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-10">No audits match “{search}”.</p>
          )}
          {filtered.length > 0 && (
            <ul className="flex flex-col gap-1">
              {filtered.map((a) => {
                const host = (() => { try { return new URL(a.url).hostname; } catch { return a.url; } })();
                const selected = selectedIds.includes(a.id);
                return (
                  <li key={a.id} className="group flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors">
                    <button type="button" onClick={() => toggleSelection(a.id)} aria-pressed={selected} className={`shrink-0 w-16 rounded border px-2 py-1 text-[10px] font-semibold transition-colors ${selected ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"}`}>
                      {selected ? "Selected" : "Compare"}
                    </button>
                    <a href={`/report/${a.id}`} className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{a.title || host}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{host} · {new Date(a.createdAt).toLocaleString()}</p>
                    </a>
                    {a.shareable && <button onClick={() => void revokeShare(a.id)} className="shrink-0 text-[10px] text-amber-400 hover:text-amber-300 px-2 py-1">Revoke share</button>}
                    <button onClick={() => void remove(a.id)} className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-red-400 text-xs px-2 py-1 transition-opacity" aria-label={`Delete audit for ${host}`}>Delete</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {comparison && <AuditComparison comparison={comparison} onClose={() => setComparison(null)} />}
    </div>
  );
}
