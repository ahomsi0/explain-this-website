// frontend/src/components/ui/CardHeader.tsx
type BadgeColor = "violet" | "green" | "amber" | "red";

const BADGE_CLASSES: Record<BadgeColor, string> = {
  violet: "text-violet-300 bg-violet-950 border border-violet-800",
  green:  "text-emerald-400 bg-emerald-950 border border-emerald-800",
  amber:  "text-amber-400 bg-amber-950 border border-amber-800",
  red:    "text-red-400 bg-red-950 border border-red-800",
};

export function CardHeader({ title, badge, badgeColor = "violet" }: {
  title: string;
  badge?: string | number;
  badgeColor?: BadgeColor;
}) {
  return (
    <div className="flex items-center gap-2 px-5 pt-5 pb-0">
      <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider flex-1 leading-none">
        {title}
      </h3>
      {badge !== undefined && (
        <span className={`text-[10px] font-bold rounded px-1.5 py-px leading-none ${BADGE_CLASSES[badgeColor]}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
