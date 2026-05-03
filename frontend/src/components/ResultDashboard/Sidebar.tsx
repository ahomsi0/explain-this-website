import type { SectionId } from "./sections";

const ICONS: Record<SectionId, React.ReactNode> = {
  overview: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  tech: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  seo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  ux: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  performance: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  conversion: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
};

type Item = { id: SectionId; label: string };

export function Sidebar({
  items,
  active,
  onSelect,
}: {
  items: Item[];
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-zinc-800 bg-zinc-950 px-3 py-5 sticky top-12 h-[calc(100vh-3rem)]">
      <div className="px-2 mb-5">
        <p className="text-[11px] font-semibold text-zinc-300 tracking-wide">Audit Reports</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">Section view</p>
      </div>

      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] font-medium uppercase tracking-wider transition-colors ${
                isActive
                  ? "bg-violet-500/10 text-violet-300 border border-transparent shadow-[inset_3px_0_0_#7c3aed]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
              }`}
            >
              <span className={isActive ? "text-violet-300" : "text-zinc-600 group-hover:text-zinc-400"}>
                {ICONS[item.id]}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

/** Horizontal chip nav for mobile (< md). */
export function MobileSectionNav({
  items,
  active,
  onSelect,
}: {
  items: Item[];
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <div className="md:hidden border-b border-zinc-800 bg-zinc-950 sticky top-12 z-10">
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium uppercase tracking-wider transition-colors ${
                isActive
                  ? "bg-violet-500/10 text-violet-300 border border-violet-500/30"
                  : "text-zinc-500 border border-transparent"
              }`}
            >
              {ICONS[item.id]}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
