import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult } from "../../types/analysis";

// ─── Palette (zinc monochrome — mirrors the UI) ───────────────────────────────
const BG     = [9,   9,  11 ] as const; // zinc-950
const CARD   = [24,  24,  27 ] as const; // zinc-900
const CARD2  = [32,  32,  36 ] as const; // zinc-850
const BORDER = [39,  39,  42 ] as const; // zinc-800
const MUTED  = [82,  82,  91 ] as const; // zinc-600
const DIM    = [113, 113, 122] as const; // zinc-500
const TEXT   = [244, 244, 245] as const; // zinc-100
const GREEN  = [52,  211, 153] as const; // emerald-400
const AMBER  = [251, 191,  36] as const; // amber-400
const RED    = [248, 113, 113] as const; // red-400

function rgb(c: readonly [number, number, number]): [number, number, number] {
  return [...c] as [number, number, number];
}
function statusColor(s: string): [number, number, number] {
  return s === "pass" ? rgb(GREEN) : s === "warning" ? rgb(AMBER) : rgb(RED);
}
function statusLabel(s: string) {
  return s === "pass" ? "PASS" : s === "warning" ? "WARN" : "FAIL";
}
// Replace non-latin1 characters that cause jsPDF to fall back to Courier
function san(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")   // curly single quotes
    .replace(/[\u201C\u201D]/g, '"')   // curly double quotes
    .replace(/\u2013/g, "-")           // en dash
    .replace(/\u2014/g, "--")          // em dash
    .replace(/\u2026/g, "...")         // ellipsis
    .replace(/[^\x00-\xFF]/g, "?");    // anything else outside latin1
}
function lastY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DownloadButton({ result }: { result: AnalysisResult }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);
    try { buildPDF(result); }
    finally { setLoading(false); }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <span className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      )}
      PDF
    </button>
  );
}

