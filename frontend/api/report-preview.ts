// ".js" specifiers: Vercel type-checks functions with Node's ESM rules, which
// require an extension; TypeScript and Vite both map it to the .ts file.
import { applyReportPreview, reportPreviewFor } from "../src/seo/reportPreview.js";

// Vercel Edge Function. vercel.json sends link-preview crawlers that ask for
// /report/<id> here; everyone else gets the static shell (_report.html) with
// no function in the way. It returns that same shell with the audited site's
// name and score written into the head, so a shared link previews as
// "example.com scored 51/100" instead of a generic title.
//
// Anything that goes wrong falls back to the unmodified shell: a generic
// preview is fine, a broken report link is not.

export const config = { runtime: "edge" };

// Same host as VITE_API_URL in .env.production; functions do not read that file.
const API_URL = "https://explain-the-website.onrender.com";
const REPORT_ID = /^[a-f0-9]{32}$/;
// Crawlers give up quickly, and the API can be asleep (cold start).
const API_TIMEOUT_MS = 4000;

function html(body: string, cacheControl: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": cacheControl },
  });
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";

  const shellResponse = await fetch(new URL("/_report.html", url.origin));
  if (!shellResponse.ok) return new Response("Report unavailable", { status: 502 });
  const shell = await shellResponse.text();

  if (REPORT_ID.test(id)) {
    try {
      const reportResponse = await fetch(`${API_URL}/api/report/${id}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      if (reportResponse.ok) {
        const preview = reportPreviewFor(await reportResponse.json(), id);
        // A report never changes, so the CDN can keep its preview for an hour.
        if (preview) return html(applyReportPreview(shell, preview), "public, s-maxage=3600, stale-while-revalidate=86400");
      }
    } catch {
      // Timeout, network error or bad JSON: fall through to the plain shell.
    }
  }
  // Not cached: the next crawler should get another chance at the real preview.
  return html(shell, "no-store");
}
