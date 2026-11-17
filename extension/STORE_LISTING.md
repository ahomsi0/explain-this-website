# Chrome Web Store listing

Text to paste into the Chrome Web Store developer dashboard when submitting the extension. Upload the zip made by `node extension/pack.mjs`.

## Store listing tab

**Name**

Explain This Website

**Summary** (132 characters at most)

Get a plain-English report on the page you are looking at, including pages behind a login.

**Description**

Explain This Website turns any web page into a plain-English report: what it is built with, how its SEO holds up, what a visitor sees first, and what to fix.

The website can only fetch pages that anyone can open. This extension covers the rest: dashboards, account pages, admin panels and staging sites behind a password.

How it works

1. Open the page you want explained, signed in the way you normally are.
2. Click the extension's icon, then "Explain this page".
3. The report opens in a new tab, saved to your Explain This Website account. Only you can open it.

A second button, "Analyze the public address", starts the normal analysis for pages anyone can open. That report adds speed scores and link checks.

What it sends

- The page's HTML and its address.
- The load timings your browser already recorded for the page.
- Nine response headers: the security headers and the name of the server software.

What it never does

- It does not read or send your password, cookies or session.
- It does not read any page until you click its button on that page.
- It does not track your browsing, and it does nothing until you click it.

You need a free Explain This Website account so the report has an owner. The page itself is not kept: it is analyzed and discarded, and only the report is saved.

**Category**

Developer Tools

**Language**

English

**Images**

- Store icon: `extension/icons/icon-128.png`
- At least one screenshot, 1280 by 800. Take one of the popup open over a page and one of a finished report.

## Privacy tab

**Single purpose**

Send the page the user is currently viewing to Explain This Website so it can be analyzed and explained in a report.

**Permission justifications**

- `activeTab`: reads the HTML of the current tab, and only after the user opens the extension on that tab and clicks "Explain this page". No access to other tabs or to any page the user has not clicked on.
- `scripting`: runs the one function that reads the current page's HTML, load timings and response headers when the user clicks "Explain this page".
- `storage`: holds the page for a few seconds, in session storage that is cleared when the browser closes, while the Explain This Website tab opens to receive it. Nothing is kept afterwards.
- Host permission for `https://www.explainthiswebsite.com/capture*` (content script): hands the page the user chose to the website's own capture page, in the tab the extension just opened.

**Remote code**

No, the extension does not use remote code.

**Data usage**

- Collected: Website content (the HTML of the page the user chooses to send, with its address).
- Not collected: personally identifiable information, health, financial, authentication information, personal communications, location, web history, user activity.
- Tick all three certifications: data is not sold, is not used for purposes unrelated to the single purpose, and is not used for creditworthiness or lending.

**Privacy policy URL**

https://www.explainthiswebsite.com/privacy

## Distribution tab

- Visibility: Public
- Regions: all

## Notes for the reviewer (Test instructions field)

The extension needs a free account on https://www.explainthiswebsite.com to show a report. To test: create an account on the site, open any web page, click the extension icon and then "Explain this page". A new tab opens on the site and shows the report. Without an account the new tab shows what was captured and asks to sign in, and nothing is sent to the server.
