type LegalKind = "privacy" | "terms" | "refunds";

const CONTENT: Record<LegalKind, { title: string; intro: string; sections: { title: string; body: string }[] }> = {
  privacy: {
    title: "Privacy Policy",
    intro: "This policy explains what Explain This Website collects, why we collect it, and the choices you have.",
    sections: [
      { title: "Information we process", body: "When you analyze a URL, we process the URL and the public response needed to create the report, including its response headers and the names of any cookies it sets. Cookie values are not stored. If you create an account, we store your email address, password hash, usage totals, and saved audit history. We may retain operational logs such as request timestamps, error details, and an anonymous quota identifier. Analyses run without an account are also logged as the analyzed page address (without any query string), the page title, and a timestamp, with no account or visitor identifier attached." },
      { title: "Pages you send from your browser", body: "If you are signed in, you can analyze a page that sits behind a login by sending it from your own browser, with our Chrome extension or by pasting its source. We receive the page's HTML and its address. The extension also sends the load timings your browser recorded for that page and a short list of its response headers, such as its security headers and the name of its server software. The extension reads a page only when you click its button on that page. It does not read or send passwords, cookies, or anything from your other tabs, and it does not track your browsing. Our servers never open or fetch the page themselves. The HTML is analyzed and then discarded: we keep the report, not the page. A report can quote parts of the page, such as its title, headings, and link addresses, so only send pages you are allowed to share and remove anything confidential first. The report is saved to your account history, has no public link, and can be opened only by you. You can delete it like any other saved audit." },
      { title: "How we use it", body: "We use this information to provide analyses, enforce daily limits, save history, secure the service, diagnose failures, and improve the product. We do not ask for, or submit, passwords, private credentials, or form data from the site you analyze." },
      { title: "Third-party services", body: "A report may use Google PageSpeed Insights for performance data and Microlink for the optional page screenshot preview. Password reset and broadcast email use Resend when configured. Optional Google Analytics is loaded only after you grant analytics consent; you can decline it in the banner. If you buy a paid plan, checkout is handled by Paddle, which acts as the seller. Paddle collects your payment details and billing address under its own privacy policy, and we never see your card number. We receive your email address, the plan you bought, and its status." },
      { title: "Retention and choices", body: "Saved audits remain in your account until you delete them or request deletion. The log of analyses run without an account is deleted after 90 days. Every report made from a public address has its own link, and anyone who has that link can open the report. Reports made from a page you sent yourself have no link and stay private to your account. Links stop working after 30 days, and if you are signed in you can revoke one from your history at any time. Reports run without an account are stored only so their link works and are deleted when it expires. You may decline optional analytics, update your account through the product, or contact support@explainthiswebsite.com for access, correction, or deletion requests." },
      { title: "Security and changes", body: "We use reasonable technical safeguards, including encrypted transport, hashed passwords, and access controls. No internet service can guarantee absolute security. We may update this policy as the service changes and will update the date below." },
    ],
  },
  refunds: {
    title: "Refund Policy",
    intro: "If you pay for Explain This Website Pro and change your mind, ask within 7 days of that payment and you get all of it back.",
    sections: [
      { title: "What is covered", body: "Every payment for a Pro plan, monthly or yearly. The 7 days start on the day of the payment, and they apply to your first payment and to each renewal. You do not need to give a reason." },
      { title: "How to ask", body: "Email support@explainthiswebsite.com from the address on your account, or use the link in the receipt Paddle sent you. Tell us which payment you mean if you have more than one." },
      { title: "How the refund is paid", body: "Pro is sold by Paddle, our reseller and the merchant of record for all orders, so Paddle sends the refund to the payment method you used. You get the full amount, including any tax you paid. How long it takes to appear depends on your bank or card." },
      { title: "After 7 days", body: "Payments older than 7 days are not refunded, and we do not refund part of a month or year. You can cancel at any time and you keep Pro until the end of the period you paid for. If something went wrong on our side, such as being charged twice, write to us and we will put it right, whenever it happened." },
      { title: "Your account after a refund", body: "The account goes back to the free plan when the refund is made. It stays open and you can keep using it." },
      { title: "Your legal rights", body: "Nothing in this policy limits the rights you have under the consumer law of your country." },
      { title: "Who we are", body: "Explain This Website is operated by the Explainthiswebsite.com team. Contact us at support@explainthiswebsite.com." },
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "By using Explain This Website, you agree to use it responsibly and understand that reports are informational analysis, not guarantees.",
    sections: [
      { title: "Acceptable use", body: "Only submit URLs you are authorized to inspect or that are publicly accessible, and only send page source from pages you are allowed to share. Do not use the service to attack, overload, evade access controls, probe private systems, submit credentials, or violate another party's rights. We may throttle or suspend abusive use." },
      { title: "Reports and limitations", body: "Reports are generated from a point-in-time fetch and may be incomplete when a site requires login, blocks automated requests, renders content only in a browser, uses infinite scroll, or depends on unavailable third-party data. Scores and recommendations are suggestions, not professional, legal, security, SEO, or performance guarantees." },
      { title: "Accounts and history", body: "Keep your account credentials private and provide an email address you control. You are responsible for activity under your account. We may enforce plan limits, remove content, or suspend accounts that breach these terms or threaten the service." },
      { title: "Third-party sites and availability", body: "Analyzed websites, PageSpeed, screenshot providers, email delivery, and payment providers are operated by third parties. Their availability and results are outside our control. The service is provided on an availability-permitting basis and may change over time." },
      { title: "Paid plans, billing, and refunds", body: "Explain This Website is operated by the Explainthiswebsite.com team. Paid plans are sold through Paddle. Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. A paid plan renews automatically at the end of each month or year until you cancel. You can cancel at any time and you keep the plan until the end of the period you paid for. Refunds are described in the Refund Policy at explainthiswebsite.com/refunds. If the price of your plan changes, we will tell you by email before your next renewal." },
      { title: "Contact and updates", body: "Questions about these terms can be sent to support@explainthiswebsite.com. Continued use after an update means you accept the revised terms." },
    ],
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const content = CONTENT[kind];
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Explain This Website</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">{content.intro}</p>
        <p className="mt-3 text-xs text-zinc-600">Last updated: November 15, 2026</p>
        <div className="mt-10 space-y-8">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-zinc-100">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
