# Contributing to Auralis

Owner / builder notes. This file is the **one place** owner setup lives — the README is for users only and must never carry setup hints, placeholders, or deploy steps.

## Change the Buy Me a Coffee username

Edit one line in `config.js`:

```js
BUY_ME_A_COFFEE_USERNAME: "carlmeiselman",
```

All header, footer and coffee-section buttons read from that one value. Never hard-code the username in `index.html` or `app.js` (the HTML hrefs are initial values only; `wireCoffee()` in `app.js` overwrites them from `config.js` on load).

## Deploy (GitHub Pages)

Pages is already enabled on this repo, deploying from the `main` branch root (`Settings → Pages → Source: Deploy from a branch → main / / (root)`).

- Push to `main` and the live site at https://moretoexplore1234.github.io/auralis-reader/ updates within a few minutes.
- There is deliberately **no** `.github/workflows/pages.yml` in the repo: the `gh` token used for pushes lacks the `workflow` scope, so a workflow file would be rejected on push. Branch deploy is the working route — do not re-add the workflow file unless the token scope changes.
- A local copy of the workflow (unused) is kept at `/tmp/auralis-pages.yml.bak` for reference only.

## Fork / customise

1. Fork the repo, or clone it and push to your own remote.
2. Edit `config.js` (coffee username, default voice preferences, sample toggle, reader-proxy list).
3. Push to your repo's `main` branch and enable Pages the same way (branch deploy, root).
4. Update the demo / Releases links in `README.md` and `index.html` to your own URLs.

No build step, no secrets, no environment variables. API keys are never committed — they live only in each visitor's browser `localStorage`.

## Releases (GitHub is the app store)

Every public version lives under **Releases** on GitHub. To cut a release (parent does this with `gh`, not from this file):

```bash
cd ~/workspace/auralis-reader
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0 — Read anything aloud" --notes-file /tmp/auralis-v1-release-notes.md
```

### v1.5.0 release notes (local build — not yet pushed/released)

**Auralis v1.5.0 — Trim silence: the pauses between words stay short**

Why: Carl (Nov 25, ~2:59 PM) said the KittenTTS voice "works much better now"
but "it pauses a lot between words". The voice speaks with natural phrase
pauses (0.5–1.5s measured) and each chunk carries leading/trailing silence.

- **Trim silence (default ON):** a "Trim silence" checkbox in the player
  strips leading/trailing silence from every synthesized chunk and caps any
  pause between words at 200ms. Silence = |sample| < 0.01 (measured:
  silent stretches RMS ~0.002, speech peaks 0.89–0.91); a silence run only
  counts after 30ms, so quiet consonants are never clipped. Applied inside
  `synthOnceKitten`, so live playback, previews, prefetch and warm-up all
  get trimmed audio — and the Download-audio file is trimmed too (with a
  150ms gap between sentences in the join, so sentences don't run
  together). Toggle is persisted per browser (`auralis.trimSilence.v1`);
  flipping it drops the synthesis cache so the next sentence is made under
  the new setting right away. Turn it off any time to hear the pauses as
  the voice made them.
- **Measured on real Kitten audio before shipping:** preview-bella
  11.81s → 8.70s (26% removed), sample-bella 21.40s → 17.01s (21%),
  preview-jasper 7.61s → 6.31s (17%); longest gap 1.5s → exactly 200ms;
  leading/trailing silence 0.000s after trim. Faster-whisper transcript
  of the trimmed audio is word-perfect (33/33 words) — no word lost or
  clipped. Full numbers in QA-v16.md.
- **Kept from v1.4.9:** KittenTTS Nano 0.8, cached synthesis, one audio
  path, warm-up, honest slow state, real Download ZIP link (now
  `v1.5.0.zip`).
- **Service worker:** cache bumped to `auralis-v1.5.0`. Footer shows
  `v1.5.0`.

```bash
cd ~/workspace/auralis-reader
git tag v1.5.0
git push origin v1.5.0
gh release create v1.5.0 --title "v1.5.0 — Trim silence: the pauses between words stay short" --notes-file /tmp/auralis-v1.5.0-release-notes.md
```

### v1.4.9 release notes (shipped Nov 24, 2026 — commit c06816a, Release live)

**Auralis v1.4.9 — KittenTTS Nano replaces Kokoro as the free on-device engine**

Why: Carl (Nov 24, ~1:37 PM) said the in-Muse Auralis sample still sounds weird/wrong and asked for a DIFFERENT Hugging Face model that is proven to work — download it, test it, transcribe the audio to make sure it plays well, and do it for the website itself. The winner, proven locally before this swap: KittenML/kitten-tts-nano-0.8 (StyleTTS2, 15M params, 24kHz, Apache-2.0) via kitten-tts-js@0.1.2 — a local generate + faster-whisper transcript of the Bella sample came back word-perfect (the preview "aloud" heard as "allowed" is a Whisper homophone confusion, not a TTS error). Same weights as onnx-community/KittenTTS-Nano-v0.8-ONNX (identical 56,767,095-byte model file + 3,278,902-byte voices.npz).

