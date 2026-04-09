import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult } from "../../types/analysis";

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = [124, 58,  237] as const; // violet-600
const BRAND2 = [99,  102, 241] as const; // indigo-500
const DARK   = [15,  20,  35 ] as const; // near-black
const CARD   = [22,  28,  48 ] as const; // card bg
const CARD2  = [28,  36,  60 ] as const; // alt row
const BORDER = [45,  50,  80 ] as const; // subtle border
const LIGHT  = [148, 155, 180] as const; // muted text
const WHITE  = [230, 232, 245] as const; // off-white
const GREEN  = [16,  185, 129] as const;
const AMBER  = [245, 158, 11 ] as const;
const ROSE   = [244, 63,  94 ] as const;
const TEAL   = [20,  184, 166] as const;

function rgb(c: readonly [number, number, number]): [number, number, number] {
  return [...c] as [number, number, number];
}

function statusColor(s: string): [number, number, number] {
  if (s === "pass")    return rgb(GREEN);
  if (s === "warning") return rgb(AMBER);
  return rgb(ROSE);
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
    <button onClick={handleDownload} disabled={loading} className="btn-primary text-sm">
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      )}
      Download PDF
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
  const FOOT = 18; // footer reserved height
  let   y    = 0;

  // ── Pre-computed scores ────────────────────────────────────────────────────
  const seoPass   = result.seoChecks.filter((c) => c.status === "pass").length;
  const seoWarn   = result.seoChecks.filter((c) => c.status === "warning").length;
  const seoFail   = result.seoChecks.filter((c) => c.status === "fail").length;
  const seoTotal  = result.seoChecks.length;
  const seoScore  = seoTotal > 0 ? Math.round((seoPass / seoTotal) * 100) : 0;
  const ux        = result.ux;
  const uxSignals = [ux.hasCTA, ux.hasForms, ux.hasSocialProof, ux.hasTrustSignals, ux.hasContactInfo, ux.mobileReady];
  const uxSigCount = uxSignals.filter(Boolean).length;
  const uxScore   = Math.round((uxSigCount / uxSignals.length) * 100);
  const issueCount = result.weakPoints.length;
  const techCount  = result.techStack.length;
  const recCount   = result.recommendations.length;
  const ps         = result.pageStats ?? { wordCount: 0, imageCount: 0, internalLinks: 0, externalLinks: 0, scriptCount: 0, h1Count: 0, h2Count: 0, h3Count: 0 };
  const readMins   = Math.max(1, Math.round(ps.wordCount / 200));
  const highConf   = result.techStack.filter((t) => t.confidence === "high").length;
  const medConf    = result.techStack.filter((t) => t.confidence === "medium").length;
  const lowConf    = result.techStack.filter((t) => t.confidence === "low").length;

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Paint the dark background — called on every page, including autoTable overflow pages
  function pageBackground() {
    doc.setFillColor(...rgb(DARK));
    doc.rect(0, 0, W, H, "F");
    doc.setFillColor(...rgb(BRAND));
    doc.rect(0, 0, W * 0.4, 2.5, "F");
    doc.setFillColor(...rgb(BRAND2));
    doc.rect(W * 0.4, 0, W * 0.6, 2.5, "F");
  }

  function pageFooter(pageNum: number, total: number) {
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    doc.line(M, H - 13, W - M, H - 13);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(LIGHT));
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

  // The didDrawPage callback — fixes white overflow pages from autoTable
  function onDrawPage() {
    pageBackground();
  }

  function sectionHeader(title: string, color: readonly [number, number, number] = BRAND) {
    checkPage(18);
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(M, y, CW, 10, 2, 2, "F");
    doc.setFillColor(...rgb(color));
    doc.roundedRect(M, y, 3.5, 10, 1, 1, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(WHITE));
    doc.text(title.toUpperCase(), M + 8, y + 6.5);
    y += 13;
  }

  function scoreBar(score: number, labelLeft: string, labelRight: string) {
    const trackH = 6;
    const color  = score >= 80 ? rgb(GREEN) : score >= 50 ? rgb(AMBER) : rgb(ROSE);
    doc.setFillColor(...rgb(BORDER));
    doc.roundedRect(M, y, CW, trackH, 1.5, 1.5, "F");
    doc.setFillColor(...color);
    doc.roundedRect(M, y, Math.max(6, CW * (score / 100)), trackH, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(WHITE));
    doc.text(labelLeft, M + 3, y + 4.3);
    doc.setTextColor(...rgb(LIGHT));
    doc.text(labelRight, W - M - 3, y + 4.3, { align: "right" });
    y += trackH + 6;
  }

  // ── Page 1: Cover ─────────────────────────────────────────────────────────
  pageBackground();

  // Logo
  const lx = W / 2, ly = 52;
  doc.setFillColor(44, 28, 90);
  doc.roundedRect(lx - 15, ly - 15, 30, 30, 6, 6, "F");
  doc.setDrawColor(...rgb(BRAND));
  doc.setLineWidth(0.7);
  doc.roundedRect(lx - 15, ly - 15, 30, 30, 6, 6, "S");
  doc.setDrawColor(200, 180, 255);
  doc.setLineWidth(2);
  doc.circle(lx - 2.5, ly - 1, 7, "S");
  doc.setLineWidth(2.5);
  doc.line(lx + 3.5, ly + 5, lx + 9, ly + 10.5);
  doc.setFillColor(170, 140, 255);
  doc.circle(lx - 2.5, ly - 1, 2, "F");

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(WHITE));
  doc.text("Website Analysis Report", W / 2, 90, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(BRAND));
  const displayUrl = result.url.length > 60 ? result.url.slice(0, 57) + "..." : result.url;
  doc.text(displayUrl, W / 2, 101, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(...rgb(LIGHT));
  doc.text(`Generated: ${new Date(result.fetchedAt).toLocaleString()}`, W / 2, 110, { align: "center" });

  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.3);
  doc.line(M + 15, 116, W - M - 15, 116);

  // 6-stat grid (3×2)
  const statY    = 120;
  const statCols = 3;
  const gapX     = 4;
  const gapY     = 4;
  const statW    = (CW - gapX * (statCols - 1)) / statCols;
  const statH    = 21;
  const stats    = [
    { label: "SEO Score",      value: `${seoScore}/100`,  color: seoScore  >= 80 ? GREEN : seoScore  >= 50 ? AMBER : ROSE },
    { label: "UX Score",       value: `${uxScore}/100`,   color: uxScore   >= 80 ? GREEN : uxScore   >= 50 ? AMBER : ROSE },
    { label: "Tech Detected",  value: `${techCount}`,     color: BRAND2 },
    { label: "Issues Found",   value: `${issueCount}`,    color: issueCount === 0 ? GREEN : issueCount <= 3 ? AMBER : ROSE },
    { label: "Words on Page",  value: `${ps.wordCount.toLocaleString()}`, color: TEAL },
    { label: "Recommendations",value: `${recCount}`,      color: [52, 211, 153] as const },
  ];

  stats.forEach((s, i) => {
    const col = i % statCols;
    const row = Math.floor(i / statCols);
    const sx  = M + col * (statW + gapX);
    const sy  = statY + row * (statH + gapY);
    doc.setFillColor(...rgb(CARD2));
    doc.roundedRect(sx, sy, statW, statH, 3, 3, "F");
    doc.setDrawColor(...rgb(s.color));
    doc.setLineWidth(0.4);
    doc.roundedRect(sx, sy, statW, statH, 3, 3, "S");
    doc.setFontSize(13.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(s.color));
    doc.text(s.value, sx + statW / 2, sy + 11, { align: "center" });
    doc.setFontSize(6.3);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(LIGHT));
    doc.text(s.label, sx + statW / 2, sy + 17, { align: "center" });
  });

  // Overview box
  const ov        = result.overview;
  const statRows  = Math.ceil(stats.length / statCols);
  const ovY       = statY + statRows * statH + (statRows - 1) * gapY + 8;
  const ovH       = 62;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(M, ovY, CW, ovH, 4, 4, "F");
  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.25);
  doc.roundedRect(M, ovY, CW, ovH, 4, 4, "S");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(LIGHT));
  doc.text("PAGE OVERVIEW", M + 5, ovY + 7);

  const ovFields: [string, string][] = [
    ["Title",       ov.title       || "(no title)"],
    ["Description", ov.description || "(no description)"],
    ["Language",    (ov.language   || "—").toUpperCase()],
    ["Page Weight", ov.pageLoadHint.charAt(0).toUpperCase() + ov.pageLoadHint.slice(1)],
  ];

  let fy = ovY + 14;
  for (const [key, val] of ovFields) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(LIGHT));
    doc.text(key, M + 5, fy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(WHITE));
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
  doc.setTextColor(...rgb(LIGHT));
  doc.text("Explain This Website — explainthewebsite.dev", W / 2, H - 8, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════
  // Page 2: Tech Stack + SEO Audit
  // ═══════════════════════════════════════════════════════════════════════════
  addPage();

  sectionHeader("Detected Tech Stack", BRAND2);

  if (techCount === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...rgb(LIGHT));
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
      headStyles: { fillColor: [30, 22, 60], textColor: rgb(LIGHT), fontSize: 8, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
      bodyStyles: { fillColor: rgb(CARD), textColor: rgb(WHITE), fontSize: 8.5, lineColor: rgb(BORDER), lineWidth: 0.2, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
      alternateRowStyles: { fillColor: rgb(CARD2) },
      columnStyles: {
        0: { cellWidth: 32, textColor: rgb(LIGHT), fontSize: 7.5 },
        1: { fontStyle: "bold" },
        2: { cellWidth: 28, halign: "center", fontSize: 7.5 },
      },
      theme: "plain",
      didDrawPage: onDrawPage,
      didParseCell(data) {
        if (data.column.index === 2 && data.section === "body") {
          const conf = data.cell.raw as string;
          data.cell.styles.textColor = conf === "high" ? rgb(GREEN) : conf === "medium" ? rgb(AMBER) : rgb(LIGHT);
        }
      },
    });
    y = lastAutoTableY(doc) + 12;
  }

  checkPage(55);
  sectionHeader("SEO Audit", BRAND);
  scoreBar(seoScore, `SEO Score: ${seoScore}/100`, `${seoPass} pass  ·  ${seoWarn} warn  ·  ${seoFail} fail`);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOT + 2 },
    head: [["Check", "Status", "Detail"]],
    body: result.seoChecks.map((c) => [c.label, statusLabel(c.status), c.detail]),
    headStyles: { fillColor: [30, 22, 60], textColor: rgb(LIGHT), fontSize: 8, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    bodyStyles: { fillColor: rgb(CARD), textColor: rgb(WHITE), fontSize: 8, lineColor: rgb(BORDER), lineWidth: 0.2, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    alternateRowStyles: { fillColor: rgb(CARD2) },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold", fontSize: 7.5 },
      1: { cellWidth: 18, halign: "center", fontStyle: "bold", fontSize: 7.5 },
      2: { fontSize: 7.5, textColor: rgb(LIGHT) },
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

  sectionHeader("Conversion & UX Signals", [99, 170, 241]);
  scoreBar(uxScore, `UX Score: ${uxScore}/100`, `${uxSigCount} of ${uxSignals.length} signals present`);

  const uxRows: [string, string, string][] = [
    ["Call-to-Action",    ux.hasCTA    ? "YES" : "NO", ux.hasCTA    ? `${ux.ctaCount} CTA button${ux.ctaCount !== 1 ? "s" : ""} detected`          : "No CTAs found — add clear action buttons"],
    ["Lead Capture Form", ux.hasForms  ? "YES" : "NO", ux.hasForms  ? `${ux.formCount} form${ux.formCount !== 1 ? "s" : ""} detected`              : "No forms found — consider a contact or lead form"],
    ["Social Proof",      ux.hasSocialProof  ? "YES" : "NO", ux.hasSocialProof  ? "Reviews, testimonials, or social indicators found"              : "No social proof — add reviews or testimonials"],
    ["Trust Signals",     ux.hasTrustSignals ? "YES" : "NO", ux.hasTrustSignals ? "SSL badges, security mentions, or guarantees detected"          : "No trust signals — add security/guarantee indicators"],
    ["Contact Info",      ux.hasContactInfo  ? "YES" : "NO", ux.hasContactInfo  ? "Email or phone number found on page"                             : "No contact info — add email/phone for credibility"],
    ["Mobile Responsive", ux.mobileReady     ? "YES" : "NO", ux.mobileReady     ? "Viewport meta tag present — mobile-ready"                        : "Missing viewport tag — not optimised for mobile"],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOT + 2 },
    head: [["Signal", "Present", "Detail"]],
    body: uxRows,
    headStyles: { fillColor: [30, 22, 60], textColor: rgb(LIGHT), fontSize: 8, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    bodyStyles: { fillColor: rgb(CARD), textColor: rgb(WHITE), fontSize: 8, lineColor: rgb(BORDER), lineWidth: 0.2, cellPadding: { top: 5, bottom: 5, left: 5, right: 5 } },
    alternateRowStyles: { fillColor: rgb(CARD2) },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", fontSize: 7.5 },
      1: { cellWidth: 20, halign: "center", fontStyle: "bold", fontSize: 8 },
      2: { fontSize: 7.5, textColor: rgb(LIGHT) },
    },
    theme: "plain",
    didDrawPage: onDrawPage,
    didParseCell(data) {
      if (data.column.index === 1 && data.section === "body") {
        data.cell.styles.textColor = data.cell.raw === "YES" ? rgb(GREEN) : rgb(ROSE);
      }
    },
  });
  y = lastAutoTableY(doc) + 12;

  // ── Page Stats ─────────────────────────────────────────────────────────────
  checkPage(55);
  sectionHeader("Page Statistics", TEAL);

  const psRows: [string, string, string][] = [
    ["Word Count",      ps.wordCount.toLocaleString(),                             `~${readMins} min read`],
    ["Images",          String(ps.imageCount),                                     ps.imageCount === 0 ? "No images found" : "Total img elements"],
    ["Scripts",         String(ps.scriptCount),                                    ps.scriptCount > 15 ? "High — may slow page load" : ps.scriptCount > 8 ? "Moderate" : "Lean"],
    ["Internal Links",  String(ps.internalLinks),                                  "Links to pages on same domain"],
    ["External Links",  String(ps.externalLinks),                                  "Links to other websites"],
    ["Heading Structure", `H1:${ps.h1Count}  H2:${ps.h2Count}  H3:${ps.h3Count}`, ps.h1Count === 1 ? "Good — single H1" : ps.h1Count === 0 ? "Missing H1" : "Multiple H1s detected"],
    ["Tech Stack Size", `${techCount} tool${techCount !== 1 ? "s" : ""} (${highConf} high / ${medConf} med / ${lowConf} low)`, "Detected by signature matching"],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOT + 2 },
    head: [["Metric", "Value", "Context"]],
    body: psRows,
    headStyles: { fillColor: [30, 22, 60], textColor: rgb(LIGHT), fontSize: 8, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    bodyStyles: { fillColor: rgb(CARD), textColor: rgb(WHITE), fontSize: 8, lineColor: rgb(BORDER), lineWidth: 0.2, cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 } },
    alternateRowStyles: { fillColor: rgb(CARD2) },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", fontSize: 7.5 },
      1: { cellWidth: 48, fontSize: 8, textColor: rgb(WHITE) },
      2: { fontSize: 7.5, textColor: rgb(LIGHT) },
    },
    theme: "plain",
    didDrawPage: onDrawPage,
  });
  y = lastAutoTableY(doc) + 12;

  // ── Weak Points ────────────────────────────────────────────────────────────
  checkPage(22);
  sectionHeader("Weak Points", ROSE);

  if (result.weakPoints.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...rgb(GREEN));
    doc.text("No significant weak points detected — great job!", M, y);
    y += 12;
  } else {
    for (const [i, point] of result.weakPoints.entries()) {
      checkPage(14);
      doc.setFillColor(...rgb(AMBER));
      doc.circle(M + 3.5, y + 1.5, 3.5, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(DARK));
      doc.text(String(i + 1), M + 3.5, y + 3, { align: "center" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(WHITE));
      const lines = doc.splitTextToSize(point, CW - 12);
      doc.text(lines, M + 10, y + 2);
      y += lines.length * 5.5 + 6;
    }
    y += 2;
  }

  // ── Recommendations ────────────────────────────────────────────────────────
  checkPage(22);
  sectionHeader("Recommendations", GREEN);

  if (result.recommendations.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...rgb(LIGHT));
    doc.text("No recommendations at this time.", M, y);
  } else {
    for (const [i, rec] of result.recommendations.entries()) {
      checkPage(16);
      doc.setFillColor(...rgb(BRAND));
      doc.circle(M + 3.5, y + 1.5, 3.5, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(WHITE));
      doc.text(String(i + 1), M + 3.5, y + 3, { align: "center" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(WHITE));
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
