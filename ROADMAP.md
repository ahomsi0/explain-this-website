# Roadmap

What is planned, in rough order. For what is already built, see [PROGRESS.md](PROGRESS.md).

Last updated: 2026-11-14

Nothing here is a promise or a date. Items move up when they are ready to be built and get deleted when they ship.

## Now

Nothing is being built right now.

## Next

All three were set aside for later by the owner on 2026-11-13. They do not depend on each other, so they can be picked up in any order.

### 1. Check the live site by hand

Owner task, about 10 minutes.

- Sign up with a new email, confirm it, sign out and sign back in.
- Open `/capture`, paste the source of one page that sits behind a login, and confirm the report opens.
- Check that the report says it is private and has no share button.

This is the one part of the November work that nobody has tried for real.

### 2. Get a few links to the site

Owner task, about 20 minutes. This moves search rankings more than any on-site change, because a new site with no links stays on page nine however good its pages are.

- Submit to Product Hunt.
- Submit to two or three tool directories.
- Post it once where developers or site owners gather.

The listing text and a short launch post can be drafted on request.

### 3. Strengthen the two pages Google already shows

Build task.

- **`/guides/lcp`** is about 340 words and ranks around position 50 for "largest contentful paint". It needs a full explanation, examples, and answers to the questions people search for.
- **`/compare`** gets a third of all impressions but ranks past position 90, with about 535 words. It needs content that matches searches like "compare two websites seo".

Best done before or alongside item 2, so the new links land on pages worth ranking.

## Paid plan

Analysis and decisions made on 2026-11-14. Nothing is built yet. The owner is based in Lebanon, which rules out most of the usual payment providers, so the provider choice came first.

**Status:** Paddle is chosen and the live account is created. The pricing page and refund policy that Paddle checks are built. The account is not verified yet, the site has not been submitted for review, and nothing can be bought.

### Decisions

Settled by the owner on 2026-11-14.

| | Decision |
|---|---|
| Provider | Paddle |
| Price | $7 a month or $59 a year, yearly shown first |
| Free trial | None. The free plan and the refund window cover it |
| Refunds | Full refund within 7 days of a payment |
| Visitors without an account | Stay at 5 analyses a day |
| Free accounts | Stay at 5 analyses a day |
| Pro | 50 analyses a day |
| Launch | Pro goes on sale with what exists today. Monitoring, logo PDF and bulk are added afterwards and shown as coming soon |
| API keys and webhooks on free accounts | Switched off the day Pro launches. No grace period |
| Seller name on the terms and refund policy | "Explainthiswebsite.com team" |

**One risk in these choices:** Paddle prefers a full legal name for an individual seller. If the site review asks for it, the name on the two pages has to change. It is a one-line edit.

### Where things are today

- **Plans in the code:** anonymous (5 analyses a day), free account (5 a day plus history), Pro (50 a day), owner (unlimited). Pro can only be granted by hand from the admin dashboard.
- **Billing code exists but is switched off.** `backend/internal/handler/billing.go` and the `/go-pro` page are written for Tap Payments, with checkout, cancel and a webhook.
- **Nothing is locked except the daily limit.** Deep scan, compare, API keys, webhooks, PDF export, history and behind-login analysis are all free.

### Which providers work from Lebanon

Checked against each provider's own country list on 2026-11-14.

| Provider | Works from Lebanon? | Why |
|---|---|---|
| **Paddle** | **Yes** | Lebanon is not on its unsupported list. Individuals can sign up without a company. Pays out by bank wire or Payoneer. |
| Stripe | No | Lebanon is not on Stripe's country list. |
| Tap Payments | No | Its support page says it accepts no new merchants from Lebanon, Egypt or Jordan (page dated April 2025). This is the provider the current code was written for. |
| Lemon Squeezy | No | No bank payouts to Lebanon, and it refuses payments from customers in Lebanon. |
| Polar | No | Pays out through Stripe, and Lebanon is not on the list. |
| Dodo Payments | No | Sign-up depends on the country that issued your ID, and Lebanon is not on the list. |
| US company with Stripe | Not practical | Needs a US bank account, and Mercury lists Lebanon residents as not eligible. Also adds US filings every year. |
| FastSpring | Unconfirmed | Lebanon is not on its payout-restricted list, but nothing confirms Lebanese sellers are accepted. Higher fees. A fallback to ask about only if Paddle says no. |
| 2Checkout (Verifone) | Unconfirmed | Its restricted-country list could not be loaded. Second fallback. |
| Areeba, NetCommerce, MontyPay, Whish | Wrong fit | Local gateways usually want a registered Lebanese company, charge setup fees, have weak support for automatic monthly charges, and do not handle foreign sales tax. Fine for a local shop, not for a subscription sold worldwide. |

