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

const today = new Date().toISOString().slice(0, 10);
function lastCommitDate(pathspec) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", pathspec], { cwd: root, encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : today;
  } catch {
    return today;
  }
}
const siteDate = lastCommitDate("src");
const guideDate = lastCommitDate("src/guides");

const paths = publicPaths();
for (const path of paths) {
  const file = resolve(dist, outFileFor(path));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderPage(template, metaForPath(path), bodyHtmlForPath(path)));
}

writeFileSync(resolve(dist, "sitemap.xml"), buildSitemap((p) => (p.startsWith("/guides/") ? guideDate : siteDate)));
console.log(`prerender: wrote ${paths.length} pages + sitemap.xml`);
