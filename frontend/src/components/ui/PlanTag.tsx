// The account's plan as a small mono tag, the same treatment as the other
// status tags on the site. Paid plans take the brand violet; nothing is filled
// or outlined.

export function PlanTag({ plan, className = "" }: { plan: string; className?: string }) {
  const paid = plan === "pro" || plan === "owner";
  const label = plan === "owner" ? "Owner" : plan === "pro" ? "Pro" : "Free";
  return (
    <span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${paid ? "text-violet-300" : "text-zinc-400"} ${className}`}>
      {label}
    </span>
  );
}
