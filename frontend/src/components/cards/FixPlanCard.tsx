import { useState } from "react";
import type { PriorityIssue, IssueCategory } from "../../utils/priorityIssues";
import { getFixFirst, getQuickWins } from "../../utils/priorityIssues";
import { HowToFixLink } from "../guides/GuidesPages";
import { CardShell } from "../ui/CardShell";

interface FixPlanCardProps {
  issues: PriorityIssue[];
}

type TabId = "fixfirst" | "quickwins" | "all";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "fixfirst",  label: "Fix first" },
  { id: "quickwins", label: "Quick wins" },
  { id: "all",       label: "All issues" },
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

// One mono tag per row carries the priority. Impact and effort are a plain
// line of text under the issue, so a row is no longer three coloured pills.
const PRIORITY: Record<PriorityIssue["priority"], { tag: string; color: string }> = {
  "fix-now":  { tag: "NOW",   color: "text-red-400" },
  "fix-soon": { tag: "SOON",  color: "text-amber-400" },
  optional:   { tag: "LATER", color: "text-zinc-500" },
};

const IMPACT: Record<PriorityIssue["impact"], string> = {
  high: "High impact",
  medium: "Medium impact",
  low: "Low impact",
};

const EFFORT: Record<PriorityIssue["effort"], string> = {
  easy: "easy fix",
  medium: "moderate effort",
  hard: "hard to fix",
};

// Tag column, body, chevron. The expanded panel reuses it so the fix lines up
// under the issue it belongs to.
const ROW_GRID = "grid grid-cols-[40px_1fr_14px] gap-x-3";

function IssueRow({
  issue,
  expanded,
  onToggle,
}: {
  issue: PriorityIssue;
  expanded: boolean;
  onToggle: () => void;
}) {
  const priority = PRIORITY[issue.priority];
  return (
    <li className="border-b border-zinc-800 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`${ROW_GRID} w-full items-baseline py-3.5 text-left`}
      >
        <span className={`font-mono text-[11px] tracking-[0.08em] ${priority.color}`}>{priority.tag}</span>
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-zinc-100">{issue.title}</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-zinc-400">{issue.whyItMatters}</span>
          <span className="mt-1.5 block text-[11px] text-zinc-500">
            {IMPACT[issue.impact]}, {EFFORT[issue.effort]}
          </span>
        </span>
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
          className={`self-center transition-transform ${expanded ? "rotate-180 text-zinc-300" : "text-zinc-500"}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className={`${ROW_GRID} pb-4`}>
          <div className="col-start-2 border-l border-zinc-700 pl-3">
            <p className="text-[11px] font-medium text-zinc-500">How to fix</p>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-200">{issue.howToFix}</p>
            {issue.links && issue.links.length > 0 && (
              <ul className="mt-2 space-y-1">
                {issue.links.map((l) => (
                  <li key={l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 underline break-all"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <HowToFixLink issueId={issue.id} className="mt-2" />
          </div>
        </div>
      )}
    </li>
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
    <CardShell variant="primary">
      {/* The section heading above the card already says "Your Fix Plan" and
          how issues are ranked, so the card opens straight on the views. */}
      <div className="flex gap-5 border-b border-zinc-800 px-5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setActiveTab(tab.id);
                setExpandedId(null);
                // Reset category filter to 'all' whenever leaving the 'All issues' view.
                if (tab.id !== "all") setCategoryFilter("all");
              }}
              className={`-mb-px border-b-2 py-3 text-[13px] font-medium transition-colors ${
                active
                  ? "border-violet-500 text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 font-normal tabular-nums text-zinc-500">{tabCounts[tab.id]}</span>
            </button>
          );
        })}
      </div>

      <div className="px-5">
        {/* Category filter (All issues view only) */}
        {activeTab === "all" && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-zinc-800 py-3">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`text-xs transition-colors ${
                    active
                      ? "font-medium text-zinc-100 underline decoration-violet-500 decoration-2 underline-offset-4"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {visibleIssues.length === 0 ? (
          <p className="py-6 text-xs text-zinc-500">No issues in this view.</p>
        ) : (
          <ul>
            {visibleIssues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                expanded={expandedId === issue.id}
                onToggle={() => toggleExpand(issue.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </CardShell>
  );
}
