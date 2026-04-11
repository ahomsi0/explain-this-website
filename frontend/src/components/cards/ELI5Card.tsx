import type { ELI5Item } from "../../types/analysis";

export function ELI5Card({ items }: { items: ELI5Item[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Website Summary</p>
        <span className="text-[10px] font-medium text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
          {items.length} findings
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-1 pl-3 border-l-2 border-zinc-800">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{item.technical}</p>
            <p className="text-xs text-zinc-400 leading-relaxed">{item.simple}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
