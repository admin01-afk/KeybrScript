// ==UserScript==
// @name        Keybr: Span Typist with Voice Prompts (Auto-Loop)
// @match       *://*.keybr.com/*
// @grant       none
// @run-at      document-idle
// ==/UserScript==

(function() {
  if (window.top !== window.self) return;
  if (window.hasRunSpanTypist) return;
  window.hasRunSpanTypist = true;

  // ─── Configuration ─────────────────────────────────────────────────
  const DIV_XPATH = "/html/body/div[1]/div/main/section/div[2]/div/div/div[2]";
  const WORD_PAUSE_MS = 300;
  const SPEECH_RATE   = 0.9;
  const SPEECH_PITCH  = 1.1;

  async function waitForXPath(xpath, timeout=15000, interval=200) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      (function check() {
        const node = document.evaluate(
          xpath, document, null,
          XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;
        if (node) return resolve(node);
        if (Date.now() - start > timeout) 
          return reject(new Error(`Timeout waiting for XPath: ${xpath}`));
        setTimeout(check, interval);
      })();
    });
  }

  async function waitForNonEmptySpans(spans, timeout=15000, interval=200) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      (function check() {
        if ([...spans].some(s => s.textContent.trim().length > 0)) 
          return resolve();
        if (Date.now() - start > timeout)
          return reject(new Error("Timeout waiting for non-empty spans"));
        setTimeout(check, interval);
      })();
    });
  }

  function speak(word) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang  = 'en-US';
    u.rate  = SPEECH_RATE;
    u.pitch = SPEECH_PITCH;
    speechSynthesis.speak(u);
  }

  // ─── Main loop ─────────────────────────────────────────────────────
  async function runOnce() {
    console.log("Waiting for container div…");
    const container = await waitForXPath(DIV_XPATH);
    console.log("Found container:", container);

    // Grab spans
    let allDesc = container.querySelectorAll('span');
    await waitForNonEmptySpans(allDesc);

    let layer = container.querySelectorAll(':scope > span');
    if ([...layer].every(s=>!s.textContent.trim())) {
      layer = container.querySelectorAll('span span');
    }

    // Collect text
    const raw = [...layer]
      .map(s => s.textContent.trim())
      .join('')
      .replaceAll('', ' ');
    console.log("Collected text:", raw);

    const words = raw.split(/\s+/).filter(w=>w.length>0);
    const spacedWords = words.map(w => w + ' ');

    console.log("Words to type:", words);

    // Typing state
    let wordIdx = 0, charIdx = 0;
    speak(words[wordIdx]);

    // Key listener (remove on restart)
    function onKey(e) {
      const currWord = spacedWords[wordIdx];
      const expected = currWord[charIdx]?.toLowerCase();
      const pressed  = e.key.length===1 ? e.key.toLowerCase() : e.key;

      console.log(`Pressed '${pressed}', Expected '${expected}'`);
      if (pressed === expected) {
        console.log("✔️ correct");
        charIdx++;
      } else {
        console.log("❌ wrong");
      }

      if (charIdx >= currWord.length) {
        wordIdx++;
        if (wordIdx >= spacedWords.length) {
          console.log("🎉 All words typed! Restarting...");
          document.removeEventListener('keydown', onKey);
          setTimeout(runOnce, 500); // wait a bit to avoid racing with re-render
          return;
        }
        charIdx = 0;
        setTimeout(() => speak(words[wordIdx]), WORD_PAUSE_MS);
      }
    }

    document.addEventListener('keydown', onKey);
  }

  // ─── Start ─────────────────────────────────────────────────────────
  runOnce();
})();
