# Roadmap

What is planned, in rough order. For what is already built, see [PROGRESS.md](PROGRESS.md).

Last updated: 2026-11-13

Nothing here is a promise or a date. Items move up when they are ready to be built and get deleted when they ship.

## Now

### Chrome extension for pages behind a login

Designed, not started. Waiting on a go-ahead.

- **What it does.** One click on the toolbar icon sends the page the user is looking at to the existing confirm step on the site. A second button opens the normal public analysis for the current address.
- **Why.** Pasting page source works but loses speed timings and security headers, and JavaScript apps need a trip into developer tools. The extension reads the finished page, so all three come back.
- **Shape.** Manifest V3, in an `extension/` folder. Permissions are `activeTab`, `scripting`, and the site's own domain only. It never asks for access to all websites. No account logic inside it: sign-in, quota and the private report stay on the site.
- **Server work.** None. `POST /api/analyze-capture` already accepts `source: "browser"`, headers and timings.
- **Site work.** A receiver on `/capture` for the handover, the speed and security sections back in those reports, an "Add to Chrome" link on `/behind-login` once a store address exists.
- **Owner tasks.** Create a Chrome Web Store developer account (one-time $5), upload the zip, pass review. Try it once by hand on a logged-in page before submitting.

### Push the bookmark removal

Done locally. Goes out with the next push.

## Next

- **Detect server frameworks from cookies and headers.** Django is found today only when the page contains its form token or debug markers. Laravel and Flask are not detected at all. Reading cookie names (`csrftoken`, `laravel_session`, `_rails_session`, `PHPSESSID` and similar) would catch most of them. Raise the "370+" number if the catalog grows enough.
- **Privacy policy line** about pages sent from the user's browser: what is stored, who can open the report, that the page itself is never fetched by the server.
- **Check the live site by hand.** A real sign-up, sign-in, and one behind-login analysis with a real account.

## Later

- **Edge and Firefox builds of the extension.** Edge takes the Chrome build as is. Firefox needs small manifest changes. Safari is skipped.
- **En dashes in number ranges** across site copy.

## Parked

- **Paid plan.** Tap Payments billing is in the code but dormant, and the paid plan UI is hidden. No plan to turn it on yet.

## Decided against

- **Bookmark button for pages behind a login.** Built and shipped on 2026-11-13, then removed. The owner did not like it, and sites with a strict content security policy can block bookmark buttons. The extension replaces it.
- **Asking users for their login details** so the server can sign in for them. Never. The server does not fetch pages behind a login at all.
