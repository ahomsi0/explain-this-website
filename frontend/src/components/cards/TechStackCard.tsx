import type { TechItem } from "../../types/analysis";

const catLabel: Record<string, string> = {
  "ai-builder": "AI Builder", cms: "CMS", ecommerce: "E-commerce", builder: "Builder",
  framework: "Framework", analytics: "Analytics", cdn: "CDN", media: "Media",
};
const catOrder = ["ai-builder", "cms", "ecommerce", "builder", "framework", "analytics", "cdn", "media"];

export function TechStackCard({ techStack }: { techStack: TechItem[] }) {
  const grouped: Record<string, TechItem[]> = {};
  for (const t of techStack) (grouped[t.category] ??= []).push(t);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Tech Stack</p>
        <span className="text-[11px] text-zinc-600">{techStack.length} detected</span>
      </div>

      {techStack.length === 0 ? (
        <p className="text-xs text-zinc-600">No technologies detected.</p>
      ) : (
        <div className="space-y-2.5">
          {catOrder.filter((c) => grouped[c]).map((cat) => (
            <div key={cat} className="flex items-start gap-3">
              <span className="text-[11px] text-zinc-600 w-20 shrink-0 pt-1">{catLabel[cat]}</span>
              <div className="flex flex-wrap gap-1.5">
                {grouped[cat].map((t) => (
                  <span key={t.name}
                    className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium"
                    title={`Confidence: ${t.confidence}`}
                  >
                    {t.name}
                    {t.confidence === "low" && <span className="ml-1 text-zinc-600">?</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
