import type { ELI5Item } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

export function ELI5Card({ items }: { items: ELI5Item[] }) {
  if (items.length === 0) return null;

  return (
    <CardShell collapsible defaultOpen={false} title="Plain-Language Explanations">
      <CardHeader title="Plain English" badge={`${items.length} terms`} badgeColor="violet" />
      <div className="p-4">
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col gap-1 pl-3 border-l-2 border-zinc-800">
              <p className="text-xs font-semibold text-zinc-200">{item.technical}</p>
              <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">{item.simple}</p>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}
