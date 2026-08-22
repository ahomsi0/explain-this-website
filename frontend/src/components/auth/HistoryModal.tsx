import { useEffect, useState } from "react";
import {
  clearAudits,
  compareAudits,
  deleteAudit,
  fetchAudits,
  revokeShare as revokeAuditShare,
  type AuditComparison as AuditComparisonData,
  type AuditListItem,
} from "../../services/authApi";
import { AuditComparison } from "./AuditComparison";
import { RowSkeleton } from "../ui/Skeletons";

export function HistoryModal({
  open,
  onClose,
  onOpenAudit,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAudit: (id: string) => void;
}) {
  const [items, setItems] = useState<AuditListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<AuditComparisonData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
    setComparison(null);
    setError(null);
    fetchAudits()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load history"));
  }, [open]);

  // ESC closes.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
        <div role="dialog" aria-modal="true" aria-labelledby="history-modal-title" className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800">
            <div>
              <h2 id="history-modal-title" className="text-sm font-semibold text-zinc-100">Audit history</h2>
              <p className="mt-1 text-[11px] text-zinc-500">Select two audits to compare changes over time.</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.length === 2 && (
                <button onClick={() => void compareSelected()} disabled={compareLoading} className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 disabled:opacity-50">
                  {compareLoading ? "Comparing…" : "Compare selected"}
                </button>
              )}
              {items && items.length > 0 && <button onClick={() => void clearAll()} className="text-[11px] font-medium text-zinc-500 hover:text-red-400 transition-colors">Clear history</button>}
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none" aria-label="Close">×</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {!items && !error && (
              <div className="p-3">
                <RowSkeleton rows={5} />
              </div>
            )}
            {error && <div className="m-3 text-xs text-red-400 bg-red-950/50 border border-red-800/40 rounded px-3 py-2">{error}</div>}
            {items && items.length === 0 && <p className="text-xs text-zinc-500 text-center py-10">No audits yet — run your first analysis to see it here.</p>}
            {items && items.length > 0 && (
              <ul className="flex flex-col">
                {items.map((a) => {
                  const host = (() => { try { return new URL(a.url).hostname; } catch { return a.url; } })();
                  const selected = selectedIds.includes(a.id);
                  return (
                    <li key={a.id} className="group flex items-center gap-2 px-3 py-2.5 rounded hover:bg-zinc-800/50 transition-colors">
                      <button type="button" onClick={() => toggleSelection(a.id)} aria-pressed={selected} className={`shrink-0 w-16 rounded border px-2 py-1 text-[10px] font-semibold transition-colors ${selected ? "border-violet-500/50 bg-violet-500/15 text-violet-300" : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"}`}>
                        {selected ? "Selected" : "Compare"}
                      </button>
                      <button onClick={() => { onOpenAudit(a.id); onClose(); }} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-zinc-100 truncate">{a.title || host}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{host} · {new Date(a.createdAt).toLocaleString()}</p>
                      </button>
                      {a.shareable && <button onClick={() => void revokeShare(a.id)} className="text-[10px] text-amber-400 hover:text-amber-300 px-2 py-1">Revoke share</button>}
                      <button onClick={() => void remove(a.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-xs px-2 py-1 transition-opacity" aria-label="Delete">Delete</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      {comparison && <AuditComparison comparison={comparison} onClose={() => setComparison(null)} />}
    </>
  );
}
