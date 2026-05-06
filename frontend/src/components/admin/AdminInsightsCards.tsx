import { useState } from "react";
import {
  toggleAdminFlag,
  adminBroadcastEmail,
  type AdminOverview,
  type RecentAuditRow,
  type DayCount,
  type UrlCount,
  type FailureEntry,
  type SystemHealth,
  type BroadcastResult,
} from "../../services/authApi";

// ─── Business Metrics Row ────────────────────────────────────────────────────
export function BusinessMetricsRow({ overview }: { overview: AdminOverview }) {
  const { users, auditsByDay } = overview;

  const totalUsers    = users.length;
  const proUsers      = users.filter(u => u.plan === "pro").length;
  const freeToProRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : "0.0";
  const todayStr      = new Date().toISOString().slice(0, 10);
  const auditsToday   = (auditsByDay.find(d => d.date === todayStr)?.count ?? 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total Users",  value: totalUsers         },
        { label: "Pro Users",    value: proUsers           },
        { label: "Free → Pro",   value: `${freeToProRate}%` },
        { label: "Audits Today", value: auditsToday        },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3.5">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-zinc-100 tabular-nums leading-none">{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── shared shell ────────────────────────────────────────────────────────────
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function timeAgo(iso: string): string {
  if (!iso || iso.startsWith("0001")) return "never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── 1. Recent Audits ────────────────────────────────────────────────────────
export function RecentAuditsCard({ rows }: { rows: RecentAuditRow[] }) {
  return (
    <Card title="Recent Audits">
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500">No audits yet.</p>
      ) : (
        <ul className="flex flex-col -my-1.5 max-h-72 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-800/50 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-200 font-medium truncate">{r.title || host(r.url)}</p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {host(r.url)}
                  {r.email && <span className="text-zinc-600"> · {r.email}</span>}
                </p>
              </div>
              <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">{timeAgo(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── 2. Failure Log ──────────────────────────────────────────────────────────
export function FailureLogCard({ rows }: { rows: FailureEntry[] }) {
  const errorsLastDay = rows.filter(r => Date.now() - new Date(r.at).getTime() < 86400_000).length;

  const failsByDomain = rows.reduce((acc, r) => {
    const h = host(r.url);
    acc[h] = (acc[h] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topFails = Object.entries(failsByDomain)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card
      title="Failure Log"
      action={<span className="text-[10px] text-zinc-500">{errorsLastDay} failures · last 24h</span>}
    >
      {rows.length === 0 ? (
        <p className="text-xs text-emerald-400/80">No failures recorded — everything's running clean.</p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {rows.map((r, i) => (
            <li key={i} className="flex items-start gap-3 px-3 py-2 rounded bg-red-950/20 border border-red-900/30">
              <span className="text-[10px] text-zinc-500 font-mono tabular-nums shrink-0 mt-0.5">{timeAgo(r.at)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-zinc-300 truncate">{host(r.url)}</p>
                <p className="text-[10px] text-red-400 break-words">{r.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {topFails.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-800/60">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Most Failed Domains
          </p>
          <ul className="flex flex-col gap-1">
            {topFails.map(([domain, count]) => (
              <li key={domain} className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 truncate">{domain}</span>
                <span className="text-red-400 tabular-nums shrink-0 ml-2">{count}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ─── 3. Audits per day chart ─────────────────────────────────────────────────
export function AuditsChartCard({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map(d => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  return (
    <Card title="Audits — Last 14 Days" action={<span className="text-[10px] text-zinc-500">{total} total</span>}>
      <div className="flex items-end gap-1 h-24">
        {days.map((d) => {
          const pct = (d.count / max) * 100;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group" title={`${d.date}: ${d.count}`}>
              <div className="relative w-full flex items-end h-20">
                <div
                  className="w-full bg-violet-500/70 group-hover:bg-violet-400 rounded-t transition-colors"
                  style={{ height: `${pct}%`, minHeight: d.count > 0 ? "2px" : "0px" }}
                />
              </div>
              <span className="text-[9px] text-zinc-600 tabular-nums">{d.date.slice(8)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── 4. Top URLs ─────────────────────────────────────────────────────────────
export function TopUrlsCard({ rows }: { rows: UrlCount[] }) {
  const max = rows[0]?.count ?? 1;
  return (
    <Card title="Top URLs Analyzed" action={<span className="text-[10px] text-zinc-500">last 30 days</span>}>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500">No analyses in the last 30 days.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.url} className="flex items-center gap-3">
              <span className="text-xs text-zinc-300 truncate flex-shrink-0 w-32 sm:w-44">{host(r.url)}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500/70 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
              <span className="text-[11px] text-zinc-500 tabular-nums w-8 text-right">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── 8. System Health ────────────────────────────────────────────────────────
function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-800/50 last:border-b-0">
      <span className="text-xs text-zinc-300">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {detail && <span className="text-[10px] text-zinc-500 tabular-nums">{detail}</span>}
        <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
      </div>
    </div>
  );
}

export function SystemHealthCard({ h }: { h: SystemHealth }) {
  const psHealthy = !!h.pagespeedKeySet && (!h.pagespeed.lastErrorAt || h.pagespeed.lastErrorAt < h.pagespeed.lastSuccessAt);
  const reHealthy = !!h.resendKeySet && (!h.resend.lastErrorAt || h.resend.lastErrorAt < h.resend.lastSuccessAt);
  return (
    <Card title="System Health">
      <div className="flex flex-col">
        <HealthRow label="Database"          ok={h.dbOk}             detail={h.dbOk ? `${h.dbLatencyMs}ms` : "down"} />
        <HealthRow label="JWT Secret"        ok={h.jwtSecretSet}     detail={h.jwtSecretSet ? "configured" : "missing"} />
        <HealthRow label="PageSpeed API"     ok={psHealthy}          detail={h.pagespeedKeySet ? `success ${timeAgo(h.pagespeed.lastSuccessAt)}` : "no key"} />
        <HealthRow label="Resend (email)"    ok={reHealthy}          detail={h.resendKeySet ? `success ${timeAgo(h.resend.lastSuccessAt)}` : "no key"} />
        <HealthRow label="Stripe"            ok={h.stripeKeySet}     detail={h.stripeKeySet ? "configured" : "no key"} />
      </div>
      {h.pagespeed.lastErrorMsg && (
        <p className="mt-3 text-[10px] text-red-400 break-words">PageSpeed last error: {h.pagespeed.lastErrorMsg}</p>
      )}
      {h.resend.lastErrorMsg && (
        <p className="mt-1 text-[10px] text-red-400 break-words">Resend last error: {h.resend.lastErrorMsg}</p>
      )}
    </Card>
  );
}

// ─── 9. Feature Flags ────────────────────────────────────────────────────────
const FLAG_LABELS: Record<string, { label: string; desc: string }> = {
  pagespeed_enabled: { label: "PageSpeed API", desc: "Run Google PageSpeed Insights for every analysis." },
  email_enabled:     { label: "Email sending",  desc: "Send password reset codes and admin broadcasts via Resend." },
};

export function FeatureFlagsCard({ flags, onChange }: { flags: Record<string, boolean>; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(name: string, current: boolean) {
    setBusy(name);
    try {
      await toggleAdminFlag(name, !current);
      onChange();
    } catch {
      // surface error state? keep it quiet for now
    } finally {
      setBusy(null);
    }
  }

  const entries = Object.entries(flags);
  return (
    <Card title="Feature Flags">
      {entries.length === 0 ? (
        <p className="text-xs text-zinc-500">No flags registered.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map(([name, enabled]) => {
            const meta = FLAG_LABELS[name] ?? { label: name, desc: "" };
            return (
              <li key={name} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-200">{meta.label}</p>
                  {meta.desc && <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{meta.desc}</p>}
                </div>
                <button
                  onClick={() => void toggle(name, enabled)}
                  disabled={busy === name}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
                    enabled
                      ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20"
                      : "text-red-300 bg-red-500/10 border-red-500/25 hover:bg-red-500/20"
                  }`}
                >
                  {busy === name ? "…" : enabled ? "Enabled" : "Disabled"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-[10px] text-zinc-600">Flags are in-memory; restarting the backend resets them to enabled.</p>
    </Card>
  );
}

// ─── 10. Broadcast Email ─────────────────────────────────────────────────────
export function BroadcastEmailCard({ totalUsers }: { totalUsers: number }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (!subject.trim() || !body.trim()) return;
    if (!confirm(`Send this email to ${totalUsers} user${totalUsers === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    setResult(null);
    setErr(null);
    try {
      const r = await adminBroadcastEmail(subject.trim(), body.trim());
      setResult(r);
      setSubject("");
      setBody("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Broadcast failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Broadcast Email" action={<span className="text-[10px] text-zinc-500">{totalUsers} recipients</span>}>
      <div className="flex flex-col gap-2.5">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          maxLength={120}
          className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 focus:border-violet-500/50 outline-none text-sm text-zinc-100 placeholder:text-zinc-600"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Plain-text body. One-shot announcement. Sent to every user with an email on file."
          rows={5}
          maxLength={4000}
          className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 focus:border-violet-500/50 outline-none text-sm text-zinc-100 placeholder:text-zinc-600 resize-y"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] text-zinc-600">{body.length} / 4000 chars</p>
          <button
            onClick={() => void send()}
            disabled={busy || !subject.trim() || !body.trim()}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-violet-500 hover:bg-violet-400 text-violet-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Sending…" : "Send broadcast"}
          </button>
        </div>
        {result && (
          <p className="text-xs text-emerald-400">
            Sent {result.sent} of {result.total}{result.failed > 0 && <span className="text-amber-400"> · {result.failed} failed</span>}.
          </p>
        )}
        {err && <p className="text-xs text-red-400">{err}</p>}
      </div>
    </Card>
  );
}

// ─── Bundle for convenient import ────────────────────────────────────────────
export function AdminInsightsSection({ overview, onChange }: { overview: AdminOverview; onChange: () => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RecentAuditsCard rows={overview.recentAudits} />
      <FailureLogCard rows={overview.failureLog} />
      <AuditsChartCard days={overview.auditsByDay} />
      <TopUrlsCard rows={overview.topUrls} />
      <SystemHealthCard h={overview.systemHealth} />
      <FeatureFlagsCard flags={overview.featureFlags} onChange={onChange} />
      <div className="lg:col-span-2">
        <BroadcastEmailCard totalUsers={overview.users.length} />
      </div>
    </div>
  );
}
