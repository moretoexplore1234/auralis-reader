# Auralis — QA Notes

Tested 2026-11-05 (local build, before any deploy). No money spent, no paid APIs called.

## How it was tested

- `node --check app.js` and `node --check config.js` — both pass.
- HTML structure parsed with Python's `html.parser` — no unclosed tags, no stray
  end tags, no duplicate IDs (69 IDs).
- Cross-check: every ID referenced in `app.js` exists in `index.html` — **none missing**.
- `pages.yml` parses as valid YAML; CSS braces balanced (201/201); stylesheet
  includes `:focus-visible` states and `prefers-reduced-motion` support.
- **Runtime smoke test** with jsdom 26 (in `/tmp/auralis-qa/test.js`, not shipped):
  the page was loaded, local scripts injected, and 23 interaction checks run —
  **23/23 PASS, zero JS errors on load or during the tests.**

## What passed in the runtime test

| Check | Result |
|---|---|
| Page loads, title correct, no console errors | ✅ |
| 3 sample cards render | ✅ (3) |
| Buy Me a Coffee buttons point at the `yourname` placeholder, not a real account | ✅ |
| Voice picker populates / degrades gracefully when speech is unavailable | ✅ (jsdom has no `speechSynthesis`; app shows a clear message instead of crashing) |
| Library empty state; Run-AI disabled with no article open | ✅ |
| Clicking a sample opens the Reader with word spans (213 words on sample 1) | ✅ |
| Progress text, Run-AI enables once an article is open | ✅ |
| Play with no TTS toasts gracefully ("Speech isn't supported… try Chrome, Edge or Safari") | ✅ |
| Save to Library → 1 entry, persisted in `localStorage` | ✅ |
| Paste-text modal → opens Reader with the pasted title | ✅ |
| Add AI app (form) → card appears, app select populated | ✅ |
| AI "Test connection" with network stubbed down → graceful "Test failed" toast, no crash | ✅ |
| "Run on this article" offline → honest error panel ("That didn't work…"), no crash | ✅ |
| Bad/unreachable URL → honest "Couldn't reach that page" status with Paste-text offer | ✅ |
| ElevenLabs provider form renders on provider-card click | ✅ |
| Export apps (JSON) does not throw; skip-sentence does not throw | ✅ |

## Fixes made during QA

1. **Unguarded `scrollIntoView`** — three call sites could throw (and abort the rest
   of the function) in environments without it. All three now go through a
   `safeScrollIntoView()` helper wrapped in try/catch. This turned 3 test failures
   into passes; in a real browser `scrollIntoView` exists, so this is defence in depth.
2. **Export fallback** — `URL.createObjectURL` is now wrapped in try/catch with a
   `FileReader` data-URL fallback for restricted browsers.

## Known limits (by design, not bugs)

- **CORS / fetch:** many news sites block cross-origin reads. Auralis tries direct
  fetch → Jina Reader (`r.jina.ai`) → AllOrigins, then reports honestly. Some sites
  will still fail; Paste Text is the fallback. This was verified in the failure-path
  test, not against a live paywalled site.
- **Paywalls & bot protection:** never bypassed. Blocked/paywalled pages get an honest
  message and a Paste-text offer. Paywall detection is heuristic (keyword matching
  on the fetched text) — a soft paywall that serves full text will read fine; a hard
  one will be refused honestly.
- **Voices:** quality and availability vary by browser/OS. Natural/neural voices are
  sorted first when present. No TTS at all in jsdom/headless test env — the app
  degrades with a message; real-browser voice quality was **not** listened to in
  this pass (needs a human ear in Chrome/Edge/Safari).
- **Word highlighting:** uses `SpeechSynthesisUtterance.onboundary` where the
  browser fires it, with a WPM-timer fallback otherwise. Sync is close, not
  frame-perfect; premium-voice highlighting is timer-estimated only.
- **Premium voices (ElevenLabs / OpenAI / Azure / Google):** code paths written and
  the ElevenLabs form verified, but **no live paid API call was made** (would cost
  money) — the test-voice flow needs one live check with a real key after deploy.
- **Local AI servers (Ollama / LM Studio):** need CORS enabled and the page served
  over `http(s)`, not `file://`. Not live-tested here (no local server in the sandbox).
- **Live fetch not tested end-to-end:** the sandbox proxy blocks the outbound fetch
  used by jsdom's resource loader; the URL-failure path was tested with a stubbed
  failing `fetch`. First live check after GitHub Pages deploy: paste a real public
  article URL (e.g. a Wikipedia article) and confirm extraction works.
- **Screenshots:** README lists screenshot slots under `docs/screenshots/`; none are
  bundled yet — take them from the deployed demo.
- **Buy Me a Coffee username** is still the placeholder `"yourname"` in `config.js`
  (deliberate — no username was invented). Set it before sharing the link publicly.
- **Live demo URL** in the README is a placeholder (`<your-github-username>`) until
  the repo is created and Pages is enabled.

## Not yet done (out of scope for this build)

- No Reddit post and no GitHub repo created — per instructions, build only.
- No real-browser (Chrome/Edge/Safari) listen-through; no mobile-device check beyond
  the responsive CSS (breakpoints at 900px / 640px, mobile-first).
