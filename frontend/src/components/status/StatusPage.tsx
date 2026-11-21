import { useEffect, useState } from "react";
import { fetchSiteStatus, type SiteStatus } from "../../services/authApi";
import { Chip, IconBadge, Panel, PageMain, secondaryBtn, type Tone } from "../ui/Panel";
import type { IconName } from "../ui/icons";

interface Service {
  label: string;
  description: string;
  icon: IconName;
}

// The old keys stay mapped so the page reads right while the frontend and
// the backend deploy at different times.
const AI: Service = { label: "AI summaries", description: "The plain-English summary at the top of each report", icon: "sparkle" };
const PERFORMANCE: Service = { label: "Performance data", description: "Speed scores and Core Web Vitals", icon: "bolt" };
const EMAIL: Service = { label: "Email delivery", description: "Sign-up links and password reset codes", icon: "mail" };
const SERVICES: Record<string, Service> = {
  database: { label: "Database", description: "Accounts, audit history and saved reports", icon: "database" },
  ai: AI,
  performance: PERFORMANCE,
  email: EMAIL,
  groq: AI,
  pagespeed: PERFORMANCE,
  resend: EMAIL,
};
const ORDER = ["database", "ai", "groq", "performance", "pagespeed", "email", "resend"];

function stateChip(state?: string): { text: string; tone: Tone } {
  if (state === "ok") return { text: "Operational", tone: "emerald" };
  if (state === "down") return { text: "Down", tone: "red" };
  return { text: "No recent data", tone: "zinc" }; // idle: not called lately, not a failure
}

// /status — public, human-readable view of /api/status for visitors and for
// linking from an external uptime monitor.
export function StatusPage() {
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetchSiteStatus().then((s) => { setStatus(s); setError(null); }).catch(() => setError("Could not reach the status endpoint."));
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const checks = status ? Object.entries(status.checks).sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b)) : [];
  const working = checks.filter(([, s]) => s !== "down").length;
  const allOk = status?.status === "ok";
  const checkedAt = status ? new Date(status.time).toLocaleTimeString() : null;

  const banner = error
    ? { tone: "red" as Tone, icon: "alert" as IconName, title: "Status unavailable", text: error, wrap: "border-red-500/25 from-red-500/10" }
    : !status
      ? { tone: "zinc" as Tone, icon: "clock" as IconName, title: "Checking…", text: "Asking each service how it is doing.", wrap: "border-zinc-800 from-zinc-800/40" }
      : allOk
        ? { tone: "emerald" as Tone, icon: "check" as IconName, title: "All systems operational", text: `${working} of ${checks.length} services working · refreshes every minute`, wrap: "border-emerald-500/20 from-emerald-500/10" }
        : { tone: "amber" as Tone, icon: "alert" as IconName, title: "Some systems are degraded", text: "Analyses may be slower or partly unavailable. This page refreshes every minute.", wrap: "border-amber-500/25 from-amber-500/10" };

  return (
    <PageMain width="max-w-5xl">
      <h1 className="mb-4 text-[13px] font-semibold text-zinc-400">System status</h1>
      <div className={`rounded-2xl border bg-gradient-to-br to-transparent p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${banner.wrap}`}>
        <div className="flex items-center gap-4 sm:gap-5">
          <IconBadge icon={banner.icon} tone={banner.tone} size="lg" />
          <div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100" role="status">{banner.title}</p>
            <p className="mt-1 text-[14px] text-zinc-400">{banner.text}</p>
          </div>
        </div>
        {checkedAt && (
          <span className="self-start sm:self-auto rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[12px] text-zinc-400">
            Last checked {checkedAt}
          </span>
        )}
      </div>

      {checks.length > 0 && (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2" aria-label="Services">
          {checks.map(([key, state]) => {
            const service = SERVICES[key] ?? { label: key, description: "", icon: "layers" as IconName };
            const chip = stateChip(state);
            return (
              <li key={key}>
                <Panel className="h-full flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <IconBadge icon={service.icon} tone={state === "down" ? "red" : "violet"} />
                    <Chip tone={chip.tone}>{chip.text}</Chip>
                  </div>
                  <h2 className="mt-5 text-[15px] font-semibold text-zinc-100">{service.label}</h2>
                  {service.description && <p className="mt-1 text-[13px] text-zinc-500">{service.description}</p>}
                  {checkedAt && <div className="mt-auto pt-5"><p className="pt-4 border-t border-zinc-800 text-[12px] text-zinc-500">Checked {checkedAt}</p></div>}
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      <Panel className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-100">Something not working?</h2>
          <p className="mt-1 text-[13px] text-zinc-500">If a service shows as fine but isn’t, tell us and we’ll look.</p>
        </div>
        <a href="mailto:support@explainthiswebsite.com" className={`${secondaryBtn} shrink-0`}>Contact support</a>
      </Panel>
    </PageMain>
  );
}