// ─── PDF builder ──────────────────────────────────────────────────────────────
function buildPDF(result: AnalysisResult) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 16, CW = W - M * 2, FOOT = 20;
  let y = 0;

  // ── Scores ─────────────────────────────────────────────────────────────────
  const seoPass    = result.seoChecks.filter(c => c.status === "pass").length;
  const seoWarn    = result.seoChecks.filter(c => c.status === "warning").length;
  const seoFail    = result.seoChecks.filter(c => c.status === "fail").length;
  const seoTotal   = result.seoChecks.length;
  const seoScore   = seoTotal > 0 ? Math.round((seoPass / seoTotal) * 100) : 0;
  const ux         = result.ux;
  const uxSigs     = [ux.hasCTA, ux.hasForms, ux.hasSocialProof, ux.hasTrustSignals, ux.hasContactInfo, ux.mobileReady];
  const uxSigCount = uxSigs.filter(Boolean).length;
  const uxScore    = Math.round((uxSigCount / uxSigs.length) * 100);
  const issueCount = result.weakPoints.length;
  const techCount  = result.techStack.length;
  const recCount   = result.recommendations.length;
  const ps         = result.pageStats ?? { wordCount: 0, imageCount: 0, internalLinks: 0, externalLinks: 0, scriptCount: 0, h1Count: 0, h2Count: 0, h3Count: 0, stylesheetCount: 0, inlineStyleCount: 0, lazyImageCount: 0, fontCount: 0, renderBlockingScripts: 0, contentToCodeRatio: 0 };
  const cs         = result.contentStats;
  const readMins   = Math.max(1, Math.round(ps.wordCount / 200));
  const highConf   = result.techStack.filter(t => t.confidence === "high").length;
  const medConf    = result.techStack.filter(t => t.confidence === "medium").length;
  const lowConf    = result.techStack.filter(t => t.confidence === "low").length;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function bg() {
    doc.setFillColor(...rgb(BG));
    doc.rect(0, 0, W, H, "F");
  }

  function overflowBg(startPage: number) {
    if (doc.getNumberOfPages() > startPage) bg();
  }

  function newPage() {
    doc.addPage();
    bg();
    y = M + 6;
  }

  function need(h: number) {
    if (y + h > H - FOOT) newPage();
  }

  function footer(n: number, total: number) {
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    doc.line(M, H - 12, W - M, H - 12);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(MUTED));
    const d = result.url.length > 55 ? result.url.slice(0, 52) + "…" : result.url;
    doc.text("Explain This Website", M, H - 7);
    doc.text(d, W / 2, H - 7, { align: "center" });
    doc.text(`${n} / ${total}`, W - M, H - 7, { align: "right" });
  }

  function section(title: string, gap = 7) {
    need(14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(DIM));
    doc.text(title.toUpperCase(), M, y + 4.5);
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    doc.line(M, y + 7, W - M, y + 7);
    y += gap + 4;
  }

  function ztable(startPage: number, opts: Parameters<typeof autoTable>[1]) {
    autoTable(doc, {
      theme: "plain",
      margin: { left: M, right: M, bottom: FOOT + 2 },
      headStyles: {
        fillColor: rgb(BG), textColor: rgb(DIM),
        fontSize: 7, fontStyle: "bold",
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        overflow: "linebreak",
      },
      bodyStyles: {
        fillColor: rgb(CARD), textColor: rgb(TEXT),
        fontSize: 8, lineColor: rgb(BORDER), lineWidth: 0.2,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        overflow: "linebreak",
      },
      alternateRowStyles: { fillColor: rgb(CARD2) },
      didDrawPage() { overflowBg(startPage); },
      ...opts,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Page 1 — Cover
  // ═══════════════════════════════════════════════════════════════════════════
  bg();

  // Title block
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(TEXT));
  doc.text("Website Analysis Report", M, 40);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(DIM));
  const dUrl = result.url.length > 72 ? result.url.slice(0, 69) + "…" : result.url;
  doc.text(dUrl, M, 49);

  doc.setFontSize(7.5);
  doc.setTextColor(...rgb(MUTED));
  doc.text(`Generated ${new Date(result.fetchedAt).toLocaleString()}`, M, 55);

  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(M, 60, W - M, 60);

  // Overview fields
  const pwColor = result.overview.pageLoadHint === "lightweight" ? GREEN : result.overview.pageLoadHint === "medium" ? AMBER : RED;
  const ovFields: { key: string; val: string; color?: readonly [number,number,number] }[] = [
    { key: "Title",       val: result.overview.title       || "(no title)" },
    { key: "Description", val: result.overview.description || "(no description)" },
    { key: "Language",    val: (result.overview.language   || "—").toUpperCase() },
    { key: "Page Weight", val: result.overview.pageLoadHint.charAt(0).toUpperCase() + result.overview.pageLoadHint.slice(1), color: pwColor },
  ];
  const ovValX = M + 30;
  const ovValW = W - M - ovValX; // exact available width to right margin
  let fy = 68;
  for (const { key, val, color } of ovFields) {
    doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(MUTED));
    doc.text(key, M, fy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(color ?? TEXT));
    const lines = doc.splitTextToSize(san(val), ovValW).slice(0, 2) as string[];
    doc.text(lines, ovValX, fy);
    fy += lines.length * 4.5 + 5;
  }

  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(M, fy + 2, W - M, fy + 2);
  fy += 8;

  // Summary stats as a plain 2-column list
  const scoreColor = (s: number) => s >= 80 ? GREEN : s >= 50 ? AMBER : RED;
  const summaryRows: { label: string; value: string; color: readonly [number,number,number] }[] = [
    { label: "SEO Score",       value: `${seoScore}/100`,             color: scoreColor(seoScore) },
    { label: "UX Score",        value: `${uxScore}/100`,              color: scoreColor(uxScore)  },
    { label: "Technologies",    value: `${techCount}`,                color: TEXT },
    { label: "Issues Found",    value: `${issueCount}`,               color: issueCount === 0 ? GREEN : issueCount <= 3 ? AMBER : RED },
    { label: "Words on Page",   value: ps.wordCount.toLocaleString(), color: TEXT },
    { label: "Reading Level",   value: cs ? cs.readingLevel.charAt(0).toUpperCase() + cs.readingLevel.slice(1) : "—", color: cs?.readingLevel === "simple" ? GREEN : cs?.readingLevel === "moderate" ? AMBER : RED },
    { label: "Recommendations", value: `${recCount}`,                 color: TEXT },
  ];
  for (const row of summaryRows) {
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(MUTED));
    doc.text(row.label, M, fy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(row.color));
    doc.text(row.value, M + 80, fy);
    fy += 7;
  }

  // Cover footer
  doc.setDrawColor(...rgb(BORDER)); doc.setLineWidth(0.25);
  doc.line(M, H - 12, W - M, H - 12);
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(MUTED));
  doc.text("explainthewebsite.dev", W / 2, H - 7, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════
  // Content pages
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();

  // ── Tech Stack ─────────────────────────────────────────────────────────────
  section("Detected Tech Stack");

  if (techCount === 0) {
    doc.setFontSize(8.5); doc.setTextColor(...rgb(MUTED));
    doc.text("No technologies detected.", M, y); y += 10;
  } else {
    const catOrder  = ["cms", "ecommerce", "builder", "framework", "analytics", "cdn"] as const;
    const catLabels: Record<string, string> = {
      cms: "CMS", ecommerce: "E-commerce", builder: "Builder",
      framework: "Framework", analytics: "Analytics", cdn: "CDN",
    };
    const grouped: Record<string, typeof result.techStack> = {};
    for (const t of result.techStack) (grouped[t.category] ??= []).push(t);
    const rows: [string, string, string][] = [];
    for (const cat of catOrder) {
      if (!grouped[cat]) continue;
      for (const t of grouped[cat]) rows.push([catLabels[cat] ?? cat, t.name, t.confidence]);
    }
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Category", "Technology", "Confidence"]],
      body: rows,
      columnStyles: {
        0: { cellWidth: 30, textColor: rgb(DIM) },
        1: { cellWidth: CW - 30 - 26, fontStyle: "bold" },
        2: { cellWidth: 26, halign: "center" },
      },
      didParseCell(data) {
        if (data.column.index === 2 && data.section === "body") {
          const c = data.cell.raw as string;
          data.cell.styles.textColor = c === "high" ? rgb(GREEN) : c === "medium" ? rgb(AMBER) : rgb(MUTED);
        }
      },
    });
    y = lastY(doc) + 10;
  }

  // ── SEO Audit ──────────────────────────────────────────────────────────────
  need(50);
  section("SEO Audit");

  // Score line
  const seoScoreColor = seoScore >= 80 ? GREEN : seoScore >= 50 ? AMBER : RED;
  {
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(DIM));
    const lbl = "Score: "; doc.text(lbl, M, y); let sx = M + doc.getTextWidth(lbl);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...rgb(seoScoreColor));
    const val = `${seoScore}/100`; doc.text(val, sx, y); sx += doc.getTextWidth(val);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...rgb(MUTED));
    doc.text(`  ·  ${seoPass} pass  ·  ${seoWarn} warn  ·  ${seoFail} fail`, sx, y);
  }
  y += 6;

  {
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Check", "Status", "Detail"]],
      body: result.seoChecks.map(c => [san(c.label), statusLabel(c.status), san(c.detail)]),
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold" },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: CW - 36 - 22, textColor: rgb(DIM) },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body") {
          data.cell.styles.textColor = statusColor(result.seoChecks[data.row.index]?.status ?? "fail");
        }
      },
    });
    y = lastY(doc) + 10;
  }

  // ── UX Signals ─────────────────────────────────────────────────────────────
  need(50);
  section("Conversion & UX Signals");

  const uxScoreColor = uxScore >= 80 ? GREEN : uxScore >= 50 ? AMBER : RED;
  {
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(DIM));
    const lbl = "Score: "; doc.text(lbl, M, y); let sx = M + doc.getTextWidth(lbl);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...rgb(uxScoreColor));
    const val = `${uxScore}/100`; doc.text(val, sx, y); sx += doc.getTextWidth(val);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...rgb(MUTED));
    doc.text(`  ·  ${uxSigCount} of ${uxSigs.length} signals present`, sx, y);
  }
  y += 6;

  {
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Signal", "Present", "Detail"]],
      body: [
        ["Call-to-Action",    ux.hasCTA              ? "YES" : "NO", san(ux.hasCTA              ? `${ux.ctaCount} CTA button${ux.ctaCount !== 1 ? "s" : ""} detected`  : "No CTAs found - add clear action buttons")],
        ["Lead Capture Form", ux.hasForms            ? "YES" : "NO", san(ux.hasForms            ? `${ux.formCount} form${ux.formCount !== 1 ? "s" : ""} detected`      : "No forms - consider a contact or lead form")],
        ["Social Proof",      ux.hasSocialProof      ? "YES" : "NO", san(ux.hasSocialProof      ? "Reviews, testimonials, or social indicators found"                  : "No social proof - add reviews or testimonials")],
        ["Trust Signals",     ux.hasTrustSignals     ? "YES" : "NO", san(ux.hasTrustSignals     ? "SSL badges, security mentions, or guarantees detected"              : "No trust signals - add security/guarantee badges")],
        ["Contact Info",      ux.hasContactInfo      ? "YES" : "NO", san(ux.hasContactInfo      ? "Email or phone number found on page"                               : "No contact info - add email/phone for credibility")],
        ["Mobile Responsive", ux.mobileReady         ? "YES" : "NO", san(ux.mobileReady         ? "Viewport meta tag present - mobile-ready"                          : "Missing viewport tag - not optimised for mobile")],
        ["Cookie Banner",     ux.hasCookieBanner     ? "YES" : "NO", ux.hasCookieBanner     ? "Consent UI detected"       : "No cookie consent detected"],
        ["Live Chat",         ux.hasLiveChat         ? "YES" : "NO", ux.hasLiveChat         ? "Chat widget detected"      : "No live chat widget found"],
        ["Video Content",     ux.hasVideoContent     ? "YES" : "NO", ux.hasVideoContent     ? "Video content detected"    : "No video content found"],
        ["Newsletter",        ux.hasNewsletterSignup ? "YES" : "NO", ux.hasNewsletterSignup ? "Email signup detected"     : "No newsletter signup found"],
        ["Privacy Policy",    ux.hasPrivacyPolicy    ? "YES" : "NO", ux.hasPrivacyPolicy    ? "Policy link found"         : "No privacy policy link found"],
      ],
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: CW - 40 - 22, textColor: rgb(DIM) },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body") {
          data.cell.styles.textColor = data.cell.raw === "YES" ? rgb(GREEN) : rgb(RED);
        }
      },
    });
    y = lastY(doc) + 10;
  }

  // ── Page Stats ─────────────────────────────────────────────────────────────
  need(50);
  section("Page Statistics");
  {
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Metric", "Value", "Context"]],
      body: [
        ["Word Count",            ps.wordCount.toLocaleString(),                                          `~${readMins} min read`],
        ["Images",                `${ps.imageCount} (${ps.lazyImageCount} lazy)`,                        ps.imageCount === 0 ? "No images" : "img elements"],
        ["Scripts",               String(ps.scriptCount),                                                 ps.scriptCount > 15 ? "High - may slow load" : ps.scriptCount > 8 ? "Moderate" : "Lean"],
        ["Internal Links",        String(ps.internalLinks),                                               "Same domain"],
        ["External Links",        String(ps.externalLinks),                                               "Other websites"],
        ["Heading Structure",     `H1:${ps.h1Count}  H2:${ps.h2Count}  H3:${ps.h3Count}`,               ps.h1Count === 1 ? "Good - single H1" : ps.h1Count === 0 ? "Missing H1" : "Multiple H1s"],
        ["Stylesheets",           String(ps.stylesheetCount),                                             ps.stylesheetCount > 10 ? "High - consider consolidating" : "OK"],
        ["Fonts",                 String(ps.fontCount),                                                   ps.fontCount === 0 ? "System fonts only" : ps.fontCount > 4 ? "Many loaded" : "OK"],
        ["Render Blocking",       String(ps.renderBlockingScripts),                                       "Scripts in <head> without defer/async"],
        ["Inline Styles",         String(ps.inlineStyleCount),                                            ps.inlineStyleCount > 50 ? "High - prefer CSS classes" : "OK"],
        ["Content Ratio",         `${ps.contentToCodeRatio}%`,                                            ps.contentToCodeRatio < 10 ? "Low - heavy markup" : ps.contentToCodeRatio > 40 ? "Great" : "OK"],
        ["Tech Stack",            `${techCount} detected (${highConf}h ${medConf}m ${lowConf}l)`,        "Signature matching"],
      ],
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold", textColor: rgb(DIM) },
        1: { cellWidth: 44 },
        2: { cellWidth: CW - 40 - 44, textColor: rgb(DIM) },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body") {
          if (data.row.index === 2) // Scripts
            data.cell.styles.textColor = ps.scriptCount > 15 ? rgb(AMBER) : rgb(TEXT);
          if (data.row.index === 5) // H1
            data.cell.styles.textColor = ps.h1Count === 1 ? rgb(GREEN) : ps.h1Count === 0 ? rgb(RED) : rgb(AMBER);
          if (data.row.index === 8) // Render blocking
            data.cell.styles.textColor = ps.renderBlockingScripts > 3 ? rgb(RED) : ps.renderBlockingScripts > 0 ? rgb(AMBER) : rgb(GREEN);
          if (data.row.index === 10) // Content ratio
            data.cell.styles.textColor = ps.contentToCodeRatio < 10 ? rgb(AMBER) : rgb(TEXT);
        }
      },
    });
    y = lastY(doc) + 10;
  }

  // ── Content Analysis ───────────────────────────────────────────────────────
  if (cs) {
    need(20);
    section("Content Analysis");

    const levelColor = cs.readingLevel === "simple" ? GREEN : cs.readingLevel === "moderate" ? AMBER : RED;
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(DIM));
    doc.text("Reading Level: ", M, y);
    let cx = M + doc.getTextWidth("Reading Level: ");
    doc.setFont("helvetica", "bold"); doc.setTextColor(...rgb(levelColor));
    doc.text(cs.readingLevel.charAt(0).toUpperCase() + cs.readingLevel.slice(1), cx, y);
    cx += doc.getTextWidth(cs.readingLevel.charAt(0).toUpperCase() + cs.readingLevel.slice(1));
    doc.setFont("helvetica", "normal"); doc.setTextColor(...rgb(MUTED));
    doc.text(`   Avg sentence: ${cs.avgSentenceLen} words`, cx, y);
    y += 8;

    if (cs.topKeywords.length > 0) {
      doc.setFontSize(7); doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(MUTED));
      doc.text("Top Keywords:", M, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(...rgb(TEXT));
      doc.text(cs.topKeywords.join("  ·  "), M + 30, y);
      y += 8;
    }
  }

  // ── Weak Points ────────────────────────────────────────────────────────────
  need(20);
  section("Weak Points");

  if (result.weakPoints.length === 0) {
    doc.setFontSize(8.5); doc.setTextColor(...rgb(GREEN));
    doc.text("No significant weak points detected.", M, y); y += 12;
  } else {
    for (const [i, pt] of result.weakPoints.entries()) {
      need(12);
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(RED));
      doc.text(`${i + 1}.`, M, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(TEXT));
      const lines = doc.splitTextToSize(san(pt), CW - 10) as string[];
      doc.text(lines, M + 8, y + 2);
      y += lines.length * 5.5 + 4;
    }
    y += 2;
  }

  // ── Recommendations ────────────────────────────────────────────────────────
  need(20);
  section("Recommendations");

  if (result.recommendations.length === 0) {
    doc.setFontSize(8.5); doc.setTextColor(...rgb(MUTED));
    doc.text("No recommendations at this time.", M, y);
  } else {
    for (const [i, rec] of result.recommendations.entries()) {
      need(12);
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(GREEN));
      doc.text(`${i + 1}.`, M, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(TEXT));
      const lines = doc.splitTextToSize(san(rec), CW - 10) as string[];
      doc.text(lines, M + 8, y + 2);
      if (i < result.recommendations.length - 1) {
        const sep = y + lines.length * 5.5 + 4;
        doc.setDrawColor(...rgb(BORDER)); doc.setLineWidth(0.2);
        doc.line(M + 8, sep, W - M, sep);
        y = sep + 5;
      } else {
        y += lines.length * 5.5 + 6;
      }
    }
  }

  // ── Footers on every page ──────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    footer(p, total);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  let host = "report";
  try { host = new URL(result.url).hostname.replace(/^www\./, ""); } catch { /**/ }
  const date = new Date(result.fetchedAt).toISOString().slice(0, 10);
  doc.save(`analysis-${host}-${date}.pdf`);
}
