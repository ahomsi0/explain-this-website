import { useState } from "react";
import { MenuAction } from "./MenuAction";

// Copies the report's public link. Every report has one, on every plan and
// without an account; `reportId` is only missing for reports that predate
// links or whose owner revoked sharing.
export function ShareButton({ reportId }: { reportId?: string }) {
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

  return (
    <MenuAction
      label="Share link"
      hint="Anyone with the link can view"
      status={
        state === "copied" ? { text: "Link copied", tone: "ok" }
        : state === "unavailable" ? { text: "Not available", tone: "error" }
        : undefined
      }
      onClick={() => void handleShare()}
      ariaLabel={state === "copied" ? "Share report: link copied" : "Share report"}
    />
  );
}
