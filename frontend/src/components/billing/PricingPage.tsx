// The public pricing page: what is free, what Pro adds, and what it costs.
// Checkout does not exist yet, so Pro has a status line where a buy button
// will go. Layout follows the Compare page: eyebrow, bold heading, cards.

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

const card = "rounded-xl border border-zinc-800/80 bg-zinc-900/30";
const columnLabel = "text-[11px] font-semibold uppercase tracking-[0.15em]";
const link = "text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors";

export function PricingPage() {
  const { user } = useAuth();
  const onPro = user?.plan === "pro" || user?.plan === "owner";

  useEffect(() => { track("pricing_view", { signed_in: Boolean(user) }); }, [user]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Plans</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{PRICING_TITLE}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">{PRICING_INTRO}</p>

        <section aria-label="Plans" className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className={`${card} flex flex-col p-5`}>
            <h2 className="text-sm font-semibold text-zinc-200">Free</h2>
            <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">$0</p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">No card, no time limit.</p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-zinc-400">{FREE_SUMMARY}</p>
            <div className="mt-auto pt-5">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-violet-600 hover:bg-violet-500 active:bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors"
              >
                Analyze a website
              </a>
            </div>
          </div>

          <div className={`${card} flex flex-col p-5`}>
            <h2 className="text-sm font-semibold text-violet-400">Pro</h2>
            <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">
              {PRO_YEARLY_PRICE}
              <span className="ml-2 text-sm font-normal tracking-normal text-zinc-500">a year</span>
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              or {PRO_MONTHLY_PRICE} a month. The year works out to {PRO_YEARLY_PER_MONTH} a month and saves {PRO_YEARLY_SAVING}.
            </p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-zinc-400">{PRO_SUMMARY}</p>
            <p className="mt-auto pt-5 text-xs leading-relaxed text-zinc-300">
              {onPro ? "You are on Pro." : PRO_NOT_ON_SALE}
            </p>
          </div>
        </section>

        <section className="mt-14 border-t border-zinc-800 pt-10" aria-labelledby="pricing-compare">
          <h2 id="pricing-compare" className="text-lg font-semibold text-zinc-100">What each plan includes</h2>
          <div className={`${card} mt-6 px-4 sm:px-5`}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800/80">
                  <th scope="col" className="py-3 pr-3 font-normal"><span className="sr-only">Feature</span></th>
                  <th scope="col" className={`${columnLabel} w-[26%] py-3 pr-3 text-zinc-500`}>Free</th>
                  <th scope="col" className={`${columnLabel} w-[30%] py-3 text-violet-400`}>Pro</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_ROWS.map((row, i) => (
                  <tr key={row.label} className={`align-baseline ${i < PRICING_ROWS.length - 1 ? "border-b border-zinc-800/80" : ""}`}>
                    <th scope="row" className="py-3 pr-3 text-[13px] font-normal leading-snug text-zinc-300">{row.label}</th>
                    <td className={`py-3 pr-3 text-[13px] leading-snug tabular-nums ${row.free === "No" ? "text-zinc-600" : "text-zinc-400"}`}>{row.free}</td>
                    <td className="py-3 text-[13px] leading-snug tabular-nums text-zinc-100">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-zinc-500">{PRICING_NO_ACCOUNT}</p>
        </section>

        <section className="mt-14 border-t border-zinc-800 pt-10" aria-labelledby="pricing-coming">
          <h2 id="pricing-coming" className="text-lg font-semibold text-zinc-100">Coming to Pro</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {PRICING_COMING.map((item) => (
              <div key={item.label} className={`${card} p-4`}>
                <h3 className="text-xs font-semibold text-zinc-200">{item.label}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-zinc-800 pt-10" aria-labelledby="pricing-notes">
          <h2 id="pricing-notes" className="text-lg font-semibold text-zinc-100">Paying and cancelling</h2>
          <ul className="mt-6 flex flex-col gap-2">
            {PRICING_NOTES.map((text) => (
              <li key={text} className="flex gap-2 text-[13px] leading-relaxed text-zinc-400">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[13px] leading-relaxed text-zinc-500">
            The details are in the <a href="/refunds" className={link}>refund policy</a> and the{" "}
            <a href="/terms" className={link}>terms</a>. Questions:{" "}
            <a href="mailto:support@explainthiswebsite.com" className={link}>support@explainthiswebsite.com</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
