import { useEffect, useMemo, useRef, useState } from "react";
import {
  createApiKey,
  fetchUsageHistory,
  listApiKeys,
  revokeApiKey,
  type ApiKey,
  type CreatedApiKey,
  type UsageHistory,
} from "../../services/authApi";

type AccountTab = "usage" | "keys";

export function AccountDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<AccountTab>("usage");
  const [usage, setUsage] = useState<UsageHistory | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // After the first successful load, reopening refreshes silently in place
  // instead of showing the loading placeholder again.
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!loadedOnce.current) setLoading(true);
    Promise.all([fetchUsageHistory(), listApiKeys()])
      .then(([usageData, keyData]) => {
        setUsage(usageData);
        setKeys(keyData);
        loadedOnce.current = true;
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load account settings"))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (open) return;
    // Secrets are intentionally ephemeral: closing the dashboard removes the
    // only plaintext copy returned by the server.
    setNewKey(null);
    setCopied(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    // Lock background scrolling while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const maxDayCount = useMemo(() => Math.max(1, usage?.current.dailyLimit ?? 1, ...(usage?.days.map((day) => day.count) ?? [])), [usage]);

  if (!open) return null;

  async function copy(value: string, label: string) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // Clipboard API unavailable/denied — fall back to the legacy path.
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      } finally {
        document.body.removeChild(el);
      }
    }
    if (!ok) return;
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function handleCreateKey() {
    setBusy("create-key");
    setError(null);
    try {
      setNewKey(await createApiKey(keyName));
      setKeyName("");
      setKeys(await listApiKeys());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create API key");
    } finally {
      setBusy(null);
    }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm("Revoke this API key? Integrations using it will stop working.")) return;
    setBusy(id);
    try {
      await revokeApiKey(id);
      setKeys((prev) => prev.map((key) => key.id === id ? { ...key, revokedAt: new Date().toISOString() } : key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke API key");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="account-dashboard-title" className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Account</p>
            <h2 id="account-dashboard-title" className="mt-1 text-base font-semibold text-zinc-100">Usage & API keys</h2>
          </div>
          <button onClick={onClose} aria-label="Close account dashboard" className="text-xl leading-none text-zinc-500 hover:text-zinc-200">×</button>
        </div>

        <div className="flex gap-1 border-b border-zinc-800 px-4 pt-3">
          {(["usage", "keys"] as AccountTab[]).map((item) => (
            <button type="button" key={item} aria-pressed={tab === item} onClick={() => setTab(item)} className={`rounded-t-md px-3 py-2 text-xs font-semibold capitalize transition-colors ${tab === item ? "border-b-2 border-violet-400 text-violet-300" : "text-zinc-500 hover:text-zinc-300"}`}>
              {item === "keys" ? "API keys" : item}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading && <p className="py-10 text-center text-xs text-zinc-500">Loading account data…</p>}
          {error && <div className="mb-4 rounded border border-red-800/40 bg-red-950/50 px-3 py-2 text-xs text-red-300">{error}</div>}

          {!loading && tab === "usage" && usage && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"><p className="text-[10px] uppercase tracking-wider text-zinc-500">Plan</p><p className="mt-2 text-lg font-semibold capitalize text-zinc-100">{usage.current.plan}</p></div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"><p className="text-[10px] uppercase tracking-wider text-zinc-500">Today</p><p className="mt-2 text-lg font-semibold text-zinc-100">{usage.current.dailyUsed}/{usage.current.dailyLimit >= 999999 ? "∞" : usage.current.dailyLimit}</p></div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"><p className="text-[10px] uppercase tracking-wider text-zinc-500">API requests</p><p className="mt-2 text-lg font-semibold text-zinc-100">{usage.apiRequestsLast30Days}</p><p className="text-[10px] text-zinc-600">last 30 days</p></div>
              </div>
              <div>
                <div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-zinc-200">Analysis activity</h3><span className="text-[10px] text-zinc-600">last 30 days</span></div>
                <div className="mt-3 flex h-28 items-end gap-1 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-3">
                  {usage.days.length === 0 && <p className="w-full text-center text-xs text-zinc-600">No saved usage history yet.</p>}
                  {usage.days.map((day) => <div key={day.date} className="group flex h-full flex-1 flex-col justify-end gap-1" title={`${day.date}: ${day.count} analyses`}><div className="min-h-1 rounded-sm bg-violet-500/70 group-hover:bg-violet-400" style={{ height: `${Math.max(4, (day.count / maxDayCount) * 100)}%` }} /><span className="truncate text-center text-[8px] text-zinc-700">{day.date.slice(5)}</span></div>)}
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500">API keys let scripts and CI bots run analyses and compare saved audits programmatically.</p>
            </div>
          )}

          {!loading && tab === "keys" && (
            <div className="space-y-4">
              <div><h3 className="text-sm font-semibold text-zinc-100">API keys</h3><p className="mt-1 text-xs text-zinc-500">Create a key for scripts and integrations. The secret is shown only once.</p></div>
              {newKey && <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-3"><p className="text-xs font-semibold text-amber-300">Copy this key now</p><p className="mt-1 text-[11px] text-amber-200/70">It cannot be displayed again after closing this panel.</p><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 break-all rounded bg-zinc-950 px-2 py-2 text-[11px] text-zinc-200">{newKey.key}</code><button onClick={() => void copy(newKey.key, "api-key")} className="shrink-0 rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">{copied === "api-key" ? "Copied" : "Copy"}</button></div><button onClick={() => setNewKey(null)} className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300">I saved it</button></div>}
              <div className="flex gap-2"><label htmlFor="api-key-name" className="sr-only">API key name</label><input id="api-key-name" value={keyName} onChange={(e) => setKeyName(e.target.value)} maxLength={64} placeholder="Key name, e.g. CI audit bot" className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500/50" /><button type="button" onClick={() => void handleCreateKey()} disabled={busy === "create-key"} className="rounded-md bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50">{busy === "create-key" ? "Creating…" : "Create key"}</button></div>
              <div className="space-y-2">{keys.map((key) => <div key={key.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-zinc-200">{key.name}</p><p className="mt-1 text-[10px] text-zinc-600"><code>{key.prefix}…</code> · {key.todayRequests} requests today · created {new Date(key.createdAt).toLocaleDateString()}</p></div>{key.revokedAt ? <span className="text-[10px] text-red-400">Revoked</span> : <button onClick={() => void handleRevokeKey(key.id)} disabled={busy === key.id} className="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50">Revoke</button>}</div>)}{keys.length === 0 && <p className="py-6 text-center text-xs text-zinc-600">No API keys yet.</p>}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
