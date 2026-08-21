export function normalizeInputUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes(".")) return null;
    if (parsed.username || parsed.password) return null;
    return candidate.replace(/#.*$/, "");
  } catch {
    return null;
  }
}
