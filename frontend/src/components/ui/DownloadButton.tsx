import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult } from "../../types/analysis";

// ─── Palette (zinc monochrome — mirrors the UI) ───────────────────────────────
const BG     = [9,   9,  11 ] as const; // zinc-950
const CARD   = [24,  24,  27 ] as const; // zinc-900
const CARD2  = [32,  32,  36 ] as const; // zinc-850 (alt rows)
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
  if (s === "pass")    return rgb(GREEN);
  if (s === "warning") return rgb(AMBER);
  return rgb(RED);
}

function statusLabel(s: string) {
  return s === "pass" ? "PASS" : s === "warning" ? "WARN" : "FAIL";
}

function lastAutoTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DownloadButton({ result }: { result: AnalysisResult }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);
    try {
      buildPDF(result);
    } finally {
      setLoading(false);
    }
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
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = 210;
  const H    = 297;
  const M    = 16;
  const CW   = W - M * 2;
  const FOOT = 18;
  let   y    = 0;

  // ── Pre-computed scores ────────────────────────────────────────────────────
  const seoPass    = result.seoChecks.filter((c) => c.status === "pass").length;
  const seoWarn    = result.seoChecks.filter((c) => c.status === "warning").length;
  const seoFail    = result.seoChecks.filter((c) => c.status === "fail").length;
  const seoTotal   = result.seoChecks.length;
  const seoScore   = seoTotal > 0 ? Math.round((seoPass / seoTotal) * 100) : 0;
  const ux         = result.ux;
  const uxSignals  = [ux.hasCTA, ux.hasForms, ux.hasSocialProof, ux.hasTrustSignals, ux.hasContactInfo, ux.mobileReady];
  const uxSigCount = uxSignals.filter(Boolean).length;
  const uxScore    = Math.round((uxSigCount / uxSignals.length) * 100);
  const issueCount = result.weakPoints.length;
  const techCount  = result.techStack.length;
  const recCount   = result.recommendations.length;
  const ps         = result.pageStats ?? { wordCount: 0, imageCount: 0, internalLinks: 0, externalLinks: 0, scriptCount: 0, h1Count: 0, h2Count: 0, h3Count: 0 };
  const readMins   = Math.max(1, Math.round(ps.wordCount / 200));
  const highConf   = result.techStack.filter((t) => t.confidence === "high").length;
  const medConf    = result.techStack.filter((t) => t.confidence === "medium").length;
  const lowConf    = result.techStack.filter((t) => t.confidence === "low").length;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function pageBackground() {
    doc.setFillColor(...rgb(BG));
    doc.rect(0, 0, W, H, "F");
  }

  function pageFooter(pageNum: number, total: number) {
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    doc.line(M, H - 13, W - M, H - 13);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(MUTED));
    doc.text("Explain This Website", M, H - 8);
    const displayUrl = result.url.length > 55 ? result.url.slice(0, 52) + "..." : result.url;
    doc.text(displayUrl, W / 2, H - 8, { align: "center" });
    doc.text(`Page ${pageNum} of ${total}`, W - M, H - 8, { align: "right" });
  }

  function addPage() {
    doc.addPage();
    pageBackground();
    y = M + 8;
  }

  function checkPage(needed = 16) {
    if (y + needed > H - FOOT) addPage();
  }

  function onDrawPage() {
    pageBackground();
  }

  // Zinc-style section header — uppercase zinc-600 label on a zinc-900 pill
  function sectionHeader(title: string) {
    checkPage(18);
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(M, y, CW, 9, 1.5, 1.5, "F");
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.2);
    doc.roundedRect(M, y, CW, 9, 1.5, 1.5, "S");
    // Left accent bar
    doc.setFillColor(...rgb(MUTED));
    doc.roundedRect(M, y, 3, 9, 1, 1, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(DIM));
    doc.text(title.toUpperCase(), M + 7.5, y + 6);
    y += 13;
  }

  function scoreBar(score: number, labelLeft: string, labelRight: string) {
    const trackH = 5.5;
    const color  = score >= 80 ? rgb(GREEN) : score >= 50 ? rgb(AMBER) : rgb(RED);
    doc.setFillColor(...rgb(BORDER));
    doc.roundedRect(M, y, CW, trackH, 1.5, 1.5, "F");
    doc.setFillColor(...color);
    doc.roundedRect(M, y, Math.max(6, CW * (score / 100)), trackH, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(TEXT));
    doc.text(labelLeft, M + 3, y + 4);
    doc.setTextColor(...rgb(DIM));
    doc.text(labelRight, W - M - 3, y + 4, { align: "right" });
    y += trackH + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Page 1: Cover
  // ═══════════════════════════════════════════════════════════════════════════
  pageBackground();

  // Thin emerald top stripe (the single accent color in the zinc UI)
  doc.setFillColor(...rgb(GREEN));
  doc.rect(0, 0, W, 1.5, "F");

  // Magnifying-glass logo in zinc tones
  const lx = W / 2, ly = 52;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(lx - 15, ly - 15, 30, 30, 6, 6, "F");
  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.5);
  doc.roundedRect(lx - 15, ly - 15, 30, 30, 6, 6, "S");
  // Glass circle
  doc.setDrawColor(...rgb(DIM));
  doc.setLineWidth(2);
  doc.circle(lx - 2.5, ly - 1, 7, "S");
  // Handle
  doc.setLineWidth(2.5);
  doc.line(lx + 3.5, ly + 5, lx + 9, ly + 10.5);
  // Emerald dot inside lens
  doc.setFillColor(...rgb(GREEN));
  doc.circle(lx - 2.5, ly - 1, 2, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(TEXT));
  doc.text("Website Analysis Report", W / 2, 90, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(DIM));
  const displayUrl = result.url.length > 60 ? result.url.slice(0, 57) + "..." : result.url;
  doc.text(displayUrl, W / 2, 101, { align: "center" });

  doc.setFontSize(7.5);
  doc.setTextColor(...rgb(MUTED));
  doc.text(`Generated: ${new Date(result.fetchedAt).toLocaleString()}`, W / 2, 110, { align: "center" });

  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(M + 15, 116, W - M - 15, 116);

  // 6-stat grid (3×2)
  const statY    = 120;
  const statCols = 3;
  const gapX     = 4;
  const gapY     = 4;
  const statW    = (CW - gapX * (statCols - 1)) / statCols;
  const statH    = 21;

  const scoreValColor = (score: number) => score >= 80 ? GREEN : score >= 50 ? AMBER : RED;
  const stats = [
    { label: "SEO Score",       value: `${seoScore}/100`,  color: scoreValColor(seoScore) },
    { label: "UX Score",        value: `${uxScore}/100`,   color: scoreValColor(uxScore)  },
    { label: "Tech Detected",   value: `${techCount}`,     color: TEXT },
    { label: "Issues Found",    value: `${issueCount}`,    color: issueCount === 0 ? GREEN : issueCount <= 3 ? AMBER : RED },
    { label: "Words on Page",   value: ps.wordCount.toLocaleString(), color: TEXT },
    { label: "Recommendations", value: `${recCount}`,      color: TEXT },
  ];

  stats.forEach((s, i) => {
    const col = i % statCols;
    const row = Math.floor(i / statCols);
    const sx  = M + col * (statW + gapX);
    const sy  = statY + row * (statH + gapY);
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(sx, sy, statW, statH, 3, 3, "F");
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.2);
    doc.roundedRect(sx, sy, statW, statH, 3, 3, "S");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(s.color));
    doc.text(s.value, sx + statW / 2, sy + 11, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(MUTED));
    doc.text(s.label, sx + statW / 2, sy + 17, { align: "center" });
  });

  // Overview box
  const ov       = result.overview;
  const statRows = Math.ceil(stats.length / statCols);
  const ovY      = statY + statRows * statH + (statRows - 1) * gapY + 8;
  const ovH      = 62;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(M, ovY, CW, ovH, 3, 3, "F");
  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.2);
  doc.roundedRect(M, ovY, CW, ovH, 3, 3, "S");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(MUTED));
  doc.text("PAGE OVERVIEW", M + 5, ovY + 7);

  // Thin separator under label
  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.2);
  doc.line(M + 5, ovY + 9.5, M + CW - 5, ovY + 9.5);

  const ovFields: [string, string][] = [
    ["Title",       ov.title       || "(no title)"],
    ["Description", ov.description || "(no description)"],
    ["Language",    (ov.language   || "—").toUpperCase()],
    ["Page Weight", ov.pageLoadHint.charAt(0).toUpperCase() + ov.pageLoadHint.slice(1)],
  ];

  let fy = ovY + 16;
  for (const [key, val] of ovFields) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(MUTED));
    doc.text(key, M + 5, fy);
    doc.setFont("helvetica", "normal");
    // Color-code Page Weight value
    if (key === "Page Weight") {
      const pwColor = val === "Lightweight" ? rgb(GREEN) : val === "Medium" ? rgb(AMBER) : rgb(RED);
      doc.setTextColor(...pwColor);
    } else {
      doc.setTextColor(...rgb(TEXT));
    }
    const wrapped = doc.splitTextToSize(val, CW - 43);
    const lines   = wrapped.slice(0, key === "Description" ? 2 : 1);
    doc.text(lines, M + 38, fy);
    fy += lines.length * 4.4 + 4.8;
  }

  // Cover footer
  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(M, H - 13, W - M, H - 13);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(MUTED));
  doc.text("Explain This Website — explainthewebsite.dev", W / 2, H - 8, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════
  // Page 2: Tech Stack + SEO Audit
  // ═══════════════════════════════════════════════════════════════════════════
  addPage();

  sectionHeader("Detected Tech Stack");

  if (techCount === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...rgb(MUTED));
    doc.text("No technologies detected.", M, y);
    y += 10;
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

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, bottom: FOOT + 2 },
      head: [["Category", "Technology", "Confidence"]],
      body: rows,
      headStyles: { fillColor: rgb(BG), textColor: rgb(DIM), fontSize: 7.5, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
      bodyStyles: { fillColor: rgb(CARD), textColor: rgb(TEXT), fontSize: 8.5, lineColor: rgb(BORDER), lineWidth: 0.2, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
      alternateRowStyles: { fillColor: rgb(CARD2) },
      columnStyles: {
        0: { cellWidth: 32, textColor: rgb(DIM), fontSize: 7.5 },
        1: { fontStyle: "bold" },
        2: { cellWidth: 28, halign: "center", fontSize: 7.5 },
      },
      theme: "plain",
      didDrawPage: onDrawPage,
      didParseCell(data) {
        if (data.column.index === 2 && data.section === "body") {
          const conf = data.cell.raw as string;
          data.cell.styles.textColor = conf === "high" ? rgb(GREEN) : conf === "medium" ? rgb(AMBER) : rgb(MUTED);
        }
      },
    });
    y = lastAutoTableY(doc) + 12;
  }

  checkPage(55);
  sectionHeader("SEO Audit");
  scoreBar(seoScore, `SEO Score: ${seoScore}/100`, `${seoPass} pass  ·  ${seoWarn} warn  ·  ${seoFail} fail`);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOT + 2 },
    head: [["Check", "Status", "Detail"]],
    body: result.seoChecks.map((c) => [c.label, statusLabel(c.status), c.detail]),
    headStyles: { fillColor: rgb(BG), textColor: rgb(DIM), fontSize: 7.5, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    bodyStyles: { fillColor: rgb(CARD), textColor: rgb(TEXT), fontSize: 8, lineColor: rgb(BORDER), lineWidth: 0.2, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    alternateRowStyles: { fillColor: rgb(CARD2) },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold", fontSize: 7.5 },
      1: { cellWidth: 18, halign: "center", fontStyle: "bold", fontSize: 7.5 },
      2: { fontSize: 7.5, textColor: rgb(DIM) },
    },
    theme: "plain",
    didDrawPage: onDrawPage,
    didParseCell(data) {
      if (data.column.index === 1 && data.section === "body") {
        data.cell.styles.textColor = statusColor(result.seoChecks[data.row.index]?.status ?? "fail");
      }
    },
  });
  y = lastAutoTableY(doc) + 8;

  // ═══════════════════════════════════════════════════════════════════════════
  // Page 3: UX + Page Stats + Weak Points + Recommendations
  // ═══════════════════════════════════════════════════════════════════════════
  addPage();

  sectionHeader("Conversion & UX Signals");
  scoreBar(uxScore, `UX Score: ${uxScore}/100`, `${uxSigCount} of ${uxSignals.length} signals present`);

  const uxRows: [string, string, string][] = [
    ["Call-to-Action",    ux.hasCTA    ? "YES" : "NO", ux.hasCTA    ? `${ux.ctaCount} CTA button${ux.ctaCount !== 1 ? "s" : ""} detected`     : "No CTAs found — add clear action buttons"],
    ["Lead Capture Form", ux.hasForms  ? "YES" : "NO", ux.hasForms  ? `${ux.formCount} form${ux.formCount !== 1 ? "s" : ""} detected`          : "No forms found — consider a contact or lead form"],
    ["Social Proof",      ux.hasSocialProof  ? "YES" : "NO", ux.hasSocialProof  ? "Reviews, testimonials, or social indicators found"          : "No social proof — add reviews or testimonials"],
    ["Trust Signals",     ux.hasTrustSignals ? "YES" : "NO", ux.hasTrustSignals ? "SSL badges, security mentions, or guarantees detected"      : "No trust signals — add security/guarantee indicators"],
    ["Contact Info",      ux.hasContactInfo  ? "YES" : "NO", ux.hasContactInfo  ? "Email or phone number found on page"                        : "No contact info — add email/phone for credibility"],
    ["Mobile Responsive", ux.mobileReady     ? "YES" : "NO", ux.mobileReady     ? "Viewport meta tag present — mobile-ready"                  : "Missing viewport tag — not optimised for mobile"],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOT + 2 },
    head: [["Signal", "Present", "Detail"]],
    body: uxRows,
    headStyles: { fillColor: rgb(BG), textColor: rgb(DIM), fontSize: 7.5, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    bodyStyles: { fillColor: rgb(CARD), textColor: rgb(TEXT), fontSize: 8, lineColor: rgb(BORDER), lineWidth: 0.2, cellPadding: { top: 5, bottom: 5, left: 5, right: 5 } },
    alternateRowStyles: { fillColor: rgb(CARD2) },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", fontSize: 7.5 },
      1: { cellWidth: 20, halign: "center", fontStyle: "bold", fontSize: 8 },
      2: { fontSize: 7.5, textColor: rgb(DIM) },
    },
    theme: "plain",
    didDrawPage: onDrawPage,
    didParseCell(data) {
      if (data.column.index === 1 && data.section === "body") {
        data.cell.styles.textColor = data.cell.raw === "YES" ? rgb(GREEN) : rgb(RED);
      }
    },
  });
  y = lastAutoTableY(doc) + 12;

  // ── Page Stats ─────────────────────────────────────────────────────────────
  checkPage(55);
  sectionHeader("Page Statistics");

  const psRows: [string, string, string][] = [
    ["Word Count",        ps.wordCount.toLocaleString(),                              `~${readMins} min read`],
    ["Images",            String(ps.imageCount),                                      ps.imageCount === 0 ? "No images found" : "Total img elements"],
    ["Scripts",           String(ps.scriptCount),                                     ps.scriptCount > 15 ? "High — may slow page load" : ps.scriptCount > 8 ? "Moderate" : "Lean"],
    ["Internal Links",    String(ps.internalLinks),                                   "Links to pages on same domain"],
    ["External Links",    String(ps.externalLinks),                                   "Links to other websites"],
    ["Heading Structure", `H1:${ps.h1Count}  H2:${ps.h2Count}  H3:${ps.h3Count}`,   ps.h1Count === 1 ? "Good — single H1" : ps.h1Count === 0 ? "Missing H1" : "Multiple H1s detected"],
    ["Tech Stack Size",   `${techCount} tool${techCount !== 1 ? "s" : ""} (${highConf} high / ${medConf} med / ${lowConf} low)`, "Detected by signature matching"],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOT + 2 },
    head: [["Metric", "Value", "Context"]],
    body: psRows,
    headStyles: { fillColor: rgb(BG), textColor: rgb(DIM), fontSize: 7.5, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    bodyStyles: { fillColor: rgb(CARD), textColor: rgb(TEXT), fontSize: 8, lineColor: rgb(BORDER), lineWidth: 0.2, cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 } },
    alternateRowStyles: { fillColor: rgb(CARD2) },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", fontSize: 7.5, textColor: rgb(DIM) },
      1: { cellWidth: 48, fontSize: 8, textColor: rgb(TEXT) },
      2: { fontSize: 7.5, textColor: rgb(DIM) },
    },
    theme: "plain",
    didDrawPage: onDrawPage,
    didParseCell(data) {
      // Color-code script count value
      if (data.column.index === 1 && data.section === "body" && data.row.index === 2) {
        const v = ps.scriptCount;
        data.cell.styles.textColor = v > 15 ? rgb(AMBER) : rgb(TEXT);
      }
      // Color-code H1
      if (data.column.index === 1 && data.section === "body" && data.row.index === 5) {
        data.cell.styles.textColor = ps.h1Count === 1 ? rgb(GREEN) : ps.h1Count === 0 ? rgb(RED) : rgb(AMBER);
      }
    },
  });
  y = lastAutoTableY(doc) + 12;

  // ── Weak Points ────────────────────────────────────────────────────────────
  checkPage(22);
  sectionHeader("Weak Points");

  if (result.weakPoints.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...rgb(GREEN));
    doc.text("No significant weak points detected — great job!", M, y);
    y += 12;
  } else {
    for (const [i, point] of result.weakPoints.entries()) {
      checkPage(14);
      // Numbered pill in red-400
      doc.setFillColor(...rgb(RED));
      doc.circle(M + 3.5, y + 1.5, 3.5, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(BG));
      doc.text(String(i + 1), M + 3.5, y + 3, { align: "center" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(TEXT));
      const lines = doc.splitTextToSize(point, CW - 12);
      doc.text(lines, M + 10, y + 2);
      y += lines.length * 5.5 + 6;
    }
    y += 2;
  }

  // ── Recommendations ────────────────────────────────────────────────────────
  checkPage(22);
  sectionHeader("Recommendations");

  if (result.recommendations.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...rgb(MUTED));
    doc.text("No recommendations at this time.", M, y);
  } else {
    for (const [i, rec] of result.recommendations.entries()) {
      checkPage(16);
      // Numbered pill in emerald-400
      doc.setFillColor(...rgb(GREEN));
      doc.circle(M + 3.5, y + 1.5, 3.5, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(BG));
      doc.text(String(i + 1), M + 3.5, y + 3, { align: "center" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(TEXT));
      const lines = doc.splitTextToSize(rec, CW - 12);
      doc.text(lines, M + 10, y + 2);
      if (i < result.recommendations.length - 1) {
        const sep = y + lines.length * 5.5 + 4;
        doc.setDrawColor(...rgb(BORDER));
        doc.setLineWidth(0.2);
        doc.line(M + 10, sep, W - M, sep);
        y = sep + 5;
      } else {
        y += lines.length * 5.5 + 8;
      }
    }
  }

  // ── Footers on all pages ───────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    pageFooter(p, total);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  let hostname = "report";
  try { hostname = new URL(result.url).hostname.replace(/^www\./, ""); } catch { /* */ }
  const date = new Date(result.fetchedAt).toISOString().slice(0, 10);
  doc.save(`analysis-${hostname}-${date}.pdf`);
}
