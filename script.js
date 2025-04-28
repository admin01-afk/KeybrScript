// ==UserScript==
// @name        Keybr: Span Text + Typing Listener (fixed)
// @match       *://*.keybr.com/*
// @grant       none
// @run-at      document-idle
// ==/UserScript==

(function() {
  if (window.top !== window.self) return;
  if (window.hasRunSpanTypist) return;
  window.hasRunSpanTypist = true;

  const DIV_XPATH = "/html/body/div[1]/div/main/section/div[2]/div/div/div[2]";
  let targetText = "", currentIndex = 0;

  function waitForXPath(xpath, timeout=10000, interval=200) {
    const start = Date.now();
    return new Promise((res, rej) => (function check() {
      const node = document.evaluate(xpath, document, null,
                     XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                     .singleNodeValue;
      if (node) return res(node);
      if (Date.now()-start>timeout) return rej("XPath timeout");
      setTimeout(check, interval);
    })());
  }

  function waitForNonEmptySpans(spans, timeout=10000, interval=200) {
    const start = Date.now();
    return new Promise((res, rej) => (function check() {
      if ([...spans].some(s => s.textContent.trim().length>0)) return res();
      if (Date.now()-start>timeout) return rej("Spans timeout");
      setTimeout(check, interval);
    })());
  }

  async function main() {
    try {
      const container = await waitForXPath(DIV_XPATH);
      console.log("Found container", container);

      // ► Wait on *all* descendant spans:
      let all = container.querySelectorAll('span');
      await waitForNonEmptySpans(all);
      
      // ► Choose your layer:
      let layer = container.querySelectorAll(':scope > span');
      if ([...layer].every(s=>!s.textContent.trim())) {
        // direct are empty → use nested spans instead
        layer = container.querySelectorAll('span span');
      }

      // ► Combine text:
      targetText = [...layer].map(s => s.textContent.trim()).join('').replaceAll('', ' ');
      console.log("Collected text:", targetText);

      // ► Start typing listener
      document.addEventListener('keydown', onKeyDown);
      console.log("Typing listener started");

    } catch (e) {
      console.error("SpanTypist error:", e);
    }
  }

  function onKeyDown(e) {
    if (currentIndex >= targetText.length) {
      console.log("✅ Done!");
      return document.removeEventListener('keydown', onKeyDown);
    }
    const expected = targetText[currentIndex].toLowerCase();
    const pressed  = e.key.length===1 ? e.key.toLowerCase() : e.key;
    console.log(`Pressed '${pressed}', expect '${expected}'`);
    if (pressed===expected) {
      console.log("✔️ correct");
      currentIndex++;
    } else {
      console.log("❌ wrong");
    }
  }

  main();
})();
