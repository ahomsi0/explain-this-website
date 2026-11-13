import { useState } from "react";
import type { AnalysisResult } from "../../types/analysis";
import { formatReport } from "../../utils/reportFormatter";
import { MenuAction } from "./MenuAction";

export function CopyButton({ result }: { result: AnalysisResult }) {
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

  return (
    <MenuAction
      label="Copy summary"
      hint="Plain text for an email or a doc"
      status={copied ? { text: "Copied", tone: "ok" } : failed ? { text: "Copy failed", tone: "error" } : undefined}
      onClick={() => void handleCopy()}
      ariaLabel={copied ? "Copy report: copied" : "Copy report"}
    />
  );
}
