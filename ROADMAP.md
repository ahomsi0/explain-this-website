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

Analysis done on 2026-11-14. Nothing is built yet. The owner is based in Lebanon, which rules out most of the usual payment providers, so the provider choice comes first.

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

The fixed $0.50 makes cheap monthly plans a bad deal:

| Price | Paddle takes | Share |
|---|---|---|
| $2.99 a month | $0.65 | 22% |
| $5 a month | $0.75 | 15% |
| $9 a month | $0.95 | 11% |
| $69 a year | $3.95 | 6% |

The old pricing page showed $2.99 a month and $24.99 a year. Suggested instead: **around $8 to $9 a month, or around $69 a year, with the yearly plan shown first.** Paddle also offers custom pricing for products under $10, which is worth asking for.

### What to lock

The rule: **a single report stays free.** It is what Google indexes, what people share, and what brings visitors, and the site has almost no traffic yet. Charge for volume, automation and output that people use for work.

| | Free | Pro |
|---|---|---|
| Analyses a day | 5 | 50 |
| Full report, share link, fix guides | Yes | Yes |
| Compare two sites | Yes | Yes |
| History | Last 30 days | Unlimited, with trends |
| Share links | Expire after 30 days | Do not expire |
| Deep scan (several pages of a site) | 1 a day | Within the daily limit |
| Pages behind a login | 1 a day | Within the daily limit |
| API keys and webhooks | No | Yes |
| **Monitoring** (new): re-check saved sites every week and email when a score drops or something breaks | No | Yes |
| **PDF with your own logo** (new), for freelancers and agencies | Standard PDF | Yes |
| **Bulk** (new): analyze a list of addresses in one go | No | Yes |

**Monitoring is the feature that matters.** A report is something people need once. A weekly check with an email when something breaks is a reason to keep paying every month. Without it, most people would subscribe for one month and cancel.

Things already free (API keys, webhooks, unlimited history) would move behind Pro. Accounts that use them today keep them.

### Order of work

1. **Owner, before any code.** Ask the bank about a fresh dollar account for incoming wires. Then create the Paddle account and start the identity check. The sandbox works straight away, so building does not wait for approval.
2. **Site pages Paddle needs.** A public pricing page and a refund policy, and the owner's legal name in the terms.
3. **One place that decides what each plan can do.** Today the plan only changes the daily limit. Every lock in the table should read from a single list on the server, so the app and the API can never disagree.
4. **Swap Tap for Paddle.** Replace `billing.go`: checkout through Paddle's overlay, a webhook for subscription created, updated and cancelled, and a link to Paddle's customer portal for cancelling and changing cards. The database already has the plan, status and period-end columns. Remove the Tap columns and settings afterwards.
5. **Turn on the locks** for things that exist: limits, deep scan, behind-login, API keys and webhooks, history length, share link expiry.
6. **Build monitoring**, then the logo PDF, then bulk.
7. **Privacy policy and terms** updated to name Paddle as the seller.

**When to start:** steps 1 and 2 are cheap and slow, so they are worth doing early. The rest pays off only once there are visitors, and right now the site gets a handful of clicks a month. Getting links and traffic (see Next) will earn more than a checkout page will.

### Open questions for the owner

- Is there already an approved Tap account from when the billing code was written? Tap stopped taking new Lebanese merchants, but an existing account may still work, which would make Tap a second option.
- Monthly and yearly, or yearly only?
- Should accounts that already use API keys and webhooks keep them for free?

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