### Recommendation: Paddle

Paddle is a merchant of record: it is the legal seller, so it collects the money, handles VAT and sales tax in every country, deals with card disputes, and sends one payout a month. For a one-person business in Lebanon this removes the two hardest problems, which are getting a card processor at all and filing tax abroad.

- **Fee:** 5% plus $0.50 per payment. No monthly or setup fee.
- **Payouts:** once a month, by the 15th, by SWIFT wire or Payoneer. Minimum $100, and a $15 SWIFT fee may apply. The bank at the receiving end may charge too.
- **Sign-up:** identity check for an individual, then a review of the website. The site must show a product description, a pricing page, terms, a privacy policy and a refund policy. Manual review takes about 5 to 7 business days.

**What could still go wrong**

- **Approval is not guaranteed.** Paddle reviews each seller and each site, and can say no. This is only known for certain after applying.
- **The payout has to land somewhere.** A SWIFT wire needs a "fresh dollar" account at a Lebanese bank, the kind opened for money arriving from abroad after 2019. Confirm with the bank that it accepts incoming business wires and what it charges, before applying. Reports on Payoneer in Lebanon are mixed, so do not count on it.
- **Wire fees eat small payouts.** Set the payout threshold well above $100 so the fixed fees are a small share.
- **Tax at home.** Paddle covers tax owed in customers' countries. Income tax in Lebanon is still the owner's, so ask an accountant once.

### Price

The fixed $0.50 makes cheap monthly plans a bad deal, which is why the old $2.99 price was dropped:

| Price | Paddle takes | Share |
|---|---|---|
| $2.99 a month (old page) | $0.65 | 22% |
| **$7 a month (chosen)** | $0.85 | 12% |
| **$59 a year (chosen)** | $3.45 | 6% |

Paddle also offers custom pricing for products under $10, which is worth asking for once there are sales.

### What is locked

The rule: **a single report stays free.** It is what Google indexes, what people share, and what brings visitors. Pro is for volume, automation and output that people use for work.

| | Visitor | Free account | Pro |
|---|---|---|---|
| Analyses a day | 5 | 5 | 50 |
| Full report, share link, fix guides | Yes | Yes | Yes |
| Compare two sites | No (needs an account, as today) | Yes | Yes |
| History | None | Last 30 days | Unlimited, with trends |
| Share links | Expire after 30 days | Expire after 30 days | Do not expire |
| Deep scan (several pages of a site) | 1 a day | 1 a day | Within the daily limit |
| Pages behind a login | No (needs an account, as today) | 1 a day | Within the daily limit |
| API keys and webhooks | No | No | Yes |

**Coming after launch, Pro only**

- **Monitoring:** re-check saved sites every week and email when a score drops or something breaks. This is the feature that gives people a reason to keep paying every month, so it is first in line after launch.
- **PDF with your own logo**, for freelancers and agencies.
- **Bulk:** analyze a list of addresses in one go.
- **Use it inside AI assistants** through an MCP server. See Later.

### Order of work

1. **Owner.** The Paddle account exists. Finish the identity check and payout details, and ask the bank about a fresh dollar account for incoming wires. Building does not wait for this, because the sandbox works straight away.
2. **Site pages Paddle needs.** Done on 2026-11-14: `/pricing`, `/refunds`, the seller name and Paddle wording in the terms. Next, the owner submits `www.explainthiswebsite.com` for review in the Paddle dashboard.
3. **One place that decides what each plan can do.** Today the plan only changes the daily limit. Every lock in the table should read from a single list on the server, so the app and the API can never disagree.
4. **Swap Tap for Paddle.** Replace `billing.go`: checkout through Paddle's overlay, a webhook for subscription created, updated and cancelled, and a link to Paddle's customer portal for cancelling and changing cards. The database already has the plan, status and period-end columns. Remove the Tap columns and settings afterwards.
5. **Turn on the locks** from the table above: deep scan and behind-login once a day on free, API keys and webhooks Pro only, 30 days of history on free, share links that last on Pro.
6. **Build monitoring**, then the logo PDF, then bulk.
7. **Privacy policy and terms** updated to name Paddle as the seller.

**When to start:** steps 1 and 2 are cheap and slow, so they are worth doing early. The rest pays off only once there are visitors, and right now the site gets a handful of clicks a month. Getting links and traffic (see Next) will earn more than a checkout page will.

### Still open

