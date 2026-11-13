import { useState } from "react";
import { MenuAction } from "./MenuAction";
import { ToolbarAction } from "./ToolbarAction";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// BadgeButton copies an embeddable SVG badge snippet for the analyzed site.
// The badge is served by GET /api/badge?url=… from the latest server-side
// analysis of that URL, so it keeps working after this session ends.
export function BadgeButton({ url, reportId, variant = "menu" }: { url: string; reportId?: string; variant?: "toolbar" | "menu" }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async () => {
    const reportPath = reportId ? `/report/${reportId}` : "/";
    const snippet = `<a href="${window.location.origin}${reportPath}" target="_blank" rel="noopener">\n  <img src="${API_URL}/api/badge?url=${encodeURIComponent(url)}" alt="Website audit score" height="20">\n</a>`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(snippet);
      ok = true;
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = snippet;
        document.body.appendChild(el);
        el.select();
        ok = document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setFailed(true);
      setTimeout(() => setFailed(false), 2500);
    }
  };

  const status = copied ? ({ text: "Badge code copied", tone: "ok" } as const) : failed ? ({ text: "Copy failed", tone: "error" } as const) : undefined;
  const ariaLabel = copied ? "Embed badge: copied" : failed ? "Embed badge: copy failed" : "Copy embeddable score badge";

  if (variant === "toolbar") {
    return (
      <ToolbarAction
        tooltip="Copy a score badge for your site"
        status={status}
        onClick={() => void handleCopy()}
        ariaLabel={ariaLabel}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
        }
      />
    );
  }
  return (
    <MenuAction
      label="Embed badge"
      hint="A score badge for your own site"
      status={status}
      onClick={() => void handleCopy()}
      ariaLabel={ariaLabel}
    />
  );
}
