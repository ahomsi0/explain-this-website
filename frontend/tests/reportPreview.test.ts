import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAnalysisResult } from "../src/mock/mockData";
import { computeInsights } from "../src/utils/insights";
import { applyReportPreview, reportPreviewFor } from "../src/seo/reportPreview";
import { renderPage } from "../src/seo/prerender";
import { shellMeta } from "../src/seo/routes";
import handler from "../api/report-preview";

const ID = "0123456789abcdef0123456789abcdef";
const SHELL = renderPage(readFileSync(resolve(process.cwd(), "index.html"), "utf8"), shellMeta("report"), "");

describe("reportPreviewFor", () => {
  it("names the audited site and shows the same overall score as the report page", () => {
    const preview = reportPreviewFor({ ...mockAnalysisResult, url: "https://www.acme.example/pricing?x=1" }, ID)!;
    const { overallScore } = computeInsights(mockAnalysisResult);
    expect(preview.title).toBe(`acme.example scored ${overallScore}/100 · Explain This Website`);
    expect(preview.description).toMatch(/^SEO \d+, .*UX \d+, Conversion \d+\. See the full audit/);
    expect(preview.url).toBe(`https://www.explainthiswebsite.com/report/${ID}`);
  });

  it("leaves Performance out when PageSpeed returned nothing", () => {
    const preview = reportPreviewFor({ ...mockAnalysisResult, performance: undefined }, ID)!;
    expect(preview.description).not.toContain("Performance");
  });

  it.each([null, {}, { error: "report not found or expired" }, { url: "not a url", seoChecks: [], ux: {} }])(
    "returns null for a payload that is not a report: %j",
    (payload) => {
      expect(reportPreviewFor(payload, ID)).toBeNull();
    },
  );
});

describe("applyReportPreview", () => {
  const preview = { title: "acme.example scored 71/100 · Explain This Website", description: "SEO 90, UX 50.", url: `https://www.explainthiswebsite.com/report/${ID}` };

  it("rewrites every title and description tag and adds the report's own URL", () => {
    const html = applyReportPreview(SHELL, preview);
    expect(html).toContain("<title>acme.example scored 71/100 · Explain This Website</title>");
    for (const tag of ['property="og:title"', 'name="twitter:title"']) {
      expect(html).toContain(`${tag} content="acme.example scored 71/100 · Explain This Website"`);
    }
    for (const tag of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
      expect(html).toContain(`${tag} content="SEO 90, UX 50."`);
    }
    expect(html).toContain(`<meta property="og:url" content="${preview.url}" />`);
    expect(html).toContain(`<link rel="canonical" href="${preview.url}" />`);
    expect(html).not.toContain("Website audit report");
  });

  it("keeps the rest of the shell intact so the app still boots and stays unindexed", () => {
    const html = applyReportPreview(SHELL, preview);
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('<script type="module"');
  });

  it("escapes a hostile site name instead of letting it break out of the tag", () => {
    const html = applyReportPreview(SHELL, { ...preview, title: `"><script>alert(1)</script> $& $1` });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; $&amp; $1");
  });
});

describe("report-preview function", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(report: () => Response | Promise<Response>) {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/_report.html")) return Promise.resolve(new Response(SHELL, { status: 200 }));
      if (url.includes("/api/report/")) return Promise.resolve(report());
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }
  const request = (id: string) => new Request(`https://www.explainthiswebsite.com/api/report-preview?id=${id}`);

  it("serves the shell with the report's preview and lets the CDN cache it", async () => {
    const fetchMock = stubFetch(() => Response.json({ ...mockAnalysisResult, url: "https://acme.example" }));
    const res = await handler(request(ID));
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(body).toMatch(/<title>acme\.example scored \d+\/100 · Explain This Website<\/title>/);
    expect(fetchMock).toHaveBeenCalledWith(`https://explain-the-website.onrender.com/api/report/${ID}`, expect.anything());
  });

  it.each([
    ["an expired or revoked report", () => Response.json({ error: "report not found or expired" }, { status: 404 })],
    ["an API that is down", () => { throw new Error("connect ECONNREFUSED"); }],
    ["a response that is not JSON", () => new Response("<html>waking up</html>", { status: 200 })],
  ])("falls back to the plain shell, uncached, for %s", async (_name, report) => {
    stubFetch(report as () => Response);
    const res = await handler(request(ID));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe(SHELL);
  });

  it("never calls the API for an id that is not a report id", async () => {
    const fetchMock = stubFetch(() => Response.json(mockAnalysisResult));
    const res = await handler(request("../../etc/passwd"));
    expect(await res.text()).toBe(SHELL);
    expect(fetchMock.mock.calls.every(([input]) => String(input).endsWith("/_report.html"))).toBe(true);
  });
});
