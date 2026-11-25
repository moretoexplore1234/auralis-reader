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
| **Free AI voices** | **Free voices that run on your device — Kitten (Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo…), free and unlimited, no key, no account.** The Kitten model comes from Hugging Face and runs 100% in your browser after a one-time ~60MB download, then works offline. In Microsoft Edge, the free voices are Microsoft's (Edge Read Aloud — Aria, Jenny, Guy and more). There is no robotic fallback anywhere: Google Translate TTS was removed entirely in v1.4.0, and no device or browser voice is ever listed — they sounded robotic. If no human-sounding voice can play, the app says so honestly and plays nothing. Every voice is a card with a plain-language description including a “Best for:” line, accent tag and a Preview button. |
| **Trim silence** | The on-device voice pauses a lot between words, so **Trim silence** (on by default, in the player) strips the dead air from the start and end of each sentence and caps any pause between words at ~200ms — the listen flows without the gaps. It applies to live playback and to the downloaded audio file too. Turn it off any time to hear the pauses as the voice made them. |
| **Download audio** | **⬇ Download audio** in the Reader renders the whole loaded article — the same cleaned, core-only text, in the selected voice — into one audio file named after the article, like its own podcast episode. WAV with the free on-device voices, MP3 with Edge/premium voices. Honest progress (“Rendering audio… sentence 4 of 22”) with Cancel. |
| **Word-by-word highlighting** | The words light up as they're spoken, with a progress bar and time remaining. Play / pause / stop / skip a sentence. Stop resets to 0%; Play after finishing restarts from the top. A failed listen stops with a loud “Playback failed” message — it never fakes a finish. |
| **Premium voices (optional)** | Bring your own key for **ElevenLabs, Cartesia Sonic, OpenAI TTS, Azure Speech or Google Cloud TTS**. Test voice included. Keys live only in your browser. Free tiers: ElevenLabs ~10k chars/mo, Cartesia ~20k credits/mo. |
| **Reader Mode** | One tap for a clean, distraction-free view — large text (A− / A+), Light / Sepia / Dark themes, narrow centred column. |
| **Easy listening** | Sleep timer (15 / 30 / 60 min), skip back/forward 15 seconds, speed presets (Slow & clear / Normal / Fast), and a one-tap **Summarize this** button in the Reader. |
| **Voice menu** | Pick a language first, then a voice — language-first, ElevenLabs-style cards, always visible (never hidden behind “More”). English shows 8 free on-device Kitten voices (Bella ★ Recommended, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo) — in Microsoft Edge, the 8 Microsoft voices (Aria ★ Recommended, Jenny, Guy, Emma, Christopher, Sonia, Ryan UK, Natasha) instead. Other languages have no free on-device voice yet — Kitten is English-only (in Microsoft Edge, the Microsoft voices cover every language). Add a free ElevenLabs or Cartesia key below for studio voices in other languages. Never all languages mixed, never 300 voices. Every card says what the voice is best for — articles, news, stories, audiobooks, narration. |
| **Content Radar** | Every page is swept like a radar: only the core paragraphs are read aloud — nav, ads, related links, newsletters, comments, “click next”, “read more”, “subscribe”, “share this” and all other UI-chrome words are cut, never read aloud. **No link is ever read aloud either** — raw URLs, bare domains and email addresses are stripped from the spoken text (markdown links keep their text). **No timestamp is ever read aloud either** — dates, times, “Published/Updated …”, “5 min read”, “2 hours ago” and datelines are stripped, and byline/date lines, captions, author bios, related-article blocks and comment sections are dropped. A time that is the substance of a sentence (“the meeting starts at 3 PM”) is kept. A “Show removed” toggle lets you see what was cut and restore any paragraph with one tap. An optional Hugging Face double-check (your free token, off by default) can confirm borderline paragraphs. |
| **Clone Studio** | Clone a voice you own or have permission to use — your own voice, or a voice you made — through ElevenLabs Instant Voice Clone or Cartesia, with your own key. 30 seconds to 1 minute of clean sample audio. |
| **Personal AI apps** | Add **any AI that speaks the OpenAI format** — OpenAI, Groq, OpenRouter, Ollama, LM Studio, your own server. Ask it to summarise, explain like you're five, answer a question, or translate what you're reading. |
| **Library** | Save articles with your place kept, resume later, delete anytime. Stored on your device only. |
| **X feed** | Follow public X accounts (e.g. @NASA) and hear their latest posts, newest first — no sign-in, no key. Posts are read via public mirrors (FxTwitter RSS first, Nitter instances as fallback) and the source is shown on every post. Tap **▶ Listen** on a post to hear it — and the whole thread, when there is one. When every mirror is down, the feed says so honestly instead of pretending. |
| **Browse a site** | Type a news site's address (or tap a favourite — BBC News is seeded) and get its headlines; tap one and Auralis reads that article aloud through the normal reader flow. Works with public, mostly-static pages — paywalled, login-walled or script-heavy homepages fail honestly, never bypassed. No live browsing. |
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
- **Best voices:** Kitten AI voices (Bella, Jasper, Luna…) run on your device and are the default in any modern browser — no key, no credits. In Microsoft Edge, the Microsoft AI voices (Aria, Jenny, Guy…) are the default instead. Device browser voices are not offered at all — on some Android phones they only sound robotic, so Auralis doesn't list them.
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
| Microsoft AI voices (Edge Read Aloud) — in Microsoft Edge, unlimited, no key | **$0** |
| Kitten on-device voices — every other browser (model from Hugging Face, downloaded once) | **$0** |
| Article & X-post reading | **$0** |
| Library & settings (your browser) | **$0** |
| Premium voices (ElevenLabs / Cartesia / OpenAI / Azure / Google) — optional, your key | Pay your provider only ($0 on the ElevenLabs & Cartesia free tiers) |
| AI apps — optional, your key | Pay your provider only |

