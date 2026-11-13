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