- **Model swap, same behaviour:** KittenTTS Nano 0.8 replaces Kokoro-82M as the default free on-device engine. The v1.4.8 audio plumbing is untouched — cached synthesis (retry replays ready audio, never re-synthesizes), one audio path with the AudioContext unlocked in the tap gesture, warm-up synthesis at load, honest slow-phone state, no false "start right away" promise. Only the engine underneath changed.
- **Smaller download:** ~60MB once (model + voices.npz) instead of ~90MB, then cached and works offline. kitten-tts-js has no progress_callback, so the download is indeterminate — the load box says what is happening and the Play/Preview watchdogs show elapsed seconds; there is no %.
- **8 English voices, English-only:** Bella ★ Recommended (default), Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo — all US English. KittenTTS Nano is an English-only model, so every non-English language now shows the honest empty state in non-Edge browsers (in real Edge, the Microsoft voices still cover every language; studio voices via a free key still work everywhere). A saved Kokoro voice ID from v1.4.8 or earlier resets to Kitten Bella on load, with the existing reset note.
- **WASM only, no WebGPU probe:** kitten-tts-js 0.1.2 is WASM-only via onnxruntime-web and does not use transformers.js, so the WebGPU probe, the alt-CDN-graph machinery and the poisoned-wasmInitPromise workaround are all deleted. A failed load can simply be retried on the same graph.
- **wasmPaths fix (verify in the real browser):** kitten-tts-js sets `ort.env.wasm.wasmPaths` to its own module directory when unset — wrong for a CDN import, because the .wasm files live in onnxruntime-web's dist/. The app now imports the EXACT onnxruntime-web URL the kitten-tts-js 0.1.2 +esm bundle imports (`https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/+esm`, verified from the bundle Nov 24, 2026) first and pre-sets `wasmPaths` to its dist/ directory (`https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/`) before importing kitten-tts-js, so the setting lands on the same module instance. Instance-sharing is inferred from the bundle's import URL, not proven in a live browser — if the first real load fails with a .wasm 404, the pre-set did not land. The espeak phonemizer loads at first generate() and fetches its data at runtime — a failure there surfaces as the real error, never a fake promise.
- **Kept from v1.4.8:** cached synthesis, one audio path, warm-up, honest slow state, real Download ZIP link (now `v1.4.9.zip`).
- **Service worker:** cache bumped to `auralis-v1.4.9`. Footer shows `v1.4.9`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.9
git push origin v1.4.9
gh release create v1.4.9 --title "v1.4.9 — KittenTTS Nano replaces Kokoro as the free on-device engine" --notes-file /tmp/auralis-v1.4.9-release-notes.md
```

### v1.4.8 release notes (local build — not yet pushed/released)

**Auralis v1.4.8 — one tap, every voice, same behaviour**

Why: Carl tested v1.4.7 on his Pixel (Nov 16, 6:12 PM) and the voice still didn't work — gibberish/foreign sounds, and Play on a different voice didn't load at all. A device-browser test on his actual Pixel 8 Pro in-app browser (Nov 16, 6:13–6:17 PM) REPRODUCED the failure and found the real root cause — not a stale version (footer v1.4.7), not a wrong language (English, Kokoro Heart, player lines correct). The model download completes, but first-sentence/preview synthesis on that phone takes MINUTES, and by the time the audio is ready the tap's user gesture has expired, so the browser blocks `audio.play()`. The retry then re-synthesized from scratch, so its gesture expired too — the loop repeated forever, for Heart Play, Heart Preview, and a switched voice (Kokoro Adam: the switch visibly works, Language stays English, same blocked failure). No audio at all was captured in the session (0% progress throughout); the "gibberish" Carl hears is most likely a tiny clipped fragment before the block. Carl's added direction (Nov 16, 6:19 PM): make it so browsers won't block ANY of the voices and it works CONSISTENTLY — every voice, every tap, same behaviour.

- **Retry never re-synthesizes:** synthesized audio is cached (voice + speed + text, 16 entries; Edge audio cached the same way). A retry after a blocked play replays the ready audio instantly — zero new synthesis calls. In-flight promises are cached too, so a prefetch and a Play tap for the same sentence share one synthesis. A failed synthesis is NOT cached, so a later tap really retries.
- **One audio path for all voices:** every `play()` in the app goes through `playAudioElement()`. It unlocks/resumes a shared AudioContext and routes the element through it, so playback is governed by the running context instead of a gesture from minutes earlier. `unlockAudio()` is called inside every tap gesture (Play/Pause, Preview, Listen/sample/URL/paste taps) — never relying on a gesture from minutes earlier. Where the browser has no AudioContext, the element plays directly. Routing only happens through a RUNNING context (routing through a suspended one would resolve `play()` yet stay silent).
- **Warm the engine at load:** once the model loads, the default-voice preview line is synthesized in the background (heating the ONNX session and caching the preview), and an open article's first sentence is prefetch-warmed. The first real tap no longer pays the cold-start cost. Synthesis is serialized through one queue so the background warm-up can never race a Play tap.
- **No more false promises:** the old "tap Play again and it will start right away (the voice is downloaded now)" is gone — it was false while the retry re-synthesized. The blocked-play message now says the voice took a while to get ready and the next tap starts at once from the ready audio. Same honest wording on Preview and premium blocks.
- **Honest slow state:** past 30s, the loading labels say "this phone is slow at it, still working…" with the elapsed seconds, on both the Play and Preview watchdogs, and on the tap-during-wait status.
- **Kept from v1.4.7:** English defaults, one-tap autoplay, warm-up banner, deduped statuses, spaced sample text, new preview sentence, Stop above the sticky player, real Download ZIP link (now `v1.4.8.zip`).
- **Service worker:** cache bumped to `auralis-v1.4.8`. Footer shows `v1.4.8`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.8
git push origin v1.4.8
gh release create v1.4.8 --title "v1.4.8 — one tap, every voice, same behaviour" --notes-file /tmp/auralis-v1.4.8-release-notes.md
```

### v1.4.6 release notes (local build — not yet pushed/released)

**Auralis v1.4.6 — faster first sound, a Download button that downloads, English always**

