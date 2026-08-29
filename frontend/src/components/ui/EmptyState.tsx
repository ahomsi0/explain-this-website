// frontend/src/components/ui/EmptyState.tsx
export function EmptyState({
  icon,
  message,
  note,
}: {
  icon?: React.ReactNode;
  message: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      {icon && <div className="text-zinc-600 mb-1">{icon}</div>}
      <p className="text-sm text-zinc-400">{message}</p>
      {note && <p className="text-xs text-zinc-600">{note}</p>}
    </div>
  );
}
