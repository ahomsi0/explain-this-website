import { useState } from "react";
import { MenuAction } from "./MenuAction";
import { ToolbarAction } from "./ToolbarAction";

// Copies the report's public link. Every report has one, on every plan and
// without an account; `reportId` is only missing for reports that predate
// links or whose owner revoked sharing.
export function ShareButton({ reportId, variant = "menu" }: { reportId?: string; variant?: "toolbar" | "menu" }) {
  const [state, setState] = useState<"idle" | "copied" | "unavailable">("idle");

  const handleShare = async () => {
    if (!reportId) {
      setState("unavailable");
      setTimeout(() => setState("idle"), 2500);
      return;
    }
    const link = `${window.location.origin}/report/${reportId}`;
    let copied = false;
    try { await navigator.clipboard.writeText(link); copied = true; }
    catch {
      // Clipboard API unavailable/denied — try the legacy path and honour its result.
      try {
        const el = document.createElement("textarea");
        el.value = link; document.body.appendChild(el); el.select();
        copied = document.execCommand("copy");
        document.body.removeChild(el);
      } catch { copied = false; }
    }
    setState(copied ? "copied" : "unavailable");
    setTimeout(() => setState("idle"), 2500);
  };

  const status =
    state === "copied" ? ({ text: "Link copied", tone: "ok" } as const)
    : state === "unavailable" ? ({ text: "Not available", tone: "error" } as const)
    : undefined;
  const ariaLabel = state === "copied" ? "Share report: link copied" : "Share report";

  if (variant === "toolbar") {
    return (
      <ToolbarAction
        primary
        text="Share"
        tooltip="Copy a link anyone can open"
        status={status}
        onClick={() => void handleShare()}
        ariaLabel={ariaLabel}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        }
      />
    );
  }
  return (
    <MenuAction
      label="Share link"
      hint="Anyone with the link can view"
      status={status}
      onClick={() => void handleShare()}
      ariaLabel={ariaLabel}
    />
  );
}
