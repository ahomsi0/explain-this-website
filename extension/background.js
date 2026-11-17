// The background worker. It does the two things the popup cannot finish,
// because the popup closes the moment a new tab opens:
//
//   1. Read the page the user asked about and open the site's /capture page.
//   2. Hand that page to /capture when its content script asks for it.
//
// Nothing here talks to the API. Sign-in, the daily limit and the report all
// stay on the site.

import { SITE } from "./config.js";
import { handoverUrl } from "./lib.js";
import { readPage } from "./read-page.js";

const PENDING_KEY = "pendingCapture";

// Used only if the page does not fit in session storage. The worker stays
// alive for the few seconds the handover takes.
let inMemory = null;
// The save in progress, so a tab that asks early waits for it to land.
let saving = Promise.resolve();

function savePending(pending) {
  saving = (async () => {
    try {
      await chrome.storage.session.set({ [PENDING_KEY]: pending });
      inMemory = null;
    } catch {
      inMemory = pending;
    }
  })();
  return saving;
}

async function takePending(tabId) {
  await saving;
  let pending = inMemory;
  if (!pending) {
    const stored = await chrome.storage.session.get(PENDING_KEY);
    pending = stored[PENDING_KEY] ?? null;
  }
  // Only the tab this worker opened for the handover may collect the page.
  if (!pending || pending.tabId !== tabId) return null;
  inMemory = null;
  await chrome.storage.session.remove(PENDING_KEY);
  return pending.capture;
}

async function explainPage(tabId) {
  let injected;
  try {
    injected = await chrome.scripting.executeScript({ target: { tabId }, func: readPage });
  } catch {
    return { error: "Chrome does not let extensions read this page." };
  }
  const result = injected?.[0]?.result;
  if (!result || result.error || !result.capture) {
    return { error: result?.error ?? "The page could not be read. Reload it and try again." };
  }

  const source = await chrome.tabs.get(tabId);
  const target = await chrome.tabs.create({
    url: handoverUrl(SITE),
    index: source.index + 1,
    openerTabId: tabId,
  });
  await savePending({ tabId: target.id, capture: result.capture });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only this extension's own pages (the popup) may start a capture.
  const fromOwnPage = sender.origin === self.location.origin;
  if (message?.type === "explain-page" && fromOwnPage && Number.isInteger(message.tabId)) {
    explainPage(message.tabId).then(sendResponse, () =>
      sendResponse({ error: "Something went wrong. Please try again." }),
    );
    return true;
  }
  if (message?.type === "take-capture" && sender.tab) {
    takePending(sender.tab.id).then(
      (capture) => sendResponse({ capture }),
      () => sendResponse({ capture: null }),
    );
    return true;
  }
  return false;
});
