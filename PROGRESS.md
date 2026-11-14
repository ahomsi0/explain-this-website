# Progress

What has been built, and where things stand right now. For what comes next, see [ROADMAP.md](ROADMAP.md).

Last updated: 2026-11-14

## Where things stand

**Live** at [www.explainthiswebsite.com](https://www.explainthiswebsite.com/). Frontend on Vercel, API on Render, database on Neon.

**Nothing is waiting to be pushed.**

**Not checked yet**

- A real sign-up and sign-in on the live site after the auth page changes.
- A real behind-login analysis on the live site with a signed-in account. It was tested locally against the real API code with a throwaway account token, and the live API correctly refuses requests without a session.

**Set aside for later** (on 2026-11-13, details in [ROADMAP.md](ROADMAP.md))

- The live-site check above. Owner task.
- Getting a few links to the site: Product Hunt, tool directories, one community post. Owner task.
- Strengthening `/guides/lcp` and `/compare`, the two pages Google already shows.
- The Chrome extension for pages behind a login.
- An MCP server so the analyzer can be used inside AI assistants. Planned for after the paid plan.

**Planned, not started**

- A paid plan. The provider analysis for a Lebanon-based owner and the list of what to lock are in [ROADMAP.md](ROADMAP.md) under Paid plan (2026-11-14). Recommendation: Paddle.

## Search (SEO)

Numbers from Google Search Console for the whole domain, web search only. Search Console data runs about three days behind, so this snapshot covers **August 31 to November 10, 2026**, which is everything Google has recorded for the site so far.

Snapshot taken: 2026-11-13

### Totals so far

| | |
|---|---|
| Clicks | 7 |
| Impressions | 488 |
| Click-through rate | 1.4% |
| Average position | 49.5 |

### Month by month

| Month | Clicks | Impressions | CTR | Avg. position |
|---|---|---|---|---|
| September | 1 | 19 | 5.3% | 14.8 |
| October | 1 | 291 | 0.3% | 48.7 |
| November 1 to 10 | 5 | 178 | 2.8% | 54.6 |

**Recent weeks**

- Last 28 days: 6 clicks and 461 impressions, up from 0 clicks and 14 impressions in the 28 days before.
- Last 7 days: 5 clicks and 114 impressions, against 0 clicks and 166 impressions the week before.

### How to read this

- **The site is at the very start.** Seven clicks in ten weeks is close to nothing in absolute terms. What matters is the direction.
- **Visibility jumped in late October.** Impressions went from 19 in September to 291 in October, and November is on pace for roughly 500. The jump follows the SEO overhaul (October 3), the built-with pages (October 22) and the sitemap submission (October 25).
- **The average position got worse on paper, and that is expected.** In September Google showed the site almost only for its own name. Now it shows it for many more searches, mostly far down the results, which drags the average down while real reach goes up.
- **Clicks are starting.** Five of the seven clicks came in the first ten days of November.

### Indexing

- **62 pages indexed**, 8 not indexed.
- Not indexed: 5 "Discovered, currently not indexed" (Google knows them and has not crawled them yet) and 3 "Page with redirect" (expected, these are redirects to the www address).
- Sitemap: 68 pages, last read by Google on November 13, status Success.

### Pages that show up most

| Page | Clicks | Impressions |
|---|---|---|
| `/` (home) | 6 | 116 |
| `/compare` | 0 | 168 |
| `/guides/lcp` | 0 | 44 |
| `/built-with/10web` | 0 | 38 |
| `/built-with/godaddy-website-builder` | 0 | 16 |
| `/guides/sitemap` | 0 | 15 |
| `/built-with/hocoos` | 0 | 13 |
| `/guides/mixed-content` | 0 | 11 |
| `/guides/stale-content` | 0 | 9 |
| `/built-with/replit` | 1 | 8 |

48 pages have had at least one impression.

### Searches that show the site

| Search | Clicks | Impressions | Position |
|---|---|---|---|
| explain this website | 1 | 2 | 2.5 |
| explain this page | 0 | 59 | 9.7 |
| compare two websites seo | 0 | 38 | 91.8 |
| compare website ranking | 0 | 24 | 96.9 |
| largest contentful paint | 0 | 20 | 54.7 |
| compare websites seo | 0 | 16 | 92.9 |
| website seo comparison | 0 | 11 | 97.6 |
| lcp (largest contentful paint) | 0 | 9 | 45.0 |
| this website | 0 | 8 | 52.2 |

69 different searches in total. One more click came from a Korean-language search. Google hides rare searches for privacy, which is why the clicks in this table add up to less than 7.

### Where it comes from

- **Devices:** desktop 374 impressions and 3 clicks, mobile 111 impressions and 4 clicks, tablet 3 impressions.
- **Countries (last 7 days):** United States leads with 58 impressions and 4 clicks, then Vietnam, United Kingdom and Canada. 42 countries in total.

### What the numbers point to

- **"explain this page" is the closest win.** The site sits around position 10 for it with 59 impressions and no clicks. A small move up, or a title that matches that wording better, is the most likely source of the next clicks.
- **`/compare` is seen the most and clicked the least.** It gets a third of all impressions, but at positions above 90, which is page nine or ten of the results. Nobody clicks there. It needs stronger content or links before it can pay off.
- **The built-with pages are being picked up.** Several of them already get impressions three weeks after launch, and one produced a click.
- **The brand name works.** Searching "explain this website" shows the site near the top.

## Log

Newest first. One line per thing a visitor or the owner would notice. Git history has the detail.

### November 2026

- **Pricing page and refund policy.** A public `/pricing` page shows the Free and Pro plans ($7 a month or $59 a year) and says plainly that Pro is not on sale yet. A `/refunds` page gives a full refund within 7 days of any payment. The terms name Paddle as the seller, and the privacy policy says what Paddle handles. These are the pages Paddle checks before it approves the site. Nothing is locked and nothing can be bought yet.
- **Fixed: verification and password reset emails were not reaching anyone.** The server had no sender address set, so it fell back to Resend's shared test sender, which Resend only delivers to the account owner. Every other recipient was rejected. The default sender is now `noreply@explainthiswebsite.com`, on the site's verified domain. Found on 2026-11-14 from the admin dashboard's System tab.
- **Email on the domain.** `support@` and `ahmad-homsi@explainthiswebsite.com` now receive mail, forwarded through Cloudflare. Before this the domain had no mail records, so the support address in the privacy policy and terms was bouncing.
- **Pages behind a login.** A signed-in user can analyze a page the analyzer cannot reach (dashboards, staging sites, intranets) by sending it from their own browser. The server never fetches the page, the report is private to its owner, and link checks, Lighthouse, the AI summary and the domain lookup are skipped. New public page `/behind-login`, private page `/capture`, new endpoint `POST /api/analyze-capture`.
- **Server frameworks detected from headers and cookies.** The tech stack now reads the server's response headers and the names of the cookies it sets, so Django, Laravel, Rails, Flask, ASP.NET, Java and others show up even when the page itself gives nothing away. Also new: web servers (LiteSpeed, IIS, Caddy, Gunicorn and more), hosts and edge services (Azure, AWS load balancers, Imperva, Sucuri and more). Cookie values are never stored or shown, only names. Guesses from naming conventions are marked medium confidence.
- **"400+ technologies"**, up from 370+. The catalog now holds 419.
- **Privacy policy and terms cover pages you send yourself**: what is received, that the page is not kept, that the report is private, and that cookie values are not stored.
- **Bookmark button removed** the same day it shipped. Pasting the page source is the one way in until the Chrome extension exists. Reports from pasted source say that speed and response headers were not measured.
- **Login wall notice.** When a fetched page turns out to be a login form, the report says so and points to the behind-login route.
- **Cached result age keeps counting.** The "Cached result from N minutes ago" notice now updates while the report stays open.
- **"370+ technologies"** claim on the landing page and built-with pages, backed by a test that fails if the catalog drops below the advertised number.
- **Every report has its own link**, on every plan, and shared links preview the audited site and its score.
- **Report header rework.** Actions as buttons, score strip pinned on Overview, First impression in the Executive Summary.
- **Resend the email verification link.**
- **No em dashes** anywhere in visible text, emails, or AI output, enforced by tests.
- **New logo and a much shorter landing page**, with a real sample report.

### October 2026

- **Built-with landing pages** for 21 AI and no-code builders, plus compare page content.
- **SEO overhaul.** Per-page titles and descriptions, prerendered public routes, sitemap generated at build, hreflang, one canonical domain, real 404s.
- **Evidence-backed findings.** Reports show what matched for contact and privacy checks; link checks retry with GET and separate "unverified" from "broken".
- **International Readiness check** (lang, hreflang validity, og:locale).
- **Accessibility pass.** WCAG contrast in both themes, landmarks, minimum text size, axe regression tests.
- **Admin.** Anonymous analyses are logged and included in all charts.

### September 2026

- **Auth hardening.** Email verification, account deletion, admin pagination.
- **Fix guides** expanded to 38, linked inline from audit cards.
- **Cache notice.** Reports say when a result came from the cache.
- **What's New page** redesigned.

### August 2026

- **Report redesign.** All analysis cards share one visual system; fix guide links on issue cards.
- **Site pages.** Guides (with search), Compare, What's New, Status, History.
- **Landing and header** iterations, privacy and terms pages.

### April to May 2026

- **MVP (April 9).** Paste a URL, get a report: SEO, UX and conversion signals, tech stack, content, recommendations.
- **Tech and AI builder detection** expanded repeatedly.
- **Core Web Vitals and Lighthouse** through the PageSpeed API.
- **Accounts and history**, usage limits, API keys and webhooks.
- **Fix Plan** with priority engine, conversion blockers, expandable score explanations.
- **PDF report** redesign.
- **Admin dashboard** with user management, failure log, system health, feature flags.
- **AI summary** in plain English through Groq, and an analysis result cache.
- **Billing** moved from Stripe to Tap Payments, then the paid plan UI was hidden. Billing is dormant.

## Keeping this file useful

- Add a line when something ships, in plain words, under the current month.
- Update "Where things stand" whenever work is left unpushed or unverified.
- When an item from the roadmap ships, move it here and delete it there.
- Refresh the Search section about once a month from Google Search Console (Performance, Pages and Sitemaps reports). Add a row to "Month by month" instead of replacing old rows, so the trend stays visible.
