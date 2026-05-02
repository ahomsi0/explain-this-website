import type { TechItem } from "../../types/analysis";
import { getTechDescription, getTechRoleLabel, getTechIcon } from "../../lib/techMeta";

const CATEGORY_ORDER = ["ai-builder", "cms", "ecommerce", "builder", "framework", "analytics", "cdn", "media"];

function confidenceBadgeClass(confidence: TechItem["confidence"]) {
  if (confidence === "high") {
    return "bg-emerald-950 text-emerald-400 border-emerald-800";
  }
  if (confidence === "medium") {
    return "bg-amber-950 text-amber-400 border-amber-800";
  }
  return "bg-zinc-800 text-zinc-400 border-zinc-700";
}

function confidenceBadgeText(confidence: TechItem["confidence"]) {
  if (confidence === "high")   return "Verified";
  if (confidence === "medium") return "Detected";
  return "Possible";
}

function TechCard({ tech }: { tech: TechItem }) {
  const description = getTechDescription(tech);
  const role = getTechRoleLabel(tech);
  const icon = getTechIcon(tech.category);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-col">
      {/* Top row: icon + confidence badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-violet-400">
          {icon}
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${confidenceBadgeClass(tech.confidence)}`}>
          {confidenceBadgeText(tech.confidence)}
        </span>
      </div>

      {/* Name + description */}
      <div className="flex-1 mb-3">
        <h3 className="text-sm font-semibold text-zinc-100 mb-1">{tech.name}</h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{description}</p>
      </div>

      {/* Divider + role */}
      <div className="pt-2.5 border-t border-zinc-800/60 flex items-baseline gap-2">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Primary Role:</span>
        <span className="text-[11px] font-medium text-zinc-300">{role}</span>
      </div>
    </div>
  );
}

export function TechStackCard({ techStack }: { techStack: TechItem[] }) {
  if (techStack.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
        <p className="text-xs text-zinc-500">No technologies detected on this page.</p>
      </div>
    );
  }

  // Sort: by category order, then high confidence first within category.
  const sorted = [...techStack].sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    const catCmp = (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb);
    if (catCmp !== 0) return catCmp;
    const confOrder = { high: 0, medium: 1, low: 2 } as const;
    return confOrder[a.confidence] - confOrder[b.confidence];
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((t) => (
          <TechCard key={`${t.category}:${t.name}`} tech={t} />
        ))}
      </div>
      <p className="text-[11px] text-zinc-600 leading-relaxed px-1">
        Detection combines HTML pattern-matching with Lighthouse network analysis. Verified entries have explicit signals; Detected ones are likely correct based on partial signals.
      </p>
    </div>
  );
}
