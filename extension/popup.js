// The popup: shows which page is about to be sent and offers the two ways to
// analyze it. Opening it is what gives the extension access to the current
// tab, and only to that tab.

import { SITE } from "./config.js";
import { describeTab, publicAnalysisUrl } from "./lib.js";

const el = (id) => document.getElementById(id);

const BLOCKED = {
  "own-site": {
    title: "You are on Explain This Website",
    text: "Open the page you want explained, then click this icon there.",
  },
  unsupported: {
    title: "This page cannot be explained",
    text: "Chrome does not let extensions read its own pages, the Web Store or local files. Open a web page and try again.",
  },
};

async function start() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const page = describeTab(tab, SITE);

  if (page.kind !== "ready") {
    el("blocked-title").textContent = BLOCKED[page.kind].title;
    el("blocked-text").textContent = BLOCKED[page.kind].text;
    el("blocked").hidden = false;
    return;
  }

  el("page-title").textContent = page.title || page.address;
  el("page-address").textContent = page.address;
  el("ready").hidden = false;

  const explain = el("explain");
  const publicButton = el("public");
  const error = el("error");

  explain.addEventListener("click", async () => {
    explain.disabled = true;
    publicButton.disabled = true;
    explain.textContent = "Reading the page…";
    error.hidden = true;

    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: "explain-page", tabId: tab.id });
    } catch {
      response = { error: "Something went wrong. Please try again." };
    }
    if (response?.ok) {
      window.close();
      return;
    }
    error.textContent = response?.error ?? "Something went wrong. Please try again.";
    error.hidden = false;
    explain.textContent = "Explain this page";
    explain.disabled = false;
    publicButton.disabled = false;
  });

  publicButton.addEventListener("click", async () => {
    await chrome.tabs.create({ url: publicAnalysisUrl(SITE, page.url), index: tab.index + 1 });
    window.close();
  });
}

start();
