import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// House style: the site never uses the em dash. This walks the real syntax
// tree, so it only looks at text that can reach a visitor (strings, template
// text, JSX text) and ignores code comments.

const ROOT = resolve(process.cwd());
const EM_DASH = "\u2014";

function filesUnder(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, exts));
    else if (exts.some((ext) => name.endsWith(ext))) out.push(path);
  }
  return out;
}

function emDashesInCode(path: string): string[] {
  const source = readFileSync(path, "utf8");
  if (!source.includes(EM_DASH)) return [];
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    const textual =
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) ||
      ts.isJsxText(node) ||
      ts.isRegularExpressionLiteral(node);
    if (textual && node.getText(file).includes(EM_DASH)) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
      hits.push(`${relative(ROOT, path)}:${line + 1}  ${node.getText(file).trim().slice(0, 80)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return hits;
}

describe("no em dashes in anything a visitor can read", () => {
  it("app and function source: strings, template text and JSX text", () => {
    const files = [...filesUnder(join(ROOT, "src"), [".ts", ".tsx"]), ...filesUnder(join(ROOT, "api"), [".ts"])];
    expect(files.length).toBeGreaterThan(100);
    expect(files.flatMap(emDashesInCode)).toEqual([]);
  });

  it("static files: guide diagrams, robots.txt and the page shell", () => {
    const withoutComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, "");
    const files = [
      ...filesUnder(join(ROOT, "public", "guides"), [".svg"]),
      join(ROOT, "public", "robots.txt"),
      join(ROOT, "public", "og-image.svg"),
      join(ROOT, "index.html"),
    ];
    const hits = files.filter((path) => withoutComments(readFileSync(path, "utf8")).includes(EM_DASH)).map((path) => relative(ROOT, path));
    expect(hits).toEqual([]);
  });

  it("catches one when it is there, and ignores comments", () => {
    const sample = join(ROOT, "tests", "noEmDash.test.ts");
    // This file writes the character as an escape, so it is clean itself.
    expect(emDashesInCode(sample)).toEqual([]);
    const file = ts.createSourceFile("x.tsx", `// a comment \u2014 fine\nconst a = <p>bad \u2014 text</p>;`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let jsxHit = false;
    const visit = (node: ts.Node) => { if (ts.isJsxText(node) && node.getText(file).includes(EM_DASH)) jsxHit = true; ts.forEachChild(node, visit); };
    visit(file);
    expect(jsxHit).toBe(true);
  });
});
