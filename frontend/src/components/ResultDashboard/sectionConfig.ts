export type SectionId = "overview" | "fixplan" | "tech" | "seo" | "ux" | "performance" | "conversion";

export type SectionMeta = {
  id: SectionId;
  label: string;
  title: string;
  description: string;
};

export const SECTIONS: SectionMeta[] = [
  { id: "overview",    label: "Overview",    title: "Audit Overview",
    description: "A high-level snapshot of the site, what it's for, and the most impactful issues to fix." },
  { id: "fixplan",     label: "Fix Plan",    title: "Your Fix Plan",
    description: "Prioritized issues ranked by impact × severity. Start here to get the most value." },
  { id: "tech",        label: "Tech Stack",  title: "Technology Stack",
    description: "Frameworks, analytics, CDNs, and platforms detected on the page." },
  { id: "seo",         label: "SEO Audit",   title: "SEO Audit",
    description: "Core SEO checks plus optional enhancements with actionable details." },
  { id: "ux",          label: "UX Review",   title: "User Experience",
    description: "Conversion-relevant UX signals, trust markers, and engagement features." },
  { id: "performance", label: "Performance", title: "Performance & Loading",
    description: "Real Core Web Vitals from Google, plus load efficiency and content stats." },
  { id: "conversion",  label: "Conversion",  title: "Conversion Readiness",
    description: "How clear the offer is, how trustworthy it feels, and where friction lives." },
];
