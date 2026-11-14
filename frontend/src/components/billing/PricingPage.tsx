// The public pricing page: what is free, what Pro adds, and what it costs.
// Checkout does not exist yet, so Pro has a status line where a buy button
// will go.

import { useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { track } from "../../lib/analytics";
import {
  FREE_SUMMARY,
  PRICING_COMING,
  PRICING_INTRO,
  PRICING_NOTES,
  PRICING_NO_ACCOUNT,
  PRICING_ROWS,
  PRICING_TITLE,
  PRO_MONTHLY_PRICE,
  PRO_NOT_ON_SALE,
  PRO_SUMMARY,
  PRO_YEARLY_PER_MONTH,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_SAVING,
} from "../../seo/pricingContent";

const eyebrow = "text-[11px] font-bold uppercase tracking-widest text-zinc-600";
const planTag = "font-mono text-[11px] uppercase tracking-[0.12em]";
const link = "text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors";

export function PricingPage() {
  const { user } = useAuth();
  const onPro = user?.plan === "pro" || user?.plan === "owner";

  useEffect(() => { track("pricing_view", { signed_in: Boolean(user) }); }, [user]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-5 text-[12px] text-zinc-500">
          <a href="/" className="hover:text-zinc-300 transition-colors">Home</a>
          <span className="mx-1.5 text-zinc-700">›</span>
          <span className="text-zinc-400">Pricing</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight text-zinc-100">{PRICING_TITLE}</h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-zinc-400">{PRICING_INTRO}</p>

        {/* The two plans, side by side and divided by a single rule. */}
        <section aria-label="Plans" className="mt-10 grid grid-cols-1 sm:grid-cols-2 border-y border-zinc-800">
          <div className="py-7 sm:pr-8">
            <h2 className={`${planTag} text-zinc-500`}>Free</h2>
            <p className="mt-4 text-4xl font-semibold tabular-nums text-zinc-100">$0</p>
            <p className="mt-1 text-[13px] text-zinc-500">No card, no time limit</p>
            <p className="mt-5 text-[13.5px] leading-relaxed text-zinc-300">{FREE_SUMMARY}</p>
            <p className="mt-5 text-[13.5px]">
              <a href="/" className={link}>Analyze a website</a>
            </p>
          </div>

          <div className="py-7 border-t border-zinc-800 sm:border-t-0 sm:border-l sm:pl-8">
            <h2 className={`${planTag} text-violet-400`}>Pro</h2>
            <p className="mt-4 text-4xl font-semibold tabular-nums text-zinc-100">
              {PRO_YEARLY_PRICE}
              <span className="ml-2 text-[14px] font-normal text-zinc-500">a year</span>
            </p>
            <p className="mt-1 text-[13px] text-zinc-500">
              or {PRO_MONTHLY_PRICE} a month. The year works out to {PRO_YEARLY_PER_MONTH} a month and saves {PRO_YEARLY_SAVING}.
            </p>
            <p className="mt-5 text-[13.5px] leading-relaxed text-zinc-300">{PRO_SUMMARY}</p>
            <p className="mt-5 text-[13.5px] leading-relaxed text-zinc-400">
              {onPro ? "You are on Pro." : PRO_NOT_ON_SALE}
            </p>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="pricing-compare">
          <h2 id="pricing-compare" className={`${eyebrow} mb-3`}>What each plan includes</h2>
          <table className="w-full border-t border-zinc-800 text-left">
            <thead>
              <tr className="border-b border-zinc-800">
                <th scope="col" className="py-3 pr-3 font-normal"><span className="sr-only">Feature</span></th>
                <th scope="col" className={`${planTag} w-[26%] py-3 pr-3 font-normal text-zinc-500`}>Free</th>
                <th scope="col" className={`${planTag} w-[30%] py-3 font-normal text-violet-400`}>Pro</th>
              </tr>
            </thead>
            <tbody>
              {PRICING_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-zinc-800 align-baseline">
                  <th scope="row" className="py-3 pr-3 text-[13.5px] font-normal leading-snug text-zinc-300">{row.label}</th>
                  <td className={`py-3 pr-3 text-[13px] leading-snug tabular-nums ${row.free === "No" ? "text-zinc-600" : "text-zinc-400"}`}>{row.free}</td>
                  <td className="py-3 text-[13px] leading-snug tabular-nums text-zinc-100">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">{PRICING_NO_ACCOUNT}</p>
        </section>

        <section className="mt-12" aria-labelledby="pricing-coming">
          <h2 id="pricing-coming" className={`${eyebrow} mb-3`}>Coming to Pro</h2>
          <dl className="border-t border-zinc-800">
            {PRICING_COMING.map((item) => (
              <div key={item.label} className="grid grid-cols-1 sm:grid-cols-[104px_1fr] items-baseline gap-x-4 gap-y-1 border-b border-zinc-800 py-3">
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">{item.label}</dt>
                <dd className="text-[13.5px] leading-relaxed text-zinc-300">{item.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12" aria-labelledby="pricing-notes">
          <h2 id="pricing-notes" className={`${eyebrow} mb-3`}>Paying and cancelling</h2>
          <ul className="border-t border-zinc-800">
            {PRICING_NOTES.map((text) => (
              <li key={text} className="border-b border-zinc-800 py-3 text-[13.5px] leading-relaxed text-zinc-300">{text}</li>
            ))}
          </ul>
          <p className="mt-4 text-[13.5px] leading-relaxed text-zinc-500">
            The details are in the <a href="/refunds" className={link}>refund policy</a> and the{" "}
            <a href="/terms" className={link}>terms</a>. Questions:{" "}
            <a href="mailto:support@explainthiswebsite.com" className={link}>support@explainthiswebsite.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
