#!/usr/bin/env node
// Packs the extension.
//
//   node extension/pack.mjs
//     Writes extension/dist/explain-this-website-<version>.zip, the file to
//     upload to the Chrome Web Store.
//
//   node extension/pack.mjs --site http://localhost:5173 --out <folder>
//     Writes an unpacked copy that talks to a local copy of the site, for
//     trying a change before it is live. Load it from chrome://extensions.

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Everything that ships. Anything not listed here stays out of the package. */
export const FILES = [
  "manifest.json",
  "background.js",
  "config.js",
  "handover.js",
  "lib.js",
  "popup.css",
  "popup.html",
  "popup.js",
  "read-page.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];

const LIVE_SITE = "https://www.explainthiswebsite.com";

/**
 * Copy the extension into `outDir`.
 * - `site` points it at another copy of the site, such as a local dev server.
 * - `testAccess` lets it read any page without a click on its toolbar icon.
 *   Browser tests need that, because automation cannot click the icon. It is
 *   never set for a build that people install.
 */
export function writeUnpacked({ outDir, site = LIVE_SITE, testAccess = false }) {
  rmSync(outDir, { recursive: true, force: true });
  for (const file of FILES) {
    mkdirSync(dirname(join(outDir, file)), { recursive: true });
    cpSync(join(here, file), join(outDir, file));
  }
  if (site === LIVE_SITE && !testAccess) return;

  const origin = new URL(site).origin;
  const config = readFileSync(join(outDir, "config.js"), "utf8");
  if (!config.includes(LIVE_SITE)) throw new Error("config.js no longer holds the live site address");
  writeFileSync(join(outDir, "config.js"), config.replace(LIVE_SITE, origin));

  const manifest = JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8"));
  manifest.content_scripts[0].matches = [`${origin}/capture*`];
  if (testAccess) manifest.host_permissions = ["<all_urls>"];
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function main() {
  const args = process.argv.slice(2);
  const value = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const site = value("--site");
  const out = value("--out");

  if (site || out) {
    if (!site || !out) throw new Error("--site and --out go together");
    writeUnpacked({ outDir: resolve(out), site });
    console.log(`Unpacked test build for ${site} written to ${resolve(out)}`);
    return;
  }

  const { version } = JSON.parse(readFileSync(join(here, "manifest.json"), "utf8"));
  const staging = mkdtempSync(join(tmpdir(), "etw-extension-"));
  writeUnpacked({ outDir: staging });
  const dist = join(here, "dist");
  mkdirSync(dist, { recursive: true });
  const zip = join(dist, `explain-this-website-${version}.zip`);
  rmSync(zip, { force: true });
  execFileSync("zip", ["-r", "-X", "-q", zip, "."], { cwd: staging });
  rmSync(staging, { recursive: true, force: true });
  console.log(`Wrote ${zip}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
