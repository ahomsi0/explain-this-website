import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult, StrategyData, CoreWebVital } from "../../types/analysis";
import { computeInsights } from "../../utils/insights";

// ─── Palette (zinc monochrome — mirrors the UI) ───────────────────────────────
const BG     = [9,   9,  11 ] as const; // zinc-950
const PANEL  = [16,  16,  19 ] as const;
const CARD   = [24,  24,  27 ] as const; // zinc-900
const CARD2  = [32,  32,  36 ] as const;
const BORDER = [39,  39,  42 ] as const; // zinc-800
const MUTED  = [82,  82,  91 ] as const; // zinc-600
const DIM    = [113, 113, 122] as const; // zinc-500
const SUB    = [161, 161, 170] as const; // zinc-400
const TEXT   = [244, 244, 245] as const; // zinc-100
const VIOLET = [167, 139, 250] as const; // violet-400
const GREEN  = [52,  211, 153] as const;
const AMBER  = [251, 191,  36] as const;
const RED    = [248, 113, 113] as const;

type RGB = readonly [number, number, number];

function rgb(c: RGB): [number, number, number] {
  return [...c] as [number, number, number];
}
function statusColor(s: string): [number, number, number] {
  return s === "pass" ? rgb(GREEN) : s === "warning" ? rgb(AMBER) : rgb(RED);
}
function statusLabel(s: string) {
  return s === "pass" ? "PASS" : s === "warning" ? "WARN" : "FAIL";
}
function scoreColor(n: number): RGB {
  return n >= 75 ? GREEN : n >= 50 ? AMBER : RED;
}
function ratingColor(r: string): RGB {
  return r === "good" ? GREEN : r === "needs-improvement" ? AMBER : RED;
}
function impactColor(impact: "high" | "medium" | "low"): RGB {
  return impact === "high" ? RED : impact === "medium" ? AMBER : DIM;
}
function san(s: string): string {
  return (s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, "-")
    .replace(/—/g, "--")
    .replace(/…/g, "...")
    .split("")
    .map((ch) => (ch.codePointAt(0) ?? 0) > 0xff ? "?" : ch)
    .join("");
}
function lastY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}
function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
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
      <span className="hidden sm:inline">PDF</span>
    </button>
  );
}

