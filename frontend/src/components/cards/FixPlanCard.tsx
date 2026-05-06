import { useState } from "react";
import type { PriorityIssue, IssueCategory } from "../../utils/priorityIssues";
import { getFixFirst, getQuickWins } from "../../utils/priorityIssues";
import { CardShell } from "../ui/CardShell";

interface FixPlanCardProps {
  issues: PriorityIssue[];
}

type TabId = "fixfirst" | "quickwins" | "all";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "fixfirst",  label: "Fix First" },
  { id: "quickwins", label: "Quick Wins" },
  { id: "all",       label: "All Issues" },
];

const CATEGORIES: Array<{ value: IssueCategory | "all"; label: string }> = [
  { value: "all",         label: "All" },
  { value: "seo",         label: "SEO" },
  { value: "performance", label: "Performance" },
  { value: "ux",          label: "UX" },
  { value: "conversion",  label: "Conversion" },
  { value: "security",    label: "Security" },
  { value: "content",     label: "Content" },
];

function priorityStyles(priority: PriorityIssue["priority"]) {
  switch (priority) {
    case "fix-now":
      return "bg-red-500/15 text-red-400 border border-red-500/25";
    case "fix-soon":
      return "bg-amber-500/15 text-amber-400 border border-amber-500/25";
    case "optional":
      return "bg-zinc-800 text-zinc-500 border border-zinc-700";
  }
}

function priorityLabel(priority: PriorityIssue["priority"]) {
  switch (priority) {
    case "fix-now":  return "Fix Now";
    case "fix-soon": return "Fix Soon";
    case "optional": return "Optional";
  }
}

function impactStyles(impact: PriorityIssue["impact"]) {
  switch (impact) {
    case "high":   return "text-red-400 bg-red-500/10 border border-red-500/20";
    case "medium": return "text-amber-400 bg-amber-500/10 border border-amber-500/20";
    case "low":    return "text-zinc-500 bg-zinc-800 border border-zinc-700";
  }
}

function effortStyles(effort: PriorityIssue["effort"]) {
  switch (effort) {
    case "easy":   return "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
    case "medium": return "text-zinc-400 bg-zinc-800 border border-zinc-700";
    case "hard":   return "text-zinc-500 bg-zinc-800/50 border border-zinc-700";
  }
}

function effortLabel(effort: PriorityIssue["effort"]) {
  switch (effort) {
    case "easy":   return "Easy";
    case "medium": return "Medium";
    case "hard":   return "Hard";
  }
}

function impactLabel(impact: PriorityIssue["impact"]) {
  switch (impact) {
    case "high":   return "High";
    case "medium": return "Medium";
    case "low":    return "Low";
  }
}

function IssueRow({
  issue,
  expanded,
  onToggle,
}: {
  issue: PriorityIssue;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left p-3 flex items-start gap-3 cursor-pointer"
      >
        {/* Priority badge */}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityStyles(issue.priority)}`}>
          {priorityLabel(issue.priority)}
        </span>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-100 leading-snug">{issue.title}</p>
          <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">{issue.whyItMatters}</p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${impactStyles(issue.impact)}`}>
            {impactLabel(issue.impact)}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${effortStyles(issue.effort)}`}>
            {effortLabel(issue.effort)}
          </span>
          <span className={`text-zinc-500 transition-colors ${expanded ? "text-zinc-300" : ""}`}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-zinc-800/80">
          <div className="p-3 bg-zinc-950/50">
            <p className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">How to Fix</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{issue.howToFix}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function FixPlanCard({ issues }: FixPlanCardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("fixfirst");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | "all">("all");

  const fixFirstIssues  = getFixFirst(issues);
  const quickWinIssues  = getQuickWins(issues);
  const allIssues       = categoryFilter === "all"
    ? issues
    : issues.filter((i) => i.category === categoryFilter);

  const tabCounts: Record<TabId, number> = {
    fixfirst:  fixFirstIssues.length,
    quickwins: quickWinIssues.length,
    all:       allIssues.length,
  };

  const visibleIssues =
    activeTab === "fixfirst"  ? fixFirstIssues :
    activeTab === "quickwins" ? quickWinIssues  :
    allIssues;

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <CardShell>
      {/* Header */}
      <div className="p-5 pb-0 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-[0.2em]">
            Your Fix Plan
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Issues ranked by impact × severity</p>
        </div>
        <span className="rounded-full bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5">
          {issues.length} {issues.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      {/* Tab row */}
      <div className="px-5 pt-3 pb-0 flex gap-2 border-b border-zinc-800">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setExpandedId(null);
                // Reset category filter to 'all' whenever leaving the 'All Issues' tab.
                if (tab.id !== "all") setCategoryFilter("all");
              }}
              className={`flex items-center gap-1.5 pb-2.5 text-xs font-medium transition-colors ${
                active
                  ? "text-violet-400 border-b-2 border-violet-500 -mb-px"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                active ? "bg-violet-500/20 text-violet-300" : "bg-zinc-800 text-zinc-500"
              }`}>
                {tabCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Issue list */}
      <div className="p-5 flex flex-col gap-3">
        {/* Category filter (All Issues tab only) */}
        {activeTab === "all" && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-colors ${
                    active
                      ? "text-violet-400 bg-violet-500/10 border-violet-500/25"
                      : "text-zinc-500 bg-zinc-900 border-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Issues */}
        {visibleIssues.length === 0 ? (
          <p className="text-xs text-emerald-400/80 py-4 text-center">
            ✓ No issues in this category
          </p>
        ) : (
          visibleIssues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              expanded={expandedId === issue.id}
              onToggle={() => toggleExpand(issue.id)}
            />
          ))
        )}
      </div>
    </CardShell>
  );
}
