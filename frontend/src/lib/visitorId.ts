const VISITOR_ID_KEY = "etw_visitor_id";

function generateVisitorId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
}

export function getVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;
  const next = generateVisitorId();
  localStorage.setItem(VISITOR_ID_KEY, next);
  return next;
}
