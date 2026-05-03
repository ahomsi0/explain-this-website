// frontend/src/components/ui/CardShell.tsx
export function CardShell({ children, className = "" }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-900 ${className}`}>
      {children}
    </div>
  );
}
