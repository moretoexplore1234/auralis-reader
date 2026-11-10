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
    engine: "browser",     // "browser" | "free" | "premium"
    premiumAudio: null,
    premiumTimer: null,
    freeAudio: null,       // Audio element (or Google chain facade) for the free AI engine
    freeTimer: null,
    freeTransport: null,   // "edge" | "google" — decided on first play, per session
    edgeFailed: false,
    googleFailed: false,
    removedParagraphs: [], // paragraphs the Content Radar cut (restorable)
    radarKeptIndices: [],  // original paragraph index of each kept paragraph
    radarKept: 0,
    radarRemoved: 0,
    wordTimer: null,
    charOffsetBase: 0
  };

  var LS = {
    library: "auralis.library.v1",
    apps: "auralis.aiapps.v1",
    voice: "auralis.voice.v1",
    premium: "auralis.premium.v1",
    hf: "auralis.hf.v1"
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
    renderRadarResult();
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

  function openArticle(title, source, byline, bodyText, clutterRemoved, resumeAt) {
    if (!bodyText || wordsOf(bodyText) < 20) {
      showStatus("error", "Not enough text to read",
        "That page didn't give us enough readable text (under 20 words). Try <strong>Paste text</strong> instead — you can copy the article text into Auralis directly.",
        "Paste text instead", openPasteModal);
      return;
    }
    hideStatus();
    // Content Radar: score every paragraph and keep only the core.
    var paras = String(bodyText || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    var isX = /^X · @/.test(source || "");
    var radar = radarFilter(paras, isX);
    var keptText = radar.kept.map(function (p) { return p.text; }).join("\n\n");
    // Brief radar sweep animation, then build. The Hugging Face
    // double-check (if the visitor enabled it) runs first, with a hard
    // cap so a slow HF call can never stall the reader.
    var sweep = $("radarSweep");
    if (sweep) { sweep.hidden = false; sweep.classList.add("sweeping"); }
    var radarDone = false;
    function finishRadar() {
      if (radarDone) return;
      radarDone = true;
      if (sweep) { sweep.hidden = true; sweep.classList.remove("sweeping"); }
      // Strip UI-chrome sentences from the kept paragraphs — applied
      // after the HF double-check, so its verdicts are never discarded.
      // Cut chrome is counted in the clutter tally and listed under
      // "Show removed", so nothing is silently lost.
      var strip = stripChromeFromKept(radar.kept);
      state.removedParagraphs = radar.removed.concat(strip.chromeRemoved).sort(function (a, b) { return a.index - b.index; });
      state.radarKeptIndices = strip.kept.map(function (p) { return p.index; });
      state.radarKept = strip.kept.length;
      state.radarRemoved = state.removedParagraphs.length;
      state.clutterRemoved = (clutterRemoved || 0) + state.removedParagraphs.length;
      keptText = strip.kept.map(function (p) { return p.text; }).join("\n\n");
      if (!keptText.trim()) {
        showStatus("error", "Nothing readable left",
          "The Content Radar cut everything on this page — it looked like navigation and buttons, not an article. Try <strong>Paste text</strong> with the article text instead.",
          "Paste text instead", openPasteModal);
        return;
      }
      buildModel(title, source, byline, keptText);
      renderRadarResult();
      if (typeof resumeAt === "number" && state.sentences.length) {
        var target = clamp(resumeAt, 0, state.sentences.length - 1);
        state.currentSentence = target;
        highlightSentence(target);
        updateProgress();
      }
      saveProgressToLibrary(true);
      toast("Ready — press play to listen.");
    }
    if (hfEnabled() && radar.borderline.length) {
      var hfTimer = setTimeout(finishRadar, 8000);
      hfDoubleCheck(radar.borderline).then(function (adjust) {
        clearTimeout(hfTimer);
        if (adjust) {
          // HF verdicts adjusted the borderline scores in place; re-partition
          // by score (do NOT re-score — that would discard the verdicts).
          var all = radar.kept.concat(radar.removed).sort(function (a, b) { return a.index - b.index; });
          var kept = all.filter(function (p) { return p.score >= RADAR_KEEP; });
          var removed = all.filter(function (p) { return p.score < RADAR_KEEP; });
          radar = { kept: kept, removed: removed, borderline: [] };
          keptText = kept.map(function (p) { return p.text; }).join("\n\n");
        }
        finishRadar();
      }).catch(function () { clearTimeout(hfTimer); finishRadar(); });
    } else {
      setTimeout(finishRadar, 450);
    }
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
  var CLUTTER_PARA_RE = /^(read more|read next|continue reading|click (here|next|to continue|below)|next (page|article)|previous (page|article)|page \d+|related( articles?)?:?|you may also like|recommended( for you)?:?|more from|sign up|subscribe( (now|to|for))?|newsletter|share this|follow us|comments?|leave a (comment|reply)|advertisement|sponsored|back to top|skip to (content|main content)|accept cookies|cookie( policy| notice| settings)?|log ?in|sign ?in|trending( now| stories)?|photo: |caption: )/i;
  function isClutterParagraph(t) {
    if (CLUTTER_PARA_RE.test(t)) return true;
    if (/^read more[:\s]/i.test(t)) return true;
    if (/^\s*\d+\s*(of|\/)\s*\d+\s*$/.test(t)) return true; // "1 of 5" pagination
    if (/^\s*\d+\s*$/.test(t)) return true; // bare page number
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
    var bestRadarRemoved = 0;
    candidates.forEach(function (n) {
      var objs = Array.prototype.slice.call(n.querySelectorAll("p, h2, h3, blockquote, li"))
        .map(function (p) {
          var t = (p.textContent || "").replace(/\s+/g, " ").trim();
          var linkText = Array.prototype.slice.call(p.querySelectorAll("a"))
            .map(function (a) { return (a.textContent || "").length; })
            .reduce(function (a, b) { return a + b; }, 0);
          return { text: t, linkDensity: t.length ? linkText / t.length : 0 };
        })
        .filter(function (o) { return o.text.length > 40 && !isClutterParagraph(o.text); });
      // Radar at the DOM stage: link density + position are visible here.
      var r = radarFilterObjs(objs, false);
      var text = r.kept.map(function (o) { return o.text; }).join("\n\n");
      if (text.length > bestText.length) { bestText = text; bestParaCount = r.kept.length; bestRadarRemoved = r.removed.length; }
    });
    if (!bestText) {
      var bodyText = (doc.body ? doc.body.textContent : "").replace(/\s+/g, " ").trim();
      if (bodyText.length > 400) bestText = bodyText;
    }
    return { title: title, author: author, text: bestText, clutterRemoved: clutterRemoved + bestRadarRemoved, paragraphs: bestParaCount };
  }

  /* ---------------- Content Radar ----------------
   * Sweeps every loaded page/text like a radar and keeps ONLY the core
   * paragraphs that should be read aloud. Scores every block on length
   * (real sentences, not fragments), link density (low = real content),
   * and boilerplate signals (nav, ads, "read more", newsletter, cookie,
   * comments, share, subscribe, related). Anything below the bar is cut
   * — but never lost: the reader can show what was removed and restore
   * any paragraph with one tap. The radar works fully with no key and
   * no account; the Hugging Face double-check below is strictly optional.
   */
  var RADAR_BOILERPLATE = /^(show this thread|show replies|promoted|advertisement|sponsored|read more|read next|continue reading|click (here|next|to continue|below)|next (page|article)|previous (page|article)|page \d+|related( articles?)?:?|you may also like|recommended( for you)?:?|more from|sign up|subscribe( (now|to|for))?|newsletter|share this|follow us|comments?|leave a (comment|reply)|back to top|skip to (content|main content)|accept cookies|cookie( policy| notice| settings)?|log ?in|sign ?in|trending( now| stories)?|photo: |caption: )/i;
  var RADAR_KEEP = 25; // score >= 25 is core content
  function scoreParagraph(p, isX) {
    var text = p.text || "";
    var sentences = splitSentences(text).length;
    var words = wordsOf(text);
    var score = 0;
    if (words >= 25) score += 30; else if (words >= 12) score += 18; else if (words >= 6) score += 6;
    if (sentences >= 2) score += 20; else if (sentences === 1) score += 8;
    if (/[.!?]["'\u201d)]?\s*$/.test(text)) score += 10; // ends like a real sentence
    if (RADAR_BOILERPLATE.test(text)) score -= 60;
    if (CLUTTER_PARA_RE.test(text)) score -= 60;
    if (/^\s*\d+\s*(of|\/)\s*\d+\s*$/.test(text)) score -= 60; // "1 of 5" pagination
    if (/^\s*\d+\s*$/.test(text)) score -= 60; // bare page number
    if (isX && /^(show this thread|promoted)\b/i.test(text)) score -= 60;
    if ((p.linkDensity || 0) > 0.5) score -= 35; else if ((p.linkDensity || 0) > 0.3) score -= 15;
    // X posts are short by nature — don't punish brevity.
    if (isX && words >= 4) score += 10;
    return score;
  }
  /* UI-chrome sentences: site instructions and furniture that must
   * never be read aloud, even when they sit inside an otherwise real
   * paragraph ("Click next to continue", "Read more", "Subscribe to
   * our newsletter"). Patterns are anchored at the start of the
   * sentence, or match the whole sentence, so a real sentence that
   * merely mentions the words is kept. */
  var UI_CHROME_SENTENCE_RES = [
    /^(click|tap|press)\s+(here|next|to continue|below|above|to read more|for (more|details))\b/i,
    /^read more\b/i,
    /^continue reading\b/i,
    /^(next|previous)\s+(page|article|story)\b/i,
    /^page\s+\d+\b/i,
    /^\d+\s*(of|\/)\s*\d+$/i,
    /^subscribe\b/i,
    /^sign up\b/i,
    /^(log|sign)\s?in\b/i,
    /^share (this|on)\b/i,
    /^follow (us|me)\b/i,
    /^advertisement\.?$/i,
    /^sponsored(\s+(content|by))?\.?$/i,
    /^related articles?\.?$/i,
    /^you may also like\.?$/i,
    /^recommended( for you)?\.?$/i,
    /^back to top\.?$/i,
    /^skip to (content|main content)\.?$/i,
    /^accept cookies?\.?$/i,
    /^cookie (policy|notice|settings)\.?$/i,
    /^(leave a|write a) (comment|reply)\b/i,
    /^comments?\.?$/i,
    /^(get|sign up for) (our )?newsletter\b/i,
    /^newsletter\.?$/i,
    /^trending( now| stories)?\.?$/i,
    /^more from\b/i
  ];
  function isUiChromeSentence(s) {
    var t = String(s || "").trim();
    if (!t) return false;
    return UI_CHROME_SENTENCE_RES.some(function (re) { return re.test(t); });
  }
  // Strip UI-chrome sentences from one paragraph. Returns the cleaned
  // text plus the chrome that was cut, so the radar can count it and
  // show it under "Show removed".
  function stripUiChrome(text) {
    var sentences = splitSentences(text);
    var kept = [], removed = [];
    sentences.forEach(function (s) { if (isUiChromeSentence(s)) removed.push(s); else kept.push(s); });
    // Trailing "— click here / read more" fragment inside a kept sentence.
    var cleaned = kept.join(" ");
    var frag = cleaned.match(/\s*[—–-]\s*(click here|read more|continue reading)\b[^.!?]*[.!?]?\s*$/i);
    if (frag) { removed.push(frag[0].trim()); cleaned = cleaned.slice(0, frag.index).trim(); }
    return { text: cleaned, removed: removed };
  }
  function stripChromeFromKept(kept) {
    var out = [], chromeRemoved = [];
    kept.forEach(function (p) {
      var r = stripUiChrome(p.text);
      if (!r.text) {
        chromeRemoved.push({ text: p.text, index: p.index, score: 0, chrome: true });
      } else {
        out.push({ text: r.text, index: p.index, score: p.score, linkDensity: p.linkDensity });
        if (r.removed.length) chromeRemoved.push({ text: r.removed.join(" "), index: p.index, score: 0, chrome: true });
      }
    });
    return { kept: out, chromeRemoved: chromeRemoved };
  }
  function radarFilter(paras, isX) {
    return radarFilterObjs(paras.map(function (t, i) { return { text: t, linkDensity: 0, index: i }; }), isX);
  }
  function radarFilterObjs(objs, isX) {
    var kept = [], removed = [], borderline = [];
    objs.forEach(function (o, i) {
      o.index = (typeof o.index === "number") ? o.index : i;
      o.score = scoreParagraph(o, isX);
      if (o.score >= RADAR_KEEP) kept.push(o);
      else removed.push(o);
      if (Math.abs(o.score - RADAR_KEEP) <= 12) borderline.push(o);
    });
    return { kept: kept, removed: removed, borderline: borderline };
  }
  function renderRadarResult() {
    var note = $("cleanNote");
    if (note) {
      if (state.radarKept > 0) {
        note.hidden = false;
        note.textContent = "Radar found " + state.radarKept + " core paragraph" + (state.radarKept === 1 ? "" : "s") +
          (state.clutterRemoved > 0 ? " · removed " + state.clutterRemoved + " clutter block" + (state.clutterRemoved === 1 ? "" : "s") : " · nothing removed");
      } else note.hidden = true;
    }
    var box = $("radarRemovedBox");
    if (box) {
      var hasRemoved = state.removedParagraphs.length > 0;
      box.hidden = !hasRemoved;
      var toggle = $("radarRemovedToggle");
      if (toggle) toggle.textContent = hasRemoved ? "Show removed (" + state.removedParagraphs.length + ")" : "Show removed";
      var list = $("radarRemovedList");
      if (list && !list.hidden) renderRemovedList();
    }
  }
  function renderRemovedList() {
    var list = $("radarRemovedList"); if (!list) return;
    list.innerHTML = "";
    state.removedParagraphs.forEach(function (p, i) {
      var row = el("div", "removed-row");
      var preview = p.text.length > 140 ? p.text.slice(0, 140) + "…" : p.text;
      row.appendChild(el("span", "removed-text", preview));
      var restore = el("button", "btn btn-ghost btn-small", "Restore");
      restore.type = "button";
      restore.addEventListener("click", function () { restoreParagraph(i); });
      row.appendChild(restore);
      list.appendChild(row);
    });
    if (!state.removedParagraphs.length) list.appendChild(el("p", "muted", "Nothing removed — the radar kept everything."));
  }
  function restoreParagraph(i) {
    var p = state.removedParagraphs[i];
    if (!p) return;
    state.removedParagraphs.splice(i, 1);
    state.radarRemoved = Math.max(0, state.radarRemoved - 1);
    state.clutterRemoved = Math.max(0, state.clutterRemoved - 1);
    state.radarKept += 1;
    // Re-insert at its original position among the kept paragraphs.
    var keptIdx = state.radarKeptIndices.length ? state.radarKeptIndices : state.paragraphs.map(function (_, j) { return j; });
    var all = state.paragraphs.map(function (t, j) { return { text: t, index: keptIdx[j] != null ? keptIdx[j] : j }; });
    all.push({ text: p.text, index: p.index });
    all.sort(function (a, b) { return a.index - b.index; });
    state.radarKeptIndices = all.map(function (o) { return o.index; });
    buildModel(state.title, state.source, state.byline, all.map(function (o) { return o.text; }).join("\n\n"));
    renderRadarResult();
    toast("Paragraph restored — it will be read aloud.");
  }

  /* Optional Hugging Face double-check for borderline paragraphs.
   * Strictly optional and off by default: the radar works fully without
   * it. When the visitor enables it and pastes a free HF token (stored
   * only in localStorage), borderline paragraphs are checked with a
   * zero-shot classifier; a failure anywhere falls back to the local
   * radar, silently. Never a required path, never a shipped token. */
  function hfCfg() { return storeGet(LS.hf, { enabled: false, token: "" }) || { enabled: false, token: "" }; }
  function hfEnabled() { var c = hfCfg(); return !!c.enabled && !!(c.token || "").trim(); }
  function hfDoubleCheck(borderline) {
    var token = hfCfg().token.trim();
    var calls = borderline.slice(0, 8).map(function (p) {
      return fetch("https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: p.text.slice(0, 1000),
          parameters: { candidate_labels: ["main article content", "advertisement, navigation, or boilerplate"] }
        })
      }).then(function (r) { if (!r.ok) throw new Error("HF HTTP " + r.status); return r.json(); })
        .then(function (j) {
          var labels = j.labels || [], scores = j.scores || [];
          var b = labels.indexOf("advertisement, navigation, or boilerplate");
          var m = labels.indexOf("main article content");
          if (b >= 0 && scores[b] > 0.75) p.score = RADAR_KEEP - 1; // demote to removed
          else if (m === 0 && scores[0] > 0.75) p.score = RADAR_KEEP; // promote to kept
        }).catch(function () { /* HF failed for this paragraph — local radar stands */ });
    });
    return Promise.all(calls).then(function () { return true; });
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

  /* ---------------- speech: curated AI voices ---------------- */
  function currentRate() { var r = $("rateRange"); return r ? parseFloat(r.value) || 1 : (PREFS.rate || 1); }
  function currentPitch() { var p = $("pitchRange"); return p ? parseFloat(p.value) || 1 : (PREFS.pitch || 1); }
  function premiumVoiceName(u) {
    return (u && u.voice) ? 1 : 0;
  }
  /* ---------------- curated human-sounding AI voices ----------------
   * No device/browser voice is EVER listed here. On Carl's Pixel the
   * browser's own voices sounded robotic, and a 300-voice picker with
   * no descriptions was impossible to choose from. Only curated AI
   * voices appear: Microsoft Edge Read Aloud voices (free, no key)
   * and the free Google voice. Language first, then a small decisive
   * subset per language — never all languages mixed, never 300 voices.
   * Every Microsoft voice name below was verified against Microsoft's
   * live voice list (Nov 10, 2026). Each entry: Edge ShortName, label,
   * plain-language description, accent tag, gender, use-case tag.
   * The Google voice is added per language by renderVoiceCards(). */
  var VOICE_LANGUAGES = [
    { code: "en", label: "English", googleTl: "en", googleAccent: "US", sample: "Hello — I'm Auralis. I can read any article aloud for you, in a voice that sounds almost human.", voices: [
      { name: "en-US-AriaNeural", label: "Microsoft Aria", desc: "Warm, friendly American woman — our most natural free voice", accent: "US", gender: "Female", use: "Articles", recommended: true },
      { name: "en-US-JennyNeural", label: "Microsoft Jenny", desc: "Bright, upbeat American woman — great for stories", accent: "US", gender: "Female", use: "Stories" },
      { name: "en-US-GuyNeural", label: "Microsoft Guy", desc: "Calm, steady American man — great for long articles", accent: "US", gender: "Male", use: "Articles" },
      { name: "en-US-EmmaNeural", label: "Microsoft Emma", desc: "Clear, gentle American woman", accent: "US", gender: "Female", use: "News" },
      { name: "en-US-ChristopherNeural", label: "Microsoft Christopher", desc: "Steady American man, newsreader style", accent: "US", gender: "Male", use: "News" },
      { name: "en-GB-SoniaNeural", label: "Microsoft Sonia", desc: "Warm, clear British woman", accent: "UK", gender: "Female", use: "Articles" },
      { name: "en-GB-RyanNeural", label: "Microsoft Ryan (UK)", desc: "Warm, clear British man", accent: "UK", gender: "Male", use: "News" },
      { name: "en-AU-NatashaNeural", label: "Microsoft Natasha", desc: "Warm Australian woman", accent: "AU", gender: "Female", use: "Stories" }
    ]},
    { code: "es", label: "Spanish", googleTl: "es", googleAccent: "Spain", sample: "Hola, soy Auralis. Puedo leer cualquier artículo en voz alta para ti.", voices: [
      { name: "es-ES-ElviraNeural", label: "Microsoft Elvira", desc: "Warm, clear Spanish woman from Spain", accent: "Spain", gender: "Female", use: "Articles" },
      { name: "es-ES-AlvaroNeural", label: "Microsoft Alvaro", desc: "Calm, steady Spanish man from Spain", accent: "Spain", gender: "Male", use: "Articles" },
      { name: "es-ES-XimenaNeural", label: "Microsoft Ximena", desc: "Bright, friendly Spanish woman from Spain", accent: "Spain", gender: "Female", use: "Stories" },
      { name: "es-MX-DaliaNeural", label: "Microsoft Dalia", desc: "Warm, clear Mexican woman", accent: "Mexico", gender: "Female", use: "Articles" },
      { name: "es-MX-JorgeNeural", label: "Microsoft Jorge", desc: "Steady, clear Mexican man", accent: "Mexico", gender: "Male", use: "News" }
    ]},
    { code: "fr", label: "French", googleTl: "fr", googleAccent: "France", sample: "Bonjour, je suis Auralis. Je peux lire n'importe quel article à voix haute pour vous.", voices: [
      { name: "fr-FR-DeniseNeural", label: "Microsoft Denise", desc: "Warm, clear French woman", accent: "France", gender: "Female", use: "Articles" },
      { name: "fr-FR-HenriNeural", label: "Microsoft Henri", desc: "Calm, steady French man", accent: "France", gender: "Male", use: "Articles" },
      { name: "fr-FR-EloiseNeural", label: "Microsoft Eloise", desc: "Clear, gentle French woman", accent: "France", gender: "Female", use: "News" },
      { name: "fr-FR-VivienneMultilingualNeural", label: "Microsoft Vivienne", desc: "Bright, elegant French woman", accent: "France", gender: "Female", use: "Stories" },
      { name: "fr-FR-RemyMultilingualNeural", label: "Microsoft Remy", desc: "Warm, conversational French man", accent: "France", gender: "Male", use: "Stories" }
    ]},
    { code: "de", label: "German", googleTl: "de", googleAccent: "Germany", sample: "Hallo, ich bin Auralis. Ich kann jeden Artikel laut für dich vorlesen.", voices: [
      { name: "de-DE-KatjaNeural", label: "Microsoft Katja", desc: "Warm, clear German woman", accent: "Germany", gender: "Female", use: "Articles" },
      { name: "de-DE-ConradNeural", label: "Microsoft Conrad", desc: "Calm, steady German man", accent: "Germany", gender: "Male", use: "Articles" },
      { name: "de-DE-AmalaNeural", label: "Microsoft Amala", desc: "Bright, friendly German woman", accent: "Germany", gender: "Female", use: "Stories" },
      { name: "de-DE-KillianNeural", label: "Microsoft Killian", desc: "Clear, steady German man", accent: "Germany", gender: "Male", use: "News" },
      { name: "de-DE-FlorianMultilingualNeural", label: "Microsoft Florian", desc: "Warm German man", accent: "Germany", gender: "Male", use: "Stories" },
      { name: "de-DE-SeraphinaMultilingualNeural", label: "Microsoft Seraphina", desc: "Clear, gentle German woman", accent: "Germany", gender: "Female", use: "News" }
    ]},
    { code: "it", label: "Italian", googleTl: "it", googleAccent: "Italy", sample: "Ciao, sono Auralis. Posso leggere qualsiasi articolo ad alta voce per te.", voices: [
      { name: "it-IT-IsabellaNeural", label: "Microsoft Isabella", desc: "Warm, clear Italian woman", accent: "Italy", gender: "Female", use: "Articles" },
      { name: "it-IT-DiegoNeural", label: "Microsoft Diego", desc: "Calm, steady Italian man", accent: "Italy", gender: "Male", use: "Articles" },
      { name: "it-IT-ElsaNeural", label: "Microsoft Elsa", desc: "Bright, friendly Italian woman", accent: "Italy", gender: "Female", use: "Stories" },
      { name: "it-IT-GiuseppeMultilingualNeural", label: "Microsoft Giuseppe", desc: "Warm, conversational Italian man", accent: "Italy", gender: "Male", use: "Stories" }
    ]},
    { code: "pt", label: "Portuguese", googleTl: "pt", googleAccent: "Brazil", sample: "Olá, eu sou Auralis. Posso ler qualquer artigo em voz alta para você.", voices: [
      { name: "pt-BR-FranciscaNeural", label: "Microsoft Francisca", desc: "Warm, clear Brazilian woman", accent: "Brazil", gender: "Female", use: "Articles" },
      { name: "pt-BR-AntonioNeural", label: "Microsoft Antonio", desc: "Calm, steady Brazilian man", accent: "Brazil", gender: "Male", use: "Articles" },
      { name: "pt-BR-ThalitaMultilingualNeural", label: "Microsoft Thalita", desc: "Bright, friendly Brazilian woman", accent: "Brazil", gender: "Female", use: "Stories" }
    ]},
    { code: "he", label: "Hebrew", googleTl: "he", googleAccent: "Israel", sample: "שלום, אני אורליס. אני יכולה לקרוא כל מאמר בקול רם בשבילך.", voices: [
      { name: "he-IL-HilaNeural", label: "Microsoft Hila", desc: "Warm, clear Hebrew woman", accent: "Israel", gender: "Female", use: "Articles" },
      { name: "he-IL-AvriNeural", label: "Microsoft Avri", desc: "Calm, steady Hebrew man", accent: "Israel", gender: "Male", use: "Articles" }
    ]},
    { code: "ar", label: "Arabic", googleTl: "ar", googleAccent: "Saudi Arabia", sample: "مرحباً، أنا أوراليس. يمكنني قراءة أي مقال بصوت عالٍ لك.", voices: [
      { name: "ar-SA-ZariyahNeural", label: "Microsoft Zariyah", desc: "Warm, clear Arabic woman", accent: "Saudi Arabia", gender: "Female", use: "Articles" },
      { name: "ar-SA-HamedNeural", label: "Microsoft Hamed", desc: "Calm, steady Arabic man", accent: "Saudi Arabia", gender: "Male", use: "Articles" }
    ]},
    { code: "hi", label: "Hindi", googleTl: "hi", googleAccent: "India", sample: "नमस्ते, मैं औरालिस हूँ। मैं आपके लिए कोई भी लेख ज़ोर से पढ़ सकती हूँ।", voices: [
      { name: "hi-IN-SwaraNeural", label: "Microsoft Swara", desc: "Warm, clear Hindi woman", accent: "India", gender: "Female", use: "Articles" },
      { name: "hi-IN-MadhurNeural", label: "Microsoft Madhur", desc: "Calm, steady Hindi man", accent: "India", gender: "Male", use: "Articles" }
    ]},
    { code: "ja", label: "Japanese", googleTl: "ja", googleAccent: "Japan", sample: "こんにちは、私はオーラリスです。どんな記事でも音声で読み上げることができます。", voices: [
      { name: "ja-JP-NanamiNeural", label: "Microsoft Nanami", desc: "Warm, clear Japanese woman", accent: "Japan", gender: "Female", use: "Articles" },
      { name: "ja-JP-KeitaNeural", label: "Microsoft Keita", desc: "Calm, steady Japanese man", accent: "Japan", gender: "Male", use: "Articles" }
    ]},
    { code: "zh", label: "Chinese (Mandarin)", googleTl: "zh-CN", googleAccent: "China", sample: "你好，我是奥拉里斯。我可以大声朗读任何文章。", voices: [
      { name: "zh-CN-XiaoxiaoNeural", label: "Microsoft Xiaoxiao", desc: "Warm, clear Mandarin woman", accent: "China", gender: "Female", use: "Articles" },
      { name: "zh-CN-XiaoyiNeural", label: "Microsoft Xiaoyi", desc: "Clear, gentle Mandarin woman", accent: "China", gender: "Female", use: "News" },
      { name: "zh-CN-YunyangNeural", label: "Microsoft Yunyang", desc: "Calm, steady Mandarin man", accent: "China", gender: "Male", use: "Articles" },
      { name: "zh-CN-YunjianNeural", label: "Microsoft Yunjian", desc: "Warm Mandarin man", accent: "China", gender: "Male", use: "Stories" }
    ]}
  ];
  var DEFAULT_EDGE_VOICE = "en-US-AriaNeural";
  var ALL_EDGE_VOICES = [];
  VOICE_LANGUAGES.forEach(function (l) { l.voices.forEach(function (v) { ALL_EDGE_VOICES.push(v); }); });
  function languageEntry(code) {
    var found = null;
    VOICE_LANGUAGES.forEach(function (l) { if (l.code === code) found = l; });
    return found || VOICE_LANGUAGES[0];
  }
  function currentLanguage() {
    var saved = storeGet(LS.voice, {}) || {};
    var c = saved.lang;
    var ok = false;
    VOICE_LANGUAGES.forEach(function (l) { if (l.code === c) ok = true; });
    return ok ? c : "en";
  }
  function edgeVoiceByName(n) {
    var found = null;
    ALL_EDGE_VOICES.forEach(function (v) { if (v.name === n) found = v; });
    return found || ALL_EDGE_VOICES[0];
  }
  function localeOf(edgeName) {
    var parts = String(edgeName || "").split("-");
    return parts.length >= 2 ? parts[0] + "-" + parts[1] : "en-US";
  }
  function currentEdgeVoice() { return (currentVoiceChoice().edgeVoice || DEFAULT_EDGE_VOICE); }
  // The visitor's voice choice: which engine, and which voice in it.
  // Default = Microsoft Aria (Edge Read Aloud), free, no key — unless
  // the visitor picked otherwise. "browser" / "free" from older
  // versions no longer exist: the browser engine was removed because
  // device voices sounded robotic — they now fall back to Aria.
  function currentVoiceChoice() {
    var saved = storeGet(LS.voice, {}) || {};
    var v = (saved.engine || "").toString();
    if (v === "edge") return { engine: "edge", edgeVoice: saved.edgeVoice || DEFAULT_EDGE_VOICE, browserName: "" };
    if (v === "google") return { engine: "google", edgeVoice: DEFAULT_EDGE_VOICE, browserName: "" };
    return { engine: "edge", edgeVoice: DEFAULT_EDGE_VOICE, browserName: "" };
  }
  // The visitor's voice choice: which engine, and which voice in it.
  // Default = Microsoft Aria (Edge Read Aloud), free, no key — unless
  // the visitor picked otherwise.
  function currentVoiceChoice() {
    var saved = storeGet(LS.voice, {}) || {};
    var v = (saved.engine || "").toString();
    if (v === "edge" || v === "google" || v === "browser") {
      return { engine: v, edgeVoice: saved.edgeVoice || DEFAULT_EDGE_VOICE, browserName: saved.name || "" };
    }
    return { engine: "edge", edgeVoice: DEFAULT_EDGE_VOICE, browserName: "" };
  }
  // The voice picker: language-first, curated cards only.
  // No browser/device voice is ever listed or used.
  function renderReaderVoiceSelect() {
    var sel = $("voiceSelect"); if (!sel) return;
    var choice = currentVoiceChoice();
    var lang = languageEntry(currentLanguage());
    sel.innerHTML = "";
    var g1 = document.createElement("optgroup");
    g1.label = "Microsoft AI voices — free, no key";
    lang.voices.forEach(function (ev) {
      var opt = el("option", null, ev.label + " — " + ev.desc);
      opt.value = "edge:" + ev.name;
      if (choice.engine === "edge" && choice.edgeVoice === ev.name) opt.selected = true;
      g1.appendChild(opt);
    });
    sel.appendChild(g1);
    var gopt = el("option", null, "Google voice — clear, natural (free, no key)");
    gopt.value = "google:free";
    if (choice.engine === "google") gopt.selected = true;
    sel.appendChild(gopt);
    if (premiumActive()) {
      var g3 = document.createElement("optgroup");
      g3.label = "Premium voices — your key";
      var popt = el("option", null, "Premium: " + premiumCfg().provider + " (set below)");
      popt.value = "premium:" + premiumCfg().provider;
      g3.appendChild(popt);
      sel.appendChild(g3);
    }
    if (!sel.value) sel.value = "edge:" + lang.voices[0].name;
  }
  function voiceCard(entry, engine) {
    var card = el("div", "voice-card");
    var choice = currentVoiceChoice();
    var selected = engine === "edge" ? (choice.engine === "edge" && choice.edgeVoice === entry.name) : (choice.engine === "google");
    if (selected) card.classList.add("selected");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-pressed", selected ? "true" : "false");
    var top = el("div", "voice-card-top");
    top.appendChild(el("span", "voice-card-name", entry.label));
    if (entry.recommended) top.appendChild(el("span", "recommended-badge", "★ Recommended"));
    if (selected) top.appendChild(el("span", "voice-badge selected-badge", "✓ Selected"));
    card.appendChild(top);
    card.appendChild(el("div", "voice-desc", entry.desc));
    var tags = el("div", "voice-card-tags");
    [entry.accent, entry.gender, entry.use, "Free"].forEach(function (t) {
      tags.appendChild(el("span", "voice-tag", t));
    });
    card.appendChild(tags);
    var actions = el("div", "voice-card-actions");
    var pv = el("button", "btn btn-ghost btn-small", "▶ Preview");
    pv.type = "button";
    pv.addEventListener("click", function (ev) { ev.stopPropagation(); if (engine === "google") previewGoogleVoice(); else previewEdgeVoice(entry); });
    actions.appendChild(pv);
    var use = el("button", "btn btn-dark btn-small", selected ? "✓ Using" : "Use this voice");
    use.type = "button";
    use.addEventListener("click", function (ev) { ev.stopPropagation(); selectVoice(engine, entry.name); });
    actions.appendChild(use);
    card.appendChild(actions);
    card.addEventListener("click", function () { selectVoice(engine, entry.name); });
    card.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectVoice(engine, entry.name); }
    });
    return card;
  }
  function renderVoiceCards() {
    var wrap = $("voiceCards"); if (!wrap) return;
    wrap.innerHTML = "";
    var lang = languageEntry(currentLanguage());
    var sel = $("voiceLangSelect");
    if (sel && sel.value !== lang.code) sel.value = lang.code;
    lang.voices.forEach(function (v) { wrap.appendChild(voiceCard(v, "edge")); });
    wrap.appendChild(voiceCard({
      name: "google", label: "Google voice",
      desc: "Clear, natural — the free Google voice, played over the internet. No key, no credits.",
      accent: lang.googleAccent, gender: "Female", use: "Articles"
    }, "google"));
  }
  function updateVoiceEmptyState() {
    var box = $("voiceEmptyState"); if (!box) return;
    box.hidden = !(state.edgeFailed && state.googleFailed);
  }
  function loadVoices() {
    renderReaderVoiceSelect();
    renderVoiceCards();
    updateVoiceEmptyState();
    syncBottomBar();
  }
  function setVoiceLanguage(code) {
    var cur = storeGet(LS.voice, {}) || {};
    cur.lang = code;
    var entry = languageEntry(code);
    if (cur.engine === "edge") {
      var ok = false;
      entry.voices.forEach(function (v) { if (v.name === cur.edgeVoice) ok = true; });
      if (!ok) cur.edgeVoice = entry.voices[0].name;
    }
    storeSet(LS.voice, cur);
    state.freeTransport = null;
    state.edgeFailed = false; state.googleFailed = false;
    loadVoices();
  }
  function selectVoice(engine, edgeVoice) {
    var cur = storeGet(LS.voice, {}) || {};
    cur.engine = engine;
    if (engine === "edge") cur.edgeVoice = edgeVoice || DEFAULT_EDGE_VOICE;
    cur.name = "";
    cur.lang = currentLanguage();
    storeSet(LS.voice, cur);
    state.freeTransport = null; // re-decide the free transport for the new voice
    state.edgeFailed = false; state.googleFailed = false;
    loadVoices();
    var label = engine === "google" ? "the free Google voice" : edgeVoiceByName(cur.edgeVoice).label;
    toast("Voice set to " + label + " (free).");
  }
  function persistVoiceChoice() {
    var sel = $("voiceSelect");
    var val = sel ? sel.value : "";
    var cur = storeGet(LS.voice, {}) || {};
    var prev = currentVoiceChoice();
    cur.engine = "edge"; cur.edgeVoice = DEFAULT_EDGE_VOICE; cur.name = "";
    if (val.indexOf("edge:") === 0) { cur.engine = "edge"; cur.edgeVoice = val.slice(5); }
    else if (val.indexOf("google:") === 0) { cur.engine = "google"; }
    else if (val.indexOf("premium:") === 0) { cur.engine = prev.engine; cur.edgeVoice = prev.edgeVoice; }
    cur.lang = currentLanguage();
    var r = $("rateRange"), p = $("pitchRange");
    cur.rate = r ? parseFloat(r.value) : 1; cur.pitch = p ? parseFloat(p.value) : 1;
    storeSet(LS.voice, cur);
    state.freeTransport = null;
    syncBottomBar();
    renderVoiceCards();
  }

  /* ---------------- playback: free AI voices (Microsoft Edge Read Aloud + Google) ----------------
   * No key, no account, no credits. Microsoft Edge Read Aloud is the
   * default: real Microsoft Natural voices (Aria, Jenny, Guy…) served
   * from speech.platform.bing.com, the same endpoint Microsoft Edge uses
   * for Read Aloud. It works in Microsoft Edge; in other browsers the
   * handshake may be refused, so we fall back to the free Google voice
   * (translate.google.com TTS), which returns real MP3 audio.
   * Verified from this sandbox (Nov 10, 2026): voices list HTTP 200,
   * 170,998 bytes, 322 voices; the WebSocket synthesis handshake was
   * refused with HTTP 403 in every variant tried here (the sandbox's
   * egress proxy cannot pass the handshake), so Edge is best-effort in
   * the browser and the verified Google path is the fallback. Karaoke
   * highlighting is timer-estimated on this engine. */
  var EDGE_TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
  var EDGE_SEC_MS_GEC_VERSION = "1-141.0.3537.57";
  function edgeRateString() {
    var r = currentRate();
    var pct = Math.round((r - 1) * 100);
    return pct === 0 ? "+0%" : (pct > 0 ? "+" + pct + "%" : pct + "%");
  }
  function edgeSecMsGec() {
    // Sec-MS-GEC = uppercase hex SHA-256 of (5-minute-floored Windows
    // file-time ticks, as a decimal string) + TRUSTED_CLIENT_TOKEN.
    // Ticks are ~1.3e17 — beyond float64 precision — so use BigInt.
    if (!window.crypto || !crypto.subtle || typeof BigInt === "undefined") return Promise.reject(new Error("no secure crypto"));
    var ticks = (BigInt(Math.floor(Date.now() / 1000)) + 11644473600n) / 300n * 300n * 10000000n;
    var data = new TextEncoder().encode(ticks.toString() + EDGE_TRUSTED_CLIENT_TOKEN);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("").toUpperCase();
    });
  }
  var edgeWs = null;
  function edgeClose() {
    if (edgeWs) { try { edgeWs.close(); } catch (e) {} edgeWs = null; }
  }
  function edgeConnect() {
    if (edgeWs && edgeWs.readyState === 1) return Promise.resolve(edgeWs);
    if (state.edgeFailed) return Promise.reject(new Error("Microsoft voices unavailable"));
    return edgeSecMsGec().then(function (gec) {
      return new Promise(function (resolve, reject) {
        var connId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });
        var url = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=" + EDGE_TRUSTED_CLIENT_TOKEN + "&Sec-MS-GEC=" + gec + "&Sec-MS-GEC-Version=" + EDGE_SEC_MS_GEC_VERSION + "&ConnectionId=" + connId;
        var ws;
        try { ws = new WebSocket(url); } catch (e) { state.edgeFailed = true; reject(e); return; }
        ws.binaryType = "arraybuffer";
        edgeWs = ws;
        var done = false;
        var to = setTimeout(function () { if (!done) { done = true; try { ws.close(); } catch (e) {} reject(new Error("Microsoft voices timed out")); } }, 6000);
        ws.onopen = function () {
          if (done) return; done = true; clearTimeout(to);
          ws.send("Path:speech.config\r\nContent-Type:application/json; charset=utf-8\r\n\r\n" + JSON.stringify({ context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "true" }, outputFormat: "audio-24khz-48kbitrate-mono-mp3" } } } }));
          resolve(ws);
        };
        ws.onerror = function () { if (!done) { done = true; clearTimeout(to); state.edgeFailed = true; edgeWs = null; reject(new Error("Microsoft voices unavailable")); } };
        ws.onclose = function () { if (edgeWs === ws) edgeWs = null; };
      });
    });
  }
  function edgeSynthesize(text, voiceName, lang) {
    return edgeConnect().then(function (ws) {
      return new Promise(function (resolve, reject) {
        var chunks = [];
        var to = setTimeout(function () { cleanup(); reject(new Error("Microsoft synthesis timed out")); }, 25000);
        function onMsg(ev) {
          var data = ev.data;
          if (typeof data === "string") {
            if (data.indexOf("Path:turn.end") !== -1) {
              cleanup();
              if (!chunks.length) { reject(new Error("Microsoft returned no audio")); return; }
              resolve(new Blob(chunks, { type: "audio/mpeg" }));
            }
            return;
          }
          var hlen = new DataView(data).getUint16(0, false);
          var header = "";
          try { header = new TextDecoder().decode(data.slice(2, 2 + hlen)); } catch (e) {}
          if (header.indexOf("Path:audio") !== -1) chunks.push(data.slice(2 + hlen));
        }
        function cleanup() { clearTimeout(to); ws.removeEventListener("message", onMsg); }
        ws.addEventListener("message", onMsg);
        var ssml = "<speak version='1.0' xml:lang='" + esc(lang || "en-US") + "'><voice name='" + esc(voiceName) + "'><prosody rate='" + edgeRateString() + "'>" + esc(text) + "</prosody></voice></speak>";
        ws.send("Path:ssml\r\nContent-Type:application/ssml+xml\r\n\r\n" + ssml);
      });
    }).catch(function (err) { state.edgeFailed = true; throw err; });
  }
  function googleFreeUrl(text, tl) {
    return "https://translate.google.com/translate_tts?ie=UTF-8&q=" + encodeURIComponent(text) + "&tl=" + encodeURIComponent(tl || "en") + "&client=tw-ob";
  }
  // Chains several short Google TTS chunks behind one play/pause/onended
  // interface (Google caps each request at ~200 characters).
  function googleAudioChain(chunks) {
    var tl = languageEntry(currentLanguage()).googleTl;
    var audios = chunks.map(function (c) { var a = new Audio(googleFreeUrl(c, tl)); a.preload = "auto"; return a; });
    var i = 0, endedFn = null;
    audios.forEach(function (a, k) {
      a.addEventListener("ended", function () {
        if (k < audios.length - 1) { i = k + 1; audios[i].play().catch(function () {}); }
        else if (endedFn) endedFn();
      });
      a.addEventListener("error", function () {
        if (k < audios.length - 1) { i = k + 1; audios[i].play().catch(function () {}); }
        else if (endedFn) endedFn();
      });
    });
    return {
      play: function () { return audios[i].play(); },
      pause: function () { audios[i].pause(); },
      get currentTime() { return audios[i].currentTime || 0; },
      set currentTime(v) { try { audios[i].currentTime = v; } catch (e) {} },
      set onended(fn) { endedFn = fn; },
      get onended() { return endedFn; },
      set onerror(fn) { /* errors advance the chain; a final error ends it */ }
    };
  }
  function edgeSentenceAudio(text) {
    return edgeSynthesize(text, currentEdgeVoice(), localeOf(currentEdgeVoice())).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = new Audio(url);
      a.addEventListener("ended", function () { URL.revokeObjectURL(url); });
      return a;
    });
  }
  function googleSentenceAudio(text) {
    return Promise.resolve(googleAudioChain(chunkText(text, 180)));
  }
  function freeFetchAudio(text) {
    if (state.freeTransport === "google") return googleSentenceAudio(text);
    // Microsoft first; fall back to the free Google voice on any failure.
    return edgeSentenceAudio(text).then(function (a) {
      state.freeTransport = "edge";
      state.edgeFailed = false;
      return a;
    }).catch(function () {
      state.freeTransport = "google";
      state.edgeFailed = true;
      toast("Microsoft voices didn't answer — using the free Google voice instead.");
      return googleSentenceAudio(text);
    });
  }
  function freeWordTimer(s) {
    // Timer-estimated karaoke highlighting (the free audio path has no
    // word-boundary events in the browser).
    var words = s.text.split(/\s+/).filter(Boolean);
    var estMs = (words.length / (175 * currentRate())) * 60000;
    var wi = 0;
    clearTimeout(state.freeTimer);
    var step = Math.max(120, estMs / Math.max(1, words.length));
    var tick = function () {
      if (!state.playing || state.engine !== "free") return;
      highlightWord(s.startWord + wi);
      wi++;
      if (wi < words.length) state.freeTimer = setTimeout(tick, step);
    };
    tick();
  }
  function playFree(fromIdx) {
    if (!state.sentences.length) { toast("Open an article first."); return; }
    if (currentVoiceChoice().engine === "google") state.freeTransport = "google";
    state.playing = true; state.paused = false; state.engine = "free";
    setPlayButton(true);
    var start = typeof fromIdx === "number" ? fromIdx : (state.currentSentence < 0 ? 0 : state.currentSentence);
    var idx = start;
    function next() {
      if (!state.playing || state.engine !== "free") return;
      if (idx >= state.sentences.length) { finishPlayback(); return; }
      var s = state.sentences[idx];
      state.currentSentence = idx;
      highlightSentence(idx);
      updateProgress();
      freeWordTimer(s);
      state.freeAudio = null;
      freeFetchAudio(s.text).then(function (audio) {
        if (!state.playing || state.engine !== "free") return;
        state.freeAudio = audio;
        audio.onended = function () { idx++; next(); };
        audio.onerror = function () { idx++; next(); };
        if (state.paused) return; // resume will play it
        audio.play().catch(function () { idx++; next(); });
      }).catch(function () {
        // Both free transports failed. Never fall back to a robotic
        // device voice — say so honestly instead.
        state.playing = false; state.paused = false;
        state.googleFailed = true;
        setPlayButton(false);
        updateVoiceEmptyState();
        toast("Free AI voices aren't answering in this browser — try Microsoft Edge, or add a free ElevenLabs/Cartesia key below.");
      });
    }
    next();
  }
  function previewEdgeVoice(ev) {
    var sample = languageEntry(currentLanguage()).sample;
    edgeSynthesize(sample, ev.name, localeOf(ev.name)).then(function (blob) {
      var a = new Audio(URL.createObjectURL(blob));
      a.play().catch(function () { toast("Audio playback was blocked — tap play again."); });
    }).catch(function () {
      toast("Microsoft voices didn't answer — playing the free Google voice instead.");
      previewGoogleVoice();
    });
  }
  function previewGoogleVoice() {
    var lang = languageEntry(currentLanguage());
    var a = new Audio(googleFreeUrl(lang.sample, lang.googleTl));
    a.play().catch(function () { toast("Audio playback was blocked — tap play again."); });
  }

  function setPlayButton(playing) {
    var label = playing ? "⏸ Pause" : "▶ Play";
    var b = $("playPauseBtn"); if (b) b.textContent = label;
    var bb = $("playPauseBtnBottom"); if (bb) bb.textContent = label;
  }
  function syncBottomBar() {
    var nameEl = $("bottomVoiceName");
    if (!nameEl) return;
    if (premiumActive()) { nameEl.textContent = "Voice: " + premiumCfg().provider + " · " + (premiumCfg().voiceId || "default") + " (premium)"; return; }
    var choice = currentVoiceChoice();
    if (choice.engine === "edge") nameEl.textContent = "Voice: " + edgeVoiceByName(choice.edgeVoice).label + " · Microsoft AI (free)";
    else nameEl.textContent = "Voice: Google voice · free";
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
    if (state.engine === "free" && state.freeAudio) {
      try {
        state.freeAudio.currentTime = Math.max(0, state.freeAudio.currentTime + dir * 15);
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
    if (wasPlaying) { if (premiumActive()) playPremium(target); else playFree(target); }
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
    clearTimeout(state.freeTimer);
    if (state.premiumAudio) { try { state.premiumAudio.pause(); } catch (e) {} state.premiumAudio = null; }
    if (state.freeAudio) { try { state.freeAudio.pause(); } catch (e) {} state.freeAudio = null; }
    edgeClose();
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
    if (c.provider === "cartesia") {
      var cartesiaVoice = (c.voiceId || "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4").trim();
      return fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: { "X-API-Key": key, "Cartesia-Version": "2026-08-14", "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: (c.model || "sonic-3"), transcript: text, voice: { mode: "id", id: cartesiaVoice }, language: "en", output_format: { container: "mp3", encoding: "mp3", sample_rate: 44100 } })
      }).then(function (r) { if (!r.ok) throw new Error("Cartesia HTTP " + r.status); return r.blob(); });
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
        audio.onerror = function () { toast("Premium audio failed to play — using the free Microsoft AI voice instead."); state.playing = false; playFree(idx); };
        audio.play().catch(function () { toast("Audio playback was blocked — tap play again."); state.playing = false; setPlayButton(false); });
      }).catch(function (err) {
        toast("Premium voice failed (" + (err && err.message ? err.message : "error") + ") — using the free Microsoft AI voice instead.");
        state.playing = false;
        playFree(idx);
      });
    }
    next();
  }

  function togglePlayPause() {
    if (!state.sentences.length) { toast("Paste a link, some text, or open a sample first."); return; }
    if (state.playing && !state.paused) {
      if (state.engine === "premium" && state.premiumAudio) { state.premiumAudio.pause(); state.paused = true; setPlayButton(false); }
      else if (state.engine === "free") { if (state.freeAudio) state.freeAudio.pause(); state.paused = true; setPlayButton(false); }
      return;
    }
    if (state.playing && state.paused) {
      if (state.engine === "premium" && state.premiumAudio) { state.premiumAudio.play(); state.paused = false; setPlayButton(true); }
      else if (state.engine === "free") {
        state.paused = false; setPlayButton(true);
        if (state.freeAudio) state.freeAudio.play().catch(function () {});
      }
      return;
    }
    // Fresh play: premium if configured, else the chosen free AI voice.
    // Pressing play is the user asking to follow along again.
    setAutoFollow(true, true);
    var restart = state.currentSentence >= state.sentences.length - 1 ? 0 : undefined;
    if (premiumActive()) playPremium(restart);
    else playFree(restart);
  }

  function skipSentence(dir) {
    if (!state.sentences.length) return;
    var next = clamp((state.currentSentence < 0 ? 0 : state.currentSentence) + dir, 0, state.sentences.length - 1);
    var wasPlaying = state.playing && !state.paused;
    stopPlayback(true);
    state.currentSentence = next - 1; // play functions advance from here
    if (wasPlaying) { if (premiumActive()) playPremium(next); else playFree(next); }
    else { state.currentSentence = next; highlightSentence(next); updateProgress(); }
  }

  /* ---------------- premium provider UI ---------------- */
  // Voice plugins. Each provider is key-only-in-this-browser, with a test
  // button and a set-as-default action. Free-tier honesty: ElevenLabs and
  // Cartesia free credits are limited; the Microsoft AI voices are free
  // and unlimited, no key at all.
  var OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  var AZURE_VOICES = ["en-US-AriaNeural", "en-US-JennyNeural", "en-US-GuyNeural", "en-US-RyanNeural", "en-US-EmmaNeural", "en-GB-SoniaNeural", "en-GB-RyanNeural", "en-AU-NatashaNeural"];
  var GOOGLE_VOICES = ["en-US-Neural2-F", "en-US-Neural2-D", "en-US-Neural2-A", "en-US-Wavenet-F", "en-US-Wavenet-D", "en-GB-Neural2-B", "en-GB-Wavenet-B"];
  // Cartesia public starter voices (voice IDs are UUIDs, from Cartesia's docs).
  var CARTESIA_VOICES = [
    { id: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4", name: "Skylar" },
    { id: "1df0b2fe-acb0-4484-8f32-9e231d9e7a90", name: "Harvey" },
    { id: "68fb6747-b6ea-4c44-a18e-4e29921424d3", name: "Derek" },
    { id: "55deba52-bc73-4481-ab69-9c8831c8a7c3", name: "Camille" },
    { id: "a0e99841-438c-4a64-b679-ae501e7d6091", name: "Professional female" }
  ];
  var PROVIDER_META = {
    none: { label: "Free AI voices", fields: [] },
    elevenlabs: { label: "ElevenLabs", keyLabel: "ElevenLabs API key", keyPh: "sk_…", voiceLabel: "Voice ID", voicePh: "21m00Tcm4TlvDq8ikWAM (Rachel)", modelLabel: "Model", modelPh: "eleven_turbo_v2_5", help: "The most realistic voices. Find your key at elevenlabs.io → Profile → API Keys. Voice IDs are listed under each voice in VoiceLab — or load your voices below.", freeNote: "Free tier: about 10,000 characters a month — plenty for short listens, not for whole books. The free Microsoft AI voices above are unlimited with no key at all." },
    cartesia: { label: "Cartesia Sonic", keyLabel: "Cartesia API key", keyPh: "sk_car_…", voiceLabel: "Voice ID", voicePh: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4 (Skylar)", modelLabel: "Model", modelPh: "sonic-3", help: "Cartesia Sonic is rated the closest rival to ElevenLabs for naturalness. Create a free key at cartesia.ai → API Keys. Voice IDs are UUIDs — load your voices below, or paste a voice ID.", freeNote: "Free tier: 20,000 credits a month (~27 minutes of TTS), renews monthly, no card required. The free Microsoft AI voices above are unlimited with no key at all." },
    openai: { label: "OpenAI TTS", keyLabel: "OpenAI API key", keyPh: "sk-…", voiceLabel: "Voice", voicePh: "alloy", modelLabel: "Model", modelPh: "tts-1", voices: OPENAI_VOICES, help: "Create a key at platform.openai.com → API Keys. You pay OpenAI's TTS rates only.", freeNote: "No free tier — pay-as-you-go with OpenAI. Microsoft AI voices are free and unlimited." },
    azure: { label: "Azure Speech", keyLabel: "Azure subscription key", keyPh: "Your Azure Speech key", voiceLabel: "Neural voice", voicePh: "en-US-AriaNeural", modelLabel: "Region", modelPh: "eastus", voices: AZURE_VOICES, help: "From the Azure portal → your Speech resource → Keys and Endpoint. Region is the short code, e.g. eastus.", freeNote: "Free tier: 500,000 characters a month for neural voices. Microsoft AI voices are free and unlimited." },
    google: { label: "Google Cloud TTS", keyLabel: "Google Cloud API key", keyPh: "AIza…", voiceLabel: "Voice", voicePh: "en-US-Neural2-F", modelLabel: "—", modelPh: "", voices: GOOGLE_VOICES, help: "Enable Cloud Text-to-Speech in Google Cloud Console and create an API key. You pay Google's TTS rates only.", freeNote: "Free tier: 1 million characters a month for WaveNet/Neural2 (first year). Microsoft AI voices are free and unlimited." },
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
      host.appendChild(el("p", "muted", "Using the free Microsoft AI voices. Nothing to configure — press play and listen."));
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
      // Voice cloning lives in Clone Studio (Voices section, below) —
      // one place for ElevenLabs and Cartesia, from your own key.
      var cloneHint = el("p", "muted", "Want to clone a voice? Use Clone Studio below — it works with ElevenLabs and Cartesia, from your own key.");
      form.appendChild(cloneHint);
      var cloneOpen = el("button", "btn btn-ghost btn-small", "Open Clone Studio ↓");
      cloneOpen.type = "button";
      cloneOpen.addEventListener("click", function () { var cs = $("cloneStudio"); if (cs) cs.scrollIntoView({ behavior: "smooth", block: "start" }); });
      form.appendChild(cloneOpen);
    }
    // Cartesia: load the account's voices + a starter menu of public voices.
    if (c.provider === "cartesia") {
      var cartesiaLoadRow = el("div"); cartesiaLoadRow.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px";
      var cartesiaLoadBtn = el("button", "btn btn-ghost btn-small", "↻ Load my Cartesia voices");
      cartesiaLoadBtn.type = "button";
      cartesiaLoadBtn.addEventListener("click", function () {
        var key = keyInput.value.trim();
        if (!key) { toast("Paste your Cartesia key first."); return; }
        setBusy(cartesiaLoadBtn, true, "Loading…");
        fetch("https://api.cartesia.ai/voices", { headers: { "X-API-Key": key, "Cartesia-Version": "2026-08-14" } })
          .then(function (r) { if (!r.ok) throw new Error("Cartesia HTTP " + r.status); return r.json(); })
          .then(function (j) {
            setBusy(cartesiaLoadBtn, false, "↻ Load my Cartesia voices");
            var list = j.data || j.voices || (Array.isArray(j) ? j : []);
            cartesiaVoiceListSel.innerHTML = "";
            list.forEach(function (v) {
              var op = el("option", null, v.name || v.id);
              op.value = v.id;
              if (v.id === voiceInput.value.trim()) op.selected = true;
              cartesiaVoiceListSel.appendChild(op);
            });
            toast("Loaded " + list.length + " voice(s). Pick one to use it.");
          })
          .catch(function (err) { setBusy(cartesiaLoadBtn, false, "↻ Load my Cartesia voices"); toast("Couldn't load voices: " + (err.message || "check your key.")); });
      });
      cartesiaLoadRow.appendChild(cartesiaLoadBtn);
      form.appendChild(cartesiaLoadRow);
      var cartesiaVlField = el("div", "field");
      cartesiaVlField.appendChild(el("label", null, "My voices (load them first, or pick a starter voice)"));
      var cartesiaVoiceListSel = document.createElement("select");
      cartesiaVoiceListSel.id = "pvVoiceList";
      CARTESIA_VOICES.forEach(function (v) {
        var op = el("option", null, v.name);
        op.value = v.id;
        if (v.id === (c.voiceId || "")) op.selected = true;
        cartesiaVoiceListSel.appendChild(op);
      });
      cartesiaVoiceListSel.addEventListener("change", function () { if (cartesiaVoiceListSel.value) voiceInput.value = cartesiaVoiceListSel.value; });
      cartesiaVlField.appendChild(cartesiaVoiceListSel);
      form.appendChild(cartesiaVlField);
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
        openArticle(item.title, item.source || "", item.byline || "", item.body || "", 0, item.sentence || 0);
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
  /* ---------------- Clone Studio ----------------
   * Clone a voice YOU own or have permission to clone — your own voice,
   * or a voice you made. Uses the visitor's own ElevenLabs or Cartesia
   * key (localStorage only). The sample file never leaves the browser
   * except to the provider the visitor chose. No downloading, ripping
   * or cloning of any company's demo audio — ever. */
  function cloneVoiceWithProvider(provider, key, name, file) {
    var fd = new FormData();
    fd.append("name", name);
    fd.append("files", file);
    if (provider === "elevenlabs") {
      return fetch("https://api.elevenlabs.io/v1/voices/add", { method: "POST", headers: { "xi-api-key": key }, body: fd })
        .then(function (r) { if (!r.ok) throw new Error("ElevenLabs HTTP " + r.status); return r.json(); })
        .then(function (j) { return j.voice_id || ""; });
    }
    if (provider === "cartesia") {
      return fetch("https://api.cartesia.ai/voices/clone", { method: "POST", headers: { "X-API-Key": key, "Cartesia-Version": "2026-08-14" }, body: fd })
        .then(function (r) { if (!r.ok) throw new Error("Cartesia HTTP " + r.status); return r.json(); })
        .then(function (j) { return j.voice_id || j.id || ""; });
    }
    return Promise.reject(new Error("Pick ElevenLabs or Cartesia."));
  }
  function wireCloneStudio() {
    var btn = $("cloneBtn"); if (!btn) return;
    var prov = $("cloneProvider"), keyEl = $("cloneKey");
    function prefillKey() {
      var c = premiumCfg();
      if (keyEl && prov && c.provider === prov.value && c.key) keyEl.value = c.key;
    }
    if (prov) prov.addEventListener("change", prefillKey);
    prefillKey();
    btn.addEventListener("click", function () {
      var status = $("cloneStatus");
      function fail(msg) { if (status) status.textContent = msg; toast(msg); }
      var provider = (prov && prov.value) || "elevenlabs";
      var key = ((keyEl && keyEl.value) || "").trim();
      var name = ((($("cloneName") || {}).value) || "").trim();
      var file = ((($("cloneFile") || {}).files) || [])[0];
      if (!key) return fail("Paste your " + (provider === "cartesia" ? "Cartesia" : "ElevenLabs") + " key first — Clone Studio uses your key, stored only in this browser.");
      if (!name) return fail("Give the clone a name first.");
      if (!file) return fail("Choose a sample audio file first — 30 seconds to 1 minute of clean audio of a voice you own or have permission to clone.");
      setBusy(btn, true, "Cloning…");
      if (status) status.textContent = "Cloning “" + name + "” with " + provider + "…";
      cloneVoiceWithProvider(provider, key, name, file).then(function (vid) {
        setBusy(btn, false, "＋ Clone this voice");
        if (!vid) { fail("The clone was created but no voice ID came back — check your account and try loading your voices."); return; }
        var next = premiumCfg(); next.provider = provider; next.key = key; next.voiceId = vid;
        storeSet(LS.premium, next);
        if (status) status.textContent = "Cloned “" + name + "” — it is now your " + (provider === "cartesia" ? "Cartesia" : "ElevenLabs") + " voice.";
        toast("Cloned “" + name + "” — it is now your voice.");
        renderProviderForm();
      }).catch(function (err) {
        setBusy(btn, false, "＋ Clone this voice");
        fail("Clone failed: " + (err && err.message ? err.message : "check your key and sample file.") + (provider === "cartesia" ? " Note: Cartesia voice cloning needs a paid plan." : ""));
      });
    });
  }

  /* ---------------- Hugging Face double-check wiring ---------------- */
  function wireHf() {
    var toggle = $("hfToggle"), token = $("hfToken"), status = $("hfStatus");
    if (!toggle) return;
    var c = hfCfg();
    toggle.checked = !!c.enabled;
    if (token) token.value = c.token || "";
    function save() {
      var next = { enabled: !!toggle.checked, token: (token ? token.value.trim() : "") };
      storeSet(LS.hf, next);
      if (status) status.textContent = (next.enabled && next.token)
        ? "Hugging Face double-check is on — borderline paragraphs will be checked."
        : (next.enabled ? "Add your free Hugging Face token to turn the double-check on." : "Hugging Face is optional — the radar already works without it.");
    }
    toggle.addEventListener("change", save);
    if (token) token.addEventListener("change", save);
    save();
  }

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
    openArticle = function (title, source, byline, bodyText, clutterRemoved, resumeAt) {
      _openArticle(title, source, byline, bodyText, clutterRemoved, resumeAt);
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

    // Voices: curated AI voices only — no device/browser voices,
    // so there is nothing to wait for from speechSynthesis.
    var langSel = $("voiceLangSelect");
    if (langSel) {
      langSel.value = currentLanguage();
      langSel.addEventListener("change", function () { setVoiceLanguage(langSel.value); });
    }
    loadVoices();
    wireCloneStudio();
    wireHf();

    // Content Radar: show what was removed, and restore with one tap.
    var rt = $("radarRemovedToggle");
    if (rt) rt.addEventListener("click", function () {
      var list = $("radarRemovedList");
      if (!list) return;
      list.hidden = !list.hidden;
      if (!list.hidden) renderRemovedList();
      rt.textContent = list.hidden ? "Show removed (" + state.removedParagraphs.length + ")" : "Hide removed";
    });

    updateAiAvailability();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
