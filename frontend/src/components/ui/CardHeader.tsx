// frontend/src/components/ui/CardHeader.tsx
type BadgeColor = "violet" | "green" | "amber" | "red";

const BADGE_CLASSES: Record<BadgeColor, string> = {
  violet: "text-violet-300 bg-violet-500/10 border border-violet-500/25",
  green:  "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25",
  amber:  "text-amber-400 bg-amber-500/10 border border-amber-500/25",
  red:    "text-red-400 bg-red-500/10 border border-red-500/25",
};

export function CardHeader({ title, badge, badgeColor = "violet" }: {
  title: string;
  badge?: string | number;
  badgeColor?: BadgeColor;
}) {
  return (
    <div className="card-header flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/60">
      <div className="w-[5px] h-[5px] rounded-full bg-violet-600 shrink-0 opacity-70" />
      <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider flex-1 leading-none">
        {title}
      </span>
      {badge !== undefined && (
        <span className={`text-[10px] font-bold rounded px-1.5 py-px leading-none ${BADGE_CLASSES[badgeColor]}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
