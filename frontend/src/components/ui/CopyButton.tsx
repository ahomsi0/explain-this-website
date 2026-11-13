import { useState } from "react";
import type { AnalysisResult } from "../../types/analysis";
import { formatReport } from "../../utils/reportFormatter";
import { MenuAction } from "./MenuAction";
import { ToolbarAction } from "./ToolbarAction";

export function CopyButton({ result, variant = "menu" }: { result: AnalysisResult; variant?: "toolbar" | "menu" }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async () => {
    const text = formatReport(result);
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      // Clipboard API unavailable/denied — try the legacy path and honour its result.
      try {
        const el = document.createElement("textarea");
        el.value = text; document.body.appendChild(el); el.select();
        ok = document.execCommand("copy");
        document.body.removeChild(el);
      } catch { ok = false; }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setFailed(true);
      setTimeout(() => setFailed(false), 2500);
    }
  };

  const status = copied ? ({ text: "Copied", tone: "ok" } as const) : failed ? ({ text: "Copy failed", tone: "error" } as const) : undefined;
  const ariaLabel = copied ? "Copy report: copied" : "Copy report";

  if (variant === "toolbar") {
    return (
      <ToolbarAction
        tooltip="Copy summary as text"
        status={status}
        onClick={() => void handleCopy()}
        ariaLabel={ariaLabel}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        }
      />
    );
  }
  return (
    <MenuAction
      label="Copy summary"
      hint="Plain text for an email or a doc"
      status={status}
      onClick={() => void handleCopy()}
      ariaLabel={ariaLabel}
    />
  );
}
