import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LogoWordmark } from "../ui/Logo";
import { AuthModal } from "../auth/AuthModal";
import { UserMenu } from "../auth/UserMenu";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAdminOverview,
  updateAdminAnonUsage,
  updateAdminUserPlan,
  updateAdminUserUsage,
  patchAdminUser,
  type AdminOverview,
} from "../../services/authApi";
import {
  AdminInsightsSection,
  BusinessMetricsRow,
  SlowAnalysesCard,
  AuditOutcomesCard,
} from "./AdminInsightsCards";
import { scoreColor } from "../../utils/scoreColors";

// ─── sub-components ─────────────────────────────────────────────────────────

function AnalyticCard({ title, value, sub, color = "text-zinc-100" }: {
  title: string; value: string; sub: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.18em]">{title}</p>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen]     = useState(false);
  const [overview, setOverview]     = useState<AdminOverview | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [busyKey, setBusyKey]       = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro">("all");
  const [activeTab, setActiveTab]     = useState<"users" | "metrics" | "system">("users");
  const [noteModal, setNoteModal]     = useState<{ userId: number; current: string } | null>(null);
  const [noteText, setNoteText]       = useState("");
  const [rowError, setRowError]       = useState<Record<number, string>>({});

  useEffect(() => {
    if (!noteModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setNoteModal(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [noteModal]);

  async function loadOverview() {
    try {
      setError(null);
      const data = await fetchAdminOverview();
      setOverview(data);
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    }
  }

  useEffect(() => {
    if (user) void loadOverview();
  }, [user?.id]);

  // ── derived analytics ──────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!overview) return null;
    const totalUsers    = overview.users.length;
    const proUsers      = overview.users.filter((u) => u.plan === "pro").length;
    const freeUsers     = totalUsers - proUsers;
    const totalAnalyses = overview.users.reduce((s, u) => s + u.dailyUsed, 0)
                        + overview.anonymousVisitors.reduce((s, v) => s + v.dailyUsed, 0);
    const guestAnalyses = overview.anonymousVisitors.reduce((s, v) => s + v.dailyUsed, 0);
    const proRatio      = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0;
    return { totalUsers, proUsers, freeUsers, totalAnalyses, guestAnalyses, proRatio };
  }, [overview]);

  // ── filtered users ─────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!overview) return [];
    return overview.users.filter((u) => {
      const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase());
      const matchPlan   = planFilter === "all" || u.plan === planFilter;
      return matchSearch && matchPlan;
    });
  }, [overview, search, planFilter]);

  // ── actions ────────────────────────────────────────────────────────────────
  async function saveUserUsage(userId: number, count: number) {
    setBusyKey(`user-usage-${userId}`);
    try { await updateAdminUserUsage(userId, count); await loadOverview(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update usage"); }
    finally { setBusyKey(null); }
  }

  async function saveAnonUsage(visitorId: string, count: number) {
    setBusyKey(`anon-usage-${visitorId}`);
    try { await updateAdminAnonUsage(visitorId, count); await loadOverview(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update visitor usage"); }
    finally { setBusyKey(null); }
  }

  async function saveUserPlan(userId: number, plan: "free" | "pro") {
    setBusyKey(`user-plan-${userId}`);
    try { await updateAdminUserPlan(userId, plan, plan === "pro" ? "active" : "inactive"); await loadOverview(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update plan"); }
    finally { setBusyKey(null); }
  }

  async function resetUserUsage(userId: number) {
    setBusyKey(`user-usage-${userId}`);
    try { await updateAdminUserUsage(userId, 0); await loadOverview(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not reset usage"); }
    finally { setBusyKey(null); }
  }

  async function patchUser(userId: number, patch: { plan?: "free" | "pro"; suspended?: boolean; note?: string }) {
    setBusyKey(`patch-${userId}`);
    try {
      await patchAdminUser(userId, patch);
      await loadOverview();
      setRowError(prev => { const next = { ...prev }; delete next[userId]; return next; });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update user";
      setRowError(prev => ({ ...prev, [userId]: msg }));
      // React 18: setState after unmount is a no-op — no cleanup needed
      setTimeout(() => setRowError(prev => { const next = { ...prev }; delete next[userId]; return next; }), 4000);
    } finally {
      setBusyKey(null);
    }
  }

  function exportUsersCsv(users: typeof filteredUsers) {
    const header = "ID,Email,Plan,Status,Daily Used,Daily Limit,Joined";
    const rows = users.map(u =>
      [u.id, u.email, u.plan, u.subscriptionStatus,
       u.dailyUsed, u.dailyLimit, u.createdAt.slice(0, 10)].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <Shell title="Dashboard"><p className="text-sm text-zinc-500">Loading account…</p></Shell>;
  }

  if (!user) {
    return (
      <Shell title="Dashboard">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 max-w-md">
          <h2 className="text-xl font-semibold text-zinc-100">Sign in to open the dashboard</h2>
          <p className="mt-2 text-sm text-zinc-400">This page is for managing daily usage, guest limits, and user plans.</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white bg-violet-500 hover:bg-violet-400 transition-colors"
          >
            Sign in
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </Shell>
    );
  }

  return (
    <Shell title="Dashboard" userMenu={<UserMenu />}>
      <div className="space-y-6">

        {/* ── Business metrics row ── */}
        {overview && <BusinessMetricsRow overview={overview} />}

        {/* ── Analytics cards ── */}
        {analytics && (
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <AnalyticCard title="Total Users"    value={String(analytics.totalUsers)}    sub="registered accounts" />
            <AnalyticCard title="Pro Users"      value={String(analytics.proUsers)}      sub={`${analytics.proRatio}% conversion rate`} color={scoreColor(analytics.proRatio)} />
            <AnalyticCard title="Free Users"     value={String(analytics.freeUsers)}     sub="on free plan" />
            <AnalyticCard title="Analyses Today" value={String(analytics.totalAnalyses)} sub={`${analytics.guestAnalyses} from guests`} />
          </section>
        )}

        {error && (
          <div className="rounded-lg border border-red-800/40 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {overview && (
          <>
            {/* ── Tab bar ── */}
            <div className="flex items-center gap-1 border-b border-zinc-800 pb-0">
              {(["users", "metrics", "system"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                    activeTab === tab
                      ? "border-violet-500 text-violet-300"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
              <div className="ml-auto">
                <button
                  onClick={() => void loadOverview()}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* ── Users tab ── */}
            {activeTab === "users" && (
              <>
                {/* Environment banner */}
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="px-5 py-4 flex flex-wrap gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                      overview.anySignedInIsAdmin
                        ? "border-amber-800/50 bg-amber-950/30 text-amber-400"
                        : "border-emerald-800/50 bg-emerald-950/30 text-emerald-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${overview.anySignedInIsAdmin ? "bg-amber-500" : "bg-emerald-500"}`} />
                      {overview.anySignedInIsAdmin
                        ? "Admin lock: OFF — any signed-in user has access"
                        : `Admin lock: ON — restricted to ${overview.adminEmail}`}
                    </div>
                  </div>
                </section>

                {/* Users table */}
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800/80">
                    <h2 className="text-lg font-semibold text-zinc-100">Users</h2>
                    <p className="text-sm text-zinc-500 mt-1">Manage plans, suspend accounts, and leave internal notes.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search users by email…"
                        className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-violet-500/50 outline-none text-xs text-zinc-200 placeholder:text-zinc-600"
                      />
                      {(["all", "free", "pro"] as const).map(plan => (
                        <button key={plan} type="button" onClick={() => setPlanFilter(plan)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            planFilter === plan
                              ? "text-violet-300 bg-violet-500/10 border-violet-500/25"
                              : "text-zinc-500 bg-zinc-900 border-zinc-800 hover:text-zinc-300"
                          }`}>
                          {plan === "all" ? "All Plans" : plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </button>
                      ))}
                      <button type="button" onClick={() => exportUsersCsv(filteredUsers)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border text-zinc-400 bg-zinc-900 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px]">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-zinc-500 border-b border-zinc-800/80">
                          <th className="px-5 py-3 font-semibold">Email</th>
                          <th className="px-5 py-3 font-semibold">Plan</th>
                          <th className="px-5 py-3 font-semibold">Used</th>
                          <th className="px-5 py-3 font-semibold">Remaining</th>
                          <th className="px-5 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr><td colSpan={5} className="px-5 py-6 text-sm text-zinc-500 text-center">No users match the current filter.</td></tr>
                        ) : filteredUsers.map((row) => (
                          <UserRow
                            key={row.id}
                            row={row}
                            busyKey={busyKey}
                            rowError={rowError[row.id]}
                            onSaveUsage={saveUserUsage}
                            onSavePlan={saveUserPlan}
                            onResetUsage={resetUserUsage}
                            onPatch={patchUser}
                            onOpenNote={(userId, current) => { setNoteModal({ userId, current }); setNoteText(current); }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Anonymous visitors */}
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800/80">
                    <h2 className="text-lg font-semibold text-zinc-100">Anonymous visitors</h2>
                    <p className="text-sm text-zinc-500 mt-1">Guest visitor IDs using the daily allowance.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-zinc-500 border-b border-zinc-800/80">
                          <th className="px-5 py-3 font-semibold">Visitor ID</th>
                          <th className="px-5 py-3 font-semibold">Used</th>
                          <th className="px-5 py-3 font-semibold">Remaining</th>
                          <th className="px-5 py-3 font-semibold">Updated</th>
                          <th className="px-5 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.anonymousVisitors.map((row) => (
                          <VisitorRow key={row.visitorId} row={row} busyKey={busyKey} onSaveUsage={saveAnonUsage} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* ── Metrics tab ── */}
            {activeTab === "metrics" && (
              <div className="space-y-6">
                <AdminInsightsSection overview={overview} onChange={() => void loadOverview()} metricsOnly />
                <SlowAnalysesCard rows={overview.slowAudits ?? []} />
                <AuditOutcomesCard rows={overview.auditOutcomes ?? []} />
              </div>
            )}

            {/* ── System tab ── */}
            {activeTab === "system" && (
              <AdminInsightsSection overview={overview} onChange={() => void loadOverview()} systemOnly />
            )}
          </>
        )}

        {/* ── Note modal ── */}
        {noteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setNoteModal(null)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-zinc-100 mb-3">Admin note</h3>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 outline-none focus:border-violet-500/50 resize-none"
                placeholder="Internal note (only visible to admins)…"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button type="button" onClick={() => setNoteModal(null)}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="button"
                  onClick={() => { void patchUser(noteModal.userId, { note: noteText }); setNoteModal(null); }}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-violet-500 hover:bg-violet-400 transition-colors">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell({ title, userMenu, children }: { title: string; userMenu?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <LogoWordmark size={20} />
            <span className="hidden sm:block text-zinc-700">/</span>
            <span className="text-sm font-semibold text-zinc-300 truncate">{title}</span>
          </div>
          <div className="shrink-0">{userMenu}</div>
        </div>
      </header>
      <main className="px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

// ─── UserRow ──────────────────────────────────────────────────────────────────

function UserRow({
  row, busyKey, rowError, onSaveUsage, onSavePlan, onResetUsage, onPatch, onOpenNote,
}: {
  row: AdminOverview["users"][number];
  busyKey: string | null;
  rowError?: string;
  onSaveUsage: (userId: number, count: number) => Promise<void>;
  onSavePlan: (userId: number, plan: "free" | "pro") => Promise<void>;
  onResetUsage: (userId: number) => Promise<void>;
  onPatch: (userId: number, patch: { plan?: "free"|"pro"; suspended?: boolean; note?: string }) => Promise<void>;
  onOpenNote: (userId: number, current: string) => void;
}) {
  const [count, setCount] = useState(String(row.dailyUsed));
  const isBusy = busyKey === `user-usage-${row.id}` || busyKey === `user-plan-${row.id}` || busyKey === `patch-${row.id}`;

  useEffect(() => { setCount(String(row.dailyUsed)); }, [row.dailyUsed]);

  return (
    <tr className="border-b border-zinc-800/60 last:border-b-0 align-top">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-zinc-100">{row.email}</p>
          {row.suspendedAt && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/25 text-red-400">
              Suspended
            </span>
          )}
          {row.adminNote && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" title={row.adminNote} />
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-1">Joined {new Date(row.createdAt).toLocaleDateString()}</p>
        {rowError && <p className="text-[10px] text-red-400 mt-1">{rowError}</p>}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            row.plan === "pro"
              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
              : "text-zinc-300 bg-zinc-800 border-zinc-700"
          }`}>
            {row.plan === "pro" ? "Pro" : "Free"}
          </span>
          <span className="text-xs text-zinc-500">{row.subscriptionStatus}</span>
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-zinc-200 tabular-nums">{row.dailyUsed}/{row.dailyLimit}</td>
      <td className="px-5 py-4 text-sm text-zinc-400 tabular-nums">{row.dailyRemaining}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-20 px-2.5 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
          />
          <button
            onClick={() => void onSaveUsage(row.id, Math.max(0, Number(count) || 0))}
            disabled={isBusy}
            className="px-3 py-2 rounded-md text-xs font-semibold text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-60 transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => void onResetUsage(row.id)}
            disabled={isBusy}
            className="text-[10px] text-zinc-600 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/30 px-2 py-0.5 rounded transition-colors disabled:opacity-60"
          >
            Reset
          </button>
          <button
            onClick={() => void onSavePlan(row.id, row.plan === "pro" ? "free" : "pro")}
            disabled={isBusy}
            className="px-3 py-2 rounded-md text-xs font-semibold text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-60 transition-colors"
          >
            Make {row.plan === "pro" ? "Free" : "Pro"}
          </button>
          <button
            type="button"
            onClick={() => void onPatch(row.id, { suspended: !row.suspendedAt })}
            disabled={isBusy}
            className={`px-3 py-2 rounded-md text-xs font-semibold border disabled:opacity-60 transition-colors ${
              row.suspendedAt
                ? "text-emerald-300 border-emerald-800/50 bg-emerald-950/30 hover:bg-emerald-900/30"
                : "text-red-300 border-red-800/50 bg-red-950/30 hover:bg-red-900/30"
            }`}
          >
            {row.suspendedAt ? "Unsuspend" : "Suspend"}
          </button>
          <button
            type="button"
            onClick={() => onOpenNote(row.id, row.adminNote ?? "")}
            disabled={isBusy}
            title={row.adminNote || "Add note"}
            className={`px-3 py-2 rounded-md text-xs font-semibold border disabled:opacity-60 transition-colors ${
              row.adminNote
                ? "text-violet-300 border-violet-800/50 bg-violet-950/30 hover:bg-violet-900/30"
                : "text-zinc-400 border-zinc-700 bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            {row.adminNote ? "Edit note" : "Add note"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── VisitorRow ───────────────────────────────────────────────────────────────

function VisitorRow({
  row, busyKey, onSaveUsage,
}: {
  row: AdminOverview["anonymousVisitors"][number];
  busyKey: string | null;
  onSaveUsage: (visitorId: string, count: number) => Promise<void>;
}) {
  const [count, setCount] = useState(String(row.dailyUsed));
  const isBusy = busyKey === `anon-usage-${row.visitorId}`;

  useEffect(() => { setCount(String(row.dailyUsed)); }, [row.dailyUsed]);

  return (
    <tr className="border-b border-zinc-800/60 last:border-b-0 align-top">
      <td className="px-5 py-4">
        <p className="text-sm font-medium text-zinc-100 font-mono break-all">{row.visitorId}</p>
      </td>
      <td className="px-5 py-4 text-sm text-zinc-200 tabular-nums">{row.dailyUsed}/{row.dailyLimit}</td>
      <td className="px-5 py-4 text-sm text-zinc-400 tabular-nums">{row.dailyRemaining}</td>
      <td className="px-5 py-4 text-xs text-zinc-500">{new Date(row.updatedAt).toLocaleString()}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-20 px-2.5 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
          />
          <button
            onClick={() => void onSaveUsage(row.visitorId, Math.max(0, Number(count) || 0))}
            disabled={isBusy}
            className="px-3 py-2 rounded-md text-xs font-semibold text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-60 transition-colors"
          >
            Save usage
          </button>
        </div>
      </td>
    </tr>
  );
}
