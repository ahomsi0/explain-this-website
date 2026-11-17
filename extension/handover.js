// Runs on the site's /capture page only. When that page says it is ready, this
// script collects the page the user just asked about from the background
// worker and passes it on. Both messages stay inside this one tab.
//
// It is injected before the site's own scripts start, so it is always
// listening by the time the page asks.

(() => {
  const REQUEST = "etw-capture-request";
  const CAPTURE = "etw-capture";

  // One trip to the background worker per page load. The worker gives the
  // page out once, so a second request is answered from here.
  let taken = null;
  const take = () => {
    taken ??= new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "take-capture" }, (response) => {
        void chrome.runtime.lastError;
        resolve(response?.capture ?? null);
      });
    });
    return taken;
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (event.data?.type !== REQUEST) return;
    take().then((capture) => {
      window.postMessage({ type: CAPTURE, capture }, window.location.origin);
    });
  });
})();
