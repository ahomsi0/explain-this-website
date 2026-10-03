import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageMeta } from "../src/seo/usePageMeta";

const meta = (sel: string) => document.head.querySelector(sel)?.getAttribute("content");
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");
const ldTypes = () =>
  [...document.head.querySelectorAll('script[type="application/ld+json"]')].map(
    (s) => JSON.parse(s.textContent ?? "{}")["@type"],
  );

beforeEach(() => {
  document.head.innerHTML = "";
  document.title = "";
});

describe("usePageMeta", () => {
  it("writes title, description, canonical, social tags and JSON-LD for a guide", () => {
    renderHook(() => usePageMeta("/guides/lcp", null));
    expect(document.title).toBe("Fix slow Largest Contentful Paint (LCP) · Explain This Website");
    expect(meta('meta[name="description"]')).toContain("LCP");
    expect(meta('meta[name="robots"]')).toBe("index, follow");
    expect(canonical()).toBe("https://www.explainthiswebsite.com/guides/lcp");
    expect(meta('meta[property="og:url"]')).toBe("https://www.explainthiswebsite.com/guides/lcp");
    expect(meta('meta[property="og:type"]')).toBe("article");
    expect(meta('meta[name="twitter:title"]')).toBe(document.title);
    expect(ldTypes()).toEqual(["Article", "HowTo", "BreadcrumbList"]);
  });

  it("replaces (never duplicates) tags and JSON-LD when the path changes", () => {
    const { rerender } = renderHook(({ p }) => usePageMeta(p, null), { initialProps: { p: "/guides/lcp" } });
    rerender({ p: "/history" });
    expect(meta('meta[name="robots"]')).toBe("noindex, nofollow");
    expect(ldTypes()).toEqual([]);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it("uses the audit title and noindex while a result is on screen", () => {
    renderHook(() => usePageMeta("/", "example.com audit · Explain This Website"));
    expect(document.title).toBe("example.com audit · Explain This Website");
    expect(meta('meta[name="robots"]')).toBe("noindex, nofollow");
    expect(ldTypes()).toEqual([]);
  });
});
