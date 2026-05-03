import { useEffect, useState } from "react";
import { fetchAudits, deleteAudit, type AuditListItem } from "../../services/authApi";

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

  useEffect(() => {
    if (!open) return;
    setItems(null);
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
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Audit history</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 text-xl leading-none"
            aria-label="Close"
          >×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!items && !error && (
            <p className="text-xs text-zinc-500 text-center py-10">Loading…</p>
          )}
          {error && (
            <div className="m-3 text-xs text-red-400 bg-red-950/50 border border-red-800/40 rounded px-3 py-2">{error}</div>
          )}
          {items && items.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-10">
              No audits yet — run your first analysis to see it here.
            </p>
          )}
          {items && items.length > 0 && (
            <ul className="flex flex-col">
              {items.map((a) => {
                const host = (() => { try { return new URL(a.url).hostname; } catch { return a.url; } })();
                return (
                  <li
                    key={a.id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded hover:bg-zinc-800/50 transition-colors"
                  >
                    <button
                      onClick={() => { onOpenAudit(a.id); onClose(); }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-zinc-100 truncate">{a.title || host}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{host} · {new Date(a.createdAt).toLocaleString()}</p>
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-xs px-2 py-1 transition-opacity"
                      aria-label="Delete"
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
