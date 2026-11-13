// ".js" specifiers on purpose: this file is bundled into a Vercel function,
// which is type-checked with Node's ESM rules (see api/report-preview.ts).
import type { AnalysisResult } from "../types/analysis.js";
import { computeScoreParts } from "../utils/overallScore.js";

// Per-report link previews. Chat apps (WhatsApp, Slack, iMessage) read a
// page's <head> without running JavaScript, so a shared report link can only
// name the audited site and its score if the server writes them into the
// HTML. api/report-preview.ts does that for crawlers using these helpers.
//
// Deliberately free of the rest of src/seo (which pulls in every guide), so
// the function bundle stays small.

const SITE_NAME = "Explain This Website";
const SITE_URL = "https://www.explainthiswebsite.com";

export interface ReportPreview {
  title: string;
  description: string;
  url: string;
}

/** The audited URL is someone else's data: never let it close an attribute or a tag. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds the preview for a report, or null when the payload is not a usable report. */
export function reportPreviewFor(report: unknown, id: string): ReportPreview | null {
  const r = report as Partial<AnalysisResult> | null;
  if (!r || typeof r.url !== "string" || !Array.isArray(r.seoChecks) || !r.ux) return null;
  let host: string;
  try {
    host = new URL(r.url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (!host) return null;

  const scores = computeScoreParts(r as AnalysisResult);
  const parts = [
    `SEO ${scores.seo}`,
    scores.performance >= 0 ? `Performance ${scores.performance}` : null,
    `UX ${scores.ux}`,
    `Conversion ${scores.conversion}`,
  ].filter(Boolean);

  return {
    title: `${host} scored ${scores.overall}/100 · ${SITE_NAME}`,
    description: `${parts.join(", ")}. See the full audit and what to fix first.`,
    url: `${SITE_URL}/report/${id}`,
  };
}

/**
 * Writes a preview into the report shell's head. Only the text of tags that
 * are already there is replaced, plus the two URL tags a shell cannot carry,
 * so the page still boots the app exactly as the static shell does.
 */
export function applyReportPreview(shellHtml: string, preview: ReportPreview): string {
  const title = escapeHtml(preview.title);
  const description = escapeHtml(preview.description);
  const url = escapeHtml(preview.url);

  if (!/<title>[^<]*<\/title>/.test(shellHtml)) return shellHtml;

  const setContent = (html: string, attr: string, key: string, value: string) =>
    html.replace(
      new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
      (_match, open: string, close: string) => `${open}${value}${close}`,
    );

  let html = shellHtml.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`);
  html = setContent(html, "name", "description", description);
  html = setContent(html, "property", "og:title", title);
  html = setContent(html, "property", "og:description", description);
  html = setContent(html, "name", "twitter:title", title);
  html = setContent(html, "name", "twitter:description", description);
  // The static shell serves every report, so it has no URL tags of its own.
  if (!html.includes('property="og:url"')) {
    html = html.replace(
      /<meta property="og:type" content="[^"]*" \/>/,
      (match) => `${match}\n    <meta property="og:url" content="${url}" />\n    <link rel="canonical" href="${url}" />`,
    );
  }
  return html;
}
