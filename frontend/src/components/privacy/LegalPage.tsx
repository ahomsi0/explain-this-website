import { LogoWordmark } from "../ui/Logo";

type LegalKind = "privacy" | "terms";

const CONTENT: Record<LegalKind, { title: string; intro: string; sections: { title: string; body: string }[] }> = {
  privacy: {
    title: "Privacy Policy",
    intro: "This policy explains what Explain This Website collects, why we collect it, and the choices you have.",
    sections: [
      { title: "Information we process", body: "When you analyze a URL, we process the URL and the public response needed to create the report. If you create an account, we store your email address, password hash, usage totals, and saved audit history. We may retain operational logs such as request timestamps, error details, and an anonymous quota identifier." },
      { title: "How we use it", body: "We use this information to provide analyses, enforce daily limits, save history, secure the service, diagnose failures, and improve the product. We do not ask for, or submit, passwords, private credentials, or form data from the site you analyze." },
      { title: "Third-party services", body: "A report may use Google PageSpeed Insights for performance data and Microlink for the optional page screenshot preview. Password reset and broadcast email use Resend when configured. Optional Google Analytics is loaded only after you grant analytics consent; you can decline it in the banner." },
      { title: "Retention and choices", body: "Saved audits remain in your account until you delete them or request deletion. Public share links are time-limited and can be revoked. You may decline optional analytics, update your account through the product, or contact support@explainthewebsite.com for access, correction, or deletion requests." },
      { title: "Security and changes", body: "We use reasonable technical safeguards, including encrypted transport, hashed passwords, and access controls. No internet service can guarantee absolute security. We may update this policy as the service changes and will update the date below." },
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "By using Explain This Website, you agree to use it responsibly and understand that reports are informational analysis, not guarantees.",
    sections: [
      { title: "Acceptable use", body: "Only submit URLs you are authorized to inspect or that are publicly accessible. Do not use the service to attack, overload, evade access controls, probe private systems, submit credentials, or violate another party's rights. We may throttle or suspend abusive use." },
      { title: "Reports and limitations", body: "Reports are generated from a point-in-time fetch and may be incomplete when a site requires login, blocks automated requests, renders content only in a browser, uses infinite scroll, or depends on unavailable third-party data. Scores and recommendations are suggestions, not professional, legal, security, SEO, or performance guarantees." },
      { title: "Accounts and history", body: "Keep your account credentials private and provide an email address you control. You are responsible for activity under your account. We may enforce plan limits, remove content, or suspend accounts that breach these terms or threaten the service." },
      { title: "Third-party sites and availability", body: "Analyzed websites, PageSpeed, screenshot providers, email delivery, and payment providers are operated by third parties. Their availability and results are outside our control. The service is provided on an availability-permitting basis and may change over time." },
      { title: "Contact and updates", body: "Questions about these terms can be sent to support@explainthewebsite.com. Continued use after an update means you accept the revised terms." },
    ],
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const content = CONTENT[kind];
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900/80 px-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between">
          <a href="/" aria-label="Explain This Website home"><LogoWordmark size={20} /></a>
          <a href="/" className="text-xs text-zinc-400 transition-colors hover:text-zinc-100">Back to analyzer</a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Explain This Website</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">{content.intro}</p>
        <p className="mt-3 text-xs text-zinc-600">Last updated: August 21, 2026</p>
        <div className="mt-10 space-y-8">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-zinc-100">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <footer className="mx-auto max-w-3xl border-t border-zinc-900 px-4 py-8 text-xs text-zinc-600 sm:px-6">
        <a href="/whats-new" className="hover:text-zinc-300">What&apos;s new</a>
        <span className="mx-2">·</span>
        <a href="/privacy" className="hover:text-zinc-300">Privacy</a>
        <span className="mx-2">·</span>
        <a href="/terms" className="hover:text-zinc-300">Terms</a>
      </footer>
    </div>
  );
}
