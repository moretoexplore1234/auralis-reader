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

QA working files (`QA*.md`) are local-only and git-ignored — never commit them. The last QA run's notes live in `QA-v2.md` (local only).
