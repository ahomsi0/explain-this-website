/**
 * "Lead. Rest of the sentence" split, so a list item can show its first words
 * in bold. Only splits when the lead is short enough to read as a label.
 */
export function splitLead(text: string): { lead: string | null; rest: string } {
  const m = text.match(/^(.{2,48}?)([:.])\s+(.+)$/s);
  if (!m) return { lead: null, rest: text };
  // After a colon the rest starts lower-case ("SEO: title and..."), so it
  // gets a capital. After a full stop it already reads right as written.
  const rest = m[2] === ":" ? m[3].charAt(0).toUpperCase() + m[3].slice(1) : m[3];
  return { lead: m[1], rest };
}

