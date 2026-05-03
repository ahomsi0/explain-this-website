// frontend/src/components/ui/CardShell.tsx
export function CardShell({ children, className = "" }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-shell rounded-lg overflow-hidden border border-zinc-800 border-l-[2px] border-l-violet-700 ${className}`}>
      {children}
    </div>
  );
}