// ─── PDF builder ──────────────────────────────────────────────────────────────
function buildPDF(result: AnalysisResult) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 16, CW = W - M * 2, FOOT = 18;
  let y = 0;

  const insights = computeInsights(result);

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
    doc.line(M, H - 11, W - M, H - 11);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(MUTED));
    const d = result.url.length > 55 ? result.url.slice(0, 52) + "…" : result.url;
    doc.text("Explain This Website", M, H - 6);
    doc.text(san(d), W / 2, H - 6, { align: "center" });
    doc.text(`${n} / ${total}`, W - M, H - 6, { align: "right" });
  }

  function section(title: string) {
    need(16);
    doc.setFillColor(...rgb(VIOLET));
    doc.rect(M, y, 1.5, 5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(TEXT));
    doc.text(title, M + 4, y + 4);
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    doc.line(M, y + 7.5, W - M, y + 7.5);
    y += 12;
  }

  function pill(x: number, py: number, w: number, label: string, value: string, color: RGB) {
    const h = 16;
    doc.setFillColor(...rgb(CARD));
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    doc.roundedRect(x, py, w, h, 1.5, 1.5, "FD");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(color));
    doc.text(value, x + w / 2, py + 7, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(DIM));
    doc.text(label.toUpperCase(), x + w / 2, py + 12.5, { align: "center" });
  }

  function kvRow(label: string, value: string, valColor: RGB = TEXT, labelW = 36) {
    need(6);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(DIM));
    doc.text(label, M, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(valColor));
    const lines = doc.splitTextToSize(san(value), CW - labelW) as string[];
    doc.text(lines, M + labelW, y);
    y += Math.max(5.5, lines.length * 4.5 + 1);
  }

  function insightBox(meaning: string, nextStep: string) {
    need(24);
    doc.setFillColor(...rgb(PANEL));
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    const meaningLines = doc.splitTextToSize(san(meaning), CW - 6) as string[];
    const nextLines    = doc.splitTextToSize(san(nextStep), CW - 6) as string[];
    const boxH = 5 + meaningLines.length * 4 + 4 + 5 + nextLines.length * 4 + 4;
    doc.roundedRect(M, y, CW, boxH, 1.5, 1.5, "FD");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(VIOLET));
    doc.text("WHAT THIS MEANS", M + 3, y + 4);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(SUB));
    doc.text(meaningLines, M + 3, y + 8);

    const nsY = y + 8 + meaningLines.length * 4 + 4;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(GREEN));
    doc.text("WHAT TO DO NEXT", M + 3, nsY);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(SUB));
    doc.text(nextLines, M + 3, nsY + 4);

    y += boxH + 5;
  }

  function ztable(startPage: number, opts: Parameters<typeof autoTable>[1]) {
    autoTable(doc, {
      theme: "plain",
      margin: { left: M, right: M, bottom: FOOT + 2 },
      headStyles: {
        fillColor: rgb(BG), textColor: rgb(DIM),
        fontSize: 7, fontStyle: "bold",
        cellPadding: { top: 3, bottom: 3, left: 6, right: 6 },
        overflow: "linebreak",
      },
      bodyStyles: {
        fillColor: rgb(CARD), textColor: rgb(TEXT),
        fontSize: 8, lineColor: rgb(BORDER), lineWidth: 0.2,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        overflow: "linebreak",
      },
      alternateRowStyles: { fillColor: rgb(CARD2) },
      didDrawPage() { overflowBg(startPage); },
      ...opts,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Page 1 — Executive Summary cover
  // ═══════════════════════════════════════════════════════════════════════════
  bg();

  // Branded header
  doc.setFillColor(...rgb(VIOLET));
  doc.rect(M, 22, 3, 14, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(VIOLET));
  doc.text("EXPLAIN THIS WEBSITE", M + 6, 27);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(TEXT));
  doc.text("Website Analysis", M + 6, 35);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(SUB));
  const dUrl = result.url.length > 72 ? result.url.slice(0, 69) + "…" : result.url;
  doc.text(san(dUrl), M, 46);

  doc.setFontSize(7);
  doc.setTextColor(...rgb(MUTED));
  doc.text(`Generated ${new Date(result.fetchedAt).toLocaleString()}`, M, 51);

  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(M, 56, W - M, 56);

  // Overall score block + summary text
  let coverY = 62;
  const overall = insights.overallScore;
  const overallC = scoreColor(overall);
  const ovLabel = overall >= 80 ? "Excellent" : overall >= 65 ? "Good" : overall >= 50 ? "Fair" : overall >= 35 ? "Poor" : "Critical";

  doc.setFillColor(...rgb(CARD));
  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.3);
  doc.roundedRect(M, coverY, 50, 36, 2, 2, "FD");

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(overallC));
  doc.text(String(overall), M + 25, coverY + 18, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(...rgb(MUTED));
  doc.text("/ 100", M + 25, coverY + 23, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(overallC));
  doc.text(ovLabel.toUpperCase(), M + 25, coverY + 31, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(VIOLET));
  doc.text("EXECUTIVE SUMMARY", M + 56, coverY + 5);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(SUB));
  const sumLines = doc.splitTextToSize(san(insights.summarySentence), CW - 56) as string[];
  doc.text(sumLines.slice(0, 6), M + 56, coverY + 11);

  coverY += 42;

  // Sub-score pills
  const pillW = (CW - 6) / 4;
  pill(M,                  coverY, pillW, "SEO",         String(insights.seoScore),        scoreColor(insights.seoScore));
  pill(M + (pillW + 2),    coverY, pillW, "Performance", String(insights.perfScore),       scoreColor(insights.perfScore));
  pill(M + (pillW + 2)*2,  coverY, pillW, "UX",          String(insights.uxScore),         scoreColor(insights.uxScore));
  pill(M + (pillW + 2)*3,  coverY, pillW, "Conversion",  String(insights.conversionScore), scoreColor(insights.conversionScore));
  coverY += 22;

  // Top issues + Quick wins panels (side by side)
  const colW = (CW - 4) / 2;
  function panel(x: number, py: number, w: number, accent: RGB, title: string, items: typeof insights.topIssues, emptyMsg: string): number {
    const padX = 4, padY = 4;
    type ItemLines = { titleL: string[]; descL: string[] };
    const layouts: ItemLines[] = items.map((it) => ({
      titleL: doc.splitTextToSize(san(it.title), w - padX * 2 - 4) as string[],
      descL:  doc.splitTextToSize(san(it.description), w - padX * 2 - 4) as string[],
    }));
    const contentLines = layouts.reduce((acc, l) => acc + l.titleL.length + l.descL.length, 0);
    const itemGap = items.length > 1 ? (items.length - 1) * 3 : 0;
    const h = items.length === 0
      ? padY + 5 + 3 + 5 + padY
      : padY + 5 + 3 + contentLines * 4 + itemGap + padY;

    doc.setFillColor(...rgb(CARD));
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    doc.roundedRect(x, py, w, h, 1.5, 1.5, "FD");
    doc.setFillColor(...rgb(accent));
    doc.rect(x, py, 1, h, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(accent));
    doc.text(title.toUpperCase(), x + padX, py + padY + 3.5);

    let cursorY = py + padY + 3.5 + 5;
    if (items.length === 0) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(MUTED));
      doc.text(emptyMsg, x + padX, cursorY);
    } else {
      items.forEach((it, idx) => {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...rgb(impactColor(it.impact)));
        doc.text("•", x + padX, cursorY);
        doc.setTextColor(...rgb(TEXT));
        doc.text(layouts[idx].titleL, x + padX + 4, cursorY);
        cursorY += layouts[idx].titleL.length * 4;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...rgb(MUTED));
        doc.text(layouts[idx].descL, x + padX + 4, cursorY);
        cursorY += layouts[idx].descL.length * 4;
        if (idx < items.length - 1) cursorY += 3;
      });
    }
    return h;
  }

  const hL = panel(M,             coverY, colW, RED,   "Top Issues", insights.topIssues, "No critical issues found.");
  const hR = panel(M + colW + 4,  coverY, colW, GREEN, "Quick Wins", insights.quickWins, "No quick wins detected.");
  coverY += Math.max(hL, hR) + 6;

  // Footer tagline
  const taglineY = H - 22;
  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(M, taglineY, W - M, taglineY);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...rgb(MUTED));
  doc.text("Detailed analysis follows on subsequent pages.", W / 2, taglineY + 5, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════
  // Page 2 — Site Overview & Intelligence
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  section("Site Overview");

  const ovFields: { key: string; val: string; color?: RGB }[] = [
    { key: "Title",       val: result.overview.title       || "(no title)" },
    { key: "Description", val: result.overview.description || "(no description)" },
    { key: "Language",    val: (result.overview.language   || "—").toUpperCase() },
    { key: "Page Weight", val: cap(result.overview.pageLoadHint), color: result.overview.pageLoadHint === "lightweight" ? GREEN : result.overview.pageLoadHint === "medium" ? AMBER : RED },
  ];
  for (const f of ovFields) kvRow(f.key, f.val, f.color ?? TEXT, 30);
  y += 3;

  section("Site Intelligence");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(VIOLET));
  doc.text(san(result.intent.label), M, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(DIM));
  const descL = doc.splitTextToSize(san(result.intent.description), CW) as string[];
  doc.text(descL, M, y);
  y += descL.length * 4.5 + 4;

  if (result.biggestOpportunity) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(AMBER));
    doc.text("BIGGEST OPPORTUNITY", M, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(TEXT));
    const oppL = doc.splitTextToSize(san(result.biggestOpportunity), CW) as string[];
    doc.text(oppL, M, y);
    y += oppL.length * 4.5 + 4;
  }

  if (result.competitorInsight) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(MUTED));
    doc.text("MARKET POSITIONING", M, y);
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...rgb(DIM));
    const ciL = doc.splitTextToSize(san(result.competitorInsight), CW) as string[];
    doc.text(ciL, M, y);
    y += ciL.length * 4.5 + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEO Audit
  // ═══════════════════════════════════════════════════════════════════════════
  section("SEO Audit");
  const seoPass = result.seoChecks.filter(c => c.status === "pass").length;
  const seoWarn = result.seoChecks.filter(c => c.status === "warning").length;
  const seoFail = result.seoChecks.filter(c => c.status === "fail").length;
  const seoScore = insights.seoScore;
  {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(DIM));
    doc.text("Score: ", M, y);
    let sx = M + doc.getTextWidth("Score: ");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(scoreColor(seoScore)));
    doc.text(`${seoScore}/100`, sx, y);
    sx += doc.getTextWidth(`${seoScore}/100`);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...rgb(MUTED));
    doc.text(`  ·  ${seoPass} pass  ·  ${seoWarn} warn  ·  ${seoFail} fail`, sx, y);
    y += 6;
  }
  {
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Check", "Status", "Detail"]],
      body: result.seoChecks.map(c => [san(c.label), statusLabel(c.status), san(c.detail)]),
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold" },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: CW - 58, textColor: rgb(DIM) },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body") {
          data.cell.styles.textColor = statusColor(result.seoChecks[data.row.index]?.status ?? "fail");
        }
      },
    });
    y = lastY(doc) + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Performance & Core Web Vitals
  // ═══════════════════════════════════════════════════════════════════════════
  if (result.performance?.available) {
    section("Performance & Core Web Vitals");
    const renderStrategy = (title: string, s?: StrategyData) => {
      if (!s) return;
      need(40);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(SUB));
      doc.text(title.toUpperCase(), M, y);
      y += 4;

      const pw = (CW - 6) / 4;
      pill(M,                 y, pw, "Performance",   String(s.lighthouse.performance),  scoreColor(s.lighthouse.performance));
      pill(M + (pw + 2),      y, pw, "Accessibility", String(s.lighthouse.accessibility), scoreColor(s.lighthouse.accessibility));
      pill(M + (pw + 2)*2,    y, pw, "Best Practices",String(s.lighthouse.bestPractices), scoreColor(s.lighthouse.bestPractices));
      pill(M + (pw + 2)*3,    y, pw, "Lighthouse SEO",String(s.lighthouse.seo),           scoreColor(s.lighthouse.seo));
      y += 22;

      const cwvBody: [string, string, string][] = [];
      const push = (l: string, v?: CoreWebVital) => { if (v) cwvBody.push([l, v.displayValue, v.rating.replace("-", " ")]); };
      push("LCP", s.lcp);
      push("CLS", s.cls);
      push("TBT", s.tbt);
      push("FCP", s.fcp);
      push("Speed Index", s.speedIndex);

      const cells = [s.lcp, s.cls, s.tbt, s.fcp, s.speedIndex].filter(Boolean) as CoreWebVital[];
      const p0 = doc.getNumberOfPages();
      ztable(p0, {
        startY: y,
        head: [["Metric", "Value", "Rating"]],
        body: cwvBody,
        columnStyles: {
          0: { cellWidth: 36, fontStyle: "bold" },
          1: { cellWidth: 36, halign: "center" },
          2: { cellWidth: CW - 72, halign: "center", fontStyle: "bold" },
        },
        didParseCell(data) {
          if (data.column.index === 2 && data.section === "body") {
            data.cell.styles.textColor = rgb(ratingColor(cells[data.row.index]?.rating ?? "good"));
          }
        },
      });
      y = lastY(doc) + 5;
    };

    renderStrategy("Mobile",  result.performance.mobile);
    renderStrategy("Desktop", result.performance.desktop);

    const perfMeaning = insights.perfScore >= 75
      ? "Performance is solid -- pages load quickly with healthy Core Web Vitals."
      : insights.perfScore >= 50
      ? "Moderate performance -- some Core Web Vitals could be improved to retain visitors."
      : "Slow performance is hurting visitors and SEO -- Core Web Vitals need urgent attention.";
    const perfNext = insights.perfScore >= 75
      ? "Continue monitoring; consider preconnecting to third-party origins to shave additional ms."
      : insights.perfScore >= 50
      ? "Optimise the largest contentful element (image or hero), defer non-critical JS, inline critical CSS."
      : "Compress images, lazy-load offscreen media, and remove render-blocking scripts.";
    insightBox(perfMeaning, perfNext);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UX & Customer Experience
  // ═══════════════════════════════════════════════════════════════════════════
  section("UX & Customer Experience");

  const cv = result.customerView;
  const trustC = cv.trustLevel === "strong" ? GREEN : cv.trustLevel === "moderate" ? AMBER : RED;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(MUTED));
  doc.text("Trust Level: ", M, y);
  let cx = M + doc.getTextWidth("Trust Level: ");
  doc.setTextColor(...rgb(trustC));
  doc.text(cap(cv.trustLevel), cx, y);
  cx += doc.getTextWidth(cap(cv.trustLevel)) + 6;
  doc.setTextColor(...rgb(MUTED));
  doc.text("Offer Clear: ", cx, y);
  cx += doc.getTextWidth("Offer Clear: ");
  doc.setTextColor(...rgb(cv.offerClear ? GREEN : RED));
  doc.text(cv.offerClear ? "Yes" : "No", cx, y);
  cx += doc.getTextWidth(cv.offerClear ? "Yes" : "No") + 6;
  doc.setTextColor(...rgb(MUTED));
  doc.text("CTA Visible: ", cx, y);
  cx += doc.getTextWidth("CTA Visible: ");
  doc.setTextColor(...rgb(cv.ctaClear ? GREEN : RED));
  doc.text(cv.ctaClear ? "Yes" : "No", cx, y);
  y += 6;

  const statements = cv.statements ?? [];
  if (statements.length) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(MUTED));
    doc.text("AS A VISITOR:", M, y);
    y += 4;
    for (const stmt of statements) {
      need(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(DIM));
      doc.text("›", M, y);
      doc.setTextColor(...rgb(TEXT));
      const lines = doc.splitTextToSize(san(stmt), CW - 6) as string[];
      doc.text(lines, M + 5, y);
      y += lines.length * 4.5 + 1.5;
    }
    y += 4;
  }

  // UX signals table
  const ux = result.ux;
  const uxRows: [string, string, string][] = [
    ["Call-to-Action",    ux.hasCTA              ? "YES" : "NO", san(ux.hasCTA              ? `${ux.ctaCount} CTA button${ux.ctaCount !== 1 ? "s" : ""} detected`  : "No CTAs found - add clear action buttons")],
    ["Lead Capture Form", ux.hasForms            ? "YES" : "NO", san(ux.hasForms            ? `${ux.formCount} form${ux.formCount !== 1 ? "s" : ""} detected`      : "No forms - consider a contact or lead form")],
    ["Social Proof",      ux.hasSocialProof      ? "YES" : "NO", san(ux.hasSocialProof      ? "Reviews, testimonials, or social indicators found"                  : "No social proof - add reviews or testimonials")],
    ["Trust Signals",     ux.hasTrustSignals     ? "YES" : "NO", san(ux.hasTrustSignals     ? "SSL badges, security mentions, or guarantees detected"              : "No trust signals - add security/guarantee badges")],
    ["Contact Info",      ux.hasContactInfo      ? "YES" : "NO", san(ux.hasContactInfo      ? "Email or phone number found on page"                               : "No contact info - add email/phone for credibility")],
    ["Mobile Responsive", ux.mobileReady         ? "YES" : "NO", san(ux.mobileReady         ? "Viewport meta tag present - mobile-ready"                          : "Missing viewport tag - not optimised for mobile")],
    ["Privacy Policy",    ux.hasPrivacyPolicy    ? "YES" : "NO", ux.hasPrivacyPolicy    ? "Policy link found"   : "No privacy policy link found"],
    ["Cookie Banner",     ux.hasCookieBanner     ? "YES" : "NO", ux.hasCookieBanner     ? "Consent UI detected" : "No cookie consent detected"],
    ["Live Chat",         ux.hasLiveChat         ? "YES" : "NO", ux.hasLiveChat         ? "Chat widget detected" : "No live chat widget"],
    ["Newsletter Signup", ux.hasNewsletterSignup ? "YES" : "NO", ux.hasNewsletterSignup ? "Email signup detected" : "No newsletter signup"],
    ["Video Content",     ux.hasVideoContent     ? "YES" : "NO", ux.hasVideoContent     ? "Video content detected" : "No video content"],
  ];
  {
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Signal", "Present", "Detail"]],
      body: uxRows,
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: CW - 62, textColor: rgb(DIM) },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body") {
          data.cell.styles.textColor = data.cell.raw === "YES" ? rgb(GREEN) : rgb(RED);
        }
      },
    });
    y = lastY(doc) + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Vague Language / Copy
  // ═══════════════════════════════════════════════════════════════════════════
  if (result.copyAnalysis) {
    section("Copy & Vague Language");
    const ca = result.copyAnalysis;
    {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(DIM));
      doc.text("Specificity Score: ", M, y);
      let sx = M + doc.getTextWidth("Specificity Score: ");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(scoreColor(ca.score)));
      doc.text(`${ca.score}/100`, sx, y);
      sx += doc.getTextWidth(`${ca.score}/100`);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(MUTED));
      doc.text(`  ·  ${ca.label}`, sx, y);
      y += 6;
    }

    const phrases = ca.vaguePhrases ?? [];
    if (phrases.length > 0) {
      const p0 = doc.getNumberOfPages();
      ztable(p0, {
        startY: y,
        head: [["Flagged Phrase", "Why It's Vague"]],
        body: phrases.slice(0, 12).map(v => [san(`"${v.phrase}"`), san(v.reason)]),
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold", textColor: rgb(AMBER) },
          1: { cellWidth: CW - 60, textColor: rgb(DIM) },
        },
      });
      y = lastY(doc) + 5;
    } else {
      doc.setFontSize(8);
      doc.setTextColor(...rgb(GREEN));
      doc.text("No vague marketing language detected -- copy is specific and clear.", M, y);
      y += 8;
    }

    const hints = ca.specificityHints ?? [];
    if (hints.length > 0) {
      need(20);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(GREEN));
      doc.text("SUGGESTED ALTERNATIVES", M, y);
      y += 4;
      for (const h of hints) {
        need(6);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...rgb(GREEN));
        doc.text("›", M, y);
        doc.setTextColor(...rgb(SUB));
        const lines = doc.splitTextToSize(san(h), CW - 5) as string[];
        doc.text(lines, M + 5, y);
        y += lines.length * 4.5 + 1.5;
      }
      y += 3;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Conversion Optimization
  // ═══════════════════════════════════════════════════════════════════════════
  section("Conversion Optimization");
  const cs2 = result.conversionScores;
  {
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Dimension", "Score", "Notes"]],
      body: [
        ["Overall",      `${cs2.overall}/100`,     "Weighted blend of all sub-scores"],
        ["Clarity",      `${cs2.clarity}/100`,     san(cs2.clarityNote)],
        ["Trust",        `${cs2.trust}/100`,       san(cs2.trustNote)],
        ["CTA Strength", `${cs2.ctaStrength}/100`, san(cs2.ctaNote)],
        ["Friction",     `${cs2.friction}/100`,    san(cs2.frictionNote)],
      ],
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold" },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: CW - 58, textColor: rgb(DIM) },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body") {
          const scores = [cs2.overall, cs2.clarity, cs2.trust, cs2.ctaStrength, cs2.friction];
          data.cell.styles.textColor = rgb(scoreColor(scores[data.row.index] ?? 0));
        }
      },
    });
    y = lastY(doc) + 5;
  }

  // Conversion blockers
  const blockers: string[] = [];
  if (cs2.ctaStrength < 50) blockers.push("Weak or absent call-to-action -- visitors don't know what to do next.");
  if (cs2.trust       < 50) blockers.push("Low trust signals -- no reviews, badges, or social proof detected.");
  if (cs2.clarity     < 50) blockers.push("Unclear offer -- the value proposition is not immediately obvious.");
  if (cs2.friction    < 40) blockers.push("Ease of action is low -- the conversion path has unnecessary obstacles.");

  if (blockers.length > 0) {
    need(8 + blockers.length * 6);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(RED));
    doc.text("CONVERSION BLOCKERS", M, y);
    y += 4;
    for (const b of blockers) {
      need(6);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(RED));
      doc.text("•", M, y);
      doc.setTextColor(...rgb(SUB));
      const lines = doc.splitTextToSize(san(b), CW - 5) as string[];
      doc.text(lines, M + 5, y);
      y += lines.length * 4.5 + 1.5;
    }
    y += 3;
  }

  // What to improve first
  {
    const worst = [
      { label: "CTA strength", score: cs2.ctaStrength },
      { label: "trust",        score: cs2.trust       },
      { label: "clarity",      score: cs2.clarity     },
    ].sort((a, b) => a.score - b.score)[0];
    const conversionMeaning = cs2.overall >= 70
      ? "Strong conversion readiness -- your offer is clear, trustworthy, and easy to act on."
      : cs2.overall >= 45
      ? "Moderate conversion potential -- some friction or trust gaps are leaving revenue on the table."
      : "Low conversion readiness -- significant barriers are preventing visitors from taking action.";
    const conversionNext = `Focus on improving ${worst.label} first -- at ${worst.score}/100 it's your biggest drag on conversions.`;
    insightBox(conversionMeaning, conversionNext);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tech Stack
  // ═══════════════════════════════════════════════════════════════════════════
  if (result.techStack.length > 0) {
    section("Detected Tech Stack");
    const catOrder  = ["cms", "ecommerce", "builder", "framework", "analytics", "cdn", "media"] as const;
    const catLabels: Record<string, string> = {
      cms: "CMS", ecommerce: "E-commerce", builder: "Builder",
      framework: "Framework", analytics: "Analytics", cdn: "CDN", media: "Media",
    };
    const grouped: Record<string, typeof result.techStack> = {};
    for (const t of result.techStack) (grouped[t.category] ??= []).push(t);
    const rows: [string, string, string][] = [];
    for (const cat of catOrder) {
      if (!grouped[cat]) continue;
      for (const t of grouped[cat]) rows.push([catLabels[cat] ?? cat, t.name, t.confidence === "low" ? "possible" : t.confidence]);
    }
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Category", "Technology", "Confidence"]],
      body: rows,
      columnStyles: {
        0: { cellWidth: 30, textColor: rgb(DIM) },
        1: { cellWidth: CW - 56, fontStyle: "bold" },
        2: { cellWidth: 26, halign: "center" },
      },
      didParseCell(data) {
        if (data.column.index === 2 && data.section === "body") {
          const c = data.cell.raw as string;
          data.cell.styles.textColor = c === "high" ? rgb(GREEN) : c === "medium" ? rgb(AMBER) : rgb(MUTED);
        }
      },
    });
    y = lastY(doc) + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Page Stats & Content
  // ═══════════════════════════════════════════════════════════════════════════
  if (result.pageStats) {
    section("Page Statistics");
    const ps = result.pageStats;
    const techCount = result.techStack.length;
    const readMins = Math.max(1, Math.round(ps.wordCount / 200));
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["Metric", "Value", "Context"]],
      body: [
        ["Word Count",        ps.wordCount.toLocaleString(),                         `~${readMins} min read`],
        ["Images",            `${ps.imageCount} (${ps.lazyImageCount} lazy)`,        ps.imageCount === 0 ? "No images" : "img elements"],
        ["Scripts",           String(ps.scriptCount),                                ps.scriptCount > 15 ? "High - may slow load" : ps.scriptCount > 8 ? "Moderate" : "Lean"],
        ["Internal Links",    String(ps.internalLinks),                              "Same domain"],
        ["External Links",    String(ps.externalLinks),                              "Other websites"],
        ["Heading Structure", `H1:${ps.h1Count}  H2:${ps.h2Count}  H3:${ps.h3Count}`, ps.h1Count === 1 ? "Good - single H1" : ps.h1Count === 0 ? "Missing H1" : "Multiple H1s"],
        ["Render Blocking",   String(ps.renderBlockingScripts),                      "Scripts blocking first paint"],
        ["Content Ratio",     `${ps.contentToCodeRatio}%`,                           ps.contentToCodeRatio < 10 ? "Low - heavy markup" : ps.contentToCodeRatio > 40 ? "Great" : "OK"],
        ["Tech Stack",        `${techCount} detected`,                                "Signature matching"],
      ],
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold", textColor: rgb(DIM) },
        1: { cellWidth: 44 },
        2: { cellWidth: CW - 84, textColor: rgb(DIM) },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body") {
          if (data.row.index === 2) data.cell.styles.textColor = ps.scriptCount > 15 ? rgb(AMBER) : rgb(TEXT);
          if (data.row.index === 5) data.cell.styles.textColor = ps.h1Count === 1 ? rgb(GREEN) : ps.h1Count === 0 ? rgb(RED) : rgb(AMBER);
          if (data.row.index === 6) data.cell.styles.textColor = ps.renderBlockingScripts > 3 ? rgb(RED) : ps.renderBlockingScripts > 0 ? rgb(AMBER) : rgb(GREEN);
          if (data.row.index === 7) data.cell.styles.textColor = ps.contentToCodeRatio < 10 ? rgb(AMBER) : rgb(TEXT);
        }
      },
    });
    y = lastY(doc) + 5;
  }

  if (result.contentStats) {
    const cs3 = result.contentStats;
    need(20);
    section("Content Analysis");
    const levelColor = cs3.readingLevel === "simple" ? GREEN : cs3.readingLevel === "moderate" ? AMBER : RED;
    kvRow("Reading Level",    cap(cs3.readingLevel),         levelColor, 38);
    kvRow("Avg Sentence Len", `${cs3.avgSentenceLen} words`, TEXT,       38);
    if (cs3.topKeywords.length) kvRow("Top Keywords", cs3.topKeywords.slice(0, 8).join("  ·  "), TEXT, 38);
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Recommendations & Action Items
  // ═══════════════════════════════════════════════════════════════════════════
  if (result.prioritizedIssues?.length) {
    section("What's Hurting You Most");
    const p0 = doc.getNumberOfPages();
    ztable(p0, {
      startY: y,
      head: [["#", "Issue", "Impact", "Why"]],
      body: result.prioritizedIssues.map(i => [`#${i.rank}`, san(i.issue), san(i.impact), san(i.why)]),
      columnStyles: {
        0: { cellWidth: 10, halign: "center", fontStyle: "bold", textColor: rgb(MUTED) },
        1: { cellWidth: 50, fontStyle: "bold" },
        2: { cellWidth: 28, halign: "center" },
        3: { cellWidth: CW - 88, textColor: rgb(DIM) },
      },
    });
    y = lastY(doc) + 5;
  }

  if (result.recommendations?.length) {
    section("Recommendations");
    for (const [i, rec] of result.recommendations.entries()) {
      need(12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(GREEN));
      doc.text(`${i + 1}.`, M, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(TEXT));
      const lines = doc.splitTextToSize(san(rec), CW - 8) as string[];
      doc.text(lines, M + 8, y + 2);
      y += lines.length * 5 + 4;
      if (i < result.recommendations.length - 1) {
        doc.setDrawColor(...rgb(BORDER));
        doc.setLineWidth(0.2);
        doc.line(M + 8, y, W - M, y);
        y += 3;
      }
    }
    y += 3;
  }

  if (result.eli5?.length) {
    section("Plain-Language Summary");
    for (const item of result.eli5) {
      need(14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(TEXT));
      const titleL = doc.splitTextToSize(san(item.technical), CW - 4) as string[];
      doc.text(titleL, M + 4, y);
      y += titleL.length * 4.5 + 1;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(DIM));
      const simpleL = doc.splitTextToSize(san(item.simple), CW - 8) as string[];
      doc.text(simpleL, M + 8, y);
      y += simpleL.length * 4.5 + 5;
    }
  }

  // Footers on every page
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    footer(p, total);
  }

  // Save
  let host = "report";
  try { host = new URL(result.url).hostname.replace(/^www\./, ""); } catch { /**/ }
  const date = new Date(result.fetchedAt).toISOString().slice(0, 10);
  doc.save(`analysis-${host}-${date}.pdf`);
}
