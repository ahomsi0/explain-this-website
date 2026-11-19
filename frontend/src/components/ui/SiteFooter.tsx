import { LogoWordmark } from "./Logo";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

// Grouped so the footer reads as three short lists instead of one long row.
// Every link stays: the product pages are internal links Google follows, and
// Pricing, Terms, Privacy and Refunds must be reachable from every page for
// the payment provider's review.
const GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Compare sites", href: "/compare" },
      { label: "Fix guides", href: "/guides" },
      { label: "Built with", href: "/built-with" },
      { label: "Behind a login", href: "/behind-login" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "What's new", href: "/whats-new" },
      { label: "Status", href: "/status" },
      { label: "Support", href: "mailto:support@explainthiswebsite.com" },
      { label: "API", href: "https://github.com/ahomsi0/explain-this-website#api-reference", external: true },
      { label: "GitHub", href: "https://github.com/ahomsi0/explain-this-website", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Refunds", href: "/refunds" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="px-4 sm:px-6 pt-12 pb-8 border-t border-zinc-900/80">
      {/* Same width as the widest page content (the guides), so the footer
          lines up with the page above it instead of hugging the screen edges. */}
      <div className="max-w-6xl mx-auto text-[12px] text-zinc-600">
        <div className="flex flex-col md:flex-row md:justify-between gap-10">
          <div className="max-w-xs">
            {/* Not a link: the header logo is the home link, and the button
                below already goes home, so a second one would only repeat it. */}
            <div className="inline-flex">
              <LogoWordmark size={22} />
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-zinc-500">
              Paste any URL and get it explained in plain English: what it’s built with, how it ranks and what to fix first.
            </p>
            <a
              href="/"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[12px] font-medium text-zinc-300 hover:border-violet-500/40 hover:text-zinc-100 transition-colors"
            >
              Analyze a website
              <span aria-hidden="true">→</span>
            </a>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-8">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{group.title}</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="hover:text-zinc-400 transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-10 pt-6 border-t border-zinc-900/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p>© {new Date().getFullYear()} Explain This Website</p>
          <p>Free website audits, no signup needed.</p>
        </div>
      </div>
    </footer>
  );
}
