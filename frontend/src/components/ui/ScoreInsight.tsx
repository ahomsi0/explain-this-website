// frontend/src/components/ui/ScoreInsight.tsx
export function ScoreInsight({ meaning, nextStep }: { meaning: string; nextStep: string }) {
  return (
    <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex gap-2.5">
        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">What this means</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{meaning}</p>
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">What to do next</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{nextStep}</p>
        </div>
      </div>
    </div>
  );
}
