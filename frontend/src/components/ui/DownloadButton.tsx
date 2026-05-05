import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult, StrategyData } from "../../types/analysis";
import { computeInsights } from "../../utils/insights";

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG     = [9,   9,  11 ] as const;
const CARD   = [24,  24,  27 ] as const;
const CARD2  = [32,  32,  36 ] as const;
const BORDER = [39,  39,  42 ] as const;
const MUTED  = [82,  82,  91 ] as const;
const DIM    = [113, 113, 122] as const;
const TEXT   = [244, 244, 245] as const;
const VIOLET = [167, 139, 250] as const;
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

// ─── PDF builder — simple, consistent, table-driven ───────────────────────────
function buildPDF(result: AnalysisResult) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 16, CW = W - M * 2, FOOT = 16;
  let y = 0;

  const insights = computeInsights(result);

  function bg() {
    doc.setFillColor(...rgb(BG));
    doc.rect(0, 0, W, H, "F");
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

  // One section header style — used everywhere
  function section(title: string) {
    need(14);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(DIM));
    doc.text(title.toUpperCase(), M, y + 4);
    doc.setDrawColor(...rgb(BORDER));
    doc.setLineWidth(0.25);
    doc.line(M, y + 7, W - M, y + 7);
    y += 12;
  }

  // Standard table
  function table(opts: Parameters<typeof autoTable>[1]) {
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
      didDrawPage() { bg(); },
      ...opts,
    });
  }

  // Simple bullet list
  function bullets(items: string[], color: RGB = TEXT, marker = "•") {
    for (const item of items) {
      need(7);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(color));
      doc.text(marker, M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(TEXT));
      const lines = doc.splitTextToSize(san(item), CW - 6) as string[];
      doc.text(lines, M + 5, y);
      y += lines.length * 4.5 + 2;
    }
    y += 2;
  }

  // ═══ Page 1 — Cover ═══════════════════════════════════════════════════════
  bg();

  // Title
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(VIOLET));
  doc.text("EXPLAIN THIS WEBSITE", M, 26);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(TEXT));
  doc.text("Website Analysis", M, 35);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(DIM));
  const dUrl = result.url.length > 72 ? result.url.slice(0, 69) + "…" : result.url;
  doc.text(san(dUrl), M, 43);

  doc.setFontSize(7.5);
  doc.setTextColor(...rgb(MUTED));
  doc.text(`Generated ${new Date(result.fetchedAt).toLocaleString()}`, M, 49);

  doc.setDrawColor(...rgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(M, 54, W - M, 54);

  // Score summary as a single table — same visual language as everything else
  y = 60;
  section("Score Summary");
  const ovLabel = insights.overallScore >= 80 ? "Excellent"
                : insights.overallScore >= 65 ? "Good"
                : insights.overallScore >= 50 ? "Fair"
                : insights.overallScore >= 35 ? "Poor" : "Critical";
  table({
    startY: y,
    head: [["Dimension", "Score", "Rating"]],
    body: [
      ["Overall",     `${insights.overallScore}/100`,    ovLabel],
      ["SEO",         `${insights.seoScore}/100`,        rateLabel(insights.seoScore)],
      ["Performance", `${insights.perfScore}/100`,       rateLabel(insights.perfScore)],
      ["UX",          `${insights.uxScore}/100`,         rateLabel(insights.uxScore)],
      ["Conversion",  `${insights.conversionScore}/100`, rateLabel(insights.conversionScore)],
    ],
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 30, halign: "center", fontStyle: "bold" },
      2: { cellWidth: CW - 80, halign: "center" },
    },
    didParseCell(data) {
      if (data.section !== "body") return;
      const scores = [insights.overallScore, insights.seoScore, insights.perfScore, insights.uxScore, insights.conversionScore];
      const c = rgb(scoreColor(scores[data.row.index]));
      if (data.column.index === 1) data.cell.styles.textColor = c;
      if (data.column.index === 2) data.cell.styles.textColor = c;
    },
  });
  y = lastY(doc) + 6;

  // Summary sentence
  section("Summary");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(TEXT));
  const sumL = doc.splitTextToSize(san(insights.summarySentence), CW) as string[];
  doc.text(sumL, M, y);
  y += sumL.length * 5 + 6;

  // Top issues
  section("Top Issues");
  if (insights.topIssues.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(...rgb(MUTED));
    doc.text("No critical issues found.", M, y);
    y += 8;
  } else {
    bullets(insights.topIssues.map(i => `${i.title} — ${i.description}`), RED);
  }

  // Quick wins
  section("Quick Wins");
  if (insights.quickWins.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(...rgb(MUTED));
    doc.text("No quick wins detected.", M, y);
    y += 8;
  } else {
    bullets(insights.quickWins.map(i => `${i.title} — ${i.description}`), GREEN);
  }

  // ═══ Site Overview ════════════════════════════════════════════════════════
  newPage();
  section("Site Overview");
  table({
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Title",       san(result.overview.title       || "(none)")],
      ["Description", san(result.overview.description || "(none)")],
      ["Language",    (result.overview.language       || "—").toUpperCase()],
      ["Page Weight", cap(result.overview.pageLoadHint)],
    ],
    columnStyles: {
      0: { cellWidth: 36, fontStyle: "bold", textColor: rgb(DIM) },
      1: { cellWidth: CW - 36 },
    },
  });
  y = lastY(doc) + 6;

  // Site Intelligence
  section("Site Intelligence");
  table({
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Intent",            san(result.intent.label)],
      ["Description",       san(result.intent.description)],
      ["Biggest Opportunity", san(result.biggestOpportunity || "—")],
      ["Market Positioning",  san(result.competitorInsight  || "—")],
    ],
    columnStyles: {
      0: { cellWidth: 36, fontStyle: "bold", textColor: rgb(DIM) },
      1: { cellWidth: CW - 36 },
    },
  });
  y = lastY(doc) + 6;

  // ═══ SEO Audit ════════════════════════════════════════════════════════════
  section("SEO Audit");
  table({
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

  // ═══ Performance ══════════════════════════════════════════════════════════
  if (result.performance?.available) {
    const renderPerf = (title: string, s?: StrategyData) => {
      if (!s) return;
      section(`Performance — ${title}`);
      table({
        startY: y,
        head: [["Metric", "Value", "Rating"]],
        body: [
          ["Lighthouse Performance",  `${s.lighthouse.performance}/100`,  rateLabel(s.lighthouse.performance)],
          ["Lighthouse Accessibility",`${s.lighthouse.accessibility}/100`,rateLabel(s.lighthouse.accessibility)],
          ["Lighthouse Best Practices",`${s.lighthouse.bestPractices}/100`,rateLabel(s.lighthouse.bestPractices)],
          ["Lighthouse SEO",          `${s.lighthouse.seo}/100`,          rateLabel(s.lighthouse.seo)],
          ["LCP",         s.lcp.displayValue,        s.lcp.rating.replace("-", " ")],
          ["CLS",         s.cls.displayValue,        s.cls.rating.replace("-", " ")],
          ["TBT",         s.tbt.displayValue,        s.tbt.rating.replace("-", " ")],
          ["FCP",         s.fcp.displayValue,        s.fcp.rating.replace("-", " ")],
          ["Speed Index", s.speedIndex.displayValue, s.speedIndex.rating.replace("-", " ")],
        ],
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold" },
          1: { cellWidth: 36, halign: "center", fontStyle: "bold" },
          2: { cellWidth: CW - 96, halign: "center" },
        },
        didParseCell(data) {
          if (data.section !== "body") return;
          const idx = data.row.index;
          if (idx <= 3) {
            const lh = [s.lighthouse.performance, s.lighthouse.accessibility, s.lighthouse.bestPractices, s.lighthouse.seo];
            const c = rgb(scoreColor(lh[idx]));
            if (data.column.index === 1 || data.column.index === 2) data.cell.styles.textColor = c;
          } else {
            const cwv = [s.lcp, s.cls, s.tbt, s.fcp, s.speedIndex];
            const c = rgb(ratingColor(cwv[idx - 4].rating));
            if (data.column.index === 2) data.cell.styles.textColor = c;
          }
        },
      });
      y = lastY(doc) + 6;
    };
    renderPerf("Mobile",  result.performance.mobile);
    renderPerf("Desktop", result.performance.desktop);
  }

  // ═══ UX & Conversion Signals ══════════════════════════════════════════════
  section("UX & Conversion Signals");
  const ux = result.ux;
  table({
    startY: y,
    head: [["Signal", "Present", "Detail"]],
    body: [
      ["Call-to-Action",    ux.hasCTA              ? "YES" : "NO", san(ux.hasCTA              ? `${ux.ctaCount} CTA button${ux.ctaCount !== 1 ? "s" : ""} detected`  : "No CTAs found")],
      ["Lead Capture Form", ux.hasForms            ? "YES" : "NO", san(ux.hasForms            ? `${ux.formCount} form${ux.formCount !== 1 ? "s" : ""} detected`      : "No forms")],
      ["Social Proof",      ux.hasSocialProof      ? "YES" : "NO", ux.hasSocialProof      ? "Reviews/testimonials present" : "No social proof detected"],
      ["Trust Signals",     ux.hasTrustSignals     ? "YES" : "NO", ux.hasTrustSignals     ? "Trust badges or guarantees"   : "No trust signals"],
      ["Contact Info",      ux.hasContactInfo      ? "YES" : "NO", ux.hasContactInfo      ? "Email or phone present"        : "No contact info on page"],
      ["Mobile Responsive", ux.mobileReady         ? "YES" : "NO", ux.mobileReady         ? "Viewport meta present"         : "Missing viewport tag"],
      ["Privacy Policy",    ux.hasPrivacyPolicy    ? "YES" : "NO", ux.hasPrivacyPolicy    ? "Policy link found"             : "No privacy policy link"],
      ["Cookie Banner",     ux.hasCookieBanner     ? "YES" : "NO", ux.hasCookieBanner     ? "Consent UI detected"           : "No consent UI"],
      ["Live Chat",         ux.hasLiveChat         ? "YES" : "NO", ux.hasLiveChat         ? "Chat widget detected"          : "No live chat"],
      ["Newsletter Signup", ux.hasNewsletterSignup ? "YES" : "NO", ux.hasNewsletterSignup ? "Email signup detected"         : "No newsletter signup"],
      ["Video Content",     ux.hasVideoContent     ? "YES" : "NO", ux.hasVideoContent     ? "Video content detected"        : "No video content"],
    ],
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

  // ═══ Customer View ════════════════════════════════════════════════════════
  const cv = result.customerView;
  const statements = cv.statements ?? [];
  section("Customer View");
  table({
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Trust Level", cap(cv.trustLevel)],
      ["Offer Clear", cv.offerClear ? "Yes" : "No"],
      ["CTA Visible", cv.ctaClear   ? "Yes" : "No"],
    ],
    columnStyles: {
      0: { cellWidth: 36, fontStyle: "bold", textColor: rgb(DIM) },
      1: { cellWidth: CW - 36, fontStyle: "bold" },
    },
    didParseCell(data) {
      if (data.column.index === 1 && data.section === "body") {
        if (data.row.index === 0) data.cell.styles.textColor = cv.trustLevel === "strong" ? rgb(GREEN) : cv.trustLevel === "moderate" ? rgb(AMBER) : rgb(RED);
        if (data.row.index === 1) data.cell.styles.textColor = cv.offerClear ? rgb(GREEN) : rgb(RED);
        if (data.row.index === 2) data.cell.styles.textColor = cv.ctaClear   ? rgb(GREEN) : rgb(RED);
      }
    },
  });
  y = lastY(doc) + 4;

  if (statements.length) {
    bullets(statements.map(san), DIM, "›");
  }

  // ═══ Copy & Vague Language ════════════════════════════════════════════════
  if (result.copyAnalysis) {
    const ca = result.copyAnalysis;
    section("Copy & Vague Language");
    const phrases = ca.vaguePhrases ?? [];
    const hints = ca.specificityHints ?? [];

    table({
      startY: y,
      head: [["Field", "Value"]],
      body: [
        ["Specificity Score", `${ca.score}/100`],
        ["Label",             ca.label],
        ["Phrases Flagged",   String(phrases.length)],
      ],
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold", textColor: rgb(DIM) },
        1: { cellWidth: CW - 36, fontStyle: "bold" },
      },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === "body" && data.row.index === 0) {
          data.cell.styles.textColor = rgb(scoreColor(ca.score));
        }
      },
    });
    y = lastY(doc) + 4;

    if (phrases.length > 0) {
      table({
        startY: y,
        head: [["Flagged Phrase", "Why It's Vague"]],
        body: phrases.slice(0, 12).map(v => [san(`"${v.phrase}"`), san(v.reason)]),
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold", textColor: rgb(AMBER) },
          1: { cellWidth: CW - 60, textColor: rgb(DIM) },
        },
      });
      y = lastY(doc) + 4;
    }

    if (hints.length > 0) {
      need(10);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(DIM));
      doc.text("SUGGESTED ALTERNATIVES", M, y + 4);
      doc.setDrawColor(...rgb(BORDER));
      doc.setLineWidth(0.25);
      doc.line(M, y + 7, W - M, y + 7);
      y += 12;
      bullets(hints.map(san), GREEN, "›");
    }
  }

  // ═══ Conversion ═══════════════════════════════════════════════════════════
  const cs2 = result.conversionScores;
  section("Conversion Scores");
  table({
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
  y = lastY(doc) + 6;

  const blockers: string[] = [];
  if (cs2.ctaStrength < 50) blockers.push("Weak or absent call-to-action.");
  if (cs2.trust       < 50) blockers.push("Low trust signals.");
  if (cs2.clarity     < 50) blockers.push("Unclear value proposition.");
  if (cs2.friction    < 40) blockers.push("Conversion path has unnecessary friction.");
  if (blockers.length > 0) {
    section("Conversion Blockers");
    bullets(blockers, RED);
  }

  // ═══ Tech Stack ═══════════════════════════════════════════════════════════
  if (result.techStack.length > 0) {
    section("Detected Tech Stack");
    const catLabels: Record<string, string> = {
      cms: "CMS", ecommerce: "E-commerce", builder: "Builder",
      framework: "Framework", analytics: "Analytics", cdn: "CDN", media: "Media",
    };
    const rows = result.techStack.map(t => [
      catLabels[t.category] ?? t.category,
      t.name,
      t.confidence === "low" ? "possible" : t.confidence,
    ]);
    table({
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

  // ═══ Page Stats ═══════════════════════════════════════════════════════════
  if (result.pageStats) {
    const ps = result.pageStats;
    const readMins = Math.max(1, Math.round(ps.wordCount / 200));
    section("Page Statistics");
    table({
      startY: y,
      head: [["Metric", "Value", "Context"]],
      body: [
        ["Word Count",        ps.wordCount.toLocaleString(),                          `~${readMins} min read`],
        ["Images",            `${ps.imageCount} (${ps.lazyImageCount} lazy)`,         ps.imageCount === 0 ? "No images" : "img elements"],
        ["Scripts",           String(ps.scriptCount),                                 ps.scriptCount > 15 ? "High" : ps.scriptCount > 8 ? "Moderate" : "Lean"],
        ["Internal Links",    String(ps.internalLinks),                               "Same domain"],
        ["External Links",    String(ps.externalLinks),                               "Other websites"],
        ["Heading Structure", `H1:${ps.h1Count}  H2:${ps.h2Count}  H3:${ps.h3Count}`, ps.h1Count === 1 ? "Good" : ps.h1Count === 0 ? "Missing H1" : "Multiple H1s"],
        ["Render Blocking",   String(ps.renderBlockingScripts),                       "Scripts blocking first paint"],
        ["Content Ratio",     `${ps.contentToCodeRatio}%`,                            ps.contentToCodeRatio < 10 ? "Low" : ps.contentToCodeRatio > 40 ? "Great" : "OK"],
      ],
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold", textColor: rgb(DIM) },
        1: { cellWidth: 44 },
        2: { cellWidth: CW - 84, textColor: rgb(DIM) },
      },
    });
    y = lastY(doc) + 6;
  }

  // ═══ Content ══════════════════════════════════════════════════════════════
  if (result.contentStats) {
    const cs3 = result.contentStats;
    section("Content Analysis");
    table({
      startY: y,
      head: [["Field", "Value"]],
      body: [
        ["Reading Level",    cap(cs3.readingLevel)],
        ["Avg Sentence Len", `${cs3.avgSentenceLen} words`],
        ["Top Keywords",     cs3.topKeywords.slice(0, 8).join("  ·  ") || "—"],
      ],
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold", textColor: rgb(DIM) },
        1: { cellWidth: CW - 36 },
      },
    });
    y = lastY(doc) + 6;
  }

  // ═══ Recommendations ══════════════════════════════════════════════════════
  if (result.recommendations?.length) {
    section("Recommendations");
    bullets(result.recommendations.map(san), GREEN);
  }

  if (result.eli5?.length) {
    section("Plain-Language Summary");
    for (const item of result.eli5) {
      need(14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...rgb(TEXT));
      const titleL = doc.splitTextToSize(san(item.technical), CW) as string[];
      doc.text(titleL, M, y);
      y += titleL.length * 4.5 + 1;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...rgb(DIM));
      const simpleL = doc.splitTextToSize(san(item.simple), CW - 4) as string[];
      doc.text(simpleL, M + 4, y);
      y += simpleL.length * 4.5 + 5;
    }
  }

  // Footers
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    footer(p, total);
  }

  let host = "report";
  try { host = new URL(result.url).hostname.replace(/^www\./, ""); } catch { /**/ }
  const date = new Date(result.fetchedAt).toISOString().slice(0, 10);
  doc.save(`analysis-${host}-${date}.pdf`);
}

function rateLabel(n: number) {
  return n >= 75 ? "Good" : n >= 50 ? "Fair" : "Poor";
}
