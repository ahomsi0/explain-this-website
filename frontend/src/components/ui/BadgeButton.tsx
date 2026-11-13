import { useState } from "react";
import { MenuAction } from "./MenuAction";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// BadgeButton copies an embeddable SVG badge snippet for the analyzed site.
// The badge is served by GET /api/badge?url=… from the latest server-side
// analysis of that URL, so it keeps working after this session ends.
export function BadgeButton({ url, reportId }: { url: string; reportId?: string }) {
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

  return (
    <MenuAction
      label="Embed badge"
      hint="A score badge for your own site"
      status={copied ? { text: "Badge copied", tone: "ok" } : failed ? { text: "Copy failed", tone: "error" } : undefined}
      onClick={() => void handleCopy()}
      ariaLabel={copied ? "Embed badge: copied" : failed ? "Embed badge: copy failed" : "Copy embeddable score badge"}
    />
  );
}