Why: Carl tested v1.4.5 on his Pixel (Nov 16) and reported three things. (1) "I click to load. It didn't load at all." A cloud-Chrome diagnostic (Nov 16, 1:35–1:41 PM) found the preview sits silent for ~25 seconds before the first sound (model generation on-device) — longer on a phone — and a tap that sits silent that long reads as dead. The same check also found the Play button treats a second tap during the model load as a pause, so an impatient double-tap left the download running invisibly with the button back on "▶ Play" and nothing ever playing. (2) "It says download Auralis but it didn't actually give me a place to download it to or from." Verified in code: the big "⬇ Download Auralis" button was only an anchor to `#get-the-app` (it scrolled, it downloaded nothing), and "Install as an app" depends on `beforeinstallprompt`, which never fires in in-app WebViews — so the button silently did nothing. (3) Playback "reading in some foreign language... random sounds." The diagnostic did NOT reproduce this with defaults (Kokoro Heart, English, clean English audio), but it confirmed the mechanism: switching the Language menu to Spanish swaps the voice to Spanish Kokoro Dora — so a persisted non-English Language choice on Carl's phone would make English text come out as foreign-accented gibberish.

- **Speed — warm-up on page load:** the Kokoro model (~90MB) now starts downloading/loading ~1.2s after the page loads, not on first Play, with a visible "Getting the voice ready… %" indicator (load box + Play button mirror). On a metered/slow connection it waits for the first tap instead of spending data unasked. A warm-up failure stays quiet (no error banner for someone who only came to read); the honest error shows when Play/Preview is tapped, and that tap really retries (a failed load used to be sticky for the session, so "tap Play to retry" was a lie). Model files are cached by transformers.js (Cache Storage) and voice files by kokoro-js (its own "kokoro-voices" bucket), so the second visit reuses them.
- **Speed — English voice files primed upfront:** the 8 English voice files (~510KB each, `huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/<id>.bin` — URL pattern verified against kokoro-js sources) are fetched in the background on load to prime the browser cache. English only, best-effort, silent on failure.
- **Speed — first sentence pre-synthesized:** as soon as an article loads, its first sentence is synthesized in the background, so tapping Play starts audio immediately from a ready buffer.
- **Tap feedback, the whole wait:** Play is not a pause toggle while the first sounds are being prepared (a tap just says how far along it is; Stop cancels). The load watchdog now covers the download AND the first synthesis, ticking with elapsed seconds ("⏳ Making the first sounds… · 12s"). Preview buttons mirror the download % and tick with elapsed time too — no more silent 25s.
- **Download Auralis actually downloads:** the big button now points at this version's GitHub ZIP (`archive/refs/tags/v1.4.6.zip`, set from `APP_VERSION` at runtime) — and triggers the install prompt when the browser offers one. The "Download the files (ZIP)" link is relabelled plainly ("Download Auralis files (ZIP) — the app's code, for your computer") and points at the same versioned ZIP.
- **Install button is honest:** when no install prompt is available it says so, shows the manual steps, and offers a "Copy the Auralis link" button; in an in-app WebView it says that browser can't install or save files and to open the page in Chrome. Already-installed state is detected and shown.
- **Everything defaults to English, in the site itself:** Language = English, voice = Kokoro Heart (`af_heart`), preview in English. Any stale saved non-English language/voice from an earlier visit is reset to English on load, with a plain note in the voice menu ("Reset to English — tap another language if you want it"). A deliberate pick inside a visit still sticks. On the first run of a new version, a toast says which voice and language the app is actually using.
- **Safety nets (kept):** every voice card shows its language plainly; the player shows "Reading with Kokoro Heart · English" while playing; a voice/text language mismatch (e.g. Japanese voice + English article) is refused with a plain reason instead of playing garbled sounds; voice IDs (not labels) identify voices, since labels repeat across languages ("Kokoro Alpha" is both Hindi and Japanese).
- **Service worker:** cache bumped to `auralis-v1.4.6`. Footer shows `v1.4.6`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.6
git push origin v1.4.6
gh release create v1.4.6 --title "v1.4.6 — faster first sound, a Download button that downloads, English always" --notes-file /tmp/auralis-v1.4.6-release-notes.md
```

### v1.4.7 release notes (local build — not yet pushed/released)

**Auralis v1.4.7 — a tap to listen actually listens**

Why: v1.4.6 shipped (commit f437d79, Release live) and its real-browser check (Nov 16, 2:09–2:15 PM) found it improved but NOT fixed for Carl's core complaint. (1) Tapping "Listen to sample" showed "Getting the voice ready… 15%" immediately, but NO speech for 60 seconds — it ended at "Ready — press play to listen." and needed a SECOND tap on Play in the reader. Only then did speech start in 1–3s. That is Carl's "it didn't load at all". (2) No warm-up indicator was visible on page load — the background download line existed in the Voices section, below the fold. (3) Duplicate status messages for the third check in a row ("Ready…" ×2, preview ×2, reset note ×2). (4) The "Reset to English" note was truncated mid-sentence. (5) "The Quiet Work of City Trees" sample rendered with words mashed together. (6) Preview mispronounces the brand "Auralis" as "Orales". (7) The reader Stop button was covered by the sticky bottom player in some scroll positions.

- **A Listen tap listens (the core fix):** sample cards ("Listen to sample") and "Try a sample" now auto-play — `openArticle` takes an `autoplay` option, and when the voice is ready playback starts by itself. No "Ready — press play to listen." parking, no second tap. Link opens, paste-text and deep links are unchanged (they still say "Ready — press play to listen." once). If the browser refuses the delayed `audio.play()` because the tap's gesture expired during a long model download, the player parks in a plain "▶ Tap to listen — voice is ready" state with no failure box, and the next tap starts at once (the voice is downloaded now).
- **Warm-up is visible at the top of the page:** a new `#warmupBanner` in the hero mirrors the same label + % as the Voices load box from the moment the page loads ("Getting the voice ready… 15%", "The voice downloads once (~90MB) — about a minute on a slow connection, then it works offline."). It hides when the voice is ready.
- **Status messages, once:** the toast is the only live region — the old code also mirrored every message into a separate `#srStatus` element, so text extraction saw each status twice. `#srStatus` is removed. The "Reset to English" note now lives only in the voice menu (`#voiceResetNote`); it is no longer also toasted. Long toasts wrap instead of truncating (`.toast` gets `white-space: normal`, centred, `overflow-wrap: break-word`).
- **Sample text has spaces:** word spans in the reader now put the space between words as its own text node instead of a trailing space inside the word span — a trailing space inside an inline element is dropped by text/accessibility extraction, which is why the sample read as one mashed word.
- **Preview no longer says the brand name:** the English preview sentence is now "Hello — I'm your reader. I can read any article aloud for you, in a voice that sounds almost human." Kokoro pronounced "Auralis" as "Orales"; rewording avoids the name entirely (other languages' previews are unchanged).
- **Stop is always tappable:** the main player (`.player`) now has z-index 30, above the sticky bottom player (25), so the bottom player can no longer paint over the Stop button.
- **Kept from v1.4.6:** English defaults, warm Play instant, Download button = versioned tag ZIP, double-tap-during-load guard, mismatch guard.
- **Service worker:** cache bumped to `auralis-v1.4.7`. Footer shows `v1.4.7`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.7
git push origin v1.4.7
gh release create v1.4.7 --title "v1.4.7 — a tap to listen actually listens" --notes-file /tmp/auralis-v1.4.7-release-notes.md
```

### v1.4.5 release notes (local build — not yet pushed/released)

**Auralis v1.4.5 — caption pastes work from the link bar, block pages are never read aloud, another proxy leg**

Why: v1.4.4 shipped (commit f05a7f0, Release live) and its real-browser check FAILED the core promise in three ways. (1) The link-bar input was `type="url"`, so the browser's own validation rejected a caption+link paste with "Please enter a URL." before the JS extractor ever ran — despite the page promising captions work. v1.4.4's jsdom QA missed it because a synthetic submit event bypasses native validation. (2) Paste Text fetched Carl's Del Mar link through Jina, which returned a Cloudflare 403 block page — and the app loaded it as a 128-word "article" and READ IT ALOUD. Two compounding causes: the length override ("40+ words means it's real") suppressed the block classification, and the fetch chain only advanced on fetch failure / non-OK status while Jina returns HTTP 200 with the block page, so AllOrigins was never tried. No "Open the original link" button existed because the blocked state was never reached. (3) Preview still showed no immediate loading state in the checker's views (though the preview line eventually played).

- **Link bar accepts anything:** the input is now `type="text"` and the form has `novalidate`, so every paste reaches the extractor. QA now clicks the real Listen button and asserts `checkValidity()` differentials (old `type="url"` input rejects Carl's paste; new one accepts it).
- **Block pages are detected, never read:** strong block-page patterns (`isBlockPageText` — verbatim Jina/Cloudflare wording: "returned error 403", "this page maybe requiring CAPTCHA", "Why have I been blocked?", "Attention Required! | Cloudflare") override the length check, and a proxy leg returning block-page text now counts as a failed leg, so the chain advances. The final error carries `blockPage`, so the catch path says "This page blocked the reader" instead of "Couldn't reach that page". Both fallback buttons ("Read what you pasted instead", "Open the original link") render in that state — verified in the DOM by QA. The weak "blocked" hints keep the 40-word override, and a real article that merely mentions "captcha" still loads — no reCAPTCHA false positive.
- **Another proxy leg:** Codetabs joins Jina and AllOrigins (direct → Jina → AllOrigins → Codetabs). Verified by curl: for jettrealestate.com specifically, direct has no CORS headers, Jina returns the Cloudflare 403 markdown, and AllOrigins AND Codetabs both return HTTP 522 — the host blocks all public reader proxies, so the honest blocked state is the correct outcome there, and Auralis never bypasses a block. For other CORS-blocked-but-public pages the extra legs now actually get tried.
- **Preview loading state (verified, not a regression):** the label IS set synchronously on tap before any await, and nothing re-renders the voice cards mid-load (`renderVoiceCards` only runs on voice selection / Edge-down UI) — the checker's view was most likely captured after the preview had already finished and the label restored. QA now asserts the label on the same tick and that the same button node still shows Loading 500ms later.
- **Service worker:** cache bumped to `auralis-v1.4.5`. Footer shows `v1.4.5`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.5
git push origin v1.4.5
gh release create v1.4.5 --title "v1.4.5 — caption pastes work, block pages never read aloud" --notes-file /tmp/auralis-v1.4.5-release-notes.md
```

### v1.4.3 release notes (local build — not yet pushed/released)

**Auralis v1.4.3 — the WASM fallback actually runs now (root cause found in the library)**

Why: v1.4.2 shipped (commit eeef79f, Release live) and its new Details line finally revealed the exact error in cloud Chrome: "no available backend found. ERR: [webgpu] Error: Failed to get GPU adapter." — the SAME error for Play and Download. The key fact: the error was STILL a WebGPU error, which proved the WASM fallback was NEVER REACHED in a real browser. Reading the transformers.js 3.5.1 source found why: `createInferenceSession` caches a failed first session creation in a module-level `wasmInitPromise` that is never reset (`if (wasmInitPromise) await wasmInitPromise;` … `wasmInitPromise ??= sessionPromise`). A same-module WASM retry therefore awaits the rejected promise and re-throws the original WebGPU error without ever creating a WASM session. The jsdom harness never caught this because its mock loader bypasses the real transformers module. This release fixes it at the root:

- **Pre-flight GPU probe:** before the first model load, the app asks `navigator.gpu.requestAdapter()` (bounded by a 4s timeout). No adapter → the first load goes straight to WASM, so a doomed WebGPU session is never created and the library state is never poisoned. An adapter → WebGPU first, as before. The probe outcome is recorded on `window.__AURALIS_GPU_PROBE` for QA.
- **Fresh-module retry:** if a WebGPU load still fails with a backend error, the ONE retry runs on WASM loaded from a fresh module graph — kokoro-js via esm.sh (`https://esm.sh/kokoro-js@1.2.1`, verified CORS `*`, exports KokoroTTS) instead of jsDelivr — so the retry's transformers instance has fresh, unpoisoned state and the WASM session is actually created. The winning graph is remembered for later loads in the page. If the retry also fails, the Details line now shows the WASM error, not the WebGPU one.
- **Play button loading state (investigated, not a regression):** the v1.4.2 check said the button "never changed from ▶ Play". The label IS set synchronously on tap in `playFree` (verified in code and in QA) — the checker's failure was sub-second (model cached from the earlier diagnostic run, session creation failing immediately), so the loading state was visible only briefly before the error reset the button. QA now asserts the label synchronously after a tap with a slow loader.
- **Service worker:** cache bumped to `auralis-v1.4.3`. Footer shows `v1.4.3`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.3
git push origin v1.4.3
gh release create v1.4.3 --title "v1.4.3 — the WASM fallback actually runs" --notes-file /tmp/auralis-v1.4.3-release-notes.md
```

### v1.4.2 release notes (local build — not yet pushed/released)

**Auralis v1.4.2 — the real error, a WASM fallback that cannot silently fail, real download %, no phantom progress**

Why: v1.4.1 shipped (commit 44fbd7f, Release live) and its re-check on cloud Chrome PASSED the paste fix, the copy fix and the stuck bars — but Play and Download audio STILL failed: the Kokoro model would not load, no percentage ever showed, and the bar jumped to 3% on a failed Play. A diagnostic pass proved it is NOT the network (jsDelivr, Hugging Face config + the 86–92MB model file all return HTTP 200) — the failure is at ONNX session creation, after the download — but the exact error was unverifiable because the app swallowed it (no console logging, generic message only). This release fixes the diagnosis gap first, then hardens the paths it exposed:

- **The real error is now visible (the most important fix):** every Kokoro failure path (load, Play, preview, download render) now `console.error`s the full error, and the persistent `#playbackError` box shows the plain message PLUS a small "Details:" line with the actual error message (trimmed to 200 chars, no stack, HTML-escaped). Toasts stay plain-language only, so the v1.4.1 "no raw GPU text in toasts" guarantee still holds. The next real-browser check can quote the exact onnxruntime error instead of guessing.
- **WASM fallback hardened — with an honest correction:** the v1.4.1 theory (multi-thread WASM needs SharedArrayBuffer, which GitHub Pages cannot provide) was checked against the actual onnxruntime-web 1.22.0-dev source and is WRONG — ort already defaults to 1 thread and falls back to single-threading with a warning when the page is not cross-origin isolated. So SAB was not the cause. What this release does instead: (a) explicitly sets `env.backends.onnx.wasm.numThreads = 1` on the shared transformers.js module instance before any WASM load (best-effort, never blocking, recorded on `window.__AURALIS_WASM_ENV`); (b) surfaces the real error (above) so the true WASM failure cause can finally be seen. Verified from library source while fixing: transformers.js 3.5.1 sets `wasmPaths` to its own dist, which DOES contain `ort-wasm-simd-threaded.jsep.wasm`/`.mjs` (HTTP 200); dtype `q8` maps to `model_quantized.onnx`, which exists in the repo (92MB) — so the model file, the WASM binaries and the network are all fine.
- **Real download progress:** the progress callback handled transformers.js v2 statuses (`downloading`/`loading`) that v3 never emits — v3.5.1 emits `initiate`/`download`/`progress`/`done`/`ready`, so no percentage ever showed during a real 30s download. The handler now maps the real v3 statuses, the load-box label carries the percentage ("Downloading the voice model once (~90MB) — 42%"), and the Play button mirrors it ("⏳ Loading voices… 42%") because that is where the visitor is looking.
- **No phantom progress:** the progress bar counted a sentence as "read" the moment it was queued — a failed first Play jumped to 3% with nothing played. Progress now counts only sentences whose audio actually started (`state.progressSentence`, set when `audio.play()` resolves), for both the free and premium engines. Finish/seek/reset update it consistently.
- **Service worker:** cache bumped to `auralis-v1.4.2`. Footer shows `v1.4.2`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.2
git push origin v1.4.2
gh release create v1.4.2 --title "v1.4.2 — the real error, hardened WASM fallback, real progress" --notes-file /tmp/auralis-v1.4.2-release-notes.md
```

### v1.4.1 release notes (local build — not yet pushed/released)

**Auralis v1.4.1 — fixes the four failures the v1.4.0 real-browser check found**

Why: v1.4.0 shipped (commit 27640b7, Release live) but its real-browser check on cloud Chrome FAILED it, so it was never called ready: (1) pasting a short note wiped it entirely ("Nothing readable left"); (2) first Play failed after ~30s with no model-download progress and no audio; (3) Download audio failed with a raw WebGPU error and no file; (4) stale "Using the free Microsoft AI voices" copy in Chrome plus progress bars stuck on screen. This release fixes all four, at the root cause:

- **Pasted text can never be wiped:** Content Radar metadata penalties (dateline/byline/timestamp/boilerplate) now only bite short fragments — a long paragraph with several real sentences is an article that happens to open with a dateline, not a dateline. And if the radar + chrome strip would still cut everything, the reader falls back to the original paragraphs cleaned of timestamps/URLs only. The browser-checker's exact pasted text now reads as "the meeting starts at 3 PM and the park opens at dawn. The city council voted to plant two hundred new trees…" with every timestamp, URL, byline and "Related articles" line gone.
- **Timestamp stripping fixed for single-block pastes:** the Published/Updated regex ran once and ate the ". " boundary the next label needed, so "Updated 2:14 PM." survived; it now repeats until stable. Inline-chrome tails ("read more", "click here"…) stop at a dash, so "Read more at www.x.example — the meeting starts at 3 PM…" keeps the sentence after the dash. Byline sentences ("By Jane Doe.") and "Related articles: see below." are dropped at sentence level; stray punctuation fragments left by cuts are dropped too.
- **Kokoro WASM fallback actually engages:** headless Chrome advertises `navigator.gpu` but its `requestAdapter()` returns nothing, so the WebGPU load failed and the old code never retried — the retry flag was set but the loader never consulted it. Now a WebGPU load failure retries once on WASM (and stays on WASM afterwards), with a plain-language loading label ("The fast voice engine isn't available here — trying the standard engine…"). Raw WebGPU/onnx errors are never shown to the visitor — anywhere (load, preview, download toasts) they read as "The on-device voice model couldn't load in this browser."
- **Live load progress, where the visitor looks:** the Play button reads "⏳ Loading voices…" while the model loads (it used to show "Pause" + a frozen 7% for 30s), and the model-download box shows the live label and percentage ("Downloading the voice model once (~90MB) — model.onnx… 42%").
- **Stuck bars fixed at the root cause:** CSS `display: flex` on `.radar-sweep`, `.kokoro-load` and `.download-progress` overrode the `hidden` attribute, so all three boxes were permanently visible. Each now has a `[hidden] { display: none; }` rule, like the rest of the app.
- **Stale copy fixed:** the provider form, ElevenLabs/Cartesia free notes and the provider-removed toast name the engine that actually plays in this browser (Kokoro on your device outside Edge, Microsoft AI voices in Edge). README's "Best voices" line corrected the same way (it wrongly said Microsoft voices "work in any modern browser").
- **Service worker:** cache bumped to `auralis-v1.4.1`. Footer shows `v1.4.1`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.1
git push origin v1.4.1
gh release create v1.4.1 --title "v1.4.1 — pasted text survives, WASM fallback works, live load progress" --notes-file /tmp/auralis-v1.4.1-release-notes.md
```

### v1.4.0 release notes (local build — not yet pushed/released)

**Auralis v1.4.0 — Kokoro voices on your device, no timestamps, download the article as audio**

Why: v1.3.1 did NOT fix the voice problem in practice. Carl (Nov 13, 2026, on his Pixel/Android Chrome and in the Muse in-app browser) reported the Microsoft voices show a "blocked by the browser" error, the voice that DOES play is even MORE robotic, and the reader reads timestamps aloud. Root cause, verified Nov 13: Microsoft rejects the Edge Read Aloud WebSocket handshake with 403 unless the User-Agent contains "Edg/", and a web page cannot set the User-Agent header on a WebSocket — so Edge voices can never work from a normal page in Chrome. The robotic voice was the Google Translate TTS fallback (one flat voice per language). This release fixes the root causes:

- **Kokoro in-browser is the free engine everywhere except real Edge:** kokoro-js + `onnx-community/Kokoro-82M-v1.0-ONNX` (Apache-2.0) runs 100% on the visitor's device via Transformers.js/onnxruntime-web (WebGPU with WASM fallback), 54 voices across 9 languages, no key, no account, no credits, no limits. Loaded lazily on first Play/Preview tap (never on page load), ~90MB model download once from Hugging Face, then cached and works offline. Honest loading state with progress; if the model fails to load, the app says so and points at the free ElevenLabs/Cartesia key path — never a robotic voice.
- **Edge transport only in real Edge:** the handshake probe runs only when `navigator.userAgent` contains "Edg/". In every other browser the Edge handshake is never attempted — no probe, no banner error — Kokoro is the free engine from the start. In real Edge, Microsoft voices stay the default; if the handshake fails there, the free engine switches to Kokoro and the banner says so.
- **Google Translate TTS REMOVED ENTIRELY:** `googleFreeUrl`/`googleAudioChain`/`googleSentenceAudio` and every call deleted. No robotic fallback is left anywhere: no Google TTS, no `speechSynthesis`, no device voices. If no human-sounding engine can play, the app shows an honest empty state and plays nothing. (Google Cloud TTS as a BYO-key PREMIUM provider stays — a different, key-based Neural2/WaveNet product, clearly labelled premium.)
- **Voice menu:** Kokoro voices are the free default in non-Edge browsers — English 8 max (Heart ★ Recommended, Sarah, Bella, Adam, Michael, Onyx, Emma, George), each with a plain description + "Best for:" line; other languages get their own small curated Kokoro sets (es/fr/hi/it/ja/pt/zh; no Kokoro voices exist for German, Hebrew or Arabic). In Edge, the Microsoft cards stay. Premium (ElevenLabs/Cartesia/OpenAI/Azure/Google Cloud, BYO key) stays as the studio tier, with a short in-app guide for getting a free ElevenLabs (10k/mo) or Cartesia (20k/mo) key — one tap to their site, paste once, localStorage only.
- **Timestamps never spoken:** standalone timestamp/date lines and inline metadata — "10:45 AM", "3:27 PM", "12:34", "Nov 13, 2026", "Friday, November 13, 2026", "Published/Updated/Posted … [date/time]", "2 hours ago", "5 min read" — are stripped in `cleanSpokenText` before sentence-splitting, and byline/date lines are dropped in extraction. Times that are the substance of a sentence ("the meeting starts at 3 PM") are kept. Cut timestamps count in the clutter tally.
- **Core content only, 11Reader-style:** extraction drops byline/date/timestamp lines, image captions ("Photo: …", "Caption: …"), "Related articles" sections, author bios, comment sections, "Read next" blocks, newsletter boxes, and any paragraph that is mostly metadata. Only the article body is read.
- **⬇ Download audio:** a button in the Reader (next to Play) renders the whole loaded article — same cleaned, core-only text, in the selected voice — into ONE audio file named after the article title (e.g. `why-mornings-feel-longer.mp3`). WAV with the free on-device voices (sentences synthesized and joined as samples), MP3 with Edge/premium voices (MP3 frames concatenated). Honest progress ("Rendering audio… sentence 4 of 22") with a Cancel button. Only human-sounding engines, never a robotic one.
- **Hugging Face, local, no credits:** the Voices section labels the free Kokoro voices "Runs on your device — free forever, no credits, no account (model from Hugging Face, downloaded once)".
- **Service worker:** cache bumped to `auralis-v1.4.0`. Footer shows `v1.4.0`.

```bash
cd ~/workspace/auralis-reader
git tag v1.4.0
git push origin v1.4.0
gh release create v1.4.0 --title "v1.4.0 — Kokoro voices on your device, no timestamps, download audio" --notes-file /tmp/auralis-v1.4-release-notes.md
```

### v1.3.0 release notes (local build — not yet pushed/released)

**Auralis v1.3.0 — no silent fallback, no links read aloud, voices you can actually choose**

Why: v1.2.0 did NOT fix the voice problem in practice. A real-browser repro on the live site (cloud Chrome, Nov 13, 2026) confirmed the labels switched fine but playback was identical for every voice — Play jumped 0→100% instantly with a "Finished" toast and no audio — because the Edge WebSocket failed and the app silently fell back to the single Google voice, and audio errors advanced sentences to fake a finish. Links were still read aloud (only t.co was stripped). This release fixes the root causes:

- **No silent fallback, ever:** when Microsoft Edge fails, the app says so LOUDLY (persistent banner + toast: "Microsoft voices aren't answering in this browser — you're hearing the single free Google voice…") and DISABLES the Microsoft voice cards (greyed, "Unavailable in this browser"). An on-load handshake probe detects this before the visitor picks. A "Retry Microsoft voices" button re-probes.
- **Google removed as a choice:** no Google voice card, no Google dropdown option. Google TTS remains ONLY as an unlisted last-resort playback engine, and only while the banner is showing. Every selectable voice is a human-sounding Microsoft AI voice.
- **Playback errors never fake "Finished":** a failed sentence stops playback with a loud "Playback failed — [reason]. Tap Play to retry." and a persistent line under the progress bar, staying on that sentence. Stop resets progress to 0%; Play after finishing restarts from the top.
- **Preview fixed:** the voice card is no longer itself a clickable button (a nested clickable card could swallow Preview taps) — only the two buttons act, with their own z-index; the floating Follow button is sticky inside the reader card so it can never cover the voice cards. Preview uses the same loud Edge-failure handling as playback — no silent Google preview.
- **Voice cards visible by default:** the Voices section is no longer hidden behind "More". Reader dropdown stays in sync.
- **Every card has a "Best for:" line** in its description (not just a tag) — e.g. Aria "Best for: articles and news", Jenny "Best for: stories and audiobooks", Guy "Best for: long articles and narration" — ElevenLabs-style, so a real user can decide. All 43 voices across 11 languages carry one.
- **URLs never spoken:** all raw URLs, `www.…` links, bare domains and email addresses are stripped from the spoken text (markdown links keep their text), plus mid-sentence UI-chrome clauses ("…and click next to continue") and link-pointer sentences ("Read the full story"). Applied to URLs, pasted text, uploads and X posts. Cut URLs count in the clutter tally. What you see is what is spoken.
- **Service worker:** cache bumped to `auralis-v1.3.0`, app shell (index.html/app.js/config.js/styles.css) is NETWORK-FIRST so returning users always get the new code. Footer shows a visible version stamp (`v1.3.0`).

```bash
cd ~/workspace/auralis-reader
git tag v1.3.0
git push origin v1.3.0
gh release create v1.3.0 --title "v1.3.0 — no silent fallback, no links read aloud" --notes-file /tmp/auralis-v1.3-release-notes.md
```

### v1.2.0 release notes (local build — not yet pushed/released)

**Auralis v1.2.0 — ElevenLabs-style voice menu, no robotic voices, radar strips UI chrome**

- **Robotic voices removed completely:** device/browser `speechSynthesis` voices are no longer listed or used anywhere — no picker group, no fallback, no toggle. Only curated human-sounding AI voices appear: Microsoft Edge Read Aloud (free, no key) and the free Google voice, plus BYO-key premium voices. If both free transports fail, the app says so honestly (“try Microsoft Edge, or add a free ElevenLabs/Cartesia key”) instead of falling back to a robotic voice.
- **ElevenLabs-style voice menu, language-first:** pick a language, then a voice card — never a 300-voice dropdown, never languages mixed. English shows 9 cards max (Aria ★ Recommended by default, Jenny, Guy, Emma, Christopher, Sonia, Ryan UK, Natasha, Google), each with a plain-language description, accent tag (US/UK/AU…), gender, use-case tag (Articles/Stories/News) and a Preview button. Spanish, French, German, Italian, Portuguese, Hebrew, Arabic, Hindi, Japanese and Chinese each show only their own curated Microsoft Natural voices (all names verified against Microsoft's live voice list, Nov 10, 2026). The three tiers are small labels above the cards. The Reader's voice select shows the same curated list for the current language.
- **Radar strips UI-chrome words:** “click next”, “click here”, “read more”, “continue reading”, “next/previous page”, “subscribe”, “sign up”, “log in”, “share this”, “follow us”, “advertisement”, “sponsored”, “related articles”, “you may also like”, “back to top”, “skip to content”, “accept cookies”, pagination (“1 of 5”) and more are cut from the spoken text — whole blocks and chrome sentences inside real paragraphs — counted in the “removed M clutter blocks” tally and visible under “Show removed”. Only core paragraphs + title/author/date are ever spoken.
- **Fix:** the old English list wrongly included `en-US-RyanNeural`, which isn't on Microsoft's Read Aloud list — removed; UK Ryan (`en-GB-RyanNeural`) is the Ryan on the menu.

```bash
cd ~/workspace/auralis-reader
git tag v1.2.0
git push origin v1.2.0
gh release create v1.2.0 --title "v1.2.0 — ElevenLabs-style voice menu, no robotic voices" --notes-file /tmp/auralis-v1.2-release-notes.md
```

### v1.1.0 release notes (local build — not yet pushed/released)

**Auralis v1.1.0 — Free AI voices, Content Radar, Clone Studio**

- **Free built-in AI voices, no key:** Microsoft AI voices (Edge Read Aloud) are now the default — Aria, Jenny, Guy and more Microsoft Natural voices, unlimited, no account. The free Google voice is the automatic fallback if Microsoft doesn't answer. (v1.2.0 removes device/browser voices entirely — they sounded robotic.)
- **Content Radar:** every page/text/X thread is swept and only the core paragraphs are read aloud — nav, ads, related links, newsletters, comments and clutter are cut, with “Radar found N core paragraphs · removed M clutter blocks” and a “Show removed” toggle to restore any paragraph with one tap. Optional Hugging Face double-check (your free token, off by default, localStorage only).
- **Cartesia Sonic** joins the premium providers (BYO key, free tier 20,000 credits/mo ≈ 27 min), alongside ElevenLabs, OpenAI, Azure and Google.
- **Clone Studio:** clone a voice you own or have permission to use through ElevenLabs Instant Voice Clone or Cartesia, from a 30-second to 1-minute clean sample, with your own key. Honest note included: local cloning is unlimited but very slow (15–25× realtime), so the Microsoft voices are the fast unlimited option.
- **Voice tiers, plainly labelled:** Unlimited & free (Microsoft AI) · Free monthly credits (ElevenLabs 10k/mo, Cartesia 20k/mo) · Your key, pay your provider (OpenAI, Azure, Google). Default is Microsoft Aria (warm, friendly).
- **Honest “Watching” line:** Block's Dessa is noted as not publicly available yet — it is NOT listed as a usable voice.
- **Defect fixes:** Play button label no longer clipped (“▶ Play”, min-width 118px); anchored sections land below the sticky header (`scroll-margin-top`); toasts sit above the bottom player bar and article text has bottom padding so the last line is never covered; the voice picker times out after 4 seconds with an honest state instead of endless “Loading voices…”.

Endpoint verification (Nov 10, 2026, sandbox): Edge voices list HTTP 200, 170,998 bytes, 322 voices (incl. Aria/Jenny/Guy Neural). Edge WebSocket synthesis returned HTTP 403 in every variant tried from the sandbox (egress proxy cannot pass the handshake) — so Edge is best-effort in the browser and the verified Google Translate TTS fallback (HTTP 200, 40,512 bytes, real MP3) is what guarantees audio. Sesame CSM-1B has no verified free browser-usable hosted endpoint, so it was left out. See `QA-v3.md` (local only) for the full QA run.

```bash
cd ~/workspace/auralis-reader
git tag v1.1.0
git push origin v1.1.0
gh release create v1.1.0 --title "v1.1.0 — Free AI voices, Content Radar, Clone Studio" --notes-file /tmp/auralis-v1.1-release-notes.md
```

### v1.0.0 release notes

**Auralis v1.0.0 — Read anything aloud**

Paste any public article or X post link and hear it read aloud in a realistic voice — free forever, no account, no paywall.

- Read any public web page or article, with word-by-word highlighting and progress
- Read long X / Twitter posts and whole threads aloud, start to finish
- Free built-in browser voices, plus optional premium voices (ElevenLabs, OpenAI, Azure, Google) with your own key — including ElevenLabs voice cloning from a 1-minute sample
- Personal AI Apps hub — plug in any OpenAI-compatible endpoint for Summarize, Explain, Ask, Translate
- Library with your place saved, on your device only
- Install as an app (PWA) or download the files — GitHub is the app store
- Reader Mode (Light / Sepia / Dark, adjustable text), human-sounding voices only, sleep timer, 15-second skip, speed presets, deep links (`?url=`) and clipboard paste
- Funded by Buy Me a Coffee — no paywall, ever

## QA notes

QA working files (`QA*.md`) are local-only and git-ignored — never commit them. The last QA run's notes live in `QA-v3.md` (local only).
