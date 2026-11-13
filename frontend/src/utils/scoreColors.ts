export function scoreLabel(n: number): string {
  return n >= 75 ? "Looking good" : n >= 50 ? "Room to improve" : "Needs attention";
}

export function scoreColor(n: number): string {
  return n >= 75 ? "text-emerald-400" : n >= 50 ? "text-amber-400" : "text-red-400";
}

/** Solid fill for a score meter, same thresholds as scoreColor. */
export function scoreFill(n: number): string {
  return n >= 75 ? "bg-emerald-500" : n >= 50 ? "bg-amber-500" : "bg-red-500";
}
