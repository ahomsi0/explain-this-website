import { useEffect } from "react";
import { applyMeta } from "./head.ts";
import { NOINDEX, metaForPath } from "./routes.ts";

/**
 * Applies the route's SEO meta on navigation. While an audit result is on
 * screen (`auditTitle` set) the tab gets that title and the view is noindex:
 * results live at "/" but are per-user content, not the landing page.
 */
export function usePageMeta(pathname: string, auditTitle: string | null): void {
  useEffect(() => {
    const meta = metaForPath(pathname);
    applyMeta(document, auditTitle ? { ...meta, title: auditTitle, robots: NOINDEX, jsonLd: [] } : meta);
  }, [pathname, auditTitle]);
}
