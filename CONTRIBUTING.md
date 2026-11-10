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

### v1.1.0 release notes (local build — not yet pushed/released)

**Auralis v1.1.0 — Free AI voices, Content Radar, Clone Studio**

- **Free built-in AI voices, no key:** Microsoft AI voices (Edge Read Aloud) are now the default — Aria, Jenny, Guy and more Microsoft Natural voices, unlimited, no account. The free Google voice is the automatic fallback if Microsoft doesn't answer. Browser voices are still there as a third option, with robotic voices hidden as before.
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
