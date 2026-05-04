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
  type AdminOverview,
} from "../../services/authApi";

export function AdminDashboard() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

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
    if (user) {
      void loadOverview();
    }
  }, [user?.id]);

  const totals = useMemo(() => {
    if (!overview) return { users: 0, pro: 0, guest: 0, analyses: 0 };
    return {
      users: overview.users.length,
      pro: overview.users.filter((u) => u.plan === "pro").length,
      guest: overview.anonymousVisitors.length,
      analyses: overview.users.reduce((sum, u) => sum + u.dailyUsed, 0) + overview.anonymousVisitors.reduce((sum, v) => sum + v.dailyUsed, 0),
    };
  }, [overview]);

  async function saveUserUsage(userId: number, count: number) {
    setBusyKey(`user-usage-${userId}`);
    try {
      await updateAdminUserUsage(userId, count);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update usage");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveAnonUsage(visitorId: string, count: number) {
    setBusyKey(`anon-usage-${visitorId}`);
    try {
      await updateAdminAnonUsage(visitorId, count);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update visitor usage");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveUserPlan(userId: number, plan: "free" | "pro") {
    setBusyKey(`user-plan-${userId}`);
    try {
      await updateAdminUserPlan(userId, plan, plan === "pro" ? "active" : "inactive");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update plan");
    } finally {
      setBusyKey(null);
    }
  }

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
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Metric title="Users" value={String(totals.users)} note="registered accounts" />
          <Metric title="Pro" value={String(totals.pro)} note="active plan holders" />
          <Metric title="Guests" value={String(totals.guest)} note="today's anonymous visitors" />
          <Metric title="Usage" value={String(totals.analyses)} note="analyses counted today" />
        </section>

        {error && (
          <div className="rounded-lg border border-red-800/40 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {overview && (
          <>
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/80 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">Overview</p>
                  <h2 className="mt-1 text-xl font-semibold text-zinc-100">Daily controls for {overview.currentDate}</h2>
                </div>
                <button
                  onClick={() => void loadOverview()}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md text-xs font-semibold text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-zinc-400">
                  {overview.anySignedInIsAdmin
                    ? "Admin mode is open to any signed-in user because ADMIN_EMAIL is not set."
                    : `Admin access is restricted to ${overview.adminEmail}.`}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/80">
                <h2 className="text-lg font-semibold text-zinc-100">Users</h2>
                <p className="text-sm text-zinc-500 mt-1">Adjust today’s count or switch someone between Free and Pro.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
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
                    {overview.users.map((row) => (
                      <UserRow
                        key={row.id}
                        row={row}
                        busyKey={busyKey}
                        onSaveUsage={saveUserUsage}
                        onSavePlan={saveUserPlan}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/80">
                <h2 className="text-lg font-semibold text-zinc-100">Anonymous visitors</h2>
                <p className="text-sm text-zinc-500 mt-1">These are the visitor IDs currently using the guest daily allowance.</p>
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
                      <VisitorRow
                        key={row.visitorId}
                        row={row}
                        busyKey={busyKey}
                        onSaveUsage={saveAnonUsage}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}

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
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-3 text-3xl font-bold text-zinc-100 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
    </div>
  );
}

function UserRow({
  row,
  busyKey,
  onSaveUsage,
  onSavePlan,
}: {
  row: AdminOverview["users"][number];
  busyKey: string | null;
  onSaveUsage: (userId: number, count: number) => Promise<void>;
  onSavePlan: (userId: number, plan: "free" | "pro") => Promise<void>;
}) {
  const [count, setCount] = useState(String(row.dailyUsed));
  const isBusy = busyKey === `user-usage-${row.id}` || busyKey === `user-plan-${row.id}`;

  useEffect(() => {
    setCount(String(row.dailyUsed));
  }, [row.dailyUsed]);

  return (
    <tr className="border-b border-zinc-800/60 last:border-b-0 align-top">
      <td className="px-5 py-4">
        <p className="text-sm font-medium text-zinc-100">{row.email}</p>
        <p className="text-xs text-zinc-500 mt-1">Joined {new Date(row.createdAt).toLocaleDateString()}</p>
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
            Save usage
          </button>
          <button
            onClick={() => void onSavePlan(row.id, row.plan === "pro" ? "free" : "pro")}
            disabled={isBusy}
            className="px-3 py-2 rounded-md text-xs font-semibold text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-60 transition-colors"
          >
            Make {row.plan === "pro" ? "Free" : "Pro"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function VisitorRow({
  row,
  busyKey,
  onSaveUsage,
}: {
  row: AdminOverview["anonymousVisitors"][number];
  busyKey: string | null;
  onSaveUsage: (visitorId: string, count: number) => Promise<void>;
}) {
  const [count, setCount] = useState(String(row.dailyUsed));
  const isBusy = busyKey === `anon-usage-${row.visitorId}`;

  useEffect(() => {
    setCount(String(row.dailyUsed));
  }, [row.dailyUsed]);

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
