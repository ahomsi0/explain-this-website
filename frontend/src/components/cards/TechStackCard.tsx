import { Badge } from "@/components/ui/badge";
import type { TechItem } from "../../types/analysis";

const catLabel: Record<string, string> = {
  cms: "CMS", ecommerce: "E-commerce", builder: "Builder",
  framework: "Framework", analytics: "Analytics", cdn: "CDN",
};

const catOrder = ["cms", "ecommerce", "builder", "framework", "analytics", "cdn"];

export function TechStackCard({ techStack }: { techStack: TechItem[] }) {
  if (techStack.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/4 p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Tech Stack</h3>
        <p className="text-sm text-slate-500">No technologies detected.</p>
      </div>
    );
  }

  const grouped: Record<string, TechItem[]> = {};
  for (const t of techStack) (grouped[t.category] ??= []).push(t);

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Tech Stack</h3>
        <span className="text-xs text-slate-500">{techStack.length} detected</span>
      </div>

      <div className="space-y-3">
        {catOrder.filter((c) => grouped[c]).map((cat) => (
          <div key={cat} className="flex items-start gap-3">
            <span className="text-xs text-slate-500 w-20 shrink-0 pt-1">{catLabel[cat]}</span>
            <div className="flex flex-wrap gap-1.5">
              {grouped[cat].map((t) => (
                <Badge key={t.name} variant="slate" className="font-medium">
                  {t.name}
                  {t.confidence === "low" && <span className="ml-1 opacity-40">?</span>}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