There is no backend, no database, no analytics, no tracking, and no code that phones home.

## Privacy

- **API keys** (premium voices, AI apps) are stored **only** in your own browser. They are sent only to the provider you chose, only when you press play, test, or Run.
- **Articles and library** stay in your browser. Auralis has no server to send them to.
- **No analytics, no cookies, no tracking.** The only outside requests are the ones you ask for: Google Fonts, the article you paste, the Kitten model from Hugging Face (one-time download, then cached), the Microsoft voice service (only in Microsoft Edge, when you press play with a free AI voice), and your chosen voice/AI provider.

## Known limits

- Voice quality depends on your connection and browser. In Microsoft Edge the free voices are Microsoft's (Edge Read Aloud); everywhere else they are Kitten, running on your device after a one-time ~60MB model download from Hugging Face. If the model can't load, the app says so honestly and points at the free ElevenLabs/Cartesia key path — it never falls back to a robotic voice. Google Translate TTS was removed entirely in v1.4.0.
- **v1.6.1 — Browse headlines are clean:** Jina's numbering and heading marks ("2 ## …") are stripped, a headline glued to its summary ("US announces new tariffs… The new levies would hit…") is cut back to the headline, and titles are deduped on the cleaned text as well as the URL. A glued title with no clean split stays whole rather than being miscut.
- **v1.6.1 — Browse opens with the headline as its title:** tapping a headline reads the article under that headline — the reader no longer titles it with the raw URL when the fetched page carries no usable title. A real page title still wins.
- **v1.6.1 — image credits are never read aloud:** bare photo credits ("Spencer Platt / Getty Images", "AP Photo") and file-extension artefacts from stripped image URLs ("webp)") are cut — including when fused onto the front of the real first sentence — while real sentences that merely mention an agency ("Getty Images reported record profits") are kept.
- **v1.6.1 — warm-up banner hides when the voice is ready:** the "Getting the voice ready…" banner and its Retry button can no longer stay visible while playback works — every load path that resolves with a voice hides them, and the 30-second stuck-load timer never re-shows anything once the voice is loaded.
- **v1.6.1 — X feed:** retweets are labelled ("↻ @NASA retweeted @NASASolarSystem") in the list and the byline, never filtered out; a failed refresh keeps the last good posts on screen with a "couldn't refresh" note instead of wiping the list; FxTwitter gets one retry pass before the Nitter fallback. The seeded BBC News favourite survives an accidental ✕ tap (seeds are merged back on every load; a deliberate removal is tracked separately and restorable by re-saving the favourite).
- **v1.6.0 — X feed:** follow public X accounts and hear their posts — FxTwitter RSS is the primary source (verified live Nov 25, 2026: HTTP 200, full post text), Nitter instances rotate as fallback with a live health check (verified the same day: no working instance — netbub.com 403, catsarch.com 429 — so the feed never depends on Nitter being up). Tapping a post reads the whole thread via the existing X-post reader, then the proxy chain, then the feed text itself.
- **v1.6.0 — Browse a site:** type a site address (BBC News seeded — verified Nov 25, 2026: 21 headlines via Jina; AP News is dead on both proxy legs, so it is not seeded) and get a clean headline list; tapping one reads it through the normal reader flow. Paywalls, login walls and blocked sites fail honestly with both fallback buttons.
- **v1.5.1 — Retry download:** if the voice download fails or stalls, a visible **↻ Retry download** button appears — in the empty state after a failure, and on the warm-up banner + load box if the download is still going after 30 seconds. Tapping it abandons the stuck attempt and re-downloads the model from scratch. Tapping Play or Preview also retries after a failed load. A Preview that hangs re-enables its button after 2 minutes so it can be tapped again.
- **v1.5.1 — pasted links read only the article:** publish labels, dates and times, bylines, share buttons, page numbers, breadcrumbs, tag lists, related-links blocks and copyright footers are stripped before reading — the spoken text is the article itself, nothing around it.
- Sites with strong bot protection or paywalls can't be read by URL — use Paste Text.
- Local AI apps (Ollama / LM Studio) need to allow browser connections and the page served over `http(s)`, not `file://`.
- Word highlighting follows the speech closely, with a timing fallback where the browser doesn't report word boundaries — sync is close, not frame-perfect.

## Support Auralis

Auralis is free, with no paywall, ever. If it saved you time today, a coffee is the kindest way to say thanks:

**☕ https://www.buymeacoffee.com/carlmeiselman**

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, make it yours. A coffee is appreciated, never required. ☕
