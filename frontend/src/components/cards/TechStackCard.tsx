import type { TechItem } from "../../types/analysis";

const catLabel: Record<string, string> = {
  "ai-builder": "AI Builder", cms: "CMS", ecommerce: "E-commerce", builder: "Builder",
  framework: "Framework", analytics: "Analytics", cdn: "CDN", media: "Media",
};
const catOrder = ["ai-builder", "cms", "ecommerce", "builder", "framework", "analytics", "cdn", "media"];
const CONFIDENCE_TOOLTIP = "Confidence indicates how certain the system is about this detection based on available signals.";

function confidenceTone(confidence: TechItem["confidence"]) {
  if (confidence === "high") {
    return "border-emerald-800/70 bg-emerald-950/60 text-emerald-300";
  }
  if (confidence === "medium") {
    return "border-amber-800/70 bg-amber-950/60 text-amber-300";
  }
  return "border-red-900/70 bg-red-950/50 text-red-300";
}

function confidenceLabel(confidence: TechItem["confidence"]) {
  if (confidence === "low") return "Possible";
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export function TechStackCard({ techStack }: { techStack: TechItem[] }) {
  const grouped: Record<string, TechItem[]> = {};
  for (const t of techStack) (grouped[t.category] ??= []).push(t);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Tech Stack</p>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-700 text-[10px] text-zinc-500"
            title={CONFIDENCE_TOOLTIP}
            aria-label="Tech confidence info"
          >
            i
          </span>
          <span className="text-[11px] text-zinc-600">{techStack.length} detected</span>
        </div>
      </div>

      {techStack.length === 0 ? (
        <p className="text-xs text-zinc-600">No technologies detected.</p>
      ) : (
        <div className="space-y-2">
          <div className="space-y-2.5">
            {catOrder.filter((c) => grouped[c]).map((cat) => (
              <div key={cat} className="flex items-start gap-3">
                <span className="text-[11px] text-zinc-600 w-20 shrink-0 pt-1">{catLabel[cat]}</span>
                <div className="flex flex-wrap gap-1.5">
                  {grouped[cat].map((t) => (
                    <span key={`${t.category}:${t.name}`} className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800">
                      <span className="px-2 py-0.5 text-xs text-zinc-300 font-medium">{t.name}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border-l ${confidenceTone(t.confidence)}`}
                        title={CONFIDENCE_TOOLTIP}
                        aria-label={`${t.name} confidence ${confidenceLabel(t.confidence)}`}
                      >
                        {confidenceLabel(t.confidence)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Technology detection is heuristic-based and may not always be 100% accurate, especially for large or custom-built websites.
          </p>
        </div>
      )}
    </div>
  );
}
