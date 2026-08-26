// Persistent site navigation rail for inner pages (guides, history, compare…).
// Desktop only — mobile keeps the header links. The analysis report page uses
// its own section sidebar instead.
const ITEMS: { href: string; label: string; key: string; icon: React.ReactNode }[] = [
  {
    href: "/history", label: "History", key: "history",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    href: "/compare", label: "Compare", key: "compare",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    href: "/guides", label: "Fix guides", key: "guides",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
  {
    href: "/whats-new", label: "What's new", key: "whats-new",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/></svg>,
  },
  {
    href: "/status", label: "Status", key: "status",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
];

export function SiteSidebar({ active }: { active?: string }) {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-14 bottom-0 w-[200px] border-r border-zinc-800 bg-zinc-950 px-3 py-5 overflow-y-auto scrollbar-none">
      <a
        href="/"
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 mb-4 rounded-md text-[11px] font-bold uppercase tracking-wider bg-violet-300 hover:bg-violet-200 text-violet-950 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New analysis
      </a>

      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <a
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] font-medium uppercase tracking-wider transition-colors ${
                isActive
                  ? "text-violet-300 bg-violet-500/10 shadow-[inset_3px_0_0_#7c3aed]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <span className={isActive ? "text-violet-300" : "text-zinc-600 group-hover:text-zinc-400"}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </a>
          );
        })}
        <a
          href="mailto:support@explainthewebsite.com"
          className="group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
        >
          <span className="text-zinc-600 group-hover:text-zinc-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <span>Support</span>
        </a>
      </nav>
    </aside>
  );
}
