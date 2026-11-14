// Plans and prices, shared by the pricing page and its prerendered copy so the
// two cannot drift. The backend enforces the limits; these are the words for
// them. Decided on 2026-11-14 (see ROADMAP.md, Paid plan).

export const PRO_MONTHLY_PRICE = "$7";
export const PRO_YEARLY_PRICE = "$59";
/** What the yearly plan works out to per month, and what it saves against twelve monthly payments. */
export const PRO_YEARLY_PER_MONTH = "$4.92";
export const PRO_YEARLY_SAVING = "$25";

export const FREE_DAILY_LIMIT = 5;
export const PRO_DAILY_LIMIT = 50;
export const REFUND_DAYS = 7;

export const PRICING_TITLE = "Pricing";

export const PRICING_INTRO =
  "A report is free, with or without an account. Pro is for people who check sites as part of their work and want more of them, kept for longer, or sent to their own tools.";

export const FREE_SUMMARY = "For checking a site now and then.";
export const PRO_SUMMARY = "For people who check sites as part of their work.";

/** Shown in place of a buy button until checkout exists. */
export const PRO_NOT_ON_SALE =
  "Pro is not on sale yet. Until it opens, nothing changes for free accounts.";

export interface PricingRow {
  label: string;
  free: string;
  pro: string;
}

export const PRICING_ROWS: PricingRow[] = [
  { label: "Analyses a day", free: String(FREE_DAILY_LIMIT), pro: String(PRO_DAILY_LIMIT) },
  { label: "Full report with fix guides", free: "Yes", pro: "Yes" },
  { label: "Compare two sites", free: "Yes", pro: "Yes" },
  { label: "PDF export", free: "Yes", pro: "Yes" },
  { label: "Share a report by link", free: "Link lasts 30 days", pro: "Link does not expire" },
  { label: "Saved history", free: "Last 30 days", pro: "Everything, with trends" },
  { label: "Deep scan of several pages", free: "1 a day", pro: "Up to your daily limit" },
  { label: "Pages behind a login", free: "1 a day", pro: "Up to your daily limit" },
  { label: "API keys and webhooks", free: "No", pro: "Yes" },
];

export const PRICING_NO_ACCOUNT =
  `Without an account you still get ${FREE_DAILY_LIMIT} analyses a day and the full report. An account is free and adds history, compare and pages behind a login.`;

export const PRICING_COMING: { label: string; text: string }[] = [
  {
    label: "Monitoring",
    text: "Your saved sites are checked again every week, and you get an email when a score drops or something breaks.",
  },
  { label: "Your logo", text: "PDF reports that carry your own logo, for freelancers and agencies." },
  { label: "Bulk", text: "Analyze a list of addresses in one go." },
];

export const PRICING_NOTES: string[] = [
  `Change your mind within ${REFUND_DAYS} days of a payment and you get all of it back.`,
  "Cancel at any time. You keep Pro until the end of the month or year you paid for.",
  "Payments are handled by Paddle, our reseller, which also takes care of tax and invoices.",
  "Prices are in US dollars. Tax is added at checkout where your country requires it.",
];
