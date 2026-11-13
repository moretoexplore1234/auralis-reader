# Auralis — Read Anything Aloud

> **Paste any public web page, article, or X post. Auralis reads it aloud in a realistic voice. Free forever.**

No account. No paywall. No server. Just open it and listen.

**Try it now:** https://moretoexplore1234.github.io/auralis-reader/

**Get the app:** https://github.com/moretoexplore1234/auralis-reader/releases — GitHub is the app store for Auralis. Every version lives under Releases.

---

## What it does

| Feature | How it works |
|---|---|
| **Read any public page** | Paste a URL. Auralis fetches the page and extracts the real article text, stripping nav, ads and clutter. |
| **Read long X posts & threads** | Paste an X / Twitter link (`x.com/…/status/…`). Long posts and whole threads are read aloud start to finish, with the author shown. |
| **Honest about limits** | Paywalled, protected, deleted or bot-blocked pages are **never** bypassed. Auralis says so plainly and offers Paste Text instead. |
| **Paste text & upload** | Paste any text, or upload `.txt`, `.md` or `.html` files. Nothing leaves your browser. |
| **Free AI voices** | **Microsoft AI voices (Edge Read Aloud) are built in — Aria, Jenny, Guy and more, free and unlimited, no key, no account.** If Microsoft can't answer in your browser, the app says so loudly (banner + toast) and greys out the Microsoft cards instead of silently switching you to the single free Google voice — which is an unlisted last resort only, never a voice choice. No device or browser voice is ever listed — they sounded robotic. Every voice is a card with a plain-language description including a “Best for:” line, accent tag and a Preview button. |
| **Word-by-word highlighting** | The words light up as they're spoken, with a progress bar and time remaining. Play / pause / stop / skip a sentence. Stop resets to 0%; Play after finishing restarts from the top. A failed listen stops with a loud “Playback failed” message — it never fakes a finish. |
| **Premium voices (optional)** | Bring your own key for **ElevenLabs, Cartesia Sonic, OpenAI TTS, Azure Speech or Google Cloud TTS**. Test voice included. Keys live only in your browser. Free tiers: ElevenLabs ~10k chars/mo, Cartesia ~20k credits/mo. |
| **Reader Mode** | One tap for a clean, distraction-free view — large text (A− / A+), Light / Sepia / Dark themes, narrow centred column. |
| **Easy listening** | Sleep timer (15 / 30 / 60 min), skip back/forward 15 seconds, speed presets (Slow & clear / Normal / Fast), and a one-tap **Summarize this** button in the Reader. |
| **Voice menu** | Pick a language first, then a voice — language-first, ElevenLabs-style cards, always visible (never hidden behind “More”). English shows 8 voices (Aria ★ Recommended, Jenny, Guy, Emma, Christopher, Sonia, Ryan UK, Natasha). Other languages show only their own voices (Spanish, French, German, Italian, Portuguese, Hebrew, Arabic, Hindi, Japanese, Chinese). Never all languages mixed, never 300 voices. Every card says what the voice is best for — articles, news, stories, audiobooks, narration. |
| **Content Radar** | Every page is swept like a radar: only the core paragraphs are read aloud — nav, ads, related links, newsletters, comments, “click next”, “read more”, “subscribe”, “share this” and all other UI-chrome words are cut, never read aloud. **No link is ever read aloud either** — raw URLs, bare domains and email addresses are stripped from the spoken text (markdown links keep their text). A “Show removed” toggle lets you see what was cut and restore any paragraph with one tap. An optional Hugging Face double-check (your free token, off by default) can confirm borderline paragraphs. |
| **Clone Studio** | Clone a voice you own or have permission to use — your own voice, or a voice you made — through ElevenLabs Instant Voice Clone or Cartesia, with your own key. 30 seconds to 1 minute of clean sample audio. |
| **Personal AI apps** | Add **any AI that speaks the OpenAI format** — OpenAI, Groq, OpenRouter, Ollama, LM Studio, your own server. Ask it to summarise, explain like you're five, answer a question, or translate what you're reading. |
| **Library** | Save articles with your place kept, resume later, delete anytime. Stored on your device only. |
| **Download & install** | Use it in the browser, install it as an app, or download the files — see [Get the app](#get-the-app) below. |

## Get the app

Three ways — all free, all take under a minute:

**1. Use it now — no download needed**
Open https://moretoexplore1234.github.io/auralis-reader/ in any browser, on phone, tablet or computer. Paste a link and press Listen.

**2. Install as an app**
1. Open the link above in Chrome or Edge on your phone or computer.
2. Tap the **⋮ menu** (or the install icon in the address bar).
3. Tap **“Install app”** or **“Add to Home screen.”**
It appears on your home screen like any app and opens full-screen. (On iPhone Safari: Share → Add to Home Screen.)

**3. Download the files**
1. Tap **Download the files (ZIP)**: https://github.com/moretoexplore1234/auralis-reader/archive/refs/heads/main.zip
2. Unzip the folder it downloads.
3. Double-click **index.html** — Auralis opens in your browser.

Every version, with notes, lives at https://github.com/moretoexplore1234/auralis-reader/releases

## How to use it

1. Open Auralis (or tap **⬇ Download Auralis** above to install it).
2. Paste an article URL or an X post link and press **Listen** — or tap a sample article, paste text, or upload a file.
3. Press **▶** to hear it. Pick a voice, adjust speed, follow the highlighting.
4. Tap **＋ Save to Library** to keep it for later.

### Tips

- **Share a link straight into Auralis:** open `https://moretoexplore1234.github.io/auralis-reader/?url=<article-url>` and the article loads itself, ready to play. If your clipboard holds a link, Auralis offers to paste it with one tap.
- **Best voices:** Microsoft AI voices (Aria, Jenny, Guy…) are the default and work in any modern browser — no key, no credits. Device browser voices are not offered at all — on some Android phones they only sound robotic, so Auralis doesn't list them.
- **A page won't load?** Some sites block cross-site reading. Auralis tries several routes, then tells you honestly. Copy the article text and use **Paste text**.
- **Paywalls & protected posts:** Auralis never bypasses a paywall or a login wall. If you have access, paste the text yourself.
- **Long listens:** Auralis reads the whole thing — a 2,000-word article or a full X thread — in sentences, keeping your place and the highlighting going all the way through.

## Add your own AI app

1. Scroll to **Personal AI Apps**.
2. Fill in **Name**, **Base URL**, **Model**, and **API key** (leave the key blank for local models).
   - OpenAI: `https://api.openai.com/v1` · model `gpt-4o-mini`
   - Groq: `https://api.groq.com/openai/v1` · model `llama-3.3-70b-versatile`
   - OpenRouter: `https://openrouter.ai/api/v1` · model e.g. `openai/gpt-4o-mini`
   - Ollama (on your computer): `http://localhost:11434/v1` · model e.g. `llama3.2`
   - LM Studio (on your computer): `http://localhost:1234/v1` · model = whatever you loaded
3. Tap **＋ Add AI app**, then **Test connection** on its card.
4. Open an article, choose an action (Summarize / Explain / Ask / Translate), pick the app, tap **Run**.

Import/export: **Export apps (JSON)** downloads your apps (including keys — keep the file safe); **Import apps (JSON)** restores them.

## Cost — $0

| Thing | Cost |
|---|---|
| Hosting (GitHub Pages) | **$0** |
| Microsoft AI voices (Edge Read Aloud) — unlimited, no key | **$0** |
| Google free voice — unlimited, no key | **$0** |
| Article & X-post reading | **$0** |
| Library & settings (your browser) | **$0** |
| Premium voices (ElevenLabs / Cartesia / OpenAI / Azure / Google) — optional, your key | Pay your provider only ($0 on the ElevenLabs & Cartesia free tiers) |
| AI apps — optional, your key | Pay your provider only |

There is no backend, no database, no analytics, no tracking, and no code that phones home.

## Privacy

- **API keys** (premium voices, AI apps) are stored **only** in your own browser. They are sent only to the provider you chose, only when you press play, test, or Run.
- **Articles and library** stay in your browser. Auralis has no server to send them to.
- **No analytics, no cookies, no tracking.** The only outside requests are the ones you ask for: Google Fonts, the article you paste, the Microsoft/Google voice services (only when you press play with a free AI voice), and your chosen voice/AI provider.

## Known limits

- Voice quality depends on your connection and browser; Microsoft's voices work best in Edge. In browsers where Microsoft doesn't answer, the app says so loudly and greys out the Microsoft cards — the single free Google voice is only an unlisted last resort while that banner shows.
- Sites with strong bot protection or paywalls can't be read by URL — use Paste Text.
- Local AI apps (Ollama / LM Studio) need to allow browser connections and the page served over `http(s)`, not `file://`.
- Word highlighting follows the speech closely, with a timing fallback where the browser doesn't report word boundaries — sync is close, not frame-perfect.

## Support Auralis

Auralis is free, with no paywall, ever. If it saved you time today, a coffee is the kindest way to say thanks:

**☕ https://www.buymeacoffee.com/carlmeiselman**

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, make it yours. A coffee is appreciated, never required. ☕
