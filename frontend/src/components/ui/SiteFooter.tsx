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
    <footer className="px-4 sm:px-6 py-10 border-t border-zinc-900/80">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:justify-between gap-8 text-[12px] text-zinc-600">
        <p className="order-last sm:order-first">© {new Date().getFullYear()} Explain This Website</p>
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
    </footer>
  );
}
