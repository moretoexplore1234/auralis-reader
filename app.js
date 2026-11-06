/* Auralis — Read Anything Aloud
 * Vanilla JS, no framework, no build step, no backend.
 * Privacy: API keys live ONLY in this browser's localStorage and are sent
 * only to the provider the user explicitly chose, only when they press play
 * or Run. Nothing is uploaded, tracked, or shared by Auralis itself.
 */
(function () {
  "use strict";

  var CFG = window.AURALIS_CONFIG || {};
  var COFFEE_USER = CFG.BUY_ME_A_COFFEE_USERNAME || "carlmeiselman";
  var PREFS = CFG.DEFAULT_VOICE_PREFS || { rate: 1, pitch: 1, preferredNames: [] };

  /* ---------------- helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  }); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function wordsOf(text) { return (text.trim().match(/\S+/g) || []).length; }
  function minutesText(wordCount, rate) {
    var wpm = 175 * (rate || 1);
    var mins = wordCount / wpm;
    if (mins < 1) return "under a minute";
    if (mins < 2) return "about 1 minute";
    return "about " + Math.round(mins) + " minutes";
  }
  function storeGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function storeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { toast("Couldn't save — browser storage is full or blocked."); return false; }
  }

  // scrollIntoView exists in every modern browser, but guard it anyway so a
  // missing/blocked implementation can never break the rest of a flow.
  function safeScrollIntoView(node, block) {
    try {
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: block || "nearest" });
      }
    } catch (e) { /* scrolling is a nicety, never a requirement */ }
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $("toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
    var sr = $("srStatus"); if (sr) sr.textContent = msg;
  }

  function showStatus(kind, title, html, actionLabel, actionFn) {
    var box = $("statusBox"); if (!box) return;
    box.hidden = false;
    box.innerHTML = "";
    var card = el("div", "status-card " + (kind || ""));
    card.appendChild(el("div", "status-title", title));
    var p = document.createElement("p"); p.innerHTML = html; card.appendChild(p);
    if (actionLabel && actionFn) {
      var b = el("button", "btn btn-gold btn-small", actionLabel);
      b.type = "button";
      b.addEventListener("click", actionFn);
      card.appendChild(b);
    }
    box.appendChild(card);
    safeScrollIntoView(box);
  }
  function hideStatus() { var b = $("statusBox"); if (b) { b.hidden = true; b.innerHTML = ""; } }
  function setBusy(btn, busy, label) {
    if (!btn) return;
    btn.disabled = !!busy;
    if (label != null) btn.textContent = label;
  }

  /* ---------------- sample articles (original writing, public-domain topics) ---------------- */
  var SAMPLES = [
    {
      id: "sample-morning-light",
      kicker: "Essay · 2 min",
      title: "Why Mornings Feel Longer Than Evenings",
      description: "A short original essay on attention, light, and why the first hour of the day seems to stretch.",
      source: "Auralis sample · original essay",
      body: [
        "There is a strange arithmetic to mornings. An hour before breakfast can feel longer than an entire afternoon, and it is not because the clock runs differently. It is because attention runs differently.",
        "In the morning, almost everything is new. The light is new. The sounds from the street are new. Even the coffee tastes like a first thing rather than a next thing. Newness forces the mind to pay attention, and attention is what stretches time. When we notice more, we remember more — and a day we remember feels like a day that lasted.",
        "By evening, the mind has settled into its grooves. The route home is familiar, the conversation is familiar, the chair is familiar. Familiar things pass through us without leaving a mark, so the hours slip by uncounted. This is why a holiday in a new city feels like a week, while a week at home can feel like a day.",
        "The good news is that we can borrow the morning's trick at any hour. Do one small thing differently — take another street, sit in another chair, ask a question you have never asked — and time slows down just enough to be noticed. A longer life, it turns out, may simply be a more noticed one."
      ].join("\n\n")
    },
    {
      id: "sample-city-trees",
      kicker: "Science · 3 min",
      title: "The Quiet Work of City Trees",
      description: "An original science-style piece on what street trees actually do for a neighbourhood — shade, air, and calm.",
      source: "Auralis sample · original science piece",
      body: [
        "A single mature street tree does more work before lunch than most of us realise. Its leaves shade the pavement, its roots drink the rain, and its canopy quietly filters the air that passes through it.",
        "The shade matters more than it looks. On a hot day, a shaded street can be several degrees cooler than the same street in full sun. That difference is not a comfort detail — it is a health detail. Cooler streets mean fewer heat-stressed afternoons, lower cooling bills, and pavements that last longer because they are not baking and cracking in the sun.",
        "Then there is the air. Leaves catch dust and soot on their surfaces, and rain washes it away. Trees also absorb some of the gases that come from traffic and heating, and they release oxygen in return. No single tree cleans a city, but a street full of them changes what it feels like to breathe there.",
        "Perhaps the most surprising effect is the calm one. Studies of neighbourhoods before and after planting have found that people walk more, linger longer, and report feeling safer on tree-lined streets. A tree is not just a plant in a city. It is furniture, shelter, and a small piece of weather that the whole street shares."
      ].join("\n\n")
    },
    {
      id: "sample-lost-library",
      kicker: "Story · 3 min",
      title: "The Library That Lent Out Its Own History",
      description: "An original story about a small-town library, a box of old photographs, and a town remembering itself.",
      source: "Auralis sample · original story",
      body: [
        "The library in the town of Millbrook had a problem that most libraries would envy: a locked cupboard full of photographs nobody had ever catalogued. They showed the same streets, the same river, the same market square — but a hundred years earlier, full of people nobody alive could name.",
        "The librarian, a woman named Ruth, had an idea that sounded slightly mad. Instead of putting the photographs behind glass, she lent them out. Any resident could borrow a photograph for a week, the way they would borrow a novel, on one condition: they had to bring it back with a note about what they had learned.",
        "The first notes were simple. A boy wrote that the bakery in his photograph was now a bicycle shop. An older man recognised his grandfather standing outside the station, twenty years old and laughing. Then the notes began to find each other. Two families discovered they had lived in the same house, fifty years apart. A woman found the shop where her mother had worked as a girl.",
        "Within a year, the cupboard was empty and the town was full. People were talking to neighbours they had never met, comparing notes, correcting each other's memories, and laughing at the haircuts of 1924. Ruth had not lent out a collection of old photographs. She had lent out the town's memory — and the town, it turned out, was very good at returning things with interest."
      ].join("\n\n")
    }
  ];

  /* ---------------- state ---------------- */
  var state = {
    title: "", source: "", byline: "",
    paragraphs: [],        // array of paragraph strings
    sentences: [],         // { text, paraIndex, startWord, wordCount }
    totalWords: 0,
    clutterRemoved: 0,     // clutter blocks stripped by extraction
    currentSentence: -1,
    playing: false,
    paused: false,
    engine: "browser",     // "browser" | "premium"
    premiumAudio: null,
    premiumTimer: null,
    wordTimer: null,
    charOffsetBase: 0
  };

  var LS = {
    library: "auralis.library.v1",
    apps: "auralis.aiapps.v1",
    voice: "auralis.voice.v1",
    premium: "auralis.premium.v1"
  };

  /* ---------------- Buy Me a Coffee ---------------- */
  function wireCoffee() {
    var url = "https://www.buymeacoffee.com/" + encodeURIComponent(COFFEE_USER);
    ["coffeeBtnHeader", "coffeeBtnFooter", "coffeeLinkFooter"].forEach(function (id) {
      var a = $(id); if (!a) return;
      a.href = url;
      a.setAttribute("aria-label", "Buy Me a Coffee");
    });
    var note = $("coffeeNote");
    if (note) note.textContent = "Auralis is free — coffee keeps it free, no paywall. Thank you for supporting it.";
  }

  /* ---------------- samples ---------------- */
  function renderSamples() {
    var grid = $("sampleGrid"); if (!grid) return;
    grid.innerHTML = "";
    if (CFG.SHOW_SAMPLES === false) { $("samplesSection").hidden = true; return; }
    SAMPLES.forEach(function (s) {
      var card = el("button", "sample-card");
      card.type = "button";
      card.setAttribute("aria-label", "Listen to sample: " + s.title);
      card.appendChild(el("span", "sample-kicker", s.kicker));
      card.appendChild(el("h3", null, s.title));
      card.appendChild(el("p", null, s.description));
      var meta = el("div", "sample-meta");
      meta.appendChild(el("span", null, minutesText(wordsOf(s.body), 1) + " listen"));
      meta.appendChild(el("span", null, "Listen →"));
      card.appendChild(meta);
      card.addEventListener("click", function () { openArticle(s.title, s.source, "Auralis · original sample", s.body); });
      grid.appendChild(card);
    });
  }

  /* ---------------- text model: paragraphs -> sentences -> words ---------------- */
  function splitSentences(text) {
    // Split on sentence-ending punctuation followed by space + capital/quote,
    // keeping abbreviations reasonably intact.
    var parts = text.match(/[^.!?]+[.!?]+["'”)]*\s*|[^.!?]+$/g) || [text];
    return parts.map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function buildModel(title, source, byline, bodyText) {
    stopPlayback(true);
    state.title = title || "Untitled";
    state.source = source || "";
    state.byline = byline || "";
    state.paragraphs = String(bodyText || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    state.sentences = [];
    state.totalWords = 0;
    state.currentSentence = -1;
    state.paragraphs.forEach(function (para, pi) {
      splitSentences(para).forEach(function (s) {
        var wc = wordsOf(s);
        state.sentences.push({ text: s, paraIndex: pi, startWord: state.totalWords, wordCount: wc });
        state.totalWords += wc;
      });
    });
    renderArticle();
    $("reader").hidden = false;
    setAutoFollow(true, true);
    safeScrollIntoView($("reader"), "start");
    updateProgress();
    updateAiAvailability();
  }

  function renderArticle() {
    $("readerTitle").textContent = state.title;
    $("readerSource").textContent = state.source || "";
    $("readerByline").textContent = state.byline || (state.totalWords + " words · " + minutesText(state.totalWords, currentRate()) + " listen");
    var note = $("cleanNote");
    if (note) {
      if (state.clutterRemoved > 0) {
        note.hidden = false;
        note.textContent = "Cleaned up — removed " + state.clutterRemoved + " clutter block" + (state.clutterRemoved === 1 ? "" : "s") + " (ads, menus, related links, comments).";
      } else note.hidden = true;
    }
    var body = $("articleBody");
    body.innerHTML = "";
    if (!state.paragraphs.length) {
      body.appendChild(el("p", "reader-empty", "No readable text found."));
      return;
    }
    state.paragraphs.forEach(function (para, pi) {
      var p = el("p");
      splitSentences(para).forEach(function (s) {
        var sentSpan = el("span", "sentence");
        sentSpan.dataset.para = String(pi);
        s.split(/\s+/).forEach(function (w) {
          sentSpan.appendChild(el("span", "word", w + " "));
        });
        p.appendChild(sentSpan);
      });
      body.appendChild(p);
    });
  }

  function wordSpans() { return Array.prototype.slice.call(document.querySelectorAll("#articleBody .word")); }
  function sentenceSpans() { return Array.prototype.slice.call(document.querySelectorAll("#articleBody .sentence")); }

  /* ---------------- auto-follow: the reader follows the words, unless the
   * user takes over. ANY manual scroll (wheel, touch, drag, keyboard)
   * pauses auto-follow immediately and it never pulls the page back until
   * the user taps "Follow along" or flips the Follow toggle back on.
   * Highlighting keeps going the whole time — only the scrolling stops. */
  var autoFollow = true;
  var followListenersWired = false;
  var lastProgrammaticScroll = 0;
  function setAutoFollow(on, silent) {
    autoFollow = !!on;
    var btn = $("followBtn");
    if (btn) btn.hidden = autoFollow;
    var toggle = $("followToggle");
    if (toggle) toggle.checked = autoFollow;
    var toggleB = $("followToggleBottom");
    if (toggleB) toggleB.checked = autoFollow;
    if (!autoFollow && !silent) {
      var hint = $("followBtn");
      if (hint) hint.textContent = "▶ Follow along";
    }
  }
  function userTookOverScrolling() {
    // Only matters while something is playing; otherwise there is nothing
    // to pause. The follow button still appears so the state is visible.
    if (!state.playing) return;
    if (autoFollow) setAutoFollow(false);
  }
  function wireFollowListeners() {
    if (followListenersWired) return;
    followListenersWired = true;
    // Wheel, touch-drag and keyboard scrolling are always the user.
    ["wheel", "touchmove"].forEach(function (evt) {
      window.addEventListener(evt, userTookOverScrolling, { passive: true });
    });
    document.addEventListener("keydown", function (ev) {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].indexOf(ev.key) !== -1) userTookOverScrolling();
    });
    // Scrollbar drags fire "scroll" with no wheel/touch event. Our own
    // scrollIntoView calls are timestamped, so a scroll that arrives
    // shortly after one of ours is ignored; any other scroll is the user.
    window.addEventListener("scroll", function () {
      if (Date.now() - lastProgrammaticScroll > 400) userTookOverScrolling();
    }, { passive: true });
  }

  function highlightWord(globalIndex) {
    var spans = wordSpans();
    spans.forEach(function (sp, i) {
      sp.classList.toggle("active", i === globalIndex);
      sp.classList.toggle("spoken", i < globalIndex);
    });
    // Scroll ONLY while the user hasn't taken over. Never call
    // scrollIntoView while auto-follow is paused.
    if (autoFollow && globalIndex >= 0 && spans[globalIndex]) {
      try {
        lastProgrammaticScroll = Date.now();
        spans[globalIndex].scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {}
    }
  }
  function highlightSentence(idx) {
    sentenceSpans().forEach(function (sp, i) { sp.classList.toggle("current", i === idx); });
  }
  function clearHighlight() {
    wordSpans().forEach(function (sp) { sp.classList.remove("active", "spoken"); });
    highlightSentence(-1);
  }

  function updateProgress() {
    var done = state.currentSentence < 0 ? 0 : state.sentences.slice(0, state.currentSentence + 1).reduce(function (a, s) { return a + s.wordCount; }, 0);
    var pct = state.totalWords ? Math.round((done / state.totalWords) * 100) : 0;
    $("progressFill").style.width = pct + "%";
    $("progressText").textContent = pct + "% read · " + done + " of " + state.totalWords + " words";
    var remaining = state.totalWords - done;
    $("timeRemaining").textContent = remaining <= 0 ? "Finished" : minutesText(remaining, currentRate()) + " remaining";
  }

  function openArticle(title, source, byline, bodyText, clutterRemoved) {
    if (!bodyText || wordsOf(bodyText) < 20) {
      showStatus("error", "Not enough text to read",
        "That page didn't give us enough readable text (under 20 words). Try <strong>Paste text</strong> instead — you can copy the article text into Auralis directly.",
        "Paste text instead", openPasteModal);
      return;
    }
    hideStatus();
    state.clutterRemoved = clutterRemoved || 0;
    buildModel(title, source, byline, bodyText);
    toast("Ready — press play to listen.");
  }

  /* ---------------- article extraction (allowed pages only) ---------------- */
  var PAYWALL_HINTS = [
    /subscribe to (continue|read|access)/i, /to continue reading/i, /sign in to (continue|read)/i,
    /you have reached your (free )?(article )?limit/i, /this article is for subscribers/i,
    /paywall/i, /premium content/i, /register to read/i
  ];
  var BLOCKED_HINTS = [/access denied/i, /403 forbidden/i, /please verify you are human/i, /captcha/i, /bot detection/i, /are you a robot/i];

  function looksBlockedOrPaywalled(text, html) {
    var hay = (text || "") + " " + (html || "").slice(0, 4000);
    if (BLOCKED_HINTS.some(function (re) { return re.test(hay); })) return "blocked";
    if (PAYWALL_HINTS.some(function (re) { return re.test(text || ""); })) return "paywall";
    return null;
  }

  // Paragraphs that are navigation / promo, never body text — even when
  // long enough to pass the length filter.
  var CLUTTER_PARA_RE = /^(read more|read next|related( articles?)?:?|you may also like|recommended( for you)?:?|more from|sign up|subscribe( (now|to|for))?|newsletter|share this|follow us|comments?|leave a (comment|reply)|advertisement|sponsored|photo: |caption: )/i;
  function isClutterParagraph(t) {
    if (CLUTTER_PARA_RE.test(t)) return true;
    if (/^read more[:\s]/i.test(t)) return true;
    return false;
  }

  function extractFromHtml(html, pageUrl) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");
    // Remove everything that is not the article itself: nav, menus,
    // headers/footers, ads, related/recommended blocks, "read more",
    // newsletter signup, cookie banners, comments, social-share buttons,
    // author bio boxes, subscribe/sign-up blocks, photo captions.
    // Title, author/date (from meta) and body paragraphs are kept.
    var junk = "script, style, noscript, iframe, svg, canvas, form, nav, header, footer, aside, figure, figcaption, " +
      "[role='navigation'], [role='banner'], [role='contentinfo'], [role='complementary'], " +
      ".ad, .ads, [class*='ad-'], [id*='ad-'], [class*='advert'], [class*='sponsor'], " +
      "[class*='paywall'], [class*='subscribe'], [class*='sign-up'], [class*='signup'], " +
      "[class*='newsletter'], [class*='cookie'], [class*='share'], [class*='social'], " +
      "[class*='comment'], [class*='related'], [class*='recommend'], [class*='read-more'], [class*='readmore'], " +
      "[class*='more-from'], [class*='also-like'], [class*='author-bio'], [class*='author-box'], [class*='byline-box'], " +
      "[class*='promo'], [class*='outbrain'], [class*='taboola'], [class*='trending'], [class*='sidebar'], " +
      "[class*='menu'], [class*='toolbar'], [class*='caption'], [class*='credit']";
    var removed = doc.querySelectorAll(junk);
    var clutterRemoved = removed.length;
    removed.forEach(function (n) { n.remove(); });
    var title = "";
    var og = doc.querySelector('meta[property="og:title"]');
    if (og && og.getAttribute("content")) title = og.getAttribute("content").trim();
    if (!title && doc.title) title = doc.title.replace(/\s*[|–—-]\s*[^|–—-]*$/, "").trim();
    if (!title) title = pageUrl;
    var author = "";
    var am = doc.querySelector('meta[name="author"]');
    if (am && am.getAttribute("content")) author = am.getAttribute("content").trim();

    // Score candidate containers: prefer <article>/<main>, else densest text block.
    var candidates = [];
    doc.querySelectorAll("article, main, [role='main']").forEach(function (n) { candidates.push(n); });
    if (!candidates.length) {
      doc.querySelectorAll("div, section").forEach(function (n) {
        var t = (n.textContent || "").trim();
        if (t.length > 600) candidates.push(n);
      });
      // Keep only leaf-ish candidates with the most text, dedupe by containment.
      candidates.sort(function (a, b) { return (b.textContent || "").length - (a.textContent || "").length; });
      candidates = candidates.slice(0, 3);
    }
    var bestText = "";
    var bestParaCount = 0;
    candidates.forEach(function (n) {
      var paras = Array.prototype.slice.call(n.querySelectorAll("p, h2, h3, blockquote, li"))
        .map(function (p) { return (p.textContent || "").replace(/\s+/g, " ").trim(); })
        .filter(function (t) { return t.length > 40 && !isClutterParagraph(t); });
      var text = paras.join("\n\n");
      if (text.length > bestText.length) { bestText = text; bestParaCount = paras.length; }
    });
    if (!bestText) {
      var bodyText = (doc.body ? doc.body.textContent : "").replace(/\s+/g, " ").trim();
      if (bodyText.length > 400) bestText = bodyText;
    }
    return { title: title, author: author, text: bestText, clutterRemoved: clutterRemoved, paragraphs: bestParaCount };
  }

  /* ---------------- X / Twitter posts (long posts & threads) ---------------- */
  // Accepts x.com and twitter.com status links, with or without www,
  // query strings, or a trailing slash. Returns { user, id } or null.
  var X_STATUS_RE = /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/i;
  function parseXUrl(url) {
    var m = String(url || "").trim().match(X_STATUS_RE);
    if (!m) return null;
    return { user: m[1], id: m[2] };
  }
  function stripShortLinks(text) {
    return String(text || "").replace(/https?:\/\/t\.co\/\S+/gi, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  // Pull every text part out of an fx/vxTwitter API response: the main post
  // plus any thread / conversation parts, in order, de-duplicated.
  function xPartsFromApi(json) {
    var parts = [];
    function addText(t) {
      var clean = stripShortLinks(t);
      if (clean && parts.indexOf(clean) === -1) parts.push(clean);
    }
    function walkTweet(t) {
      if (!t || typeof t !== "object") return;
      if (typeof t.text === "string") addText(t.text);
      ["thread", "conversation", "replies"].forEach(function (key) {
        if (Array.isArray(t[key])) t[key].forEach(walkTweet);
      });
    }
    var root = (json && json.tweet) || json || {};
    walkTweet(root);
    // Some mirrors nest the post under data.tweet instead.
    if (!parts.length && json && json.data) walkTweet(json.data.tweet || json.data);
    var author = root.author || (root.user || {}) || {};
    var created = root.created_at || root.createdAt || "";
    return {
      parts: parts,
      authorName: author.name || author.display_name || "",
      authorHandle: author.screen_name || author.username || author.handle || "",
      createdAt: created
    };
  }
  function fetchXPost(x) {
    var hosts = ["https://api.fxtwitter.com/", "https://api.vxtwitter.com/"];
    var chain = Promise.reject(new Error("start"));
    hosts.forEach(function (base) {
      chain = chain.catch(function () {
        return fetchWithTimeout(base + encodeURIComponent(x.user) + "/status/" + encodeURIComponent(x.id), 15000)
          .then(function (resp) {
            if (!resp.ok) throw new Error(resp.status);
            return resp.json();
          })
          .then(function (json) {
            var parsed = xPartsFromApi(json);
            if (!parsed.parts.length) throw new Error("empty post");
            parsed.via = base.indexOf("fxtwitter") !== -1 ? "fxTwitter" : "vxTwitter";
            return parsed;
          });
      });
    });
    return chain;
  }
  function formatXDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (e) { return ""; }
  }

  function fetchWithTimeout(url, ms) {
    return Promise.race([
      fetch(url, { headers: { "Accept": "text/html, text/plain, */*" } }),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error("Timed out after " + (ms / 1000) + "s")); }, ms); })
    ]);
  }

  function fetchArticle(url) {
    var attempts = [{ name: "direct", url: url }];
    (CFG.FETCH_PROXIES || []).forEach(function (p) {
      try { attempts.push({ name: p.name, url: p.url(url) }); } catch (e) { /* skip bad proxy config */ }
    });
    var chain = Promise.reject(new Error("start"));
    attempts.forEach(function (a) {
      chain = chain.catch(function () {
        return fetchWithTimeout(a.url, 15000).then(function (resp) {
          if (!resp.ok) throw new Error(a.name + " returned HTTP " + resp.status);
          return resp.text().then(function (text) { return { via: a.name, text: text }; });
        });
      });
    });
    return chain;
  }

  function readUrl(rawUrl) {
    var url = (rawUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    var parsed;
    try { parsed = new URL(url); } catch (e) {
      showStatus("error", "That link doesn't look right", "Check the URL and try again — it should start with <strong>https://</strong>.");
      return;
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      showStatus("error", "Only web pages can be read", "Auralis reads public <strong>http(s)</strong> pages. Paste text instead for anything else.");
      return;
    }
    var btn = $("readUrlBtn");
    setBusy(btn, true, "Fetching…");
    var x = parseXUrl(url);
    if (x) {
      showStatus("", "Fetching the X post…", "Reading the full post — long posts and threads, start to finish — via a public mirror. No login needed, and nothing is bypassed: protected or deleted posts can't be read.");
      fetchXPost(x).then(function (post) {
        setBusy(btn, false, "▶  Listen");
        var body = post.parts.join("\n\n");
        var who = post.authorName || ("@" + (post.authorHandle || x.user));
        var handle = post.authorHandle || x.user;
        var title = body.length > 90 ? body.slice(0, 90).replace(/\s+\S*$/, "") + "…" : body;
        var date = formatXDate(post.createdAt);
        var byline = "By " + who + " (@" + handle + ")" + (date ? " · " + date : "") +
          " · X post · via " + post.via + " · " + post.parts.length + (post.parts.length > 1 ? " parts" : " post") +
          " · Original: " + url;
        openArticle(title, "X · @" + handle, byline, body);
        saveProgressToLibrary(true);
      }).catch(function () {
        // Fall through to the generic article fetch (Jina / AllOrigins can
        // sometimes still read a public post page). If that fails too, the
        // honest error below explains it and offers Paste text.
        fetchArticleGeneric(url, btn, parsed);
      });
      return;
    }
    showStatus("", "Fetching the article…", "Trying the page directly, then a free public reader proxy if the site blocks cross-site reading. This usually takes a few seconds.");
    fetchArticleGeneric(url, btn, parsed);
  }

  // Generic (non-X) article fetch, shared by the X fallback path.
  function fetchArticleGeneric(url, btn, parsed) {
    fetchArticle(url).then(function (res) {
      var text = res.text || "";
      var blockKind = looksBlockedOrPaywalled(text, text);
      var extracted = extractFromHtml(text, url);
      if (blockKind === "blocked") {
        setBusy(btn, false, "▶  Listen");
        showStatus("error", "This page blocked the reader",
          "The site refused to share its text with a reader (bot protection or an access block). <strong>Auralis never tries to bypass blocks or paywalls.</strong> You can still copy the article text yourself and use <strong>Paste text</strong>.",
          "Paste text instead", openPasteModal);
        return;
      }
      if (!extracted.text || wordsOf(extracted.text) < 40) {
        if (blockKind === "paywall") {
          setBusy(btn, false, "▶  Listen");
          showStatus("error", "This looks paywalled",
            "The page we could reach asks readers to subscribe before showing the article. <strong>Auralis doesn't bypass paywalls.</strong> If you have access, copy the text and use <strong>Paste text</strong> instead.",
            "Paste text instead", openPasteModal);
          return;
        }
        setBusy(btn, false, "▶  Listen");
        showStatus("error", "Couldn't find the article text",
          "We reached the page via <strong>" + esc(res.via) + "</strong>, but couldn't find enough article text — it may be mostly images, video, or a script-heavy page. Try <strong>Paste text</strong> with the article copied from the page.",
          "Paste text instead", openPasteModal);
        return;
      }
      setBusy(btn, false, "▶  Listen");
      var byline = extracted.author ? "By " + extracted.author + " · " + parsed.hostname : parsed.hostname + " · via " + res.via;
      openArticle(extracted.title, parsed.hostname, byline, extracted.text, extracted.clutterRemoved || 0);
      saveProgressToLibrary(true);
    }).catch(function (err) {
      setBusy(btn, false, "▶  Listen");
      if (parseXUrl(url)) {
        showStatus("error", "Couldn't read that X post",
          "Every route failed (" + esc(err && err.message ? err.message : "network error") + "). The post may be deleted, protected, or from an account that limits readers. <strong>Auralis never bypasses login walls.</strong> You can still copy the post text yourself and use <strong>Paste text</strong>.",
          "Paste text instead", openPasteModal);
        return;
      }
      showStatus("error", "Couldn't reach that page",
        "Every fetch route failed (" + esc(err && err.message ? err.message : "network error") + "). The site may be down, offline, or blocking readers. Check the link, or use <strong>Paste text</strong>.",
        "Paste text instead", openPasteModal);
    });
  }

  /* ---------------- paste text + upload ---------------- */
  function openPasteModal() { var m = $("pasteModal"); if (m) { m.hidden = false; var t = $("pasteText"); if (t) t.focus(); } }
  function closePasteModal() { var m = $("pasteModal"); if (m) m.hidden = true; }

  function readPastedText() {
    var text = ($("pasteText").value || "").trim();
    if (wordsOf(text) < 5) { toast("Paste a little more text first — at least a sentence or two."); return; }
    var title = ($("pasteTitle").value || "").trim() || "Pasted text";
    closePasteModal();
    openArticle(title, "Pasted text", "Pasted by you · " + wordsOf(text) + " words", text);
  }

  function handleFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var raw = String(reader.result || "");
      var text = raw;
      var fileClutter = 0;
      if (/\.html?$/i.test(file.name)) {
        try { var ex = extractFromHtml(raw, file.name); text = ex.text || raw.replace(/<[^>]+>/g, " "); fileClutter = ex.clutterRemoved || 0; } catch (e) { text = raw.replace(/<[^>]+>/g, " "); }
      }
      // Strip markdown headings markers lightly; keep the words.
      text = text.replace(/^#{1,6}\s+/gm, "");
      openArticle(file.name.replace(/\.[^.]+$/, ""), "Uploaded file", file.name + " · " + wordsOf(text) + " words", text, fileClutter);
    };
    reader.onerror = function () { toast("Couldn't read that file. Try a .txt or .md file."); };
    reader.readAsText(file);
  }

  /* ---------------- speech: browser voices ---------------- */
  var voices = [];
  function currentRate() { var r = $("rateRange"); return r ? parseFloat(r.value) || 1 : (PREFS.rate || 1); }
  function currentPitch() { var p = $("pitchRange"); return p ? parseFloat(p.value) || 1 : (PREFS.pitch || 1); }
  function premiumVoiceName(u) {
    return (u && u.voice) ? 1 : 0;
  }
  /* Known robotic / low-quality voices. These are old formant-synthesis
   * voices (eSpeak, old Microsoft SAPI voices, Pico, Festival) and the
   * generic "default" voices some platforms expose. They sound like a
   * robot and must never be offered as a normal choice. */
  var ROBOTIC_VOICE_RE = /espeak|pico|festival|flite|robot|sapi\s*5|Microsoft\s+(David|Hazel|Zira|Mark|Hortense|Haruka|Huihui|Kangkang|Yaoyao|Hanhan|Hui|Tracy|Mei-Jia|Guo|Yao|Li|Hao|Jia|Cheng|Zhi|Wei|Jun|Feng|Lei|Qing|Yan|Dong|Nan|Bei|Xi|Yun|Fang|Lan|Ping|An)\b/i;
  var ANDROID_ROBOT_RE = /android/i;
  function isRoboticVoice(v) {
    var name = (v.name || "") + " " + (v.voiceURI || "");
    if (ROBOTIC_VOICE_RE.test(name)) return true;
    // "Android" voices and nameless "default" voices on some platforms.
    if (ANDROID_ROBOT_RE.test(name)) return true;
    if (/^\s*(default|system)\s*$/i.test(v.name || "")) return true;
    return false;
  }
  // Quality badge shown next to every voice.
  function voiceQuality(v) {
    var name = (v.name || "") + " " + (v.voiceURI || "");
    if (/neural2?|wavenet|neural/i.test(name)) return "Neural";
    if (/natural/i.test(name)) return "Natural";
    if (/Microsoft\s+(Aria|Jenny|Guy|Ryan|Emma|Sonia|Christopher|Eric|Michelle|Roger|Steffan|Natasha|Libby|Mia|Maisie|Clara|Alvaro|Elsie|Ana|Alonso|Lucia|Dalia|Jorge|Monica|Beatriz|Camila|Paloma|Raul|Vivienne|Andrew|Brian|Ethan|Jacob|Ashley|Aria)/i.test(name)) return "Natural";
    if (/Google\s+US\s+English|Google\s+UK\s+English/i.test(name)) return "Natural";
    if (/Samantha|Alex|Daniel|Karen|Moira|Tessa|Fred|Victoria|Zoe|Nicky|Allison|Ava|Susan|Tom|Veena|Fiona|Kate|Serena|Kyoko|Otoya|Yuna|Yuri|Ji|Ting|Mei|Sin-ji|Ling/i.test(name)) return "Natural";
    if (isRoboticVoice(v)) return "Robotic";
    return "Standard";
  }
  // Plain-language descriptions for known voices: what they sound like,
  // accent and gender where the name/locale actually tells us, and a tag.
  // Anything unknown is described from name/locale only — never invent
  // a personality for a voice we know nothing about.
  var VOICE_DESCRIPTIONS = {
    "Microsoft Aria": { text: "Warm, friendly American woman — our most natural free voice", tag: "Best for long reads" },
    "Microsoft Jenny": { text: "Bright, upbeat American woman", tag: "Energetic" },
    "Microsoft Guy": { text: "Calm, steady American man — great for long articles", tag: "Calm · Best for long reads" },
    "Microsoft Ryan": { text: "Warm, conversational American man", tag: "Warm" },
    "Microsoft Emma": { text: "Clear, gentle American woman", tag: "Warm" },
    "Microsoft Sonia": { text: "Warm, clear British woman", tag: "Warm" },
    "Microsoft Christopher": { text: "Steady British man, newsreader style", tag: "Calm" },
    "Microsoft Eric": { text: "Clear, steady American man", tag: "Calm" },
    "Microsoft Michelle": { text: "Friendly, clear American woman", tag: "Warm" },
    "Microsoft Natasha": { text: "Warm Australian woman", tag: "Warm" },
    "Microsoft Libby": { text: "Friendly British woman", tag: "Warm" },
    "Google US English": { text: "Clear, natural American voice", tag: "Natural" },
    "Google UK English Female": { text: "Clear, natural British woman", tag: "Natural" },
    "Google UK English Male": { text: "Clear, natural British man", tag: "Natural" },
    "Samantha": { text: "Warm, natural American woman", tag: "Natural" },
    "Alex": { text: "Warm, natural American man", tag: "Natural" },
    "Daniel": { text: "Clear, steady British man", tag: "Calm" },
    "Karen": { text: "Warm Australian woman", tag: "Warm" },
    "Moira": { text: "Warm Irish woman", tag: "Warm" },
    "Tessa": { text: "Clear South African woman", tag: "Warm" },
    "Fred": { text: "Warm American man", tag: "Warm" },
    "Victoria": { text: "Clear American woman", tag: "Warm" },
    "Zoe": { text: "Bright American woman", tag: "Energetic" },
    "Allison": { text: "Clear American woman", tag: "Warm" },
    "Ava": { text: "Bright American woman", tag: "Energetic" },
    "Susan": { text: "Clear American woman", tag: "Warm" },
    "Tom": { text: "Clear American man", tag: "Calm" },
    "Veena": { text: "Clear Indian woman", tag: "Warm" },
    "Fiona": { text: "Warm Scottish woman", tag: "Warm" },
    "Kate": { text: "Clear British woman", tag: "Warm" },
    "Serena": { text: "Clear British woman", tag: "Warm" }
  };
  function accentOf(lang) {
    var l = String(lang || "");
    if (/en[-_]US/i.test(l)) return "American";
    if (/en[-_]GB/i.test(l)) return "British";
    if (/en[-_]AU/i.test(l)) return "Australian";
    if (/en[-_]CA/i.test(l)) return "Canadian";
    if (/en[-_]IN/i.test(l)) return "Indian";
    if (/en[-_]IE/i.test(l)) return "Irish";
    if (/en[-_]ZA/i.test(l)) return "South African";
    if (/^en/i.test(l)) return "English";
    return "";
  }
  function voiceDescription(v) {
    var name = v.name || "";
    var known = null;
    Object.keys(VOICE_DESCRIPTIONS).forEach(function (k) {
      if (name.indexOf(k) !== -1) known = VOICE_DESCRIPTIONS[k];
    });
    if (known) return known;
    var q = voiceQuality(v);
    if (q === "Robotic") return { text: "Old robotic voice — sounds mechanical", tag: "Robotic" };
    var accent = accentOf(v.lang);
    var text = (q === "Neural" ? "Natural-sounding neural voice" : q === "Natural" ? "Natural-sounding voice" : "Standard voice") + (accent ? " · " + accent : "");
    return { text: text, tag: q };
  }
  function humanOnlyOn() {
    var saved = storeGet(LS.voice, {}) || {};
    return saved.humanOnly !== false; // default ON
  }
  function visibleVoices() {
    if (!voices.length) return [];
    if (humanOnlyOn()) return voices.filter(function (v) { return !isRoboticVoice(v); });
    return voices.slice();
  }
  function voiceScore(v) {
    var name = (v.name || "") + " " + (v.voiceURI || "");
    var score = 0;
    if (isRoboticVoice(v)) score -= 100;
    // (b) Microsoft Natural / Edge Read Aloud voices first.
    if (/Microsoft\s+(Aria|Jenny|Guy|Ryan|Emma|Sonia|Christopher|Eric|Michelle)/i.test(name)) score += 60;
    else if (/natural/i.test(name)) score += 45;
    // (c) Google Neural / WaveNet.
    if (/neural2?|wavenet/i.test(name)) score += 55;
    else if (/Google\s+US\s+English/i.test(name)) score += 40;
    else if (/Google\s+UK\s+English/i.test(name)) score += 30;
    // (d) Apple natural voices.
    if (/Samantha|Alex|Daniel|Karen|Moira|Tessa|Fred|Victoria|Zoe|Nicky|Allison|Ava/i.test(name)) score += 35;
    if (/neural|natural|premium|enhanced/i.test(name)) score += 10;
    if (/en[-_]US/i.test(v.lang || "")) score += 10;
    else if (/^en/i.test(v.lang || "")) score += 5;
    if (v.default) score += 3;
    if (v.localService) score += 2;
    return score;
  }
  // Most natural voice available — never just the first in the list.
  function bestHumanVoice() {
    var human = voices.filter(function (v) { return !isRoboticVoice(v); });
    if (!human.length) return null;
    return human.slice().sort(function (a, b) { return voiceScore(b) - voiceScore(a); })[0];
  }
  function onlyRoboticVoices() {
    return voices.length > 0 && voices.every(isRoboticVoice);
  }
  function loadVoices() {
    if (!("speechSynthesis" in window)) {
      var sel = $("voiceSelect");
      if (sel) sel.innerHTML = "<option value=''>Speech not supported in this browser — try Chrome, Edge or Safari</option>";
      var list = $("voiceList");
      if (list) list.innerHTML = "<p class='muted'>This browser doesn't offer speech synthesis. Try Chrome, Edge or Safari — their built-in voices are free and sound human.</p>";
      return;
    }
    voices = window.speechSynthesis.getVoices().slice().sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
    if (!voices.length) return; // voiceschanged will fire again
    var sel = $("voiceSelect");
    var saved = storeGet(LS.voice, {}) || {};
    var selectedName = saved.name || "";
    var shown = visibleVoices();
    sel.innerHTML = "";
    if (!shown.length && voices.length) {
      // Every voice on this device is robotic: say so honestly instead of
      // quietly playing a robot voice.
      var opt = el("option", null, "Only robotic voices on this device — open in Edge or Chrome, or use a premium voice below");
      opt.value = "";
      sel.appendChild(opt);
    }
    shown.forEach(function (v) {
      var desc = voiceDescription(v);
      var opt = el("option", null, v.name + " — " + desc.text + " (" + v.lang + " · " + voiceQuality(v) + ")" + (v.localService ? "" : " (online)"));
      opt.value = v.name;
      if (v.name === selectedName) opt.selected = true;
      sel.appendChild(opt);
    });
    if (!selectedName || !shown.some(function (v) { return v.name === selectedName; })) {
      // Default = most natural voice available, never the first listed.
      var best = bestHumanVoice();
      if (best) sel.value = best.name;
      else if (voices.length) sel.value = "";
    }
    var toggle = $("humanOnlyToggle");
    if (toggle) toggle.checked = humanOnlyOn();
    renderVoiceList();
    syncBottomBar();
  }
  function chosenVoice() {
    var sel = $("voiceSelect");
    var name = sel ? sel.value : "";
    var found = voices.find(function (v) { return v.name === name; });
    if (found) return found;
    return bestHumanVoice() || voices[0] || null;
  }
  function renderVoiceList() {
    var list = $("voiceList"); if (!list) return;
    list.innerHTML = "";
    if (!voices.length) { list.appendChild(el("p", "muted", "Loading voices…")); return; }
    if (onlyRoboticVoices()) {
      var warn = el("div", "voice-warn");
      warn.appendChild(el("strong", null, "Only robotic voices on this device."));
      warn.appendChild(el("p", null, "This browser only offers old robotic voices, so Auralis won't pretend one of them sounds human. For a human voice, open this page in Microsoft Edge or Chrome (their Natural voices are free and unlimited), or add a premium voice below — ElevenLabs is the most realistic, and its free tier covers short listens."));
      list.appendChild(warn);
      return;
    }
    var shown = visibleVoices();
    if (!shown.length) { list.appendChild(el("p", "muted", "Loading voices…")); return; }
    var recommended = bestHumanVoice();
    shown.slice(0, 8).forEach(function (v) {
      var row = el("div", "voice-row");
      var info = el("div", "voice-info");
      var nameRow = el("div", "voice-name");
      nameRow.textContent = v.name + " ";
      var badge = el("span", "voice-badge " + voiceQuality(v).toLowerCase(), voiceQuality(v));
      nameRow.appendChild(badge);
      var desc = voiceDescription(v);
      if (desc.tag && desc.tag !== voiceQuality(v)) {
        nameRow.appendChild(el("span", "voice-badge", desc.tag));
      }
      if (recommended && v.name === recommended.name) {
        nameRow.appendChild(el("span", "recommended-badge", "★ Recommended"));
      }
      info.appendChild(nameRow);
      info.appendChild(el("div", "voice-meta", v.lang + (v.localService ? " · on-device" : " · online")));
      info.appendChild(el("div", "voice-desc", desc.text));
      row.appendChild(info);
      var b = el("button", "btn btn-ghost btn-small", "▶ Preview");
      b.type = "button";
      b.addEventListener("click", function () { previewVoice(v); });
      row.appendChild(b);
      var use = el("button", "btn btn-dark btn-small", "Use");
      use.type = "button";
      use.addEventListener("click", function () {
        var sel = $("voiceSelect"); if (sel) sel.value = v.name;
        persistVoiceChoice();
        toast("Voice set to " + v.name + ".");
      });
      row.appendChild(use);
      list.appendChild(row);
    });
    if (humanOnlyOn() && voices.length > shown.length) {
      list.appendChild(el("p", "muted", (voices.length - shown.length) + " robotic voice(s) hidden. Turn off “Human-sounding voices only” to see them."));
    }
  }
  function previewVoice(v) {
    if (!("speechSynthesis" in window)) { toast("Speech isn't supported in this browser."); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance("Hello — I'm Auralis. I can read any article aloud for you, in a voice that sounds almost human.");
    u.voice = v; u.rate = currentRate(); u.pitch = currentPitch();
    window.speechSynthesis.speak(u);
  }
  function persistVoiceChoice() {
    var v = chosenVoice();
    var cur = storeGet(LS.voice, {}) || {};
    if (v) { cur.name = v.name; cur.lang = v.lang; }
    var r = $("rateRange"), p = $("pitchRange");
    cur.rate = r ? parseFloat(r.value) : 1; cur.pitch = p ? parseFloat(p.value) : 1;
    var t = $("humanOnlyToggle");
    if (t) cur.humanOnly = !!t.checked;
    storeSet(LS.voice, cur);
    syncBottomBar();
  }

  /* ---------------- playback: browser engine ---------------- */
  function speakSentenceBrowser(idx) {
    if (idx < 0 || idx >= state.sentences.length) { finishPlayback(); return; }
    state.currentSentence = idx;
    highlightSentence(idx);
    updateProgress();
    var s = state.sentences[idx];
    var u = new SpeechSynthesisUtterance(s.text);
    var v = chosenVoice(); if (v) u.voice = v;
    u.rate = currentRate(); u.pitch = currentPitch();
    // Word highlighting via boundary events, with a timer fallback.
    var words = s.text.split(/\s+/).filter(Boolean);
    var wordIdx = 0;
    clearTimeout(state.wordTimer);
    var wpm = 175 * currentRate();
    var msPerWord = 60000 / wpm;
    function tickWord() {
      highlightWord(s.startWord + wordIdx);
      wordIdx++;
      if (wordIdx < words.length && state.playing && !state.paused) {
        state.wordTimer = setTimeout(tickWord, msPerWord * Math.max(0.6, Math.min(1.6, words[Math.min(wordIdx, words.length - 1)].length / 5)));
      }
    }
    tickWord();
    u.onboundary = function (ev) {
      if (typeof ev.charIndex !== "number") return;
      var before = s.text.slice(0, ev.charIndex);
      var wi = (before.match(/\S+/g) || []).length;
      wordIdx = clamp(wi, 0, words.length - 1);
      highlightWord(s.startWord + wordIdx);
    };
    u.onend = function () {
      if (!state.playing) return;
      speakSentenceBrowser(idx + 1);
    };
    u.onerror = function (ev) {
      if (ev && ev.error === "canceled") return;
      // Skip a sentence that fails to speak rather than stalling forever.
      speakSentenceBrowser(idx + 1);
    };
    window.speechSynthesis.speak(u);
  }

  function playBrowser(fromIdx) {
    if (!("speechSynthesis" in window)) { toast("Speech isn't supported in this browser — try Chrome, Edge or Safari."); return; }
    if (!state.sentences.length) { toast("Open an article first."); return; }
    if (onlyRoboticVoices()) {
      toast("Heads up: this device only has robotic voices. For a human voice, open in Edge or Chrome, or add an ElevenLabs key below.");
    }
    window.speechSynthesis.cancel();
    state.playing = true; state.paused = false; state.engine = "browser";
    setPlayButton(true);
    speakSentenceBrowser(typeof fromIdx === "number" ? fromIdx : (state.currentSentence < 0 ? 0 : state.currentSentence));
  }

  function pauseBrowser() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    state.paused = true; state.playing = true;
    setPlayButton(false);
  }
  function resumeBrowser() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    state.paused = false; state.playing = true;
    setPlayButton(true);
  }

  function setPlayButton(playing) {
    var label = playing ? "⏸ Pause" : "▶ Listen";
    var b = $("playPauseBtn"); if (b) b.textContent = label;
    var bb = $("playPauseBtnBottom"); if (bb) bb.textContent = label;
  }
  function syncBottomBar() {
    var v = chosenVoice();
    var nameEl = $("bottomVoiceName");
    if (nameEl) nameEl.textContent = "Voice: " + (premiumActive() ? (premiumCfg().provider + " · " + (premiumCfg().voiceId || "default")) : (v ? v.name : "—"));
  }

  // Skip ~15 seconds of speech: for premium audio, seek the audio element;
  // for browser voices, jump sentences by estimated words (175 wpm).
  function skipSeconds(dir) {
    if (!state.sentences.length) return;
    if (state.engine === "premium" && state.premiumAudio) {
      try {
        state.premiumAudio.currentTime = Math.max(0, state.premiumAudio.currentTime + dir * 15);
        toast(dir > 0 ? "Skipped forward 15 seconds." : "Skipped back 15 seconds.");
      } catch (e) {}
      return;
    }
    var wordsToSkip = Math.round(15 * (175 * currentRate()) / 60);
    var targetWord = clamp((state.currentSentence < 0 ? 0 : state.sentences[state.currentSentence].startWord) + dir * wordsToSkip, 0, Math.max(0, state.totalWords - 1));
    var target = 0;
    state.sentences.forEach(function (s, i) { if (s.startWord <= targetWord) target = i; });
    var wasPlaying = state.playing && !state.paused;
    stopPlayback(true);
    if (wasPlaying) { if (premiumActive()) playPremium(target); else playBrowser(target); }
    else { state.currentSentence = target; highlightSentence(target); updateProgress(); }
  }

  // Sleep timer: stops playback after N minutes.
  var sleepTimerId = null;
  function setSleepTimer(mins) {
    if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; }
    if (mins > 0) {
      sleepTimerId = setTimeout(function () {
        sleepTimerId = null;
        stopPlayback(false);
        updateProgress();
        toast("Sleep timer — stopped reading. Good night.");
      }, mins * 60000);
      toast("Sleep timer set — reading stops in " + mins + " minutes.");
    }
  }

  function stopPlayback(silent) {
    state.playing = false; state.paused = false;
    clearTimeout(state.wordTimer);
    clearTimeout(state.premiumTimer);
    if ("speechSynthesis" in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    if (state.premiumAudio) { try { state.premiumAudio.pause(); } catch (e) {} state.premiumAudio = null; }
    setPlayButton(false);
    if (!silent) { clearHighlight(); }
  }
  function finishPlayback() {
    stopPlayback(true);
    state.currentSentence = state.sentences.length - 1;
    updateProgress();
    clearHighlight();
    toast("Finished — nicely listened. ☕");
  }

  /* ---------------- playback: premium (BYO key) engine ---------------- */
  function premiumCfg() { return storeGet(LS.premium, { provider: "none", key: "", voiceId: "", model: "", region: "" }) || { provider: "none" }; }
  function premiumActive() {
    var c = premiumCfg();
    return c.provider && c.provider !== "none" && !!(c.key || "").trim();
  }
  function chunkText(text, maxChars) {
    var chunks = [];
    var sentences = splitSentences(text);
    var cur = "";
    sentences.forEach(function (s) {
      if ((cur + " " + s).length > maxChars && cur) { chunks.push(cur.trim()); cur = s; }
      else cur = (cur ? cur + " " : "") + s;
    });
    if (cur.trim()) chunks.push(cur.trim());
    return chunks;
  }
  function premiumFetchAudio(text, onChunk) {
    var c = premiumCfg();
    var key = (c.key || "").trim();
    if (c.provider === "elevenlabs") {
      var voiceId = (c.voiceId || "21m00Tcm4TlvDq8ikWAM").trim();
      return fetch("https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voiceId), {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
        body: JSON.stringify({ text: text, model_id: (c.model || "eleven_turbo_v2_5"), voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      }).then(function (r) { if (!r.ok) throw new Error("ElevenLabs HTTP " + r.status); return r.blob(); });
    }
    if (c.provider === "openai") {
      return fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: (c.model || "tts-1"), input: text, voice: (c.voiceId || "alloy"), response_format: "mp3" })
      }).then(function (r) { if (!r.ok) throw new Error("OpenAI HTTP " + r.status); return r.blob(); });
    }
    if (c.provider === "azure") {
      var region = (c.region || "eastus").trim();
      var voice = (c.voiceId || "en-US-AriaNeural").trim();
      var ssml = "<speak version='1.0' xml:lang='en-US'><voice name='" + esc(voice) + "'>" + esc(text) + "</voice></speak>";
      return fetch("https://" + region + ".tts.speech.microsoft.com/cognitiveservices/v1", {
        method: "POST",
        headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3" },
        body: ssml
      }).then(function (r) { if (!r.ok) throw new Error("Azure HTTP " + r.status); return r.blob(); });
    }
    if (c.provider === "google") {
      var gvoice = (c.voiceId || "en-US-Neural2-F").trim();
      return fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(key), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { text: text }, voice: { languageCode: gvoice.slice(0, 5), name: gvoice }, audioConfig: { audioEncoding: "MP3", speakingRate: currentRate() } })
      }).then(function (r) { if (!r.ok) throw new Error("Google HTTP " + r.status); return r.json(); })
        .then(function (j) {
          if (!j.audioContent) throw new Error("Google returned no audio.");
          var bin = atob(j.audioContent);
          var bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return new Blob([bytes], { type: "audio/mpeg" });
        });
    }
    if (c.provider === "generic-tts") {
      // Any OpenAI-compatible /audio/speech endpoint (local servers,
      // Kokoro, Piper servers, hosted TTS APIs with the same shape).
      var base = String(c.baseUrl || "").replace(/\/+$/, "");
      if (!base) return Promise.reject(new Error("Add the endpoint base URL for your TTS server first."));
      var headers = { "Content-Type": "application/json" };
      if (key) headers["Authorization"] = "Bearer " + key;
      var body = { model: (c.model || "tts-1"), input: text, voice: (c.voiceId || "alloy"), response_format: "mp3" };
      return fetch(base + "/audio/speech", { method: "POST", headers: headers, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) throw new Error("TTS endpoint HTTP " + r.status); return r.blob(); });
    }
    return Promise.reject(new Error("No premium provider selected."));
  }

  function playPremium(fromIdx) {
    if (!state.sentences.length) { toast("Open an article first."); return; }
    state.playing = true; state.paused = false; state.engine = "premium";
    setPlayButton(true);
    var start = typeof fromIdx === "number" ? fromIdx : (state.currentSentence < 0 ? 0 : state.currentSentence);
    var queue = state.sentences.slice(start);
    var idx = start;
    function next() {
      if (!state.playing || idx >= state.sentences.length) { if (state.playing) finishPlayback(); return; }
      var s = state.sentences[idx];
      state.currentSentence = idx;
      highlightSentence(idx);
      updateProgress();
      // Approximate word highlighting from estimated duration.
      var words = s.text.split(/\s+/).filter(Boolean);
      var estMs = (words.length / (175 * currentRate())) * 60000;
      var wi = 0;
      clearTimeout(state.premiumTimer);
      var step = Math.max(120, estMs / Math.max(1, words.length));
      var tick = function () {
        if (!state.playing) return;
        highlightWord(s.startWord + wi);
        wi++;
        if (wi < words.length) state.premiumTimer = setTimeout(tick, step);
      };
      tick();
      premiumFetchAudio(s.text).then(function (blob) {
        if (!state.playing) return;
        var url = URL.createObjectURL(blob);
        var audio = new Audio(url);
        state.premiumAudio = audio;
        audio.playbackRate = 1; // premium audio is pre-rendered at natural speed
        audio.onended = function () { URL.revokeObjectURL(url); idx++; next(); };
        audio.onerror = function () { toast("Premium audio failed to play — falling back to the free browser voice."); state.playing = false; playBrowser(idx); };
        audio.play().catch(function () { toast("Audio playback was blocked — tap play again."); state.playing = false; setPlayButton(false); });
      }).catch(function (err) {
        toast("Premium voice failed (" + (err && err.message ? err.message : "error") + ") — using the free browser voice instead.");
        state.playing = false;
        playBrowser(idx);
      });
    }
    next();
  }

  function togglePlayPause() {
    if (!state.sentences.length) { toast("Paste a link, some text, or open a sample first."); return; }
    if (state.playing && !state.paused) {
      if (state.engine === "premium" && state.premiumAudio) { state.premiumAudio.pause(); state.paused = true; setPlayButton(false); }
      else pauseBrowser();
      return;
    }
    if (state.playing && state.paused) {
      if (state.engine === "premium" && state.premiumAudio) { state.premiumAudio.play(); state.paused = false; setPlayButton(true); }
      else resumeBrowser();
      return;
    }
    // Fresh play: premium if configured, else browser. Pressing play is
    // the user asking to follow along again.
    setAutoFollow(true, true);
    if (premiumActive()) playPremium(state.currentSentence >= state.sentences.length - 1 ? 0 : undefined);
    else playBrowser(state.currentSentence >= state.sentences.length - 1 ? 0 : undefined);
  }

  function skipSentence(dir) {
    if (!state.sentences.length) return;
    var next = clamp((state.currentSentence < 0 ? 0 : state.currentSentence) + dir, 0, state.sentences.length - 1);
    var wasPlaying = state.playing && !state.paused;
    stopPlayback(true);
    state.currentSentence = next - 1; // play functions advance from here
    if (wasPlaying) { if (premiumActive()) playPremium(next); else playBrowser(next); }
    else { state.currentSentence = next; highlightSentence(next); updateProgress(); }
  }

  /* ---------------- premium provider UI ---------------- */
  // Voice plugins. Each provider is key-only-in-this-browser, with a test
  // button and a set-as-default action. Free-tier honesty: ElevenLabs free
  // credits are limited; browser neural voices are free and unlimited.
  var OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  var AZURE_VOICES = ["en-US-AriaNeural", "en-US-JennyNeural", "en-US-GuyNeural", "en-US-RyanNeural", "en-US-EmmaNeural", "en-GB-SoniaNeural", "en-GB-RyanNeural", "en-AU-NatashaNeural"];
  var GOOGLE_VOICES = ["en-US-Neural2-F", "en-US-Neural2-D", "en-US-Neural2-A", "en-US-Wavenet-F", "en-US-Wavenet-D", "en-GB-Neural2-B", "en-GB-Wavenet-B"];
  var PROVIDER_META = {
    none: { label: "Browser voice", fields: [] },
    elevenlabs: { label: "ElevenLabs", keyLabel: "ElevenLabs API key", keyPh: "sk_…", voiceLabel: "Voice ID", voicePh: "21m00Tcm4TlvDq8ikWAM (Rachel)", modelLabel: "Model", modelPh: "eleven_turbo_v2_5", help: "The most realistic voices. Find your key at elevenlabs.io → Profile → API Keys. Voice IDs are listed under each voice in VoiceLab — or load your voices below.", freeNote: "Free tier: about 10,000 characters a month — plenty for short listens, not for whole books. Browser neural voices are free and unlimited." },
    openai: { label: "OpenAI TTS", keyLabel: "OpenAI API key", keyPh: "sk-…", voiceLabel: "Voice", voicePh: "alloy", modelLabel: "Model", modelPh: "tts-1", voices: OPENAI_VOICES, help: "Create a key at platform.openai.com → API Keys. You pay OpenAI's TTS rates only.", freeNote: "No free tier — pay-as-you-go with OpenAI. Browser neural voices are free and unlimited." },
    azure: { label: "Azure Speech", keyLabel: "Azure subscription key", keyPh: "Your Azure Speech key", voiceLabel: "Neural voice", voicePh: "en-US-AriaNeural", modelLabel: "Region", modelPh: "eastus", voices: AZURE_VOICES, help: "From the Azure portal → your Speech resource → Keys and Endpoint. Region is the short code, e.g. eastus.", freeNote: "Free tier: 500,000 characters a month for neural voices. Browser neural voices are free and unlimited." },
    google: { label: "Google Cloud TTS", keyLabel: "Google Cloud API key", keyPh: "AIza…", voiceLabel: "Voice", voicePh: "en-US-Neural2-F", modelLabel: "—", modelPh: "", voices: GOOGLE_VOICES, help: "Enable Cloud Text-to-Speech in Google Cloud Console and create an API key. You pay Google's TTS rates only.", freeNote: "Free tier: 1 million characters a month for WaveNet/Neural2 (first year). Browser neural voices are free and unlimited." },
    "generic-tts": { label: "My own TTS server", keyLabel: "API key (leave blank for local servers)", keyPh: "Optional", voiceLabel: "Voice name", voicePh: "alloy", modelLabel: "Model", modelPh: "tts-1", help: "Any OpenAI-compatible /audio/speech endpoint — a local Kokoro or Piper server, or a hosted TTS API with the same shape. Kokoro sounds noticeably robotic next to the voices above, so treat it as a last resort, not a default.", freeNote: "Your server, your cost — usually free if it runs on your own computer." }
  };
  var elevenLabsVoices = []; // fetched from the account: [{voice_id, name}]
  function fetchElevenLabsVoices(key, done) {
    fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } })
      .then(function (r) { if (!r.ok) throw new Error("ElevenLabs HTTP " + r.status); return r.json(); })
      .then(function (j) {
        elevenLabsVoices = (j.voices || []).map(function (v) { return { voice_id: v.voice_id, name: v.name }; });
        done(null, elevenLabsVoices);
      })
      .catch(function (err) { done(err); });
  }
  function renderProviderForm() {
    var c = premiumCfg();
    var host = $("providerForm"); if (!host) return;
    host.innerHTML = "";
    document.querySelectorAll(".provider-card").forEach(function (card) {
      var active = card.dataset.provider === c.provider;
      card.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (!c.provider || c.provider === "none") {
      host.appendChild(el("p", "muted", "Using the free browser voice. Nothing to configure — press play and listen."));
      return;
    }
    var meta = PROVIDER_META[c.provider];
    var form = el("div");
    form.appendChild(el("p", "muted", meta.help || ""));
    if (meta.freeNote) form.appendChild(el("p", "muted", meta.freeNote));
    var isDefault = premiumActive() && premiumCfg().provider === c.provider;
    if (isDefault) form.appendChild(el("p", "muted", "★ This is your default voice for narration."));
    function field(labelText, id, type, ph, val) {
      var f = el("div", "field");
      f.appendChild(el("label", null, labelText));
      var input = document.createElement("input");
      input.id = id; input.type = type || "text"; input.placeholder = ph || ""; input.value = val || ""; input.autocomplete = "off";
      f.appendChild(input);
      form.appendChild(f);
      return input;
    }
    function selectField(labelText, id, options, current) {
      var f = el("div", "field");
      f.appendChild(el("label", null, labelText));
      var sel = document.createElement("select");
      sel.id = id;
      var opts = options.slice();
      if (current && opts.indexOf(current) === -1) opts.unshift(current);
      opts.forEach(function (o) {
        var op = el("option", null, o);
        op.value = o;
        if (o === current) op.selected = true;
        sel.appendChild(op);
      });
      f.appendChild(sel);
      form.appendChild(f);
      return sel;
    }
    var keyInput = field(meta.keyLabel, "pvKey", "password", meta.keyPh, c.key || "");
    var voiceInput;
    if (meta.voices) voiceInput = selectField(meta.voiceLabel, "pvVoice", meta.voices, c.voiceId || meta.voices[0]);
    else voiceInput = field(meta.voiceLabel, "pvVoice", "text", meta.voicePh, c.voiceId || "");
    var modelInput = null;
    if (meta.modelLabel && meta.modelLabel !== "—") modelInput = field(meta.modelLabel, "pvModel", "text", meta.modelPh, (c.provider === "azure" ? (c.region || "") : (c.model || "")));
    var baseInput = null;
    if (c.provider === "generic-tts") baseInput = field("Endpoint base URL", "pvBase", "url", "http://localhost:8880/v1", c.baseUrl || "");
    // ElevenLabs: load the account's voices + clone-a-voice flow.
    var voiceListSel = null;
    if (c.provider === "elevenlabs") {
      var loadRow = el("div"); loadRow.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px";
      var loadBtn = el("button", "btn btn-ghost btn-small", "↻ Load my ElevenLabs voices");
      loadBtn.type = "button";
      loadBtn.addEventListener("click", function () {
        var key = keyInput.value.trim();
        if (!key) { toast("Paste your ElevenLabs key first."); return; }
        setBusy(loadBtn, true, "Loading…");
        fetchElevenLabsVoices(key, function (err, list) {
          setBusy(loadBtn, false, "↻ Load my ElevenLabs voices");
          if (err) { toast("Couldn't load voices: " + (err.message || "check your key.")); return; }
          voiceListSel.innerHTML = "";
          list.forEach(function (v) {
            var op = el("option", null, v.name);
            op.value = v.voice_id;
            if (v.voice_id === voiceInput.value.trim()) op.selected = true;
            voiceListSel.appendChild(op);
          });
          toast("Loaded " + list.length + " voice(s). Pick one to use it.");
        });
      });
      loadRow.appendChild(loadBtn);
      form.appendChild(loadRow);
      var vlField = el("div", "field");
      vlField.appendChild(el("label", null, "My voices (load them first)"));
      voiceListSel = document.createElement("select");
      voiceListSel.id = "pvVoiceList";
      var placeholder = el("option", null, "— Load my voices to choose —");
      placeholder.value = "";
      voiceListSel.appendChild(placeholder);
      elevenLabsVoices.forEach(function (v) {
        var op = el("option", null, v.name);
        op.value = v.voice_id;
        if (v.voice_id === (c.voiceId || "")) op.selected = true;
        voiceListSel.appendChild(op);
      });
      voiceListSel.addEventListener("change", function () {
        if (voiceListSel.value) voiceInput.value = voiceListSel.value;
      });
      vlField.appendChild(voiceListSel);
      form.appendChild(vlField);
      // Clone a voice (Instant Voice Clone): 1+ min of clean sample audio.
      var cloneBox = el("div", "field");
      cloneBox.appendChild(el("label", null, "Clone a voice (ElevenLabs Instant Voice Clone)"));
      var cloneHint = el("p", "muted", "Upload 1+ minute of clean sample audio — one voice, no music, no background noise. The clone is created in your ElevenLabs account with your key.");
      cloneBox.appendChild(cloneHint);
      var cloneName = document.createElement("input");
      cloneName.id = "pvCloneName"; cloneName.type = "text"; cloneName.placeholder = "Clone name, e.g. My Reading Voice"; cloneName.maxLength = 60;
      cloneBox.appendChild(cloneName);
      var cloneFile = document.createElement("input");
      cloneFile.id = "pvCloneFile"; cloneFile.type = "file"; cloneFile.accept = "audio/*"; cloneFile.style.marginTop = "8px";
      cloneBox.appendChild(cloneFile);
      var cloneBtn = el("button", "btn btn-ghost btn-small", "＋ Clone this voice");
      cloneBtn.type = "button"; cloneBtn.style.marginTop = "8px";
      cloneBtn.addEventListener("click", function () {
        var key = keyInput.value.trim();
        var name = cloneName.value.trim();
        var file = cloneFile.files && cloneFile.files[0];
        if (!key) { toast("Paste your ElevenLabs key first."); return; }
        if (!name) { toast("Give the clone a name first."); return; }
        if (!file) { toast("Choose a sample audio file first (1+ minute, clean)."); return; }
        setBusy(cloneBtn, true, "Cloning…");
        var fd = new FormData();
        fd.append("name", name);
        fd.append("files", file);
        fetch("https://api.elevenlabs.io/v1/voices/add", { method: "POST", headers: { "xi-api-key": key }, body: fd })
          .then(function (r) { if (!r.ok) throw new Error("ElevenLabs HTTP " + r.status); return r.json(); })
          .then(function (j) {
            setBusy(cloneBtn, false, "＋ Clone this voice");
            var vid = j.voice_id || "";
            voiceInput.value = vid;
            var next = premiumCfg(); next.provider = "elevenlabs"; next.key = key; next.voiceId = vid;
            storeSet(LS.premium, next);
            toast("Cloned “" + name + "” — it is now your ElevenLabs voice.");
            renderProviderForm();
          })
          .catch(function (err) {
            setBusy(cloneBtn, false, "＋ Clone this voice");
            toast("Clone failed: " + (err && err.message ? err.message : "check your key and sample file."));
          });
      });
      cloneBox.appendChild(cloneBtn);
      form.appendChild(cloneBox);
    }
    function readFormInto(next) {
      next.provider = c.provider;
      next.key = keyInput.value.trim();
      next.voiceId = voiceInput.value.trim();
      if (modelInput) { if (c.provider === "azure") next.region = modelInput.value.trim(); else next.model = modelInput.value.trim(); }
      if (baseInput) next.baseUrl = baseInput.value.trim();
      return next;
    }
    var row = el("div"); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
    var save = el("button", "btn btn-gold btn-small", "Save provider");
    save.type = "button";
    save.addEventListener("click", function () {
      storeSet(LS.premium, readFormInto(premiumCfg()));
      toast(meta.label + " saved — it will be used for narration.");
      renderProviderForm();
    });
    var setDefault = el("button", "btn btn-gold btn-small", "★ Set as default voice");
    setDefault.type = "button";
    setDefault.addEventListener("click", function () {
      var next = readFormInto(premiumCfg());
      if (!next.key && c.provider !== "generic-tts") { toast("Paste your " + meta.label + " key first, then set it as default."); return; }
      storeSet(LS.premium, next);
      toast(meta.label + " is now your default voice.");
      renderProviderForm();
    });
    var test = el("button", "btn btn-ghost btn-small", "▶ Test voice");
    test.type = "button";
    test.addEventListener("click", function () {
      var next = readFormInto(premiumCfg());
      storeSet(LS.premium, next);
      if (!next.key && c.provider !== "generic-tts") { toast("Paste your " + meta.label + " key first, then test."); return; }
      setBusy(test, true, "Testing…");
      premiumFetchAudio("Hello — this is Auralis, reading in your premium voice.").then(function (blob) {
        setBusy(test, false, "▶ Test voice");
        var audio = new Audio(URL.createObjectURL(blob));
        audio.play().catch(function () { toast("Test audio was ready but playback was blocked — tap again."); });
        toast(meta.label + " is working.");
      }).catch(function (err) {
        setBusy(test, false, "▶ Test voice");
        toast("Test failed: " + (err && err.message ? err.message : "check your key and try again."));
      });
    });
    var clear = el("button", "btn btn-ghost btn-small", "Remove key");
    clear.type = "button";
    clear.addEventListener("click", function () {
      var next = premiumCfg(); next.key = ""; next.provider = "none"; next.voiceId = ""; next.model = ""; next.region = ""; next.baseUrl = "";
      storeSet(LS.premium, next);
      renderProviderForm();
      toast("Premium provider removed — back to the free browser voice.");
    });
    row.appendChild(save); row.appendChild(setDefault); row.appendChild(test); row.appendChild(clear);
    form.appendChild(row);
    form.appendChild(el("p", "muted", "Your key is stored only in this browser (localStorage). It is sent only to " + meta.label + ", only when you play or test."));
    host.appendChild(form);
  }

  /* ---------------- library ---------------- */
  function library() { return storeGet(LS.library, []) || []; }
  function saveLibrary(items) { storeSet(LS.library, items); renderLibrary(); }
  function saveToLibrary(silentAuto) {
    if (!state.paragraphs.length) { if (!silentAuto) toast("Nothing to save yet — open an article first."); return; }
    var items = library();
    var existing = items.findIndex(function (i) { return i.title === state.title && i.source === state.source; });
    var entry = {
      id: "lib-" + Date.now(),
      title: state.title, source: state.source, byline: state.byline,
      body: state.paragraphs.join("\n\n"),
      sentence: Math.max(0, state.currentSentence),
      savedAt: new Date().toISOString()
    };
    if (existing >= 0) { entry.id = items[existing].id; items[existing] = entry; }
    else items.unshift(entry);
    saveLibrary(items.slice(0, 100));
    if (!silentAuto) toast("Saved to your Library.");
  }
  function saveProgressToLibrary(quiet) {
    // Light-touch autosave: only updates an existing entry, never creates noise.
    if (!state.paragraphs.length) return;
    var items = library();
    var idx = items.findIndex(function (i) { return i.title === state.title && i.source === state.source; });
    if (idx >= 0) { items[idx].sentence = Math.max(0, state.currentSentence); items[idx].body = state.paragraphs.join("\n\n"); saveLibrary(items); }
  }
  function renderLibrary() {
    var list = $("libraryList"); if (!list) return;
    list.innerHTML = "";
    var items = library();
    $("libraryEmpty").hidden = items.length > 0;
    items.forEach(function (item) {
      var row = el("div", "library-row");
      var info = el("div", "lib-info");
      info.appendChild(el("div", "lib-title", item.title));
      var when = "";
      try { when = new Date(item.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch (e) {}
      info.appendChild(el("div", "lib-meta", (item.source || "") + (when ? " · saved " + when : "") + " · " + wordsOf(item.body || "") + " words"));
      row.appendChild(info);
      var open = el("button", "btn btn-gold btn-small", "▶ Resume");
      open.type = "button";
      open.addEventListener("click", function () {
        openArticle(item.title, item.source || "", item.byline || "", item.body || "");
        var target = clamp(item.sentence || 0, 0, Math.max(0, state.sentences.length - 1));
        state.currentSentence = target;
        highlightSentence(target);
        updateProgress();
        toast("Resumed where you left off.");
      });
      var del = el("button", "btn btn-ghost btn-small", "Delete");
      del.type = "button";
      del.addEventListener("click", function () {
        saveLibrary(library().filter(function (i) { return i.id !== item.id; }));
        toast("Removed from Library.");
      });
      row.appendChild(open); row.appendChild(del);
      list.appendChild(row);
    });
  }

  /* ---------------- AI apps hub ---------------- */
  function aiApps() { return storeGet(LS.apps, []) || []; }
  function saveApps(items) { storeSet(LS.apps, items); renderApps(); }
  function normaliseBaseUrl(u) { return String(u || "").trim().replace(/\/+$/, ""); }
  function aiPromptFor(action, articleText, question, lang) {
    var clipped = articleText.length > 12000 ? articleText.slice(0, 12000) + "\n\n[…article trimmed for length…]" : articleText;
    if (action === "Summarize") return "Summarise this article in plain language. Give the main point first, then up to 5 short bullet points, then one sentence on why it matters.\n\nARTICLE:\n" + clipped;
    if (action === "Explain") return "Explain this article like I'm five years old. Use simple words, short sentences, and one everyday analogy. No jargon without explaining it.\n\nARTICLE:\n" + clipped;
    if (action === "Ask") return "Answer this question about the article below. Answer only from the article; if the article doesn't say, say so plainly. Keep it short and plain.\n\nQUESTION: " + (question || "What is this article about?") + "\n\nARTICLE:\n" + clipped;
    if (action === "Translate") return "Translate this article into " + (lang || "Spanish") + ". Keep paragraph breaks. Translate faithfully, in natural everyday language.\n\nARTICLE:\n" + clipped;
    return "Summarise this article briefly.\n\nARTICLE:\n" + clipped;
  }
  function callAiApp(app, prompt) {
    var base = normaliseBaseUrl(app.baseUrl);
    var headers = { "Content-Type": "application/json" };
    if ((app.key || "").trim()) headers["Authorization"] = "Bearer " + app.key.trim();
    return fetch(base + "/chat/completions", {
      method: "POST", headers: headers,
      body: JSON.stringify({ model: app.model, messages: [{ role: "user", content: prompt }], temperature: 0.4 })
    }).then(function (resp) {
      if (!resp.ok) throw new Error("HTTP " + resp.status + " from " + base);
      return resp.json();
    }).then(function (j) {
      var text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!text) throw new Error("The app replied, but with no text.");
      return String(text).trim();
    });
  }
  function renderApps() {
    var grid = $("appGrid"); if (!grid) return;
    grid.innerHTML = "";
    var apps = aiApps();
    var sel = $("aiAppSelect");
    if (sel) {
      var cur = sel.value;
      sel.innerHTML = "";
      if (!apps.length) sel.appendChild(el("option", null, "— Add an AI app first —"));
      apps.forEach(function (a) {
        var opt = el("option", null, a.name + " · " + a.model + (a.enabled === false ? " (disabled)" : ""));
        opt.value = a.id;
        if (a.id === cur) opt.selected = true;
        sel.appendChild(opt);
      });
    }
    if (!apps.length) {
      grid.appendChild(el("div", "app-empty", "No AI apps yet. Add one above — OpenAI, Groq, OpenRouter, Ollama, LM Studio, or any OpenAI-compatible endpoint. Your keys stay in this browser."));
      return;
    }
    apps.forEach(function (app) {
      var card = el("div", "app-card" + (app.enabled === false ? " disabled" : ""));
      card.appendChild(el("span", "app-purpose", app.purpose || "Summarize"));
      card.appendChild(el("h3", null, app.name));
      if (app.localDetected) card.appendChild(el("span", "app-connected", "● Connected — found on this computer"));
      card.appendChild(el("p", null, app.notes || "OpenAI-compatible chat app."));
      card.appendChild(el("div", "app-model", (app.model || "") + " · " + normaliseBaseUrl(app.baseUrl)));
      var actions = el("div", "app-actions");
      var toggle = el("button", "btn btn-dark btn-small", app.enabled === false ? "Enable" : "Disable");
      toggle.type = "button";
      toggle.addEventListener("click", function () {
        app.enabled = app.enabled === false ? true : false;
        saveApps(aiApps().map(function (a) { return a.id === app.id ? app : a; }));
        toast(app.name + (app.enabled === false ? " disabled." : " enabled."));
      });
      var test = el("button", "btn btn-ghost btn-small", "Test connection");
      test.type = "button";
      test.addEventListener("click", function () {
        setBusy(test, true, "Testing…");
        callAiApp(app, "Reply with exactly: OK — connection works.").then(function (txt) {
          setBusy(test, false, "Test connection");
          toast(app.name + " works: " + txt.slice(0, 60));
        }).catch(function (err) {
          setBusy(test, false, "Test connection");
          toast("Test failed: " + (err && err.message ? err.message : "check the base URL, model and key."));
        });
      });
      var del = el("button", "btn btn-ghost btn-small", "Delete");
      del.type = "button";
      del.addEventListener("click", function () {
        saveApps(aiApps().filter(function (a) { return a.id !== app.id; }));
        toast(app.name + " deleted.");
      });
      actions.appendChild(toggle); actions.appendChild(test); actions.appendChild(del);
      card.appendChild(actions);
      grid.appendChild(card);
    });
  }
  function updateAiAvailability() {
    var btn = $("runAiBtn");
    if (btn) btn.disabled = !state.paragraphs.length;
  }

  /* Auto-detect a local Ollama server in the background. If it answers,
   * it appears in the AI hub as "Connected". If it isn't there, nothing
   * happens and no error is ever shown. */
  function autoDetectLocalAI() {
    if (typeof fetch !== "function") return;
    var controller = null;
    var timeoutId = null;
    try {
      controller = new AbortController();
      timeoutId = setTimeout(function () { try { controller.abort(); } catch (e) {} }, 2500);
    } catch (e) { controller = null; }
    var opts = {};
    if (controller) opts.signal = controller.signal;
    fetch("http://localhost:11434/api/tags", opts).then(function (resp) {
      if (timeoutId) clearTimeout(timeoutId);
      if (!resp.ok) return;
      return resp.json();
    }).then(function (j) {
      if (!j) return;
      var models = (j.models || []).map(function (m) { return m.name; }).filter(Boolean);
      var apps = aiApps();
      if (apps.some(function (a) { return String(a.baseUrl || "").indexOf("localhost:11434") !== -1; })) return;
      apps.unshift({
        id: "app-ollama-local", name: "Ollama (local)", baseUrl: "http://localhost:11434/v1",
        model: models[0] || "llama3.2", purpose: "Summarize", key: "",
        notes: "Found on this computer — runs locally, no key needed.",
        enabled: true, localDetected: true, createdAt: new Date().toISOString()
      });
      saveApps(apps);
    }).catch(function () { /* Ollama isn't there — stay quiet */ });
  }

  /* ---------------- PWA install + service worker ---------------- */
  var deferredInstallPrompt = null;
  function wireInstall() {
    window.addEventListener("beforeinstallprompt", function (ev) {
      ev.preventDefault();
      deferredInstallPrompt = ev;
      var hint = $("installAppHint");
      if (hint) hint.textContent = "Your browser is ready — tap the button above to install Auralis.";
    });
    window.addEventListener("appinstalled", function () {
      deferredInstallPrompt = null;
      var hint = $("installAppHint");
      if (hint) hint.textContent = "Installed — look for the gold A on your home screen or apps list.";
      toast("Auralis installed. Enjoy listening.");
    });
    var btn = $("installAppBtn");
    if (btn) btn.addEventListener("click", function () {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(function () { deferredInstallPrompt = null; });
      } else {
        toast("To install: open the ⋮ menu and tap “Install app” or “Add to Home screen.”");
        var hint = $("installAppHint");
        if (hint) hint.textContent = "No install prompt right now — use your browser's ⋮ menu → “Install app” or “Add to Home screen.” On iPhone Safari: Share → Add to Home Screen.";
      }
    });
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () { /* offline install is a bonus, never a blocker */ });
      });
    }
  }

  /* ---------------- wire up ---------------- */
  function init() {
    wireCoffee();
    wireInstall();
    renderSamples();
    renderLibrary();
    renderApps();
    renderProviderForm();

    // Restore saved voice prefs.
    var savedVoice = storeGet(LS.voice, {}) || {};
    var rate = $("rateRange"), pitch = $("pitchRange");
    if (rate) { rate.value = String(savedVoice.rate || PREFS.rate || 1); $("speedReadout").textContent = parseFloat(rate.value).toFixed(2).replace(/0$/, "") + "×"; }
    if (pitch) pitch.value = String(savedVoice.pitch || PREFS.pitch || 1);

    // URL form.
    $("urlForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      readUrl($("urlInput").value);
    });
    $("pasteTextBtn").addEventListener("click", openPasteModal);
    $("pasteCancelBtn").addEventListener("click", closePasteModal);
    $("pasteModal").addEventListener("click", function (ev) { if (ev.target === $("pasteModal")) closePasteModal(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closePasteModal(); });
    $("pasteReadBtn").addEventListener("click", readPastedText);
    $("uploadBtn").addEventListener("click", function () { $("fileInput").click(); });
    $("fileInput").addEventListener("change", function (ev) {
      if (ev.target.files && ev.target.files[0]) handleFile(ev.target.files[0]);
      ev.target.value = "";
    });
    $("surpriseBtn").addEventListener("click", function () {
      var s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
      openArticle(s.title, s.source, "Auralis · original sample", s.body);
    });

    // Player.
    $("playPauseBtn").addEventListener("click", togglePlayPause);
    wireFollowListeners();
    var followBtn = $("followBtn");
    if (followBtn) followBtn.addEventListener("click", function () {
      setAutoFollow(true, true);
      var spans = wordSpans();
      var idx = state.sentences.length && state.currentSentence >= 0
        ? state.sentences[state.currentSentence].startWord : 0;
      if (spans[idx]) { try { lastProgrammaticScroll = Date.now(); spans[idx].scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {} }
    });
    var followToggle = $("followToggle");
    if (followToggle) followToggle.addEventListener("change", function () { setAutoFollow(followToggle.checked); });
    var followToggleB = $("followToggleBottom");
    if (followToggleB) followToggleB.addEventListener("change", function () { setAutoFollow(followToggleB.checked); });
    var playBottom = $("playPauseBtnBottom");
    if (playBottom) playBottom.addEventListener("click", togglePlayPause);
    var prevBottom = $("prevBtnBottom");
    if (prevBottom) prevBottom.addEventListener("click", function () { skipSentence(-1); });
    var nextBottom = $("nextBtnBottom");
    if (nextBottom) nextBottom.addEventListener("click", function () { skipSentence(1); });

    // Skip 15 seconds back / forward.
    var skipBack = $("skipBackBtn");
    if (skipBack) skipBack.addEventListener("click", function () { skipSeconds(-1); });
    var skipFwd = $("skipFwdBtn");
    if (skipFwd) skipFwd.addEventListener("click", function () { skipSeconds(1); });

    // Speed presets (both bars stay in sync).
    function applySpeedPreset(val) {
      var r = $("rateRange");
      if (r) { r.value = String(val); $("speedReadout").textContent = parseFloat(val).toFixed(2).replace(/0$/, "") + "×"; }
      var a = $("speedPreset"); if (a) a.value = String(val);
      var b = $("speedPresetBottom"); if (b) b.value = String(val);
      persistVoiceChoice(); updateProgress();
    }
    var sp = $("speedPreset");
    if (sp) sp.addEventListener("change", function () { applySpeedPreset(sp.value); });
    var spB = $("speedPresetBottom");
    if (spB) spB.addEventListener("change", function () { applySpeedPreset(spB.value); });

    // Sleep timer.
    var sleepSel = $("sleepTimer");
    if (sleepSel) sleepSel.addEventListener("change", function () { setSleepTimer(parseInt(sleepSel.value, 10) || 0); });

    // Human-sounding voices only (default on).
    var humanToggle = $("humanOnlyToggle");
    if (humanToggle) humanToggle.addEventListener("change", function () {
      persistVoiceChoice();
      loadVoices();
      toast(humanToggle.checked ? "Showing human-sounding voices only." : "Showing all voices, including robotic ones.");
    });

    // Reader mode: distraction-free view, font size + Light / Sepia / Dark.
    var readerFontSize = 1.35;
    function applyReaderFont() {
      var body = $("articleBody");
      if (body) body.style.fontSize = readerFontSize.toFixed(2) + "rem";
      document.documentElement.style.setProperty("--reader-fs", readerFontSize.toFixed(2) + "rem");
    }
    function setReaderTheme(theme) {
      document.body.classList.remove("reader-light", "reader-sepia", "reader-dark");
      document.body.classList.add("reader-" + theme);
      document.querySelectorAll(".theme-btn").forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.theme === theme ? "true" : "false");
      });
    }
    function setReaderMode(on) {
      document.body.classList.toggle("reader-mode", !!on);
      var bar = $("readerModeBar");
      if (bar) bar.hidden = !on;
      if (on) { applyReaderFont(); setReaderTheme("light"); safeScrollIntoView($("reader"), "start"); }
    }
    var rmBtn = $("readerModeBtn");
    if (rmBtn) rmBtn.addEventListener("click", function () { setReaderMode(!document.body.classList.contains("reader-mode")); });
    var rmExit = $("exitReaderModeBtn");
    if (rmExit) rmExit.addEventListener("click", function () { setReaderMode(false); });
    var fDown = $("fontDownBtn");
    if (fDown) fDown.addEventListener("click", function () { readerFontSize = Math.max(1.0, readerFontSize - 0.1); applyReaderFont(); });
    var fUp = $("fontUpBtn");
    if (fUp) fUp.addEventListener("click", function () { readerFontSize = Math.min(1.6, readerFontSize + 0.1); applyReaderFont(); });
    document.querySelectorAll(".theme-btn").forEach(function (b) {
      b.addEventListener("click", function () { setReaderTheme(b.dataset.theme); });
    });

    // "More" — home screen stays to three big choices; everything else
    // lives behind this one clearly labelled toggle.
    var moreBtn = $("moreBtn");
    function setMore(on) {
      document.body.classList.toggle("show-more", !!on);
      if (moreBtn) { moreBtn.setAttribute("aria-expanded", on ? "true" : "false"); moreBtn.textContent = on ? "− Less" : "＋ More"; }
    }
    if (moreBtn) moreBtn.addEventListener("click", function () { setMore(!document.body.classList.contains("show-more")); });
    document.querySelectorAll(".site-nav a[href^='#']").forEach(function (a) {
      a.addEventListener("click", function () { setMore(true); });
    });

    // Auto-paste: if the clipboard holds a URL, offer it with one tap.
    // Clipboard access needs permission; a denial is silent — no error.
    var clipboardUrl = "";
    function tryClipboardUrl() {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") return;
      navigator.clipboard.readText().then(function (text) {
        var t = String(text || "").trim();
        if (/^https?:\/\/\S+$/i.test(t)) {
          clipboardUrl = t;
          var b = $("pasteClipboardBtn");
          if (b) b.hidden = false;
        }
      }).catch(function () { /* no clipboard permission — stay quiet */ });
    }
    var clipBtn = $("pasteClipboardBtn");
    if (clipBtn) clipBtn.addEventListener("click", function () {
      if (!clipboardUrl) return;
      $("urlInput").value = clipboardUrl;
      clipBtn.hidden = true;
      readUrl(clipboardUrl);
    });
    var urlInput = $("urlInput");
    if (urlInput) urlInput.addEventListener("focus", tryClipboardUrl);
    tryClipboardUrl();

    // Deep link: ?url=<article-url> auto-loads and offers to play at once.
    var deepLinkPending = false;
    try {
      var params = new URLSearchParams(window.location.search || "");
      var deepUrl = params.get("url");
      if (deepUrl) {
        deepLinkPending = true;
        if (urlInput) urlInput.value = deepUrl;
        readUrl(deepUrl);
      }
    } catch (e) { /* malformed deep link — ignore */ }
    // Hook openArticle's completion for the deep-link play offer.
    var _openArticle = openArticle;
    openArticle = function (title, source, byline, bodyText, clutterRemoved) {
      _openArticle(title, source, byline, bodyText, clutterRemoved);
      if (deepLinkPending) {
        deepLinkPending = false;
        showStatus("ok", "Loaded from your link — ready to listen",
          "This article was opened from a shared link. Press play whenever you're ready.",
          "▶ Listen now", function () { togglePlayPause(); });
      }
    };

    // Auto-detect local Ollama in the background. Silent if absent:
    // nothing is shown and no error appears unless it answers.
    autoDetectLocalAI();
    syncBottomBar();
    $("stopBtn").addEventListener("click", function () { stopPlayback(false); updateProgress(); toast("Stopped."); });
    $("prevSentenceBtn").addEventListener("click", function () { skipSentence(-1); });
    $("nextSentenceBtn").addEventListener("click", function () { skipSentence(1); });
    $("voiceSelect").addEventListener("change", persistVoiceChoice);
    rate.addEventListener("input", function () {
      $("speedReadout").textContent = parseFloat(rate.value).toFixed(2).replace(/0$/, "") + "×";
      persistVoiceChoice(); updateProgress();
    });
    pitch.addEventListener("input", persistVoiceChoice);
    $("saveToLibraryBtn").addEventListener("click", function () { saveToLibrary(false); });
    $("copyTextBtn").addEventListener("click", function () {
      var text = state.title + "\n\n" + state.paragraphs.join("\n\n");
      function done() { toast("Article text copied."); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast("Copy was blocked by the browser."); });
      else toast("Copy isn't available in this browser.");
    });

    // Premium provider cards.
    document.querySelectorAll(".provider-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var next = premiumCfg(); next.provider = card.dataset.provider;
        storeSet(LS.premium, next);
        renderProviderForm();
      });
    });

    // AI apps: add form.
    $("aiAppForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = $("appName").value.trim();
      var baseUrl = normaliseBaseUrl($("appBaseUrl").value);
      var model = $("appModel").value.trim();
      if (!name || !baseUrl || !model) { toast("Name, base URL and model are all required."); return; }
      try { new URL(baseUrl); } catch (e) { toast("That base URL doesn't look right — it should start with http(s)://"); return; }
      var apps = aiApps();
      apps.unshift({
        id: "app-" + Date.now(), name: name, baseUrl: baseUrl, model: model,
        purpose: $("appPurpose").value, key: $("appKey").value, notes: $("appNotes").value.trim(),
        enabled: true, createdAt: new Date().toISOString()
      });
      saveApps(apps);
      ev.target.reset();
      toast(name + " added. Tap Test connection on its card to check it.");
    });
    $("aiAction").addEventListener("change", function () {
      $("aiQuestionField").hidden = $("aiAction").value !== "Ask";
      $("aiLangField").hidden = $("aiAction").value !== "Translate";
    });
    $("exportAppsBtn").addEventListener("click", function () {
      var apps = aiApps();
      if (!apps.length) { toast("No AI apps to export yet."); return; }
      var blob = new Blob([JSON.stringify(apps, null, 2)], { type: "application/json" });
      try {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "auralis-ai-apps.json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 1000);
        toast("Exported " + apps.length + " app(s). Keep the file safe — it contains your keys.");
      } catch (e) {
        // Very old / restricted browsers without blob downloads.
        var reader = new FileReader();
        reader.onload = function () {
          var b = document.createElement("a");
          b.href = String(reader.result || "");
          b.download = "auralis-ai-apps.json";
          document.body.appendChild(b); b.click(); b.remove();
        };
        reader.readAsDataURL(blob);
        toast("Exported " + apps.length + " app(s) via fallback download.");
      }
    });
    $("importAppsBtn").addEventListener("click", function () { $("importAppsInput").click(); });
    $("importAppsInput").addEventListener("change", function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result || "[]"));
          if (!Array.isArray(data)) throw new Error("not an array");
          var valid = data.filter(function (a) { return a && a.name && a.baseUrl && a.model; }).map(function (a) {
            return { id: a.id || ("app-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7)), name: String(a.name).slice(0, 60), baseUrl: normaliseBaseUrl(a.baseUrl), model: String(a.model), purpose: a.purpose || "Summarize", key: a.key || "", notes: a.notes || "", enabled: a.enabled !== false, createdAt: a.createdAt || new Date().toISOString() };
          });
          if (!valid.length) { toast("That file had no valid AI apps in it."); return; }
          saveApps(valid.concat(aiApps()));
          toast("Imported " + valid.length + " app(s).");
        } catch (e) { toast("Couldn't import that file — it isn't valid Auralis app JSON."); }
      };
      reader.readAsText(file);
      ev.target.value = "";
    });
    // One-tap AI action, shared by the hub's Run button and the Reader's
    // "Summarize this" button. `forceAction` overrides the hub's select.
    function runAiAction(forceAction) {
      if (!state.paragraphs.length) { toast("Open an article first, then run an AI action on it."); return; }
      var sel = $("aiAppSelect");
      var app = aiApps().find(function (a) { return a.id === (sel ? sel.value : ""); });
      if (!app) {
        var enabled = aiApps().filter(function (a) { return a.enabled !== false; });
        if (enabled.length) app = enabled[0];
      }
      if (!app) {
        toast("Add an AI app first — the hub can also auto-detect Ollama on this computer.");
        document.body.classList.add("show-more");
        var moreBtn = $("moreBtn"); if (moreBtn) moreBtn.setAttribute("aria-expanded", "true");
        safeScrollIntoView($("ai-apps"));
        return;
      }
      if (app.enabled === false) { toast(app.name + " is disabled — enable it on its card first."); return; }
      var action = forceAction || $("aiAction").value;
      var question = ($("aiQuestion").value || "").trim();
      var lang = ($("aiLang").value || "").trim();
      if (action === "Ask" && !question) { toast("Type your question first."); $("aiQuestion").focus(); return; }
      var out = $("aiOutput");
      out.hidden = false;
      out.innerHTML = "";
      out.appendChild(el("h3", null, action + " — " + app.name));
      out.appendChild(el("p", null, "Asking " + app.name + " (" + app.model + ")… The article text is sent only to this app, only now."));
      safeScrollIntoView(out);
      var btn = $("runAiBtn");
      setBusy(btn, true, "Working…");
      callAiApp(app, aiPromptFor(action, state.paragraphs.join("\n\n"), question, lang)).then(function (txt) {
        setBusy(btn, false, "Run on this article");
        out.innerHTML = "";
        out.appendChild(el("h3", null, action + " — " + app.name));
        var pre = el("div", null, txt);
        out.appendChild(pre);
      }).catch(function (err) {
        setBusy(btn, false, "Run on this article");
        out.innerHTML = "";
        out.appendChild(el("h3", null, "That didn't work"));
        out.appendChild(el("p", null, (err && err.message ? err.message : "The app didn't reply.") + " Check the app's base URL, model and key — or test the connection on its card. (Local servers like Ollama need CORS enabled and the page served over http, not file://.)"));
      });
    }
    $("runAiBtn").addEventListener("click", function () { runAiAction(); });
    var summarizeBtn = $("summarizeBtn");
    if (summarizeBtn) summarizeBtn.addEventListener("click", function () { runAiAction("Summarize"); });
    $("aiNoArticleLink").addEventListener("click", function () {
      var u = $("urlInput"); if (u) u.focus();
    });

    // Voices.
    if ("speechSynthesis" in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      // Some browsers populate voices late; retry once.
      setTimeout(loadVoices, 800);
    } else {
      loadVoices();
    }

    updateAiAvailability();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
