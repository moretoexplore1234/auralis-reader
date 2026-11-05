# Auralis — Read Anything Aloud

> **Paste any public web page or article link. Auralis reads it aloud in a realistic voice. Free forever.**

No account. No paywall. No server. A single static page you can host for **$0** on GitHub Pages — and use for $0, with the realistic voices already built into your browser.

**Live demo:** `https://<your-github-username>.github.io/auralis-reader/` *(replace with your repo URL after publishing — see [Deploy](#deploy-for-free-github-pages) below)*

---

## What it does

| Feature | How it works |
|---|---|
| **Read any public page** | Paste a URL. Auralis fetches the page (direct, then the free Jina Reader proxy, then AllOrigins) and extracts the real article text, stripping nav, ads and clutter. |
| **Honest about limits** | Paywalled, bot-blocked or empty pages are **never** bypassed. Auralis says so plainly and offers Paste Text instead. |
| **Paste text & upload** | Paste any text, or upload `.txt`, `.md` or `.html` files. Nothing leaves your browser. |
| **Realistic free voices** | The Web Speech API voices built into Chrome, Edge and Safari — natural/neural voices listed first, with preview, speed (0.5–1.5×) and pitch controls. |
| **Karaoke highlighting** | Word-by-word highlighting follows the narration, with a progress bar and time remaining. Play / pause / stop / skip a sentence. |
| **Premium voices (optional)** | Bring your own key for **ElevenLabs, OpenAI TTS, Azure Speech or Google Cloud TTS**. Test voice included. Keys live only in your browser. |
| **Personal AI Apps hub** | Add **any OpenAI-compatible endpoint** — OpenAI, Groq, OpenRouter, Ollama, LM Studio, your own server. Summarize, Explain like I'm 5, Ask a question, Translate. Enable / test / delete, import & export as JSON. |
| **Library** | Save articles with your place kept, resume later, delete anytime. Stored in `localStorage` on your device only. |
| **Buy Me a Coffee** | One gold button, header + footer. Free app, coffee-funded — no paywall, ever. |

## Screenshots

> Screenshots go here once the site is live — take them from the deployed demo:
>
> 1. `docs/screenshots/hero.png` — hero with the URL bar
> 2. `docs/screenshots/reader.png` — reader view with word highlighting
> 3. `docs/screenshots/ai-apps.png` — the AI Apps hub
>
> (No screenshots are bundled yet; the app ships without them so the repo stays light.)

## Cost — $0 to run

| Thing | Provider | Cost |
|---|---|---|
| Hosting | GitHub Pages | **$0** |
| Built-in voices | Your browser / OS (Web Speech API) | **$0** |
| Article extraction | Browser + Jina Reader / AllOrigins (free, no key) | **$0** |
| Library & settings | Your browser (`localStorage`) | **$0** |
| Premium voices | ElevenLabs / OpenAI / Azure / Google — optional, your key | Pay your provider only |
| AI apps | Your endpoint of choice — optional, your key | Pay your provider only |

There is no backend, no database, no analytics, no tracking, and no code that phones home.

## Use it

1. Open the demo link (or open `index.html` — most features work from `file://`, though fetching pages and local AI servers work best over `http(s)`).
2. Paste an article URL and press **Listen**, or tap a sample article.
3. Press **▶** to hear it. Pick a voice, adjust speed, follow the highlighting.
4. Tap **＋ Save to Library** to keep it for later.

### Tips

- **Best voices:** Chrome and Edge on Windows/macOS expose the most natural voices (Microsoft Natural, Google US English). Safari on iOS/macOS has Samantha and friends. Voice availability varies by browser and OS — Auralis lists whatever your device offers, best first.
- **A page won't load?** Some sites block cross-site reading. Auralis tries three routes, then tells you honestly. Copy the article text and use **Paste text**.
- **Paywalls:** Auralis never bypasses a paywall. If you have legitimate access, paste the text yourself.

## Add your own AI app

1. Scroll to **Personal AI Apps**.
2. Fill in **Name**, **Base URL**, **Model**, and **API key** (leave the key blank for local models).
   - OpenAI: `https://api.openai.com/v1` · model `gpt-4o-mini`
   - Groq: `https://api.groq.com/openai/v1` · model `llama-3.3-70b-versatile`
   - OpenRouter: `https://openrouter.ai/api/v1` · model e.g. `openai/gpt-4o-mini`
   - Ollama (local): `http://localhost:11434/v1` · model e.g. `llama3.2` — needs CORS enabled; serve Auralis over `http`, not `file://`
   - LM Studio (local): `http://localhost:1234/v1` · model = whatever you loaded
3. Tap **＋ Add AI app**, then **Test connection** on its card.
4. Open an article, choose an action (Summarize / Explain / Ask / Translate), pick the app, tap **Run**.

Import/export: **Export apps (JSON)** downloads your apps (including keys — keep the file safe); **Import apps (JSON)** restores them.

## Set your Buy Me a Coffee name

Edit one line in `config.js`:

```js
BUY_ME_A_COFFEE_USERNAME: "yourname",
```

Replace `"yourname"` with your real Buy Me a Coffee username. The header, footer and coffee-section buttons then link to `https://www.buymeacoffee.com/<your-username>`. While it still says `"yourname"`, the buttons show a gentle setup hint instead of linking anywhere.

Other settings in `config.js`: default voice preferences, the sample-articles toggle, and the reader-proxy list.

## Deploy for free (GitHub Pages)

1. Create a public repo (e.g. `auralis-reader`) and push this folder to its `main` branch.
2. The included workflow (`.github/workflows/pages.yml`) deploys automatically on every push to `main`. Or enable it manually: repo **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**.
3. Your site goes live at `https://<your-github-username>.github.io/auralis-reader/`.
4. Update the **Live demo** link at the top of this README with your real URL.

No build step, no secrets, no environment variables.

## Privacy

- **API keys** (premium voices, AI apps) are stored **only** in the visitor's own browser `localStorage`. They are sent only to the provider the visitor chose, only when they press play, test, or Run.
- **Articles and library** stay in the visitor's browser. Auralis has no server to send them to.
- **No analytics, no cookies, no tracking.** The only third-party requests are the ones the visitor asks for: Google Fonts, the article they paste (via a public reader proxy if needed), and their chosen voice/AI provider.

## Project structure

```
auralis-reader/
├── index.html                  # Single-page app (structure)
├── styles.css                  # Editorial design system (charcoal / ivory / gold)
├── app.js                      # All logic: extraction, TTS, premium voices, AI hub, library
├── config.js                   # One place for Buy Me a Coffee + defaults
├── README.md                   # This file
├── LICENSE                     # MIT
├── .gitignore
├── .nojekyll                   # GitHub Pages: serve files as-is
└── .github/workflows/pages.yml # Auto-deploy to GitHub Pages
```

## Known limits

- Voice quality and availability vary by browser/OS; some browsers only offer a few voices.
- Sites with strong bot protection or paywalls can't be read by URL — use Paste Text.
- Local AI servers (Ollama/LM Studio) need CORS enabled and the page served over `http(s)`, not `file://`.
- Word highlighting uses speech boundary events where the browser supports them, with a timing fallback otherwise — sync is close, not frame-perfect.
- See `QA.md` for the test notes from the last check.

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, make it yours. A coffee is appreciated, never required. ☕
