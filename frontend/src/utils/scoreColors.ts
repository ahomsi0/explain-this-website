export function scoreColor(n: number): string {
  return n >= 75 ? "text-emerald-400" : n >= 50 ? "text-amber-400" : "text-red-400";
}

export function scoreBg(n: number): string {
  return n >= 75 ? "bg-emerald-500/10 border-emerald-500/20" : n >= 50 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
}
