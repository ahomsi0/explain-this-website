import { OG_IMAGE, SITE_NAME, serializeJsonLd } from "./routes.ts";
import type { PageMeta } from "./routes.ts";

function setMeta(doc: Document, attr: "name" | "property", key: string, content: string) {
  let el = doc.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = doc.createElement("meta");
    el.setAttribute(attr, key);
    doc.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(doc: Document, href: string) {
  let el = doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = doc.createElement("link");
    el.setAttribute("rel", "canonical");
    doc.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Writes a page's SEO meta into the document head, replacing whatever was there. */
export function applyMeta(doc: Document, meta: PageMeta): void {
  doc.title = meta.title;
  setMeta(doc, "name", "description", meta.description);
  setMeta(doc, "name", "robots", meta.robots);
  setCanonical(doc, meta.canonical);

  setMeta(doc, "property", "og:type", meta.ogType);
  setMeta(doc, "property", "og:url", meta.canonical);
  setMeta(doc, "property", "og:site_name", SITE_NAME);
  setMeta(doc, "property", "og:title", meta.title);
  setMeta(doc, "property", "og:description", meta.description);
  setMeta(doc, "property", "og:image", OG_IMAGE);

  setMeta(doc, "name", "twitter:card", "summary_large_image");
  setMeta(doc, "name", "twitter:title", meta.title);
  setMeta(doc, "name", "twitter:description", meta.description);
  setMeta(doc, "name", "twitter:image", OG_IMAGE);

  doc.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
  for (const data of meta.jsonLd) {
    const script = doc.createElement("script");
    script.type = "application/ld+json";
    script.textContent = serializeJsonLd(data);
    doc.head.appendChild(script);
  }
}
