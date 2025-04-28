// ==UserScript==
// @name        XPath Span Text Collector (polling)
// @match       *://*/*
// @grant       none
// @run-at      document-idle
// ==/UserScript==

(function() {

  // === Prevent multiple injections ===
  if (window.top !== window.self) {
    console.log("Skipping iframe:", window.location.href);
    return;
  }
  if (window.hasRunMySpanCollectorScript) return;
  window.hasRunMySpanCollectorScript = true;
  
  const DIV_XPATH = "/html/body/div[1]/div/main/section/div[2]/div/div/div[2]";
  /** Poll for an XPath match until timeout */
  function waitForXPath(xpath, timeout = 10000, interval = 200) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      (function check() {
        const res = document.evaluate(
          xpath, document, null,
          XPathResult.FIRST_ORDERED_NODE_TYPE, null
        );
        if (res.singleNodeValue) {
          resolve(res.singleNodeValue);
        } else if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for XPath: ${xpath}`));
        } else {
          setTimeout(check, interval);
        }
      })();
    });
  }

  /** Simple sleep utility */
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Kick things off
  main();

  async function main() {
    try {
      console.log("Waiting for target div…");
      const container = await waitForXPath(DIV_XPATH);
      console.log("Found div:", container);

      // Grab all descendant <span> elements
      const spans = container.querySelectorAll(':scope > span');
      console.log("Number of spans:", spans.length);

      // Build and log the combined text
      const pieces = Array.from(spans, s => s.textContent.trim());
      const combined = pieces.join('');
      console.log("Combined spans text:", combined);

    } catch (err) {
      console.error("XPath Span Text Collector error:", err);
    }
  }
})();
