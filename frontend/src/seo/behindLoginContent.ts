// Copy for the "Analyze a page behind a login" page, shared by the React page
// and the build-time prerender so the static HTML matches what the app renders.

export const BEHIND_LOGIN_TITLE = "Analyze a page behind a login";

export const BEHIND_LOGIN_INTRO =
  "The analyzer can only fetch pages that anyone can open. For a dashboard, an account page or a staging site behind a password, send the page from your own browser instead. There is nothing to install, and your password never leaves your browser.";

export const BEHIND_LOGIN_STEPS = [
  "Drag the Explain this page button to your bookmarks bar. You only do this once.",
  "Open the page you want analyzed, signed in the way you normally are.",
  "Click the bookmark. A new tab opens here, shows you what arrived and asks you to confirm.",
];

export const BEHIND_LOGIN_REPORT: { label: string; text: string }[] = [
  { label: "Same", text: "Tech stack, SEO checks, UX review, conversion signals, content and image audits. They are read from the page as your browser shows it, after its scripts have run." },
  { label: "Headers", text: "Security headers are read by your browser from the page's own response, so the audit is real." },
  { label: "Speed", text: "Load time, largest paint and layout shift as your browser measured them. There is no Lighthouse score, because Google cannot reach a page behind a login." },
  { label: "Left out", text: "Link checks and the AI summary. Links inside an account can be one-time or private, so none of them is ever requested, and the page is not sent to an AI provider." },
];

export const BEHIND_LOGIN_PRIVACY = [
  "Your browser sends the page's HTML, its address, nine response headers and its load timings. It does not send your password, cookies or session.",
  "Our server never requests the page. It only reads what your browser sent.",
  "The report is saved to your account and only you can open it. It has no public link.",
  "We keep the report, not the page. The HTML is discarded once it has been analyzed.",
];

export const BEHIND_LOGIN_LIMITS = [
  "You need a free account, so the report has an owner. Each page counts as one of your daily analyses.",
  "It is built for desktop browsers. Phones have no bookmarks bar to click.",
  "A few sites with strict security settings block bookmark buttons. If the new tab says no page arrived, paste the page source there instead.",
];
