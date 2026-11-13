// Copy for the "Analyze a page behind a login" page, shared by the React page
// and the build-time prerender so the static HTML matches what the app renders.

export const BEHIND_LOGIN_TITLE = "Analyze a page behind a login";

export const BEHIND_LOGIN_INTRO =
  "The analyzer can only fetch pages that anyone can open. For a dashboard, an account page or a staging site behind a password, copy the page from your own browser and paste it here. Your password never leaves your browser.";

export const BEHIND_LOGIN_STEPS = [
  "Open the page you want analyzed, signed in the way you normally are.",
  "Copy its source: right-click the page, choose View Page Source, select everything and copy.",
  "Paste it here with the page's address. You see what you are sending and confirm before anything is analyzed.",
];

export const BEHIND_LOGIN_JS_TIP =
  "For an app that builds its pages with JavaScript, the page source is nearly empty. Copy the finished page instead: open developer tools, right-click the html element and choose Copy, then Copy outerHTML.";

export const BEHIND_LOGIN_REPORT: { label: string; text: string }[] = [
  { label: "Included", text: "Tech stack, SEO checks, UX review, conversion signals, content and image audits, all read from the HTML you paste." },
  { label: "Left out", text: "Speed scores and security headers, because pasted source carries no load timings or response headers. Link checks, because links inside an account can be one-time or private, so none of them is ever requested. The AI summary, because the page is not sent to an AI provider." },
];

export const BEHIND_LOGIN_PRIVACY = [
  "You send the page's HTML and its address, and nothing else: no password, no cookies, no session.",
  "Our server never requests the page. It only reads what you pasted.",
  "The report is saved to your account and only you can open it. It has no public link.",
  "We keep the report, not the page. The HTML is discarded once it has been analyzed.",
];

export const BEHIND_LOGIN_LIMITS = [
  "You need a free account, so the report has an owner. Each page counts as one of your daily analyses.",
  "A page can be up to 5 MB of HTML.",
  "Pasted pages are not flagged as sign-in screens: what you paste is taken as the page you meant.",
];