- Paddle verification: identity check and payout details, both in the Paddle dashboard under Business account. Owner task.
- Submitting the site to Paddle for review, now that the pricing page and refund policy exist. Owner task.
- The site's content security policy has to allow Paddle's checkout script before checkout can work. Part of step 4.
- Replying from the domain address. Mail to `support@` arrives in a personal inbox, so replies go out from that personal address until "send mail as" is set up.
- The bank: confirm a fresh dollar account accepts incoming business wires, and what it charges. Owner task.
- How many free accounts use API keys or webhooks today. Worth checking before launch, since they are switched off without notice.

### Sources

- Paddle: [unsupported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle), [payouts](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid), [pricing](https://www.paddle.com/pricing), [domain review](https://www.paddle.com/help/start/account-verification/what-is-domain-verification), [identity check](https://www.paddle.com/help/start/account-verification/what-is-identity-verification)
- [Stripe country list](https://stripe.com/global)
- [Tap Payments supported countries](https://support.tap.company/en/support/solutions/articles/153000140298-what-countries-are-supported-by-tap-payments-)
- [Lemon Squeezy supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
- [Polar supported countries](https://polar.sh/docs/merchant-of-record/supported-countries)
- [Dodo Payments accepted countries](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories)
- [Mercury prohibited countries](https://support.mercury.com/hc/en-us/articles/28771710754580-Prohibited-countries) (seen in search results only, the page itself would not load)
- [FastSpring payouts](https://developer.fastspring.com/docs/fastspring-payouts-portal)
- [BBAC fresh money account](https://www.bbacbank.com/banking/personal/account/fresh-money-account-lebanon), as one example of a fresh dollar account

## Later

### MCP server, so the analyzer works inside AI assistants

Added on 2026-11-14. Not designed in detail and not started. To be built after the paid plan, because it belongs to Pro.

MCP (Model Context Protocol) is the standard way to plug a service into an AI assistant. With it, someone types "analyze stripe.com and tell me what to fix first" in Claude, Cursor or ChatGPT, and the assistant calls this site and answers from the real report.

- **Actions it offers.** Analyze a website, compare two websites, get a saved report, list recent audits.
- **Shape.** One new address on the existing API server, for example `/mcp`. No new hosting. It reuses the analysis code, so every call counts against the same daily limit.
- **Who can use it.** People connect with an API key from their account. API keys are Pro only, so MCP access comes with Pro.
- **Why.** It is a clearer selling point for Pro than "API keys and webhooks". MCP servers are listed in public directories, which is the kind of link the site needs. Few audit tools have one.
- **Things to get right.**
  - Return a trimmed summary, not the whole report. A full report is too large for an assistant to take in.
  - Key-based setup works in Claude Code and Cursor. One-click connection inside Claude or ChatGPT needs a sign-in flow, which would be a second step later.
  - The standard changes often, so read the current documentation before building.
- **Size.** About a day of work once the plan rules exist.
- **After it.** Submit it to the MCP directories, add a page explaining how to connect it, and mention it on the pricing page.

### Chrome extension for pages behind a login

Designed, not started. Set aside for later by the owner on 2026-11-13. The design below is ready to build from when the time comes.

- **What it does.** One click on the toolbar icon sends the page the user is looking at to the existing confirm step on the site. A second button opens the normal public analysis for the current address.
- **Why.** Pasting page source works but loses speed timings and security headers, and JavaScript apps need a trip into developer tools. The extension reads the finished page, so all three come back.
- **Shape.** Manifest V3, in an `extension/` folder. Permissions are `activeTab`, `scripting`, and the site's own domain only. It never asks for access to all websites. No account logic inside it: sign-in, quota and the private report stay on the site.
- **Server work.** None. `POST /api/analyze-capture` already accepts `source: "browser"`, headers and timings.
- **Site work.** A receiver on `/capture` for the handover, the speed and security sections back in those reports, an "Add to Chrome" link on `/behind-login` once a store address exists.
- **Owner tasks.** Create a Chrome Web Store developer account (one-time $5), upload the zip, pass review. Try it once by hand on a logged-in page before submitting.
- **After it.** Edge takes the Chrome build as is. Firefox needs small manifest changes. Safari is skipped.

### Smaller items

- **En dashes in number ranges** across site copy.
- **Tidy tech categories.** Font services such as Bunny Fonts and Google Fonts are listed under Framework.
- **Cookies set during a redirect are not seen.** Framework detection reads the cookies on the final response only. Reading the ones set on the way there would catch a few more sites.

## Parked

- Nothing parked right now. The paid plan has its own section above.

## Decided against

- **Bookmark button for pages behind a login.** Built and shipped on 2026-11-13, then removed. The owner did not like it, and sites with a strict content security policy can block bookmark buttons. Pasting the page source covers it for now, and the extension is the planned replacement.
- **Asking users for their login details** so the server can sign in for them. Never. The server does not fetch pages behind a login at all.
