// Post-build step: writes dist/<route>/index.html for every public route
// (real head tags + static body content) and a generated sitemap.xml.
// Imports TypeScript directly (Node 24 type stripping), so keep src/seo/*.ts
// free of path aliases and enums.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { metaForPath, publicPaths } from "../src/seo/routes.ts";
import { bodyHtmlForPath, buildSitemap, outFileFor, renderPage } from "../src/seo/prerender.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const template = readFileSync(resolve(dist, "index.html"), "utf8");

// lastmod is only emitted when git can give a real date (guide content lives
// in one file). A made-up "today" on every build would teach Google to ignore it.
function lastCommitDate(pathspec) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", pathspec], { cwd: root, encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}
const guideDate = lastCommitDate("src/guides/guides.ts");

const paths = publicPaths();
for (const path of paths) {
  const file = resolve(dist, outFileFor(path));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderPage(template, metaForPath(path), bodyHtmlForPath(path)));
}

// Rewrite target for every non-prerendered URL (/history, /report/:id, junk):
// the same shell with a noindex head, so crawlers that skip JS never see a
// duplicate-of-home page. React's usePageMeta sets the real tags at runtime.
writeFileSync(resolve(dist, "_spa.html"), renderPage(template, metaForPath("/__spa__"), ""));

writeFileSync(resolve(dist, "sitemap.xml"), buildSitemap((p) => (p.startsWith("/guides/") ? guideDate : null)));
console.log(`prerender: wrote ${paths.length} pages + sitemap.xml`);
