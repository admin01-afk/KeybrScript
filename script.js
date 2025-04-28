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
  const WORD_PAUSE_MS = 0;
  const SPEECH_RATE   = 0.7;
  const SPEECH_PITCH  = 0.7;
  // Audio effects
  const AUDIO_VOLUME = 0.025;
  const audioUrls = [
    "https://cdn.pixabay.com/download/audio/2024/08/13/audio_b31955cb8c.mp3?filename=kick-greg-232043.mp3",
    "https://cdn.pixabay.com/download/audio/2025/03/07/audio_bf3a10b647.mp3?filename=wiese-kick-blau-310489.mp3",
    "https://cdn.pixabay.com/download/audio/2024/11/13/audio_3edb83bb51.mp3?filename=kick-drum-263837.mp3",
    "https://cdn.pixabay.com/download/audio/2025/04/17/audio_b3573a7dd8.mp3?filename=kick-328873.mp3",
    "https://cdn.pixabay.com/download/audio/2024/09/16/audio_29f423f32b.mp3?filename=tr808-kick-drum-241401.mp3",
    "https://cdn.pixabay.com/download/audio/2024/09/16/audio_2d8da4b6cc.mp3?filename=tr909-snare-drum-241413.mp3",
    "https://cdn.pixabay.com/download/audio/2024/09/16/audio_ad9c4af8f5.mp3?filename=tr707-snare-drum-241412.mp3",
    "https://cdn.pixabay.com/download/audio/2024/09/16/audio_57c811e0c0.mp3?filename=tr808-snare-drum-241403.mp3",
    "https://cdn.pixabay.com/download/audio/2024/09/16/audio_fc5bc92d9b.mp3?filename=tr707-kick-drum-241400.mp3",
    "https://cdn.pixabay.com/download/audio/2025/04/17/audio_f2ab2014dd.mp3?filename=snare-328872.mp3",
    "https://cdn.pixabay.com/download/audio/2022/03/26/audio_6d664dc42b.mp3?filename=bass-drum-107154.mp3",
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_bebf451003.mp3?filename=big-round-soft-kick-drum-87898.mp3",
    "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c1753eca44.mp3?filename=snarenormal3-86814.mp3",
    "https://cdn.pixabay.com/download/audio/2024/09/21/audio_070c505e7b.mp3?filename=snare-3-243039.mp3",
    "https://cdn.pixabay.com/download/audio/2024/09/16/audio_206d44d0e7.mp3?filename=tr909-kick-drum-241402.mp3"
  ];


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

        const randomUrl = audioUrls[Math.floor(Math.random() * audioUrls.length)];
        const audio = new Audio(randomUrl);
        audio.volume = AUDIO_VOLUME;
        audio.play().catch(e => console.error("Audio play failed:", e));
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