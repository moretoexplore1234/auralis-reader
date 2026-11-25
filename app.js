/* Auralis — Read Anything Aloud
 * Vanilla JS, no framework, no build step, no backend.
 * Privacy: API keys live ONLY in this browser's localStorage and are sent
 * only to the provider the user explicitly chose, only when they press play
 * or Run. Nothing is uploaded, tracked, or shared by Auralis itself.
 */
(function () {
  "use strict";

  var CFG = window.AURALIS_CONFIG || {};
  var APP_VERSION = "v1.6.2";
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
    // v1.4.7: the toast itself is role="status" aria-live="polite"
    // (see index.html), so it is announced once. The old code also
    // mirrored every message into a separate #srStatus live region,
    // so a text extraction saw each status TWICE ("Ready — press
    // play to listen." x2, "Making the preview sounds…" x2) — the
    // duplication a browser check flagged three times in a row.
    // #srStatus is gone; one message, one place.
  }

  // v1.6.2 (d): hide the toast at once, cancelling its auto-hide
  // timer. Playback hides it the moment audio actually starts
  // (playAudioElement) — the "Ready — press play to listen." toast
  // used to sit over the player for its whole 3.2s while the
  // article was already playing.
  function hideToast() {
    var t = $("toast"); if (!t) return;
    clearTimeout(toastTimer);
    t.classList.remove("show");
  }

  // v1.4.4: an optional second action (extraLabel/extraFn) — the
  // blocked-fetch errors offer TWO ways forward: read the pasted
  // text instead, and open the original link in the browser.
  function showStatus(kind, title, html, actionLabel, actionFn, extraLabel, extraFn) {
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
    if (extraLabel && extraFn) {
      var b2 = el("button", "btn btn-ghost btn-small", extraLabel);
      b2.type = "button";
      b2.addEventListener("click", extraFn);
      card.appendChild(b2);
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
    currentSentence: -1,   // sentence highlighted as "current" (may be loading)
    progressSentence: -1,  // last sentence whose audio actually STARTED playing — this is what the progress bar counts (v1.4.2: a sentence that only failed to load must never count as "read")
    playing: false,
    paused: false,
    engine: "browser",     // "browser" | "free" | "premium"
    premiumAudio: null,
    premiumTimer: null,
    freeAudio: null,       // Audio element for the free AI engine (Edge or Kitten)
    freeTimer: null,
    freeTransport: null,   // "edge" | "kitten" — decided on first play, per session
    edgeFailed: false,
    edgeDown: false,       // Microsoft voices proven unavailable in this browser — Kitten is the free engine instead
    edgeProbed: false,     // the on-load Edge handshake probe has run once (Edge browsers only)
    kittenFailed: false,   // the on-device Kitten model could not be loaded
    warmingUp: false,      // v1.4.6: background model warm-up in flight (page load, not first Play)
    prefetchAudio: null,   // v1.4.6: first sentence's audio, synthesized at article load
    prefetchKey: null,     // v1.4.6: title + first sentence the prefetch belongs to
    finished: false,       // the current article actually played to the end
    waitingFirstAudio: false, // v1.4.6: true from a fresh Play until the first sentence's audio actually starts — the only window in which Play is a "still loading" tap, never a pause
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
      card.addEventListener("click", function () { openArticle(s.title, s.source, "Auralis · original sample", s.body, 0, undefined, { autoplay: true }); });
      grid.appendChild(card);
    });
  }

  /* ---------------- text model: paragraphs -> sentences -> words ---------------- */
  function splitSentences(text) {
    // Split on sentence-ending punctuation followed by whitespace or
    // end-of-text, keeping abbreviations reasonably intact. The
    // punctuation must be followed by whitespace or end-of-text —
    // otherwise a dot inside a token (www.example.com,
    // hello@example.org, U.S.A.) would be torn into fragments that
    // no URL/email stripper can recognise afterwards.
    // v1.6.2 (b): LOSSLESS by construction. The old implementation
    // matched sentences with /[^.!?]+[.!?]+…/ — when a dot inside a
    // URL failed the whitespace lookahead ("…(https://www.bbc.co.uk/…"),
    // the match simply STARTED after that dot, silently dropping the
    // whole head of the sentence ("The US government also announced
    // a raft of new tariffs") and leaving the tail
    // ("uk/news/articles/c893r9ke5p97o) on countries…") as a
    // "sentence" no URL regex could ever recognise. This version
    // scans for boundaries and keeps every character between them:
    // the join of the returned parts is the input (modulo trimming).
    // A chunk with no letters/digits (a lone "." left by a cut) is
    // never a sentence and is dropped, as before.
    var t = String(text || "");
    if (!t.trim()) return [];
    var out = [], start = 0;
    var re = /[.!?]+["'”)]*(?=\s+|$)/g, m;
    while ((m = re.exec(t)) !== null) {
      var end = m.index + m[0].length;
      var chunk = t.slice(start, end).trim();
      if (chunk && /[A-Za-z0-9]/.test(chunk)) out.push(chunk);
      start = end;
    }
    var rest = t.slice(start).trim();
    if (rest && /[A-Za-z0-9]/.test(rest)) out.push(rest);
    return out;
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
    state.progressSentence = -1; // new article: nothing has played yet (v1.4.2)
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
          // v1.4.7: the space between words is its OWN text node,
          // not a trailing space inside the word span. A space at
          // the end of an inline element is dropped by text and
          // accessibility extraction, so the article read as one
          // mashed word ("Asinglematurestreettreedoesmorework…")
          // even though it looked spaced on screen. A standalone
          // space text node survives both rendering and extraction.
          sentSpan.appendChild(el("span", "word", w));
          sentSpan.appendChild(document.createTextNode(" "));
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
    var done = state.progressSentence < 0 ? 0 : state.sentences.slice(0, state.progressSentence + 1).reduce(function (a, s) { return a + s.wordCount; }, 0);
    var pct = state.totalWords ? Math.round((done / state.totalWords) * 100) : 0;
    $("progressFill").style.width = pct + "%";
    $("progressText").textContent = pct + "% read · " + done + " of " + state.totalWords + " words";
    var remaining = state.totalWords - done;
    $("timeRemaining").textContent = remaining <= 0 ? "Finished" : minutesText(remaining, currentRate()) + " remaining";
  }

  // opts.autoplay (v1.4.7): the tap that opened this article was a
  // LISTEN tap — a sample card ("Listen to sample") or "Try a
  // sample". Playback must start by itself once the voice is ready;
  // parking at "Ready — press play to listen." and needing a second
  // tap is exactly what Carl reported as "it didn't load at all"
  // (v1.4.6 check: 60s of silence, then a second tap needed).
  function openArticle(title, source, byline, bodyText, clutterRemoved, resumeAt, opts) {
    var autoplay = !!(opts && opts.autoplay);
    if (autoplay) unlockAudio(); // v1.4.8: a Listen tap IS the gesture — unlock the audio context now, before the radar sweep and model load eat it.
    // Floor is 5 words, not 20 (v1.4.4): a short caption the user
    // pasted on purpose ("How to Read a Comparative Market Analysis
    // in Del Mar", 10 words) is real reading material. Junk pages
    // are already guarded earlier — the fetch path refuses anything
    // under 40 words before it ever gets here.
    if (!bodyText || wordsOf(bodyText) < 5) {
      showStatus("error", "Not enough text to read",
        "That page didn't give us enough readable text (under 5 words). Try <strong>Paste text</strong> instead — you can copy the article text into Auralis directly.",
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
        // Never wipe the reader entirely (v1.4.1): if the radar +
        // chrome strip cut everything, fall back to the original
        // paragraphs cleaned of timestamps/URLs only. A pasted note
        // that opens with a dateline is still an article — the
        // reader must never answer real text with "nothing left".
        var fbTexts = [], fbRemoved = [], fbIndices = [];
        paras.forEach(function (p, pi) {
          var c = cleanSpokenText(p);
          if (c.text.trim()) { fbTexts.push(c.text); fbIndices.push(pi); }
          c.removed.forEach(function (r) { fbRemoved.push({ text: r, index: pi, score: 0, chrome: true }); });
        });
        if (fbTexts.length) {
          keptText = fbTexts.join("\n\n");
          state.removedParagraphs = fbRemoved;
          state.radarKeptIndices = fbIndices;
          state.radarKept = fbTexts.length;
          state.radarRemoved = fbRemoved.length;
          state.clutterRemoved = (clutterRemoved || 0) + fbRemoved.length;
        } else {
          showStatus("error", "Nothing readable left",
            "The Content Radar cut everything on this page — it looked like navigation and buttons, not an article. Try <strong>Paste text</strong> with the article text instead.",
            "Paste text instead", openPasteModal);
          return;
        }
      }
      buildModel(title, source, byline, keptText);
      renderRadarResult();
      if (autoplay) {
        // v1.4.7: a Listen tap means listen. playFree waits on the
        // model itself and starts the first sentence as soon as it
        // exists — no prefetch detour, no "Ready — press play"
        // parking. (The prefetch below is only for non-autoplay
        // opens, where Play is a later, separate tap.)
        playFree(0, true);
      } else {
        prefetchFirstSentence(); // v1.4.6: first sentence ready before Play is tapped
      }
      if (typeof resumeAt === "number" && state.sentences.length) {
        var target = clamp(resumeAt, 0, state.sentences.length - 1);
        state.currentSentence = target;
        highlightSentence(target);
        updateProgress();
      }
      saveProgressToLibrary(true);
      if (!autoplay) toast("Ready — press play to listen.");
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

  // A block page is a page whose ONLY content is a bot/Cloudflare
  // challenge or a 403 notice — never an article. Reader proxies
  // return such pages with HTTP 200, so the fetch chain must
  // recognise the text itself (v1.4.5): Jina returned the Cloudflare
  // 403 page for Carl's Del Mar link and the app read it aloud as a
  // 128-word "article", because the old length override ("40+ words
  // means it's real") suppressed the block classification. These
  // patterns are verbatim Jina/Cloudflare wording — a real article
  // that merely mentions "captcha" in passing matches NONE of them,
  // so the v1.4.4 visible-text rule stays intact for the weak hints
  // above (those still get the length override).
  var BLOCK_PAGE_PATTERNS = [
    /returned error 403/i,                        // Jina: "Target URL returned error 403: Forbidden"
    /this page (maybe|may be) requiring captcha/i, // Jina warning line
    /why have i been blocked/i,                   // Cloudflare block page heading
    /attention required!\s*\|\s*cloudflare/i      // Cloudflare challenge title ("Attention Required! | Cloudflare")
  ];
  function isBlockPageText(text) {
    var t = String(text || "");
    return BLOCK_PAGE_PATTERNS.some(function (re) { return re.test(t); });
  }

  // Paragraphs that are navigation / promo, never body text — even when
  // long enough to pass the length filter.
  var CLUTTER_PARA_RE = /^(read more|read next|continue reading|click (here|next|to continue|below)|next (page|article)|previous (page|article)|prev\.?$|next\.?$|page\s+\d+(\s+of\s+\d+)?\.?\s*$|related( articles?| reading| stories| posts)?\.?\s*:?\s*$|you may also like|recommended( for you)?:?|more from|sign up|subscribe( (now|to|for))?|newsletter|share( this)?\.?$|share this|follow us|comments?|leave a (comment|reply)|post a comment|to post a comment|advertisement|sponsored|back to (top|blog|home|posts|results|search)|skip to (content|main content)|accept cookies|cookie( policy| notice| settings)?|log ?in|sign ?in|trending( now| stories)?|photo: |caption: |image: |about the author|author bio|tags?\s*:|posted (in|under)|filed (in|under)|categor(y|ies)\s*:|©|copyright\s+(©|\d{4})|you have permission to|edit\.?$|close\.?$|\d+\s+comments?\.?\s*$)/i;
  // A breadcrumb line ("Home / Blog / Buyer Resources") — short
  // segments joined by / > › », starting with a section word, no
  // sentence punctuation. Never matches a real sentence (those end
  // with . ! ? or run long).
  function isBreadcrumbLine(t) {
    var s = String(t || "").trim();
    if (!s || /[.!?]$/.test(s) || wordsOf(s) > 10) return false;
    if (!/\s*[/>›»]\s*/.test(s)) return false;
    var parts = s.split(/\s*[/>›»]\s*/).map(function (p) { return p.trim(); }).filter(Boolean);
    if (parts.length < 2) return false;
    if (!parts.every(function (p) { return /^[A-Z0-9][\w\s&'’-]{0,30}$/.test(p); })) return false;
    return /^(home|blog|news|articles?|sections?)\b/i.test(parts[0]) || parts.some(function (p) { return /^(home|blog|news)$/i.test(p); });
  }
  function isClutterParagraph(t) {
    if (CLUTTER_PARA_RE.test(t)) return true;
    if (isBreadcrumbLine(t)) return true;
    // A copyright footer line ("© Copyright 2023 ... All rights
    // reserved | Terms of Use | Privacy Policy") — but ONLY when
    // the paragraph IS (mostly) the footer. A real paragraph that
    // merely carries a footer sentence at its end (a mixed
    // paragraph) must survive: its footer sentence is cut at
    // sentence level, and dropping the whole paragraph would eat
    // real sentences with it (v1.5.1 QA caught this).
    if (/©|copyright/i.test(t) && /all rights reserved/i.test(t)) {
      if (t.length < 200 || /^\s*(©|\(c\)|copyright\b)/i.test(t)) return true;
    }
    if (/^©/.test(t.trim())) return true; // "© 2026 ..." line
    if (/^read more[:\s]/i.test(t)) return true;
    if (TIMESTAMP_ONLY_RE.test(t)) return true; // a line that is only a date/time
    if (/^\s*by\s+\S.{1,60}$/i.test(t) && !/[.!?]/.test(t)) return true; // byline line
    if (/^\s*(published|updated|posted|last updated)\b/i.test(t)) return true; // dateline
    if (/^\s*\d+\s*(of|\/)\s*\d+\s*$/.test(t)) return true; // "1 of 5" pagination
    if (/^\s*\d+\s*$/.test(t)) return true; // bare page number
    return false;
  }

  function extractFromHtml(html, pageUrl) {
    var rawText = String(html || "");
    // v1.6.2 (b): Jina Reader markdown — "Title: … URL Source: …
    // Published Time: … Markdown Content:" header, then blank-line
    // paragraphs. The header is metadata, never article text, and
    // the blank lines ARE the paragraph boundaries — so parse it as
    // markdown paragraphs directly, instead of collapsing the whole
    // thing to one line (where the dateline, byline, image markdown
    // and credit fuse onto the first real sentence). Image-only
    // lines, bylines and datelines are dropped here; a bare credit
    // line ("Spencer Platt / Getty Images") is left for the radar +
    // chrome-trim, which already know it. Title stays the page URL:
    // Jina markdown carries no <title>, and the Browse headline (or
    // the URL, honestly) is applied by the caller.
    // (Why now: the old lossy splitSentences used to eat this header
    // as a side effect of dropping text before URL dots; the lossless
    // splitter keeps it, so the cut must be explicit.)
    var jinaHead = rawText.match(/^\s*Title:[\s\S]{0,2000}?Markdown Content:/);
    if (jinaHead) {
      var jinaBody = rawText.slice(jinaHead[0].length);
      var jinaParas = jinaBody.split(/\n\s*\n/).map(function (p) { return p.replace(/\s+/g, " ").trim(); }).filter(Boolean);
      var jinaKept = jinaParas.filter(function (p) {
        if (isClutterParagraph(p)) return false;
        if (/^!\[Image/.test(p)) return false; // image-only markdown line
        if (/^\s*by\s+\S.{1,60}$/i.test(p) && !/[.!?]/.test(p)) return false; // byline line
        return true;
      });
      return { title: pageUrl, author: "", text: jinaKept.join("\n\n"), clutterRemoved: jinaParas.length - jinaKept.length, paragraphs: jinaKept.length };
    }
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
      "[class*='byline'], [class*='dateline'], [class*='timestamp'], [class*='article-meta'], [class*='post-meta'], [class*='entry-meta'], time, " +
      "[class*='promo'], [class*='outbrain'], [class*='taboola'], [class*='trending'], [class*='sidebar'], " +
      "[class*='menu'], [class*='toolbar'], [class*='caption'], [class*='credit'], " +
      // v1.5.1: footer/copyright blocks that sit OUTSIDE the <footer>
      // element (a real news page's copyright lives in a <div>
      // after </footer>), plus breadcrumbs, tag lists and
      // share-button blocks — all navigation, never article text.
      "[class*='copyright'], [id*='copyright'], [class*='footer'], [id*='footer'], " +
      "[class*='site-header'], [class*='site-footer'], [class*='page-header'], [class*='page-footer'], " +
      "[class*='breadcrumb'], [class*='tags'], [id*='tags'], [class*='post-tags'], " +
      "[class*='share-buttons'], [class*='share-tools'], [class*='author-info']";
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
      // Whole-body fallback (no <article>/<main> yielded paragraphs):
      // split into ~4-sentence blocks so the radar below can score
      // and cut chrome blocks (nav, footer, copyright) instead of
      // one giant paragraph that scores "substantive" and keeps
      // everything — a real news page arrived as a single 2,200-char
      // block (v1.5.1).
      var bodyText = (doc.body ? doc.body.textContent : "").replace(/\s+/g, " ").trim();
      if (bodyText.length > 400) {
        var fbSentences = splitSentences(bodyText);
        var fbBlocks = [];
        for (var fbi = 0; fbi < fbSentences.length; fbi += 4) fbBlocks.push(fbSentences.slice(fbi, fbi + 4).join(" "));
        bestText = fbBlocks.length ? fbBlocks.join("\n\n") : bodyText;
      }
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
  var RADAR_BOILERPLATE = /^(show this thread|show replies|promoted|advertisement|sponsored|read more|read next|continue reading|click (here|next|to continue|below)|next (page|article)|previous (page|article)|prev\.?$|next\.?$|page\s+\d+(\s+of\s+\d+)?\.?\s*$|related( articles?| reading| stories| posts)?\.?\s*:?\s*$|you may also like|recommended( for you)?:?|more from|sign up|subscribe( (now|to|for))?|newsletter|share( this)?\.?$|share this|follow us|comments?|leave a (comment|reply)|post a comment|to post a comment|back to (top|blog|home|posts|results|search)|skip to (content|main content)|accept cookies|cookie( policy| notice| settings)?|log ?in|sign ?in|trending( now| stories)?|photo: |caption: |image: |about the author|author bio|tags?\s*:|posted (in|under)|filed (in|under)|categor(y|ies)\s*:|©|copyright\s+(©|\d{4})|you have permission to|edit\.?$|close\.?$|\d+\s+comments?\.?\s*$)/i;
  // Timestamps and datelines are metadata, never substance. A time
  // that is the substance of a sentence ("the meeting starts at
  // 3 PM") is kept — bare hour times without minutes are never
  // touched, and dates/times are only stripped where they sit as
  // metadata: at a sentence/paragraph start, after Published /
  // Updated / Posted, standalone, or as "min read" / "X ago".
  var MONTHS_RE = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
  var DATE_RE = "(?:" + MONTHS_RE + "\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}\\s+" + MONTHS_RE + "\\.?\\s+\\d{4})";
  // v1.5.1: dates without a year ("November 12", "November 2026")
  // and machine dates ("2026-11-12", "11/12/2026") — metadata
  // positions only (publish labels, standalone lines, datelines),
  // never bare-stripped from real sentences.
  var DATE_NY_RE = "(?:" + MONTHS_RE + "\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?|\\d{1,2}\\s+" + MONTHS_RE + "\\.?|" + MONTHS_RE + "\\.?\\s+\\d{4})";
  var ISO_DATE_RE = "\\d{4}-\\d{2}-\\d{2}";
  var NUM_DATE_RE = "\\d{1,2}/\\d{1,2}/\\d{2,4}";
  var WEEKDAY_RE = "(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+)?";
  var PUB_DATE_RE = "(?:" + WEEKDAY_RE + "(?:" + DATE_RE + "|" + DATE_NY_RE + "|" + ISO_DATE_RE + "|" + NUM_DATE_RE + "))";
  var TIME_RE = "\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:AM|PM|am|pm)?";
  var AGO_RE = "\\d+\\s*(?:seconds?|minutes?|hours?|hrs?|days?|weeks?|months?|years?)\\s+ago";
  var TIMESTAMP_ONLY_RE = new RegExp("^\\s*(?:" + WEEKDAY_RE + "(?:" + DATE_RE + "|" + DATE_NY_RE + "|" + ISO_DATE_RE + "|" + NUM_DATE_RE + "|" + TIME_RE + "|\\d{1,2}\\s*(?:AM|PM|am|pm))|\\d{1,2}\\s*(?:AM|PM|am|pm))\\s*[.!?]?\\s*$", "i");
  var RADAR_KEEP = 25; // score >= 25 is core content
  function scoreParagraph(p, isX) {
    var text = p.text || "";
    var sentences = splitSentences(text).length;
    var words = wordsOf(text);
    var score = 0;
    if (words >= 25) score += 30; else if (words >= 12) score += 18; else if (words >= 6) score += 6;
    if (sentences >= 2) score += 20; else if (sentences === 1) score += 8;
    if (/[.!?]["'\u201d)]?\s*$/.test(text)) score += 10; // ends like a real sentence
    // Metadata penalties only bite short fragments. A long paragraph
    // with several real sentences is an article that happens to open
    // with a dateline ("Published Nov 13, 2026…") — the timestamps
    // are stripped later by cleanSpokenText, so the paragraph must
    // not be scored as if it were only its dateline (v1.4.1: a
    // single-block paste starting with "Published" was wiped whole).
    var substantive = words >= 25 && sentences >= 2;
    if (!substantive) {
      if (RADAR_BOILERPLATE.test(text)) score -= 60;
      if (CLUTTER_PARA_RE.test(text)) score -= 60;
      if (TIMESTAMP_ONLY_RE.test(text)) score -= 60; // a line that is only a date/time
      if (/^\s*by\s+\S/i.test(text) && !/[.!?]\s+\S/.test(text)) score -= 60; // byline line
      if (/^\s*(published|updated|posted|last updated)\b/i.test(text)) score -= 60; // dateline
      if (/^(photo|image|picture|illustration|credit)\s*:/i.test(text)) score -= 60; // caption
      if (isImageCreditLine(text)) score -= 60; // v1.6.1 (e): bare image credit, no prefix
      if (/^about the (author|writer)\b|^author bio\b/i.test(text)) score -= 60; // author bio
      if (/^\s*\d+\s*(of|\/)\s*\d+\s*$/.test(text)) score -= 60; // "1 of 5" pagination
      if (/^\s*\d+\s*$/.test(text)) score -= 60; // bare page number
      if (isX && /^(show this thread|promoted)\b/i.test(text)) score -= 60;
    }
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
    /^(prev|next)\.?$/i,
    /^page\s+\d+\b/i,
    /^\d+\s*(of|\/)\s*\d+$/i,
    /^subscribe\b/i,
    /^sign up\b/i,
    /^(log|sign)\s?in\b/i,
    /^share (this|on)\b/i,
    /^share\.?$/i,
    /^(facebook|twitter|x|linkedin|pinterest|whatsapp|reddit|sms|email)(\s+(facebook|twitter|x|linkedin|pinterest|whatsapp|reddit|sms|email|and|,))*\s*\.?$/i,
    /^follow (us|me)\b/i,
    /^advertisement\.?$/i,
    /^sponsored(\s+(content|by))?\.?$/i,
    /^related (articles?|reading|stories|posts)\b/i,
    /^you may also like\b/i,
    /^recommended( for you)?\b/i,
    /^back to (top|blog|home|posts|results|search)\b/i,
    /^skip to (content|main content)\b/i,
    /^accept cookies?\.?$/i,
    /^cookie (policy|notice|settings)\.?$/i,
    /^(leave a|write a|post a|to post a|to leave a) (comment|reply)\b/i,
    /^comments?\.?$/i,
    /^\d+\s+comments?\.?$/i,
    /^\d+(\.\d+)?[kKmM]?\s+shares?\.?$/i,
    /^(get|sign up for) (our )?newsletter\b/i,
    /^newsletter\.?$/i,
    /^trending( now| stories)?\.?$/i,
    /^more from\b/i,
    /^tags?\s*:/i,
    /^(posted|filed) (in|under)\b/i,
    /^categor(y|ies)\s*:/i,
    /^listen to this (article|story|post)\b/i,
    /^table of contents\.?$/i,
    /^jump to\b/i,
    /^(©|\(c\)|copyright\s+(©|\d{4}))/i,
    /^all rights reserved\.?$/i,
    /^all rights reserved\b.*(\||terms of use|privacy policy)/i,
    /^you have permission to (edit|view|access)\b/i,
    /^(edit|close)\.?$/i
  ];
  function isUiChromeSentence(s) {
    var t = String(s || "").trim();
    if (!t) return false;
    if (isBreadcrumbLine(t)) return true;
    return UI_CHROME_SENTENCE_RES.some(function (re) { return re.test(t); });
  }
  // Leading chrome clause at the start of a sentence ("Skip to main
  // content You have permission to edit this article." — two chrome
  // fragments joined into one sentence when the page arrives as a
  // single block). Cut the leading clause, then re-test what is
  // left: if nothing real remains, the sentence goes.
  var LEADING_CHROME_RES = [
    /^skip to (content|main content)\b[.,;:|•—–-]?\s*/i,
    /^you have permission to (edit|view|access)\b[^.!?]*[.!?]?\s*/i,
    /^back to (blog|home|top|posts|results|search)\b[^.!?]*[.!?]?\s*/i,
    // Fused chrome (v1.5.1): a nav/button label with no trailing
    // punctuation runs straight into the next real sentence ("Log
    // in The river rose…"). Cut the label ONLY when a new sentence
    // (capital, digit, quote) follows — "Sign up sheets were
    // posted…" keeps its subject because "sheets" is lowercase.
    /^(log|sign)\s?in\b[.,;:|•—–-]?\s*(?=[A-Z0-9"“])/i,
    /^share\s+(this|on)\b[^.!?]{0,40}?[.!?]?\s*(?=[A-Z0-9"“])/i,
    /^(subscribe|sign\s?up)\b[^.!?]{0,40}?[.!?]?\s*(?=[A-Z0-9"“])/i,
    /^follow\s+(us|me)\b[^.!?]{0,40}?[.!?]?\s*(?=[A-Z0-9"“])/i,
    /^(read more|continue reading)\b[^.!?]{0,40}?[.!?]?\s*(?=[A-Z0-9"“])/i,
    /^related\s+(articles?|reading|stories|posts)?\b[^.!?]{0,40}?[.!?]?\s*(?=[A-Z0-9"“])/i
  ];
  function cutLeadingChrome(s) {
    var t = String(s || "").trim(), prev;
    do {
      prev = t;
      LEADING_CHROME_RES.forEach(function (re) { t = t.replace(re, "").trim(); });
    } while (t !== prev);
    return t;
  }
  // Strip UI-chrome sentences from one paragraph. Returns the cleaned
  // text plus the chrome that was cut, so the radar can count it and
  // show it under "Show removed".
  function stripUiChrome(text) {
    var sentences = splitSentences(text);
    var kept = [], removed = [];
    sentences.forEach(function (s) {
      // Cut a leading chrome clause first ("Skip to main content
      // You have permission..." — the remainder is re-tested, so a
      // real sentence that merely starts near chrome is kept).
      var s2 = cutLeadingChrome(s);
      if (!s2) { removed.push(s); return; }
      if (isUiChromeSentence(s2)) { removed.push(s); return; }
      // A short fragment left after cutting a leading chrome clause
      // is chrome too — it was never a real sentence on its own.
      if (s2 !== s && wordsOf(s2) < 5) { removed.push(s); return; }
      kept.push(s2);
    });
    // Trailing "— click here / read more" fragment inside a kept sentence.
    var cleaned = kept.join(" ");
    var frag = cleaned.match(/\s*[—–-]\s*(click here|read more|continue reading)\b[^.!?]*[.!?]?\s*$/i);
    if (frag) { removed.push(frag[0].trim()); cleaned = cleaned.slice(0, frag.index).trim(); }
    return { text: cleaned, removed: removed };
  }
  function stripChromeFromKept(kept) {
    var out = [], chromeRemoved = [];
    kept.forEach(function (p) {
      // URLs FIRST, on the raw paragraph, while the links are still
      // intact: splitting sentences first tears "www.x.example" and
      // "https://example.com/…" at their dots into fragments no URL
      // regex can recognise afterwards (v1.3.0 bug — www/email survived
      // as "www. cityparks. example"). Only then strip UI-chrome
      // sentences from the cleaned text.
      var c0 = cleanSpokenText(p.text);
      var r = stripUiChrome(c0.text);
      var c = { text: r.text, removed: c0.removed.concat(r.removed) };
      var allRemoved = r.removed.concat(c0.removed);
      if (!c.text) {
        chromeRemoved.push({ text: p.text, index: p.index, score: 0, chrome: true });
      } else {
        out.push({ text: c.text, index: p.index, score: p.score, linkDensity: p.linkDensity });
        if (allRemoved.length) chromeRemoved.push({ text: allRemoved.join(" "), index: p.index, score: 0, chrome: true });
      }
    });
    return { kept: out, chromeRemoved: chromeRemoved };
  }
  /* URLs and link pointers must NEVER be spoken — or shown as spoken
   * text, so what you see is what you hear. Strips every raw URL
   * (http(s)://…, www.…), bare domain and email address, drops
   * markdown links to their text, cuts UI-chrome clauses wherever
   * they appear mid-sentence ("…and click next to continue"), and
   * drops sentences that only exist to point at a link. Returns
   * { text, removed } — removed is what was cut, so the radar can
   * count it and show it under "Show removed". */
  var SPOKEN_URL_RE = /https?:\/\/[^\s"'<>)\]]+/gi;
  var SPOKEN_WWW_RE = /(^|[\s("'])www\.[^\s"'<>)\]]+/gi;
  var SPOKEN_DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|co|gov|edu|me|ai|app|dev|uk|au|ca|de|fr|es|it|nl|in|jp|cn|br|za|mx|news|blog|site|online)(?:\/[^\s"'<>)\]]*)?/gi;
  var SPOKEN_EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.]+\b/gi;
  var SPOKEN_MD_LINK_RE = /\[([^\]]+)\]\([^)]*\)/g;
  // A sentence that only points at a link ("Read the full story",
  // "For more details") — dropped once its URL is gone.
  var LINK_POINTER_SENTENCE_RE = /^(read|see|check|find|visit|go to|click|tap)\s+(the\s+)?(full\s+)?(story|article|report|post|details|more|it|this)\b|^for\s+(more|details|the full story)\b|^more\s+(details|info)\b/i;
  // UI-chrome clauses, wherever they sit inside a sentence. Each match
  // is capped (~40 chars, stops at punctuation) so real content after
  // the chrome phrase is never eaten.
  // Tails stop at a dash (— – -) as well as at punctuation: a chrome
  // clause before a dash ("Read more at www.x.example — the meeting
  // starts at 3 PM…") must never eat the real sentence after the
  // dash (v1.4.1).
  var INLINE_CHROME_RES = [
    /[,;]?\s*(and\s+)?(click|tap|press)\s+(here|next|to continue|below|above|for (more|details))\b[^.!?,;—–-]{0,40}/gi,
    /[,;]?\s*read more\b[^.!?,;—–-]{0,30}/gi,
    /[,;]?\s*continue reading\b[^.!?,;—–-]{0,30}/gi,
    /[,;]?\s*subscribe( to (our )?(newsletter|updates))?\b[^.!?,;—–-]{0,30}/gi,
    /[,;]?\s*sign up for (our )?(newsletter|updates)\b[^.!?,;—–-]{0,30}/gi,
    // "Share this article on Facebook Twitter LinkedIn" — the old
    // pattern cut "share this article" and left "on Facebook
    // Twitter LinkedIn" to be spoken. Swallow the platform tail too.
    /[,;]?\s*share this( article| post| story)?(\s+on\s+(facebook|twitter|x|linkedin|pinterest|reddit|whatsapp|telegram|email|social media))?\b[^.!?,;—–-]{0,30}/gi,
    /[,;]?\s*share on (facebook|twitter|x|linkedin|pinterest|reddit|whatsapp|telegram|email)\b[^.!?,;—–-]{0,30}/gi,
    // Pagination inside a sentence ("Continued on page 2", "Page 2
    // of 3", "(Page 2)") — the sentence-start rules never see it.
    /[,;]?\s*continued on page \d+\b[^.!?,;—–-]{0,20}/gi,
    /\bpage\s+\d+\s+of\s+\d+\b/gi,
    /\(\s*page\s+\d+\s*\)/gi
  ];
  // v1.6.1 (e): image-credit fragments. Jina/BBC text carries bare
  // credits with no "Photo:" prefix ("Spencer Platt / Getty
  // Images"), sometimes fused onto the front of the real first
  // sentence with a file-extension artefact from a stripped image
  // URL ("webp)Spencer Platt / Getty Images Big technology
  // firms…"). A bare credit is ONLY a credit: a name + agency, or
  // an agency alone (optionally + "Photo"), ≤ 8 words. A real
  // sentence that merely mentions an agency ("Getty Images reported
  // record profits") never matches — it has a verb after the agency
  // and no "/" name pattern.
  var IMAGE_CREDIT_AGENCIES = "(?:Getty Images|Associated Press|PA Media|Reuters|Alamy|Shutterstock|Bloomberg|NurPhoto|Anadolu|AP|AFP|EPA|Getty|BBC)";
  var IMAGE_CREDIT_AGENCIES_MULTI = "(?:Getty Images|Associated Press|PA Media)";
  var IMAGE_CREDIT_AGENCIES_SINGLE = "(?:AP|Reuters|AFP|EPA|Getty|BBC|Alamy|Shutterstock|Bloomberg|NurPhoto|Anadolu)";
  function isImageCreditLine(t) {
    var s = String(t || "").trim().replace(/^\(?\s*/, "").replace(/\)?\s*\.?$/, "").trim();
    if (!s || wordsOf(s) > 8) return false;
    var re = new RegExp("^(?:[A-Z][\\w'’\\-]+(?:\\s+[A-Z][\\w'’\\-]+){0,3}\\s*/\\s*)?" + IMAGE_CREDIT_AGENCIES + "(?:\\s+Photo)?$");
    if (re.test(s)) return true;
    if (/^(photo|image|picture)\s+by\s+[A-Z]/i.test(s)) return true;
    return false;
  }
  function stripLeadingImageCredit(s) {
    var t = String(s || ""), prev;
    var namePat = "[A-Z][\\w'’\\-]+(?:\\s+[A-Z][\\w'’\\-]+){0,3}";
    do {
      prev = t;
      // File-extension artefacts from a stripped image URL
      // ("webp)", "jpg.webp)") and a stray ")" left with them.
      t = t.replace(/^(?:[A-Za-z0-9_-]+\.)?(?:webp|jpe?g|png|gif|avif|svg)\)\s*/i, "").trim();
      t = t.replace(/^\)+\s*/, "").trim();
      // A "Name / Agency" credit fused onto a real sentence — cut
      // only when a new sentence follows (capital, digit, quote).
      t = t.replace(new RegExp("^" + namePat + "\\s*/\\s*" + IMAGE_CREDIT_AGENCIES + "(?:\\s+Photo)?\\s*[.,;:|•—–-]?\\s*(?=[A-Z0-9\"“])"), "").trim();
      // A multi-word agency alone fused onto a real sentence
      // ("Getty Images Big technology…") — same new-sentence
      // guard, and never before an ALL-CAPS word ("Getty Images
      // CEO…" keeps its subject).
      t = t.replace(new RegExp("^" + IMAGE_CREDIT_AGENCIES_MULTI + "\\s*[.,;:|•—–-]?\\s*(?![A-Z]{2,}\\b)(?=[A-Z0-9\"“])"), "").trim();
      // A single-word agency followed by punctuation ("Reuters.
      // Big technology…") — the punctuation is what marks it as a
      // standalone credit, never a sentence subject.
      t = t.replace(new RegExp("^" + IMAGE_CREDIT_AGENCIES_SINGLE + "[.,;:|•—–-]\\s*(?=[A-Z0-9\"“])"), "").trim();
    } while (t !== prev);
    return t;
  }
  // v1.6.2 (b): URL-fragment artefacts. splitSentences is lossless
  // now, so a markdown link normally survives whole until the
  // MD-link cut above — but a fragment can still arrive intact
  // (pasted text, a proxy's mangled link, a URL whose ")" broke the
  // MD-link match): a bare path with no scheme and no domain
  // ("uk/news/articles/c893r9ke5p97o", "news/articles/…"), or a
  // markdown-link leftover ("[text](" with the URL already gone).
  // Only WHITESPACE-DELIMITED TOKENS are stripped — never a
  // complete sentence — and only tokens with two or more "/"
  // segments, at least one alphabetic segment, and a last segment of
  // 4+ characters (a real prose token never looks like that).
  // Numeric dates ("10/12/2026") and "and/or" (one slash) never
  // match. A trailing "." is never eaten: it is the sentence's own
  // terminator, and eating it would fuse two sentences.
  function stripUrlFragments(t, removed) {
    var out = String(t || "");
    out = out.replace(/(^|[\s(\["'])(\/?(?:[A-Za-z0-9][A-Za-z0-9_.\-]*\/){2,}[A-Za-z0-9_\-](?:[A-Za-z0-9_.\-]*[A-Za-z0-9_\-])?\)?)/g, function (m, pre, tok) {
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}\)?$/.test(tok)) return m;
      if (!/[A-Za-z]/.test(tok)) return m;
      var last = tok.replace(/^\//, "").replace(/\)$/, "").split("/").pop();
      if (!last || last.length < 4) return m;
      removed.push(tok);
      return pre;
    });
    // A markdown link whose URL is already gone ("[label](") —
    // keep the label, drop the brackets and paren. "[label] (…)"
    // (space before the paren) is real prose and never matches.
    out = out.replace(/\[([^\]]+)\]\(\s*/g, function (m, label) { removed.push(m); return label; });
    return out;
  }
  // Orphan closers left by a stripped link ("…(film))" — the MD cut
  // keeps the label and leaves the ")"). Drop ")" beyond the "("
  // count (from the end first) and likewise for "]" — balanced
  // parentheses/brackets are never touched.
  function stripUnbalancedClosers(s) {
    var t = String(s || "");
    var opens = (t.match(/\(/g) || []).length, closes = (t.match(/\)/g) || []).length;
    while (closes > opens) {
      var i = t.lastIndexOf(")");
      if (i < 0) break;
      t = t.slice(0, i) + t.slice(i + 1);
      closes--;
    }
    var ob = (t.match(/\[/g) || []).length, cb = (t.match(/\]/g) || []).length;
    while (cb > ob) {
      var j = t.lastIndexOf("]");
      if (j < 0) break;
      t = t.slice(0, j) + t.slice(j + 1);
      cb--;
    }
    return t;
  }
  function cleanSpokenText(text) {
    var removed = [];
    var t = String(text || "");
    function cut(re) {
      t = t.replace(re, function (m) {
        var mm = String(m).trim();
        if (mm) removed.push(mm);
        return " ";
      });
    }
    // Markdown links keep their text, drop the URL.
    t = t.replace(SPOKEN_MD_LINK_RE, function (m, label) { removed.push(m); return label; });
    // Timestamps are metadata, never substance — strip them BEFORE
    // sentence-splitting, so a split can never tear "Nov. 13" or
    // "3:27 PM" apart. Metadata-position only: a time that is the
    // substance of a sentence ("the meeting starts at 3 PM") is kept.
    // "Published Nov 13, 2026 at 3:27 PM." / "Updated 2:14 PM" /
    // "Last updated 2 hours ago" / "Posted: Nov 13, 2026" — label
    // plus date/time/ago (or just the label + punctuation), at a
    // sentence start only. The date/time is REQUIRED after the label
    // unless punctuation follows, so "Updated guidance says…" is
    // never touched. v1.5.1: the label may carry "by <name>" before
    // the date ("Posted by Richelle Jett & Ernie Hahn on Thursday,
    // November 12, 2026 at 6:56:24 PM" — the exact dateline a real
    // blog page speaks aloud), "at" as well as "on", a comma before
    // the time ("Nov 12, 2026, 3:27 PM"), and year-less / ISO /
    // numeric dates. A weekday before the date is allowed too.
    var PUB_RE = new RegExp("(^|[.!?]\\s+)(?:Published|Updated|Posted|Last updated)\\s*:?\\s*(?:by\\s+[^,;|—–.!?\\n]{1,60}?\\s+)?(?:on|at)?\\s*(?:(?:" + PUB_DATE_RE + "(?:(?:\\s+at\\s+|\\s*,\\s*)" + TIME_RE + ")?|" + TIME_RE + "|" + AGO_RE + ")\\s*[.!?]?\\s*|[.!?]+\\s*)", "gi");
    // "Published by Jane Doe." with NO date at all — the label plus
    // a by-name is still only metadata, never article substance.
    var PUB_BY_RE = /(^|[.!?]\s+)(?:Published|Posted|Updated)\s+by\s+[^,;|—–.!?\n]{1,60}[.!?]\s*/gi;
    // Repeat until stable: one global pass eats the ". " boundary the
    // next label needs, so "Updated 2:14 PM." survived after
    // "Published … 3:27 PM." was cut (v1.4.1). Each pass shortens
    // the string, so the loop always terminates.
    var prevT;
    do { prevT = t; t = t.replace(PUB_RE, function (m, pre) { var mm = m.trim(); if (mm) removed.push(mm); return pre; }); } while (t !== prevT);
    do { prevT = t; t = t.replace(PUB_BY_RE, function (m, pre) { var mm = m.trim(); if (mm) removed.push(mm); return pre; }); } while (t !== prevT);
    // "5 min read", "· 3 min read", "5-minute read"
    cut(/·?\s*\b\d+\s*-?\s*(?:min|mins|minute|minutes)\s+read\b/gi);
    // "2 hours ago", "3 days ago"
    cut(new RegExp("\\b" + AGO_RE + "\\b", "gi"));
    // A date or time opening a sentence and followed by a dash,
    // pipe or bullet ("November 13, 2026 — the council met.",
    // "November 12, 2026 | By Jane Doe"): the dateline goes.
    // Year-less and machine dates count here too (v1.5.1).
    do { prevT = t; t = t.replace(new RegExp("(^|[.!?]\\s+)(?:" + PUB_DATE_RE + "|" + TIME_RE + ")\\s*[\\-—–|•]\\s*", "gi"), function (m, pre) { var mm = m.trim(); if (mm) removed.push(mm); return pre; }); } while (t !== prevT);
    cut(SPOKEN_URL_RE);
    cut(SPOKEN_WWW_RE);
    cut(SPOKEN_EMAIL_RE);
    cut(SPOKEN_DOMAIN_RE);
    // v1.6.2 (b): bare URL-fragment artefacts (see stripUrlFragments).
    t = stripUrlFragments(t, removed);
    INLINE_CHROME_RES.forEach(cut);
    t = t.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.!?;:])/g, "$1").trim();
    var kept = [], dropped = [];
    splitSentences(t).forEach(function (s) {
      // Drop a dangling preposition/conjunction left behind by a cut.
      var s2 = s.replace(/\s+(at|to|on|in|for|and|or|with|from|of|by)\s*([.!?]|$)/gi, "$2").trim();
      s2 = s2.replace(/[ \t]{2,}/g, " ").trim();
      // A leading dash left behind when a chrome clause before it was
      // cut ("Read more — the meeting starts…").
      s2 = s2.replace(/^[—–-]\s*/, "").trim();
      if (!s2) { dropped.push(s); return; }
      // v1.6.2 (b): orphan closers from a stripped link ("Foo)").
      s2 = stripUnbalancedClosers(s2);
      if (!s2) { dropped.push(s); return; }
      // v1.6.2 (b): a headless clause left by a stripped URL fragment
      // ("on countries and trading partners…" — the sentence's head
      // went with the link). A real sentence starts with a capital;
      // a clause starting with a lowercase preposition/conjunction
      // is a fragment, never prose. Dropped, not silently lost — it
      // lands in `dropped` and shows under "Show removed".
      if (/^(on|in|at|to|for|with|from|of|by|and|but|or|as)\s/.test(s2)) { dropped.push(s2); return; }
      // v1.6.1 (e): image-credit fragments (Jina/BBC): strip a
      // leading credit + file-extension artefact fused onto a real
      // sentence, drop a sentence that IS only a credit, drop
      // "(Image: …)" / "Image caption" fragments. A real sentence
      // that merely mentions an agency survives — the guards live
      // in stripLeadingImageCredit / isImageCreditLine.
      s2 = stripLeadingImageCredit(s2);
      if (!s2) { dropped.push(s); return; }
      if (isImageCreditLine(s2)) { dropped.push(s2); return; }
      if (/^\(?\s*(image|photo|picture|illustration)(\s+\d+)?\s*:/i.test(s2) || /^image caption\b/i.test(s2) || /^\(image:[^)]*\)$/i.test(s2)) { dropped.push(s2); return; }
      // A fragment with no letters at all is stray punctuation left
      // by a cut (a lone "." after "5 min read." was removed).
      if (!/[A-Za-z]/.test(s2)) { dropped.push(s2); return; }
      // A byline carrying its date after a separator ("By Richelle
      // Jett & Ernie Hahn / November 12, 2026"): cut the trailing
      // dateline first, so the byline test below can see the byline.
      // Only for sentences that start with "By" — a real sentence
      // ending "— November 2026" ("The report covers January —
      // November 2026") keeps its date.
      if (/^by\s/i.test(s2)) s2 = s2.replace(new RegExp("\\s*[—–\\-•/]\\s*(?:" + PUB_DATE_RE + "|" + TIME_RE + ")\\s*\\.?$", "i"), "").trim();
      if (!s2) { dropped.push(s); return; }
      // A byline carrying a trailing "— <description>" ("By A & B
      // — the X Group at Douglas Elliman"): cut the trailing segment
      // ONLY when what is left is a pure byline — a real sentence
      // ("By Monday — the deadline — the report was ready") fails
      // that test, because "By Monday — the deadline" is not a
      // byline, so it is never cut.
      var bylineCut;
      do {
        bylineCut = false;
        if (/^by\s/i.test(s2)) {
          var bm = s2.match(/^(.*)\s+[—–\-•/]\s*.+$/);
          // Same no-/i rule as the byline test below: [A-Z] must mean
          // capitals only, or the guard eats real sentences.
          if (bm && /^[Bb]y\s+[A-Z][A-Za-z'’-]*(\s+(?:&|and)?\s*[A-Z][A-Za-z'’-]*|,\s*[A-Z][\w\s'’-]{0,40}){0,7}\.?$/.test(bm[1].trim())) { s2 = bm[1].trim(); bylineCut = true; }
        }
      } while (bylineCut);
      if (!s2) { dropped.push(s); return; }
      // A byline sentence inside a pasted block ("By Jane Doe.").
      // Names only: capitalized words (plus & / and), so a real
      // sentence that merely starts with "By" ("By November the
      // leaves had fallen.") is kept — the old {0,50} rule ate it.
      // NO /i flag here: with it, [A-Z] matches lowercase too and
      // the guard is worthless (v1.5.1 caught this in QA).
      if (/^[Bb]y\s+[A-Z][A-Za-z'’-]*(\s+(?:&|and)?\s*[A-Z][A-Za-z'’-]*|,\s*[A-Z][\w\s'’-]{0,40}){0,7}\.?$/.test(s2)) { dropped.push(s2); return; }
      // A copyright footer line ("© Copyright 2023 APG East LLC.
      // All rights reserved | Terms of Use | Privacy Policy") —
      // never article substance. The "All rights reserved" tail
      // often carries "| Terms of Use | Privacy Policy" after it,
      // so the bare end-anchored pattern is not enough on its own.
      if (/©/.test(s2) || /^\(c\)\s/i.test(s2) || /^copyright\s+(©|\d{4})/i.test(s2) || (/^all rights reserved\b/i.test(s2) && (s2.length < 80 || /\||terms of use|privacy policy/i.test(s2)))) { dropped.push(s2); return; }
      // A breadcrumb line ("Home / Blog / Buyer Resources").
      if (isBreadcrumbLine(s2)) { dropped.push(s2); return; }
      // A sentence that IS only a date or a time is metadata — drop
      // it. (Substance times survive: "the meeting starts at 3 PM"
      // is a real sentence, not a timestamp line.)
      if (TIMESTAMP_ONLY_RE.test(s2)) { dropped.push(s2); return; }
      if (wordsOf(s2) < 8 && LINK_POINTER_SENTENCE_RE.test(s2)) { dropped.push(s2); return; }
      kept.push(s2);
    });
    return { text: kept.join(" "), removed: removed.concat(dropped) };
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
    // X posts: strip every URL (not just t.co) and UI chrome, so a
    // link in a post is never read aloud.
    var c = cleanSpokenText(String(text || ""));
    return c.text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
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

  /* ---------------- v1.6.0 — X follow-accounts feed + Browse mode ----
   * Two new ways in, same reader out. Both reuse the existing
   * machinery and rules: the proxy chain (fetchArticle), the X-post
   * reader (fetchXPost / parseXUrl / stripShortLinks), the reader
   * flow (openArticle with autoplay, so a tap IS the gesture and
   * the Kitten voice + trim silence + chrome-trim all apply), and
   * the honest blocked-state UI (both fallback buttons, never a
   * bypass). No sign-in, no key, no payment, no official X API.
   *
   * X FEED: follows are handles the visitor adds, persisted in
   * localStorage (auralis.xFollows.v1). NO default handles — the
   * empty state explains how to add one (e.g. @NASA). Per handle:
   *   PRIMARY — FxTwitter RSS: https://fxtwitter.com/<handle>/feed.xml
   *     Verified live Nov 25, 2026: HTTP 200, ~90 items, full post
   *     text in each item's <description> (CDATA HTML, first <p>),
   *     <title> truncated at 140 chars, <link> the x.com status
   *     URL, <pubDate> RFC 822. No CORS headers on fxtwitter.com,
   *     so a browser fetch goes through a proxy leg (below).
   *   FALLBACK — Nitter-instance RSS: <instance>/<handle>/rss.
   *     Verified Nov 25, 2026: NO working instance — netbub.com
   *     403 "Gandalf — You shall not pass!", catsarch.com 429,
   *     privacyredirect.com 403, moomoo.me / poast.org unreachable.
   *     So every instance is UNTRUSTED until a live fetch+parse
   *     with >=1 item passes at runtime; the list rotates, the
   *     last instance that worked is tried first (stored in
   *     auralis.xFeed.nitterInstance.v1), and when all mirrors are
   *     down the handle shows an honest "this source is down right
   *     now" state. Nothing in this feature depends on Nitter
   *     being up — FxTwitter is the working primary.
   * RSS fetch legs (fetchRssText): direct, then the raw-preserving
   * proxies from CFG.FETCH_PROXIES (AllOrigins, Codetabs), then
   * Jina Reader LAST — Jina rewrites XML to markdown, so its text
   * is parsed as markdown (parseJinaFeedMarkdown: ### [title](link)
   * + date line per item, truncated titles). Raw XML is preferred
   * because only it carries the full post text. A leg that returns
   * a block page is a failed leg, same as in fetchArticle (v1.4.5).
   * Tapping a post reads the WHOLE thread: fetchXPost (api.fx/vx,
   * thread + conversation parts in order) first; if that fails,
   * the post URL through the existing proxy chain (fetchArticle)
   * with the thread's posts extracted in order; if that fails too,
   * the RSS item's own text — which is always there, so a tap
   * never dead-ends. The source (FxTwitter / Nitter + instance)
   * is shown on every item, and the feed says plainly it reads
   * public posts via public mirrors.
   *
   * BROWSE: the visitor types a site URL (or taps a favourite,
   * persisted in auralis.browseFavs.v1, seeded with BBC News —
   * verified Nov 25, 2026: Jina 200 with 21 distinct
   * /news/articles/ links; AllOrigins flaky 500-then-200, so the
   * proxy-chain retry matters. AP News is dead on both legs the
   * same day — do NOT seed it). The front/section page is fetched
   * through the EXISTING proxy chain (fetchArticle), its article
   * links extracted (same-site, article-like, deduped, title from
   * anchor text, nav/ads/section pages dropped), and shown as a
   * clean headline list. Tapping a headline calls readUrl — the
   * existing reader flow. Paywalls, login walls, JS-rendered
   * homepages and fully-blocked sites fail honestly with the
   * existing blocked-state UI (both fallback buttons, never a
   * bypass). No live iframe browsing. */
  var X_FEED_KEY = "auralis.xFollows.v1";
  var X_FEED_INSTANCE_KEY = "auralis.xFeed.nitterInstance.v1";
  var BROWSE_FAVS_KEY = "auralis.browseFavs.v1";
  var BROWSE_REMOVED_SEEDS_KEY = "auralis.browseRemovedSeeds.v1";
  var NITTER_INSTANCES = [
    "https://nitter.netbub.com",
    "https://nitter.catsarch.com",
    "https://nitter.privacyredirect.com"
  ];
  var BROWSE_SEED_FAVS = [{ name: "BBC News", url: "https://www.bbc.com/news" }];

  // An X handle, normalised: no @, no whitespace, lower-case.
  // X handles are 1–15 chars of letters, digits and underscore.
  // Returns the handle or "" when it isn't one.
  function normalizeXHandle(raw) {
    var h = String(raw || "").trim().replace(/^@+/, "").trim().toLowerCase();
    return /^[a-z0-9_]{1,15}$/.test(h) ? h : "";
  }
  function xFollows() {
    var list = storeGet(X_FEED_KEY, null);
    if (!Array.isArray(list)) return [];
    return list.filter(function (h) { return typeof h === "string" && normalizeXHandle(h) === h; });
  }
  function saveXFollows(list) {
    var clean = [];
    (list || []).forEach(function (h) {
      var n = normalizeXHandle(h);
      if (n && clean.indexOf(n) === -1) clean.push(n);
    });
    storeSet(X_FEED_KEY, clean);
    return clean;
  }
  // v1.6.1: seeds are merged back on EVERY load (dedup by URL), so
  // a stored list that lost a seed — e.g. v1.6.0 persisted [] after
  // an accidental ✕ tap — can never lose it permanently. A deliberate
  // seed removal is tracked separately (removedSeedUrls) and is
  // restorable by re-saving the site as a favourite.
  function removedSeedUrls() {
    var list = storeGet(BROWSE_REMOVED_SEEDS_KEY, null);
    if (!Array.isArray(list)) return [];
    var clean = [];
    list.forEach(function (u) { if (typeof u === "string" && clean.indexOf(u) === -1) clean.push(u); });
    return clean;
  }
  function saveRemovedSeedUrls(list) {
    storeSet(BROWSE_REMOVED_SEEDS_KEY, removedSeedUrls().concat(list || []).filter(function (u, i, a) { return a.indexOf(u) === i; }));
  }
  function browseFavs() {
    var removed = removedSeedUrls();
    var list = storeGet(BROWSE_FAVS_KEY, null);
    var stored = [];
    var seen = {};
    (Array.isArray(list) ? list : BROWSE_SEED_FAVS).forEach(function (f) {
      if (!f || !f.url) return;
      var url = String(f.url);
      if (seen[url]) return;
      seen[url] = true;
      stored.push({ name: String(f.name || "").slice(0, 60) || hostOf(url), url: url });
    });
    var merged = [];
    BROWSE_SEED_FAVS.forEach(function (s) {
      if (removed.indexOf(s.url) === -1) merged.push({ name: s.name, url: s.url });
    });
    stored.forEach(function (f) {
      if (removed.indexOf(f.url) !== -1) return;
      if (!merged.some(function (m) { return m.url === f.url; })) merged.push(f);
    });
    return merged;
  }
  function saveBrowseFavs(list) {
    var clean = [], seen = {};
    (list || []).forEach(function (f) {
      if (!f || !f.url) return;
      var url = String(f.url);
      if (seen[url]) return;
      seen[url] = true;
      clean.push({ name: String(f.name || "").slice(0, 60) || hostOf(url), url: url });
    });
    storeSet(BROWSE_FAVS_KEY, clean);
    // Re-saving a seed favourite restores it after a deliberate removal.
    var removed = removedSeedUrls().filter(function (u) {
      return !clean.some(function (f) { return f.url === u; });
    });
    if (removed.length !== removedSeedUrls().length) storeSet(BROWSE_REMOVED_SEEDS_KEY, removed);
    return clean;
  }
  // Remove one favourite. A seed removal is recorded separately so
  // the stored list alone can never silently lose a seed again.
  function removeBrowseFav(url) {
    var u = String(url || "");
    if (BROWSE_SEED_FAVS.some(function (s) { return s.url === u; })) saveRemovedSeedUrls([u]);
    return saveBrowseFavs(browseFavs().filter(function (g) { return g.url !== u; }));
  }
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return String(url || ""); }
  }

  // Fetch raw text for an RSS URL through the same public proxies as
  // fetchArticle — but raw-preserving legs first: only raw XML carries
  // the full post text, while Jina rewrites it to (parseable, but
  // title-truncated) markdown. Returns { via, text }.
  function fetchRssText(url) {
    var rawLegs = [], jinaLegs = [];
    (CFG.FETCH_PROXIES || []).forEach(function (p) {
      try {
        if (/jina/i.test(p.name || "")) jinaLegs.push({ name: p.name, url: p.url(url) });
        else rawLegs.push({ name: p.name, url: p.url(url) });
      } catch (e) { /* skip bad proxy config */ }
    });
    var attempts = [{ name: "direct", url: url }].concat(rawLegs).concat(jinaLegs);
    var chain = Promise.reject(new Error("start"));
    attempts.forEach(function (a) {
      chain = chain.catch(function () {
        return fetchWithTimeout(a.url, 15000).then(function (resp) {
          if (!resp.ok) throw new Error(a.name + " returned HTTP " + resp.status);
          return resp.text().then(function (text) {
            if (isBlockPageText(text)) throw new Error(a.name + " returned a block page");
            return { via: a.name, text: text };
          });
        });
      });
    });
    return chain;
  }
  // Decode the entities an RSS field may carry (&lt; &gt; &amp; …).
  function decodeRssEntities(s) {
    return String(s || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
  }
  // Plain text out of an HTML fragment (an FxTwitter <description>):
  // the FIRST <p> is the post itself; later <p>s are media. No <p>
  // at all → the whole fragment's text.
  function rssDescriptionText(html) {
    var raw = String(html || "").trim();
    if (!raw) return "";
    try {
      var doc = new DOMParser().parseFromString(raw, "text/html");
      var first = doc.querySelector("p");
      var t = (first ? first.textContent : doc.body.textContent) || "";
      return t.replace(/\s+/g, " ").trim();
    } catch (e) {
      return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  }
  // One RSS <item> block → { text, link, date (ms or null), guid }.
  // Text is the FULLER of the description text and the title:
  // FxTwitter truncates <title> at 140 chars but puts the whole
  // post in <description>; Nitter puts the whole post in <title>
  // and may carry no description at all.
  function rssItemFromFields(title, desc, link, pubDate, guid) {
    var fromDesc = rssDescriptionText(decodeRssEntities(desc));
    var fromTitle = decodeRssEntities(title).replace(/\s+/g, " ").trim();
    var text = fromDesc.length >= fromTitle.length ? fromDesc : fromTitle;
    var date = null;
    if (pubDate) {
      var ms = Date.parse(String(pubDate).trim());
      if (!isNaN(ms)) date = ms;
    }
    return { text: text, link: String(link || "").trim(), date: date, guid: String(guid || link || "").trim() };
  }
  function rssField(block, tag) {
    var re = new RegExp("<" + tag + ">(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</" + tag + ">", "i");
    var m = String(block || "").match(re);
    return m ? m[1].trim() : "";
  }
  // Regex fallback for environments whose DOMParser can't do XML
  // (the browser path below is primary — this keeps the parse
  // working in the jsdom harness and anywhere else XML parsing is
  // unavailable). Returns items or null when there's no <item>.
  function parseRssXmlRegex(text) {
    var items = [], m;
    var itemRe = /<item>([\s\S]*?)<\/item>/gi;
    while ((m = itemRe.exec(String(text || ""))) !== null) {
      var block = m[1];
      var it = rssItemFromFields(rssField(block, "title"), rssField(block, "description"), rssField(block, "link"), rssField(block, "pubDate"), rssField(block, "guid"));
      if (it.text && it.link) items.push(it);
    }
    return items.length ? items : null;
  }
  // Parse RSS 2.0 XML into [{ text, link, date, guid }], newest
  // first is the caller's job. Returns null when the text isn't
  // RSS (a block page, Jina markdown, an empty feed).
  function parseRssXml(text) {
    var raw = String(text || "");
    if (raw.indexOf("<item") === -1 && raw.indexOf("<item>") === -1) return null;
    try {
      var doc = new DOMParser().parseFromString(raw, "text/xml");
      var err = doc.getElementsByTagName("parsererror");
      if (err && err.length) return parseRssXmlRegex(raw);
      var nodes = doc.getElementsByTagName("item");
      if (!nodes.length) return parseRssXmlRegex(raw);
      var items = [];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        function tag(name) {
          var e = n.getElementsByTagName(name);
          return e.length ? (e[0].textContent || "") : "";
        }
        var it = rssItemFromFields(tag("title"), tag("description"), tag("link"), tag("pubDate"), tag("guid"));
        if (it.text && it.link) items.push(it);
      }
      return items.length ? items : null;
    } catch (e) {
      return parseRssXmlRegex(raw);
    }
  }
  // Parse the markdown Jina Reader returns for an RSS URL:
  //   ### [title…](https://x.com/<handle>/status/<id>)
  //   [https://x.com/…](https://x.com/…)
  //   Wed, 25 Nov 2026 20:01:29 GMT
  // per item. Titles are truncated (140 chars) — the full text
  // comes from the tap, not from here. Returns items or null.
  function parseJinaFeedMarkdown(text) {
    var raw = String(text || "");
    if (raw.indexOf("### [") === -1) return null;
    var items = [];
    var blocks = raw.split(/^### \[/m).slice(1);
    blocks.forEach(function (b) {
      var head = b.match(/^([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
      if (!head) return;
      var link = head[2];
      var date = null;
      var dm = b.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+[^\n]+/m);
      if (dm) {
        var ms = Date.parse(dm[0].trim());
        if (!isNaN(ms)) date = ms;
      }
      var title = decodeRssEntities(head[1]).replace(/\s+/g, " ").trim();
      if (title && link) items.push({ text: title, link: link, date: date, guid: link });
    });
    return items.length ? items : null;
  }
  // Parse one fetched feed body, XML first (full text), Jina
  // markdown second (truncated titles). Returns items or null.
  function parseFeedBody(text) {
    return parseRssXml(text) || parseJinaFeedMarkdown(text);
  }
  // The post's author is the handle in its x.com status URL
  // (a followed account's feed can carry another account's post
  // via retweet — the AUTHOR is who the item is by, not the feed).
  function xAuthorFromLink(link) {
    var x = link ? parseXUrl(link) : null;
    return x ? x.user : "";
  }
  // Merge every handle's items into one list, newest first:
  // deduped by link (the same post can appear under two handles
  // via retweets), undated items last in feed order.
  function mergeXFeedItems(perHandle) {
    var seen = {}, all = [];
    (perHandle || []).forEach(function (r) {
      (r.items || []).forEach(function (it) {
        var key = it.link || it.guid || it.text;
        if (!key || seen[key]) return;
        seen[key] = true;
        var author = xAuthorFromLink(it.link) || r.handle;
        all.push({
          handle: r.handle, author: author,
          // v1.6.1: a retweet — the post's author is not the followed
          // account — is labelled, never filtered out.
          retweet: author.toLowerCase() !== String(r.handle || "").toLowerCase(),
          text: it.text, link: it.link, date: it.date || null,
          via: r.via, sourceLabel: r.sourceLabel
        });
      });
    });
    all.sort(function (a, b) {
      if (a.date == null && b.date == null) return 0;
      if (a.date == null) return 1;
      if (b.date == null) return -1;
      return b.date - a.date;
    });
    return all;
  }
  // Fetch one handle's feed. Resolves { handle, items, via,
  // sourceLabel } — via is "FxTwitter" or "Nitter" and sourceLabel
  // is what the UI shows ("FxTwitter" / "Nitter · nitter.netbub.com").
  // Rejects with an Error listing what was tried, so the UI can say
  // honestly that the source is down right now. Nitter instances
  // are tried in order — last instance that worked first — and an
  // instance only counts as working when a live fetch+parse yields
  // at least one item; a 403/429/empty reply moves on to the next.
  function fetchXFeedForHandle(handle) {
    var h = normalizeXHandle(handle);
    if (!h) return Promise.reject(new Error("not a handle"));
    var tried = [];
    function tryFx() {
      return fetchRssText("https://fxtwitter.com/" + h + "/feed.xml").then(function (res) {
        var items = parseFeedBody(res.text);
        if (!items) throw new Error("FxTwitter returned no posts");
        return { handle: h, items: items, via: "FxTwitter", sourceLabel: "FxTwitter" };
      }).catch(function (err) {
        tried.push("FxTwitter (" + (err && err.message ? err.message : "failed") + ")");
        return tryNitter(0);
      });
    }
    function nitterOrder() {
      var last = null;
      try { last = storeGet(X_FEED_INSTANCE_KEY, null); } catch (e) {}
      var order = NITTER_INSTANCES.slice();
      if (last && order.indexOf(last) !== -1) {
        order.splice(order.indexOf(last), 1);
        order.unshift(last);
      }
      return order;
    }
    function tryNitter(i) {
      var order = nitterOrder();
      if (i >= order.length) {
        var err = new Error("All X mirrors are down right now: " + tried.join("; "));
        err.tried = tried;
        throw err;
      }
      var base = order[i];
      return fetchRssText(base + "/" + h + "/rss").then(function (res) {
        var items = parseFeedBody(res.text);
        if (!items) throw new Error("no posts");
        try { storeSet(X_FEED_INSTANCE_KEY, base); } catch (e) {}
        return { handle: h, items: items, via: "Nitter", sourceLabel: "Nitter · " + hostOf(base) };
      }).catch(function (err) {
        tried.push(hostOf(base) + " (" + (err && err.message ? err.message : "failed") + ")");
        return tryNitter(i + 1);
      });
    }
    // v1.6.1: one full retry pass (short delay) before declaring a
    // handle down — a transient FxTwitter failure used to fall back
    // to a short Nitter feed (the 68 → 18 swing: no cap in
    // parseFeedBody/mergeXFeedItems — the count depends on which leg
    // answers, FxTwitter carrying the fuller feed — so Fx gets a
    // second chance before the fallback leg is accepted).
    function delayMs(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
    function attemptFetch(n) {
      return tryFx().catch(function (err) {
        if (n < 1) return delayMs(1000).then(function () { return attemptFetch(n + 1); });
        throw err;
      });
    }
    return attemptFetch(0);
  }
  // Thread text out of a proxy-chain fetch of an x.com status URL
  // (fetchArticle's { text }): Jina markdown — strip the header,
  // drop headings / bare-link lines, keep the post lines in order;
  // raw HTML — the normal extractor. Best-effort: returns "" when
  // nothing readable comes back, and the caller falls back to the
  // RSS item text it already has.
  function xThreadTextFromFetched(text) {
    var t = String(text || "");
    if (!t) return "";
    var parts = [];
    if (/Markdown Content:/.test(t) || /^Title:/m.test(t)) {
      var idx = t.indexOf("Markdown Content:");
      var body = idx !== -1 ? t.slice(idx + "Markdown Content:".length) : t;
      body.split(/\n/).forEach(function (line) {
        var l = line.trim();
        if (!l || l.indexOf("###") === 0 || l.indexOf("![") === 0) return;
        if (/^\[https?:\/\/[^\]]*\]\(https?:\/\/[^)]*\)\s*$/.test(l)) return; // bare-link line
        if (/^https?:\/\/\S+$/.test(l)) return;
        var clean = stripShortLinks(l);
        if (clean && parts.indexOf(clean) === -1) parts.push(clean);
      });
    } else {
      try {
        var ex = extractFromHtml(t, "");
        (ex.text || "").split(/\n\s*\n/).forEach(function (p) {
          var clean = stripShortLinks(p.trim());
          if (clean && parts.indexOf(clean) === -1) parts.push(clean);
        });
      } catch (e) { /* not HTML either — fall through empty */ }
    }
    return parts.join("\n\n");
  }
  // Open one feed item in the reader, whole thread when there is
  // one. The tap is the gesture: openArticle({autoplay:true})
  // unlocks the audio context in the tap and playFree uses the
  // visitor's chosen voice with trim silence + chrome-trim, exactly
  // like any other article. Route 1: fetchXPost (api.fx/vx —
  // thread + conversation parts in order). Route 2: the post URL
  // through the existing proxy chain, thread posts extracted in
  // order. Route 3 (never fails): the RSS item's own text.
  function readXFeedItem(item) {
    var author = item.author || item.handle || "";
    var followed = item.handle || "";
    // v1.6.1: a retweet's byline names the real author AND the
    // account that retweeted it, so it can never read as the
    // followed account's own post.
    var isRetweet = !!author && !!followed && author.toLowerCase() !== followed.toLowerCase();
    var handle = author;
    var link = item.link || "";
    var via = item.sourceLabel || item.via || "FxTwitter";
    function openFromText(body, parts, bylineVia) {
      var title = body.length > 90 ? body.slice(0, 90).replace(/\s+\S*$/, "") + "…" : body;
      var date = item.date ? formatXDate(new Date(item.date).toISOString()) : "";
      var byline = "By @" + handle + (isRetweet ? " · retweeted by @" + followed : "") + (date ? " · " + date : "") +
        " · X post · via " + bylineVia +
        (parts > 1 ? " · " + parts + " parts" : " · 1 post") +
        (link ? " · Original: " + link : "");
      openArticle(title, "X · @" + handle, byline, body, 0, undefined, { autoplay: true });
    }
    function openRssText() {
      var body = stripShortLinks(item.text || "");
      if (wordsOf(body) < 5) {
        showStatus("error", "Couldn't read that post",
          "Every route failed — the post may be deleted, protected, or from an account that limits readers. <strong>Auralis never bypasses login walls.</strong>",
          "Open the original post", function () { openExternal(link); },
          "Paste text instead", openPasteModal);
        return;
      }
      openFromText(body, 1, via + " (feed text)");
    }
    var x = link ? parseXUrl(link) : null;
    if (!x) { openRssText(); return; }
    showStatus("", "Fetching the X post…", "Reading the full post — long posts and threads, start to finish — via a public mirror. No login needed, and nothing is bypassed: protected or deleted posts can't be read.");
    fetchXPost(x).then(function (post) {
      var body = post.parts.join("\n\n");
      openFromText(body, post.parts.length, post.via);
    }).catch(function () {
      fetchArticle(link).then(function (res) {
        var thread = xThreadTextFromFetched(res.text);
        if (wordsOf(thread) >= 5) {
          var parts = thread.split(/\n\s*\n/).filter(Boolean);
          openFromText(thread, parts.length, res.via);
        } else {
          openRssText();
        }
      }).catch(function () { openRssText(); });
    });
  }

  /* ---------------- Browse mode (v1.6.0) ---------------- */
  // Article-like links only: nav, account pages, section listings,
  // media files and ads never reach the headline list.
  var BROWSE_DROP_PATHS = [
    /^\/(login|signin|sign-in|signup|sign-up|register|search|account|cart|checkout|subscribe|newsletter|sitemap|privacy|terms|cookie|cookies|contact|about|help|support|settings|profile|advertis|careers|jobs|press|legal)(\/|$)/i,
    /\/(tag|category|author|topics?|section)\//i,
    /\/search(\/|$)/i,
    /\/videos?\//i, // video pages have little readable text — articles only
    /\/live\//i // live-text pages are a rolling feed, not an article
  ];
  var BROWSE_DROP_EXTS = /\.(jpg|jpeg|png|gif|webp|svg|css|js|pdf|mp4|webm|mp3|wav|zip|xml|rss|ico|woff2?)($|\?)/i;
  var BROWSE_SECTION_WORDS = ["news", "sport", "sports", "business", "tech", "technology", "culture", "world", "politics", "opinion", "video", "videos", "live", "weather", "entertainment", "science", "health", "education", "money", "style", "travel", "food", "local", "uk", "us", "articles"];
  var BROWSE_DROP_TITLES = ["home", "menu", "search", "sign in", "log in", "subscribe", "newsletter", "privacy policy", "terms of use", "cookie policy", "contact us", "about us", "advertise", "skip to content", "back to top", "read more", "share", "listen", "watch"];
  // One candidate link → normalised same-site article URL, or "".
  // Title must read like a headline (>= 15 chars, has a space, not
  // a nav label); URL must be same-site (www-insensitive), not a
  // section/listing page, not a media file.
  function browseLinkOk(title, href, baseUrl) {
    var t = String(title || "").replace(/\s+/g, " ").trim();
    if (t.length < 15 || t.indexOf(" ") === -1) return "";
    if (BROWSE_DROP_TITLES.indexOf(t.toLowerCase()) !== -1) return "";
    if (/^(read more|share|listen|watch)\b/i.test(t)) return "";
    var u;
    try { u = new URL(href, baseUrl); } catch (e) { return ""; }
    if (!/^https?:$/.test(u.protocol)) return "";
    var base;
    try { base = new URL(baseUrl); } catch (e) { return ""; }
    if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) return "";
    u.hash = "";
    var path = u.pathname;
    if (path === "/" || path === "") return "";
    if (BROWSE_DROP_EXTS.test(path + u.search)) return "";
    if (BROWSE_DROP_PATHS.some(function (re) { return re.test(path); })) return "";
    var segs = path.split("/").filter(Boolean);
    if (segs.length === 1 && BROWSE_SECTION_WORDS.indexOf(segs[0].toLowerCase()) !== -1) return "";
    if (/\/$/.test(path) && segs.length <= 1) return "";
    return u.href;
  }
  // Extract headline links from a fetched front/section page — raw
  // HTML (AllOrigins/Codetabs/direct) or Jina markdown. HTML: links
  // inside <main>/<article> first (the story list, not the chrome);
  // if that yields fewer than 5, all page links. Markdown: [t](u)
  // links. Same-site, article-like, deduped by URL and by title,
  // page order, capped at 40.
  // v1.6.1 (c): ONE choke point for headline titles — every pass
  // (HTML anchors, markdown links, line scan) stores its title
  // through cleanBrowseTitle, so no pass can smuggle raw Jina
  // markdown ("2 ## Calls for inquiry…", "US announces new
  // tariffs… The new levies would hit…") into the list.
  var BROWSE_TITLE_STOP_END = /^(in|of|the|a|an|and|to|for|on|with|by|at|from|as|but|or|nor|after|before|during|against|over|under|between|into|through|without|within|upon|around|across|behind|below|above|toward|towards|until|while|when|where|than|then|ending|including|following|amid|—|–|-)$/i;
  // Words that can START a summary sentence. The glued-split below
  // only cuts before one of these — a Titlecase word that merely
  // continues the headline ("Nvidia shares…", "Thanksgiving
  // parade…", "Sterling given…", "Earth's defences…") never
  // qualifies, so a head that ends mid-phrase ("Macy's postpones",
  // "Trump's accounts traded") is never produced. Conservative by
  // design: a glued title with no clean boundary stays whole rather
  // than miscut.
  var BROWSE_TITLE_STARTERS = "(?:The|A|An|His|Her|Their|Its|This|That|These|Those|It|He|She|They|We|You|My|Our|Your|Once|After|Before|Meanwhile|Now|Today|Yesterday|But|And|So|Then|When|While)";
  function cleanBrowseTitle(raw) {
    var s = String(raw || "").replace(/\s+/g, " ").trim();
    // Markdown links keep their text, drop the URL; emphasis marks go.
    s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`~]+/g, "");
    // Leading numbering ("2. ", "2 ", "1) "), heading marks ("## ",
    // "# ") and bullets ("• ") — looped, so "2 ## " loses both.
    var prev;
    do {
      prev = s;
      s = s.replace(/^(?:\d+\s*[.)]\s*|\d+\s+|#{1,6}\s+|[•·\-–—]\s+)/, "").trim();
    } while (s !== prev);
    s = s.replace(/\s+/g, " ").trim();
    if (!s) return "";
    // Glued with NO period ("…including China The new levies would
    // hit…"): cut before the first summary-starter word, when the
    // head is a complete headline (>= 15 chars, has a space, does
    // not end on a preposition/article/conjunction/participle) and
    // the tail is a complete sentence of its own (>= 20 chars).
    var gm = s.match(new RegExp("\\s+\"?" + BROWSE_TITLE_STARTERS + "\\s+\"?(?=[a-z0-9]|[A-Z]{2,}\\b)", "g"));
    if (gm) {
      var idx = -1, cut = -1;
      for (var gi = 0; gi < gm.length; gi++) {
        var at = s.indexOf(gm[gi], gi === 0 ? 0 : idx + 1);
        if (at < 0) break;
        idx = at;
        var head = s.slice(0, at).replace(/["“‘\s]+$/, "").trim();
        var tail = s.slice(at).replace(/^["“‘\s]+/, "").trim();
        if (head.length < 15 || head.indexOf(" ") === -1) continue;
        if (BROWSE_TITLE_STOP_END.test(head.split(/\s+/).pop())) continue;
        var tailFirstSent = tail.match(/^[^.!?…]+[.!?…]/);
        var tailSent = tailFirstSent ? tailFirstSent[0].trim() : tail;
        if (tailSent.length < 20 || tailSent.indexOf(" ") === -1) continue;
        cut = at;
        break;
      }
      if (cut > 0) s = s.slice(0, cut).trim();
    }
    // v1.6.2 (c): NEW-SENTENCE cut. The summary starts a fresh
    // sentence after a complete headline, but with no starter word
    // ("…she could not let go Jane Collins had all but given up…",
    // "…last NFL game Veteran quarterback Aaron Rodgers may have
    // played…", "…without charge Mahdi Tunsi, 26, was taken…"). A
    // cut is valid only when the head is a complete headline
    // (>= 20 chars, >= 4 words, last word lowercase and not a stop
    // word) and the tail is a complete sentence (first sentence
    // >= 20 chars, ends with terminal punctuation) that opens with a
    // proper name — either two capitalised words followed within a
    // few words by a finite verb or a comma ("Jane Collins had…",
    // "Raheem Sterling was…", "Mahdi Tunsi, 26, was…"), or a name
    // inside the first five words followed by a finite verb
    // ("Veteran quarterback Aaron Rodgers may…"). The guards are
    // what keep real headlines whole: "…targeted to test Earth's
    // defences…" never cuts (its tail has no terminal punctuation
    // and no name); "…host Top Gear…" never cuts (the head ends on
    // capitalised "Top"); "…against Netanyahu The Israeli PM…"
    // never cuts (the head ends on capitalised "Netanyahu").
    (function () {
      var VERBS = "had|has|have|was|were|is|are|will|would|could|may|might|did|does|said|says|say|faces|faced|makes|made|takes|took|gives|gave|sees|saw|comes|came|goes|went|begins|began|announces|announced|reveals|revealed|shows|showed|claims|claimed|warns|warned";
      function cleanWord(w) { return String(w || "").replace(/[,.;:!?)"”'’]+$/, ""); }
      function isVerb(w) { return new RegExp("^(?:" + VERBS + ")$", "i").test(cleanWord(w)); }
      var re = /\b[A-Z][\w'’\-]*\b/g, m;
      while ((m = re.exec(s)) !== null) {
        var cutAt = m.index;
        if (cutAt < 20) continue;
        var head = s.slice(0, cutAt).replace(/["“‘\s]+$/, "").trim();
        var tail = s.slice(cutAt).replace(/^["“‘\s]+/, "").trim();
        if (head.length < 20 || head.split(/\s+/).length < 4) continue;
        var lastWord = head.split(/\s+/).pop();
        if (BROWSE_TITLE_STOP_END.test(lastWord)) continue;
        // A head ending on a word that needs a noun after it ("played
        // last", "announces new") is never complete — the tail's
        // acronym ("NFL game…") is the missing object, not a new
        // sentence. Blocks the (c) acronym cut from miscutting
        // "…may have played last NFL game Veteran…".
        if (/^(last|next|new|final|only|former|latest|main|prime|chief|senior|junior|annual|daily|weekly|every|each|any|own|same|other|whole|full|major|top|big)$/i.test(lastWord.replace(/['\u2019"\u201c\u201d.,;:!?]+$/, ""))) continue;
        // (c) below allows a capitalised last word, but only when the
        // tail opens with an all-caps acronym (WBO / NBA / …) —
        // otherwise the head must end lowercase, or "…host Top
        // Gear…" miscuts.
        var tailOpensAcronym = /^[A-Z]{2,}\b/.test(tail);
        if (!/^[a-z]/.test(lastWord) && !tailOpensAcronym) continue;
        var tailFirstSent = tail.match(/^[^.!?…]+[.!?…]/);
        if (!tailFirstSent || tailFirstSent[0].trim().length < 20 || tailFirstSent[0].indexOf(" ") === -1) continue;
        var words = tailFirstSent[0].trim().split(/\s+/);
        var ok = false;
        var om = tailFirstSent[0].trim().match(/^([A-Z][\w'’\-]+)\s+([A-Z][\w'’\-]+(?:['’]s)?)/);
        if (om && ["The", "A", "An"].indexOf(om[1]) === -1) {
          for (var wi = 2; wi < Math.min(6, words.length); wi++) {
            if (isVerb(words[wi]) || /,/.test(words[wi])) { ok = true; break; }
          }
        }
        if (!ok) {
          for (var ni = 0; ni < Math.min(4, words.length - 1); ni++) {
            var w1 = cleanWord(words[ni]), w2 = cleanWord(words[ni + 1]);
            if (/^[A-Z][\w'’\-]+$/.test(w1) && /^[A-Z][\w'’\-]+$/.test(w2) && ["The", "A", "An"].indexOf(w1) === -1) {
              for (var vj = ni + 2; vj < Math.min(ni + 5, words.length); vj++) {
                if (isVerb(words[vj])) { ok = true; break; }
              }
              if (ok) break;
            }
          }
        }
        // (c) tail opens with an all-caps acronym, then a name + verb
        // ("WBO heavyweight world champion Daniel Dubois will
        // make…"). The acronym is what licenses the capitalised
        // head-last-word above; a plain capitalised tail word does not.
        if (!ok && tailOpensAcronym) {
          for (var n2 = 0; n2 < Math.min(7, words.length - 1); n2++) {
            var x1 = cleanWord(words[n2]), x2 = cleanWord(words[n2 + 1]);
            if (/^[A-Z][\w'’\-]+$/.test(x1) && /^[A-Z][\w'’\-]+$/.test(x2) && ["The", "A", "An"].indexOf(x1) === -1) {
              for (var v2 = n2 + 2; v2 < Math.min(n2 + 5, words.length); v2++) {
                if (isVerb(words[v2])) { ok = true; break; }
              }
              if (ok) break;
            }
          }
        }
        if (!ok) continue;
        s = head;
        return;
      }
    })();
    // v1.6.2 (c): REPEAT cut. The summary re-states the headline's
    // words at the join ("Williams exceeded F1 cost cap by £627,000
    // Williams "unintentially" broke…", "…say star Hunter Schafer
    // and series creator Hunter Schafer and co-stars say…") — cut
    // before the repeat. Candidates: every capitalised 2-word phrase
    // in the string, then the title's first word. A cut is valid only
    // when the head is a complete headline (>= 15 chars, has a
    // space, does not end on a stop word) and the tail is a complete
    // sentence of its own (first sentence >= 20 chars, ends with
    // terminal punctuation). When the repeat is the second half of a
    // name ("Daniel Dubois" — first word "Dubois" repeats), walk back
    // over immediately-preceding capitalised words so the cut falls
    // before the full name.
    (function () {
      function escRe(x) { return String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
      var cands = [];
      var bi = s.match(/[A-Z][\w'’\-]+(?:\s+[A-Z][\w'’\-]+)/g) || [];
      bi.forEach(function (b) { if (cands.indexOf(b) === -1) cands.push(b); });
      var firstWord = s.split(/\s+/)[0].replace(/["“‘\(\[]+$/, "");
      if (/^[A-Z][\w'’\-]{2,}$/.test(firstWord) && cands.indexOf(firstWord) === -1) cands.push(firstWord);
      for (var ci = 0; ci < cands.length; ci++) {
        var cand = cands[ci];
        var occ = [];
        var ore = new RegExp("\\b" + escRe(cand) + "\\b", "g"), om;
        while ((om = ore.exec(s)) !== null) occ.push(om.index);
        if (occ.length < 2) continue;
        var cutAt = occ[1];
        // Walk back over ONE immediately-preceding capitalised word
        // (the first half of a name: "Daniel" before "Dubois") —
        // but only when the word before THAT is lowercase, so the
        // walk never eats the headline's own last word ("…against
        // Netanyahu The Israeli…" must not become "…against").
        var back = s.slice(0, cutAt).match(/([A-Z][\w'’\-]+)\s+$/);
        if (back) {
          var beforeBack = s.slice(0, cutAt - back[0].length);
          var prevWord = beforeBack.match(/([A-Za-z][\w'’\-]*)\s*$/);
          if (!prevWord || !/^[A-Z]/.test(prevWord[1])) cutAt = cutAt - back[0].length;
        }
        var head = s.slice(0, cutAt).replace(/["“‘\s]+$/, "").trim();
        var tail = s.slice(cutAt).replace(/^["“‘\s]+/, "").trim();
        if (head.length < 15 || head.indexOf(" ") === -1) continue;
        if (BROWSE_TITLE_STOP_END.test(head.split(/\s+/).pop())) continue;
        var tailFirstSent = tail.match(/^[^.!?…]+[.!?…]/);
        if (!tailFirstSent || tailFirstSent[0].trim().length < 20 || tailFirstSent[0].indexOf(" ") === -1) continue;
        s = head;
        return;
      }
    })();
    // "Headline. Summary sentence." glued with a real period: cut
    // after the first sentence when it alone is a complete headline
    // (>= 15 chars, has a space). Abbreviation dots ("U.S.") can
    // never qualify — the prefix before them is far too short.
    var sm = s.match(/^(.{15,}?[.!?])\s+(?=[A-Z0-9"“‘])/);
    if (sm && sm[1].indexOf(" ") !== -1 && !/[A-Z]\.$/.test(sm[1])) s = sm[1].trim();
    // Trailing "5 hrs ago Business" / "· 2 hrs ago" tails that
    // survive without a summary to cut them away.
    s = s.replace(/\s*[·•|]\s*\d+\s*(?:hrs?|mins?|hours?|minutes?|days?)\s+ago.*$/i, "").trim();
    s = s.replace(/\s+\d+\s*(?:hrs?|mins?|hours?|minutes?|days?)\s+ago\s+[A-Z][\w &]*$/i, "").trim();
    if (s.length > 140) s = s.slice(0, 140).replace(/\s+\S*$/, "") + "…";
    return s;
  }
  function cleanBrowseTitleKey(t) {
    return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function extractBrowseLinks(text, baseUrl) {
    var raw = String(text || "");
    var found = [];
    var seenUrl = {}, seenTitle = {};
    function add(title, href) {
      var clean = cleanBrowseTitle(title);
      if (!clean) return;
      var url = browseLinkOk(clean, href, baseUrl);
      if (!url) return;
      var key = url.replace(/\/$/, "");
      if (seenUrl[key]) return;
      var tk = cleanBrowseTitleKey(clean);
      if (tk && seenTitle[tk]) return;
      seenUrl[key] = true; if (tk) seenTitle[tk] = true;
      found.push({ title: clean, url: url });
    }
    var isHtml = /<[a-z][\s\S]*>/i.test(raw) && raw.indexOf("<a ") !== -1;
    if (isHtml) {
      try {
        var doc = new DOMParser().parseFromString(raw, "text/html");
        var scopes = doc.querySelectorAll("main, article");
        var anchors = [];
        if (scopes.length) {
          scopes.forEach(function (s) { Array.prototype.forEach.call(s.querySelectorAll("a[href]"), function (a) { anchors.push(a); }); });
        }
        if (anchors.length < 5) anchors = Array.prototype.slice.call(doc.querySelectorAll("a[href]"));
        anchors.forEach(function (a) {
          var href = a.getAttribute("href") || "";
          var title = (a.textContent || "").replace(/\s+/g, " ").trim();
          if (title) add(title, href);
        });
      } catch (e) { /* unparseable HTML — fall through to markdown scan */ }
    }
    if (!isHtml || found.length < 5) {
      var mdRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, m;
      while ((m = mdRe.exec(raw)) !== null) add(m[1], m[2]);
      // Line-based pass: Jina wraps some stories as image links
      // ([![alt](img)](article)), and the regex above matches the
      // IMAGE link first, hiding the article URL — 4 of BBC's 21
      // /news/articles/ links were lost that way (Nov 25, 2026).
      // Scan each line for article URLs and take the line's own
      // text as the title (link text kept, image refs dropped).
      // Dedupe by URL means this only adds what the regex missed.
      raw.split(/\n/).forEach(function (line) {
        var urlRe = /\((https?:\/\/[^)\s]+)\)/g, um;
        while ((um = urlRe.exec(line)) !== null) {
          var title = line
            .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/#{1,6}\s*/g, " ")
            .replace(/[*_`]/g, "")
            .replace(/\s+/g, " ").trim();
          if (title.length > 140) title = title.slice(0, 140).replace(/\s+\S*$/, "") + "…";
          if (title) add(title, um[1]);
        }
      });
    }
    return found.slice(0, 40);
  }
  // Fetch a site's front/section page through the EXISTING proxy
  // chain and extract its headlines. Resolves { site, via, finalUrl,
  // links }. Rejects with the fetch error (the caller shows the
  // honest blocked-state UI with both fallback buttons).
  function browseSite(siteUrl) {
    var url = String(siteUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    var parsed;
    try { parsed = new URL(url); } catch (e) { return Promise.reject(new Error("That link doesn't look right")); }
    if (!/^https?:$/.test(parsed.protocol)) return Promise.reject(new Error("Only web pages can be browsed"));
    return fetchArticle(url).then(function (res) {
      var links = extractBrowseLinks(res.text || "", res.finalUrl || url);
      return { site: url, via: res.via, finalUrl: res.finalUrl || url, links: links };
    });
  }

  /* ---------------- X feed + Browse UI (v1.6.0) ---------------- */
  // Feed items keep their fetch state so a tap can read them even
  // when the list re-renders (a re-render replaces the DOM nodes).
  var xFeedItems = [];
  var xFeedDown = []; // [{ handle, detail }] — handles whose mirrors are all down
  var xFeedStale = false; // v1.6.1: true while showing last-good items after a failed refresh
  var xFeedLoading = false;
  // v1.6.2 (a): last-good feed cache — a reload shows the previous
  // posts at once (with their time) instead of an empty list while
  // the live refresh runs behind them. Best-effort only: a corrupt
  // or unreadable cache is ignored, never allowed to break the feed.
  var X_FEED_CACHE_KEY = "auralis.xFeedCache.v1";
  var X_FEED_CACHE_MAX_ITEMS = 50;
  var xFeedCacheAt = null; // ms epoch the on-screen items were cached (null = live-fresh)
  function formatCacheTime(ms) {
    try {
      var d = new Date(ms);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch (e) { return ""; }
  }
  function saveXFeedCache(items) {
    try {
      var clean = (items || []).slice(0, X_FEED_CACHE_MAX_ITEMS).map(function (it) {
        return { handle: it.handle, author: it.author, retweet: !!it.retweet, text: it.text, link: it.link, date: it.date || null, via: it.via, sourceLabel: it.sourceLabel };
      });
      localStorage.setItem(X_FEED_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items: clean }));
    } catch (e) { /* cache is best-effort — never break the feed over it */ }
  }
  function loadXFeedCache() {
    var raw = null;
    try { raw = localStorage.getItem(X_FEED_CACHE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    var data = null;
    try { data = JSON.parse(raw); } catch (e) { return null; }
    if (!data || typeof data.savedAt !== "number" || !Array.isArray(data.items)) return null;
    var items = data.items.filter(function (it) {
      return it && typeof it.text === "string" && it.text && typeof it.link === "string" && typeof it.handle === "string";
    });
    if (!items.length) return null;
    return { savedAt: data.savedAt, items: items };
  }
  // Fill the feed from the cache (still-followed handles only).
  // Returns true when cached posts are now on screen.
  function restoreXFeedCache() {
    var cached = loadXFeedCache();
    if (!cached) return false;
    var follows = xFollows();
    var items = cached.items.filter(function (it) { return follows.indexOf(it.handle) !== -1; });
    if (!items.length) return false;
    xFeedItems = items;
    xFeedCacheAt = cached.savedAt;
    return true;
  }

  function renderXFollows() {
    var row = $("xFollowChips");
    if (!row) return;
    row.innerHTML = "";
    xFollows().forEach(function (h) {
      var chip = el("span", "chip", "@" + h);
      var x = el("button", "chip-x", "✕");
      x.type = "button";
      x.setAttribute("aria-label", "Stop following @" + h);
      x.addEventListener("click", function () {
        saveXFollows(xFollows().filter(function (f) { return f !== h; }));
        renderXFollows();
        refreshXFeed();
        toast("Stopped following @" + h + ".");
      });
      chip.appendChild(x);
      row.appendChild(chip);
    });
    var empty = $("xFeedEmpty");
    if (empty) empty.hidden = xFollows().length > 0;
  }
  function renderXFeed() {
    var list = $("xFeedList");
    if (!list) return;
    list.innerHTML = "";
    xFeedItems.forEach(function (item) {
      var card = el("article", "feed-item");
      // v1.6.1: retweets are labelled with both accounts — an
      // @NASASolarSystem post in @NASA's feed can never look like
      // NASA's own post. Originals are unchanged.
      var head = el("p", "feed-item-handle", item.retweet
        ? "↻ @" + item.handle + " retweeted @" + (item.author || item.handle)
        : "@" + (item.author || item.handle));
      var date = el("span", "feed-item-date", item.date ? formatXDate(new Date(item.date).toISOString()) : "date unknown");
      head.appendChild(document.createTextNode(" · "));
      head.appendChild(date);
      card.appendChild(head);
      var text = item.text || "";
      var shown = text.length > 280 ? text.slice(0, 280).replace(/\s+\S*$/, "") + "…" : text;
      card.appendChild(el("p", "feed-item-text", shown));
      var meta = el("p", "feed-item-meta");
      meta.appendChild(document.createTextNode("via " + (item.sourceLabel || item.via || "FxTwitter") + " · "));
      var open = document.createElement("a");
      open.href = item.link || ("https://x.com/" + item.handle);
      open.target = "_blank"; open.rel = "noopener noreferrer";
      open.textContent = "Open post ↗";
      meta.appendChild(open);
      card.appendChild(meta);
      var btn = el("button", "btn btn-gold btn-small", "▶ Listen");
      btn.type = "button";
      btn.addEventListener("click", function () { readXFeedItem(item); });
      card.appendChild(btn);
      list.appendChild(card);
    });
    var status = $("xFeedStatus");
    if (status) {
      status.innerHTML = "";
      // v1.6.2 (a): the down-state must NEVER show while a fetch is
      // still in flight. A fresh load used to flash "down" for the
      // whole fetch, because the first render ran before the refresh
      // set xFeedLoading — and the refresh only re-rendered when the
      // fetch settled. While loading with nothing to show, say so
      // honestly; with posts already on screen, say the feed is
      // refreshing instead.
      if (xFeedLoading && !xFeedItems.length) {
        var loading = el("div", "feed-loading");
        loading.appendChild(el("strong", null, "Loading your feed… "));
        loading.appendChild(document.createTextNode("Fetching the latest public posts."));
        status.appendChild(loading);
      } else if (xFeedLoading && xFeedItems.length) {
        var refreshing = el("div", "feed-cached");
        refreshing.appendChild(el("strong", null, xFeedCacheAt
          ? "Showing posts from " + formatCacheTime(xFeedCacheAt) + " — refreshing…"
          : "Refreshing your feed… "));
        status.appendChild(refreshing);
      }
      // v1.6.2 (a): cached note — the posts on screen came from the
      // last good fetch (a previous visit), not a live one yet.
      // Cleared by a successful refresh (xFeedCacheAt = null) and
      // superseded by the stale note after a failed one.
      if (!xFeedLoading && !xFeedStale && xFeedCacheAt && xFeedItems.length) {
        var cached = el("div", "feed-cached");
        cached.appendChild(el("strong", null, "Showing posts from " + formatCacheTime(xFeedCacheAt) + ". "));
        cached.appendChild(document.createTextNode("Refresh in a bit for the latest."));
        status.appendChild(cached);
      }
      // v1.6.1: stale note when the list on screen is last-good
      // items kept through a failed refresh.
      if (xFeedStale && xFeedItems.length) {
        var stale = el("div", "feed-stale");
        stale.appendChild(el("strong", null, "Couldn't refresh just now — showing the last posts we got. "));
        stale.appendChild(document.createTextNode("Try Refresh in a bit."));
        status.appendChild(stale);
      }
      // Per-handle down-notes only once a fetch has settled — never
      // mid-flight (they are cleared when a refresh starts, so a
      // note from the last fetch can never linger over a live one).
      if (!xFeedLoading) {
        xFeedDown.forEach(function (d) {
          var note = el("div", "feed-down");
          note.appendChild(el("strong", null, "@" + d.handle + " — this source is down right now. "));
          note.appendChild(document.createTextNode("Both public mirrors failed (" + d.detail + "). Your other follows still load — try Refresh in a bit. Nothing is bypassed."));
          status.appendChild(note);
        });
      }
      if (!xFeedItems.length && xFollows().length && !xFeedLoading) {
        var all = el("div", "feed-down");
        all.appendChild(el("strong", null, "The X feed is down right now. "));
        all.appendChild(document.createTextNode("Every public mirror failed for every account you follow. Try Refresh in a bit — Auralis never bypasses a block, it just waits."));
        status.appendChild(all);
      }
    }
    var count = $("xFeedCount");
    if (count) count.textContent = xFeedItems.length ? xFeedItems.length + " post" + (xFeedItems.length === 1 ? "" : "s") + " · newest first" : "";
  }
  // Refresh every followed handle in parallel; a handle that fails
  // keeps its honest down-note while the working handles still
  // render. Never throws. v1.6.1: a failed refresh never wipes a
  // good list — last-good items of failed handles are kept on screen
  // (still followed only) with a stale note; the all-down state
  // appears only when there is genuinely nothing to show.
  function refreshXFeed() {
    var follows = xFollows();
    renderXFollows();
    if (!follows.length) {
      xFeedItems = []; xFeedDown = []; xFeedStale = false; xFeedCacheAt = null;
      renderXFeed();
      return Promise.resolve([]);
    }
    xFeedLoading = true;
    // v1.6.2 (a): last fetch's down-notes and stale flag are stale
    // the moment a new refresh starts — clear them so no old
    // down-state can linger over the live fetch.
    xFeedDown = [];
    xFeedStale = false;
    var btn = $("xRefreshBtn");
    setBusy(btn, true, "Refreshing…");
    // v1.6.2 (a): render AT ONCE — the old code only re-rendered
    // when the fetch settled, so the first render's down-state sat
    // on screen for the whole fetch. This render shows the loading
    // state (or the cached posts + a refreshing note).
    renderXFeed();
    var previous = xFeedItems.slice();
    var settled = follows.map(function (h) {
      return fetchXFeedForHandle(h).then(function (r) { return { ok: true, r: r }; })
        .catch(function (err) { return { ok: false, handle: h, err: err }; });
    });
    return Promise.all(settled).then(function (results) {
      xFeedLoading = false;
      setBusy(btn, false, "↻ Refresh feed");
      var good = [], down = [];
      results.forEach(function (s) {
        if (s.ok) good.push(s.r);
        else down.push({ handle: s.handle, detail: (s.err && s.err.tried ? s.err.tried.join("; ") : (s.err && s.err.message ? s.err.message : "failed")) });
      });
      var downHandles = {};
      down.forEach(function (d) { downHandles[d.handle] = true; });
      var keptByHandle = {};
      previous.forEach(function (it) {
        if (follows.indexOf(it.handle) === -1 || !downHandles[it.handle]) return;
        (keptByHandle[it.handle] = keptByHandle[it.handle] || []).push(it);
      });
      var keptResults = Object.keys(keptByHandle).map(function (h) {
        return { handle: h, items: keptByHandle[h], via: keptByHandle[h][0].via, sourceLabel: keptByHandle[h][0].sourceLabel };
      });
      var keptCount = 0;
      keptResults.forEach(function (r) { keptCount += r.items.length; });
      xFeedItems = mergeXFeedItems(good.concat(keptResults));
      xFeedDown = down;
      xFeedStale = keptCount > 0;
      // v1.6.2 (a): a refresh that brought back posts refreshes the
      // cache too, so the next load shows them at once — and the
      // on-screen list is live-fresh now, so the cached note goes.
      // A failed refresh never rewrites the cache: its kept posts
      // are older than the timestamp would claim.
      if (good.length && xFeedItems.length) { saveXFeedCache(xFeedItems); xFeedCacheAt = null; }
      renderXFeed();
      return xFeedItems;
    });
  }
  function renderBrowseFavs() {
    var row = $("browseFavs");
    if (!row) return;
    row.innerHTML = "";
    browseFavs().forEach(function (f) {
      // v1.6.1: the remove control is a SEPARATE button beside the
      // favourite button — never a span nested inside the chip
      // button — so a tap on the name can only browse, and a tap on
      // ✕ can only remove. (v1.6.0 nested the ✕ span inside the
      // <button>, so a tap near its edge could remove the seed
      // instead of browsing it, and the removal was then persisted.)
      var wrap = el("span", "chip", "");
      var chip = el("button", "chip-name", f.name);
      chip.type = "button";
      chip.title = f.url;
      chip.setAttribute("aria-label", "Browse " + f.name);
      chip.addEventListener("click", function () {
        var input = $("browseUrlInput");
        if (input) input.value = f.url;
        browseCurrentSite(f.url);
      });
      var x = el("button", "chip-x", "✕");
      x.type = "button";
      x.setAttribute("aria-label", "Remove favourite " + f.name);
      x.addEventListener("click", function () {
        removeBrowseFav(f.url);
        renderBrowseFavs();
      });
      wrap.appendChild(chip);
      wrap.appendChild(x);
      row.appendChild(wrap);
    });
  }
  function renderBrowseList(result) {
    var list = $("browseList");
    if (!list) return;
    list.innerHTML = "";
    var head = $("browseResultHead");
    if (head) {
      head.hidden = !result;
      if (result) head.textContent = result.links.length + " headline" + (result.links.length === 1 ? "" : "s") + " from " + hostOf(result.finalUrl) + " · via " + result.via + " — tap one to listen.";
    }
    var saveBtn = $("browseSaveFavBtn");
    if (saveBtn) saveBtn.hidden = !result;
    (result ? result.links : []).forEach(function (link) {
      var row = el("div", "browse-item");
      var t = el("button", "browse-title", link.title);
      t.type = "button";
      t.addEventListener("click", function () { readUrl(link.url, null, link.title); });
      row.appendChild(t);
      var host = el("span", "browse-host", hostOf(link.url));
      row.appendChild(host);
      list.appendChild(row);
    });
    var empty = $("browseEmpty");
    if (empty) empty.hidden = !!(result && result.links.length);
  }
  // Browse the URL in the input (or the one passed in). Failures
  // use the EXISTING blocked-state UI — both fallback buttons,
  // never a bypass — exactly like fetchArticleGeneric.
  function browseCurrentSite(siteUrl) {
    var url = String(siteUrl || ($("browseUrlInput") ? $("browseUrlInput").value : "") || "").trim();
    if (!url) { toast("Type a site address first — try bbc.com/news."); return Promise.resolve(null); }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    var btn = $("browseBtn");
    setBusy(btn, true, "Fetching…");
    return browseSite(url).then(function (result) {
      setBusy(btn, false, "Browse");
      if (!result.links.length) {
        showStatus("error", "Couldn't find headlines there",
          "We reached <strong>" + esc(hostOf(result.finalUrl)) + "</strong> via " + esc(result.via) + ", but couldn't find article links — it may be a script-heavy homepage, mostly images, or a page with no story list. Try another site, or paste an article link directly.",
          "Open the site", function () { openExternal(result.finalUrl); },
          "Paste text instead", openPasteModal);
        renderBrowseList(result);
        return result;
      }
      renderBrowseList(result);
      safeScrollIntoView($("browseList"));
      return result;
    }).catch(function (err) {
      setBusy(btn, false, "Browse");
      var blocked = err && err.blockPage;
      showStatus("error", blocked ? "That site blocked the reader" : "Couldn't reach that site",
        (blocked
          ? "The site refused to share its text with a reader (bot protection or an access block). <strong>Auralis never tries to bypass blocks or paywalls.</strong>"
          : "Every fetch route failed (" + esc(err && err.message ? err.message : "network error") + "). The site may be down, offline, or blocking readers.") +
        " You can open the site in your browser, or copy an article's text yourself and use <strong>Paste text</strong>.",
        "Open the site", function () { openExternal(url); },
        "Paste text instead", openPasteModal);
      return null;
    });
  }
  function wireXFeedAndBrowse() {
    var addBtn = $("xAddBtn");
    var input = $("xHandleInput");
    function addFollow() {
      var h = normalizeXHandle(input ? input.value : "");
      if (!h) { toast("That doesn't look like an X handle — try @NASA (letters, numbers and _ only, up to 15)."); return; }
      var list = xFollows();
      if (list.indexOf(h) !== -1) { toast("You're already following @" + h + "."); return; }
      saveXFollows(list.concat([h]));
      if (input) input.value = "";
      renderXFollows();
      toast("Following @" + h + " — fetching their posts…");
      refreshXFeed();
    }
    if (addBtn) addBtn.addEventListener("click", addFollow);
    if (input) input.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); addFollow(); } });
    var refreshBtn = $("xRefreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", function () { refreshXFeed(); });
    var bBtn = $("browseBtn");
    if (bBtn) bBtn.addEventListener("click", function () { browseCurrentSite(); });
    var bInput = $("browseUrlInput");
    if (bInput) bInput.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); browseCurrentSite(); } });
    var saveFav = $("browseSaveFavBtn");
    if (saveFav) saveFav.addEventListener("click", function () {
      var url = (bInput ? bInput.value : "").trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      var favs = browseFavs();
      if (favs.some(function (f) { return f.url === url; })) { toast("That's already a favourite."); return; }
      saveBrowseFavs(favs.concat([{ name: hostOf(url), url: url }]));
      renderBrowseFavs();
      toast("Saved " + hostOf(url) + " as a favourite.");
    });
    renderXFollows();
    renderBrowseFavs();
    renderBrowseList(null);
    // v1.6.2 (a): restore the cached posts BEFORE the first render,
    // so a reload shows them at once with their time — and let
    // refreshXFeed do the first render itself: it renders the
    // loading/cached state immediately. The old unconditional
    // renderXFeed() here ran with xFeedLoading still false and
    // flashed the down-state on every load with follows.
    restoreXFeedCache();
    if (xFollows().length) refreshXFeed();
    else renderXFeed();
  }

  function fetchWithTimeout(url, ms) {
    return Promise.race([
      fetch(url, { headers: { "Accept": "text/html, text/plain, */*" } }),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error("Timed out after " + (ms / 1000) + "s")); }, ms); })
    ]);
  }

  /* ---------------- links pasted with captions (v1.4.4) ----------------
   * Carl pastes from his Google feed: a caption describing the
   * article PLUS its link, e.g. "How to Read a Comparative Market
   * Analysis in Del Mar https://share.google/ioXVzaqrTN7pGRRzx".
   * The app must pull the link out of the caption — never make him
   * delete the caption text to make the link work. */
  var URL_IN_TEXT_RE = /https?:\/\/[^\s<>"'\]]+/gi;
  // Strip trailing punctuation that belongs to the sentence, not the
  // URL. A trailing ")" is dropped only when it is unmatched, so
  // Wikipedia-style balanced parens survive.
  function cleanExtractedUrl(u) {
    var s = String(u || "");
    while (s.length && /[.,;:!?'"\]}]/.test(s.charAt(s.length - 1))) s = s.slice(0, -1);
    while (s.length && s.charAt(s.length - 1) === ")") {
      var open = (s.match(/\(/g) || []).length, close = (s.match(/\)/g) || []).length;
      if (close > open) s = s.slice(0, -1); else break;
    }
    return s;
  }
  // Every http(s) URL anywhere in the text, in order, de-duplicated.
  function extractUrls(text) {
    var found = [], m;
    URL_IN_TEXT_RE.lastIndex = 0;
    while ((m = URL_IN_TEXT_RE.exec(String(text || ""))) !== null) {
      var u = cleanExtractedUrl(m[0]);
      if (u && found.indexOf(u) === -1) found.push(u);
    }
    return found;
  }
  // Unwrap Google redirect links WITHOUT fetching anything:
  // google.com/url?q=<real-url> and the AMP viewer
  // (google.com/amp/s/<real-url>). share.google and news.google.com
  // cannot be unwrapped from the URL alone — their destination lives
  // server-side — so they pass through to resolveRedirectorUrl.
  function unwrapGoogleUrl(raw) {
    var u = String(raw || "");
    try {
      var p = new URL(u);
      var host = p.hostname.replace(/^www\./, "").toLowerCase();
      if (host === "google.com" || host.endsWith(".google.com")) {
        if (p.pathname === "/url") {
          var q = p.searchParams.get("q") || p.searchParams.get("url");
          if (q) return q;
        }
        var amp = p.pathname.match(/^\/amp\/s\/(.+)$/);
        if (amp) { try { return decodeURIComponent(amp[1]); } catch (e) { return amp[1]; } }
        var amp2 = p.pathname.match(/^\/amp\/(https?:\/\/.+)$/);
        if (amp2) return amp2[1];
      }
    } catch (e) { /* not a URL — return as-is */ }
    return u;
  }
  // Hosts that never serve the article themselves: they redirect (or
  // server-render a wrapper page) to the real article.
  function isRedirectorHost(host) {
    host = String(host || "").toLowerCase().replace(/^www\./, "");
    return host === "share.google" || host === "news.google.com";
  }
  // The destination of a redirector page lives in its HTML: the
  // canonical link (or og:url) points at the real article. Google's
  // share page server-renders the article itself, so its canonical
  // IS the destination.
  function canonicalUrlFromHtml(html) {
    try {
      var doc = new DOMParser().parseFromString(String(html || ""), "text/html");
      var link = doc.querySelector('link[rel="canonical"]');
      var href = link && link.getAttribute("href");
      if (href) return href;
      var og = doc.querySelector('meta[property="og:url"]');
      var c = og && og.getAttribute("content");
      return c || "";
    } catch (e) { return ""; }
  }
  // Resolve a redirector URL to the real article URL. Tries the raw
  // page first (direct fetch), then AllOrigins (raw HTML, keeps the
  // canonical link), then Jina Reader (markdown — no canonical, so
  // it only counts if the others failed and the page is already the
  // article). Returns the original URL when nothing resolves, so the
  // normal fetch path still runs. Never throws.
  function resolveRedirectorUrl(url) {
    var parsed;
    try { parsed = new URL(url); } catch (e) { return Promise.resolve(url); }
    if (!isRedirectorHost(parsed.hostname)) return Promise.resolve(url);
    var attempts = [
      { name: "direct", fetch: function () { return fetchWithTimeout(url, 15000); } },
      { name: "AllOrigins", fetch: function () { return fetchWithTimeout("https://api.allorigins.win/raw?url=" + encodeURIComponent(url), 15000); } },
      { name: "Jina Reader", fetch: function () { return fetchWithTimeout("https://r.jina.ai/" + url, 15000); } }
    ];
    var i = 0;
    function nextAttempt() {
      if (i >= attempts.length) return Promise.resolve(url);
      var a = attempts[i++];
      return a.fetch().then(function (resp) {
        if (!resp.ok) throw new Error(a.name + " HTTP " + resp.status);
        return resp.text();
      }).then(function (text) {
        var dest = canonicalUrlFromHtml(text);
        if (dest) {
          try {
            var d = new URL(dest, url);
            if (/^https?:$/.test(d.protocol) && !isRedirectorHost(d.hostname) && !/\.google\.com$/i.test(d.hostname) && d.hostname !== "google.com") return d.href;
          } catch (e) { /* bad canonical — try the next source */ }
        }
        return nextAttempt();
      }).catch(function () { return nextAttempt(); });
    }
    return nextAttempt();
  }
  // Open a link in the visitor's browser (new tab). Used by the
  // blocked-fetch fallback — never a fetch, never a bypass.
  function openExternal(url) {
    try { window.open(url, "_blank", "noopener,noreferrer"); } catch (e) { toast("Couldn't open the link — copy it from the address bar."); }
  }
  // A short title from pasted text: the whole caption when it fits,
  // else the first ~90 characters cut at a word boundary.
  function deriveTitleFromText(text) {
    var t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return "Pasted text";
    if (t.length <= 90) return t;
    return t.slice(0, 90).replace(/\s+\S*$/, "") + "…";
  }
  // Read the user's own pasted caption as the article. This is the
  // honest fallback when the original page can't be fetched: the
  // words are the visitor's own, so reading them aloud bypasses
  // nothing. Returns true when it opened, false when there wasn't
  // enough pasted text to read.
  function openFallbackText(fallback, url) {
    var text = (fallback && fallback.text) || "";
    if (wordsOf(text) < 5) { toast("There's not enough pasted text to read — try opening the original link instead."); return false; }
    var title = (fallback && fallback.title) || deriveTitleFromText(text);
    openArticle(title, "Pasted text", "Pasted by you · " + wordsOf(text) + " words · the original page couldn't be read", text);
    toast("Reading your pasted text — the original page couldn't be read aloud.");
    return true;
  }

  function fetchArticle(url) {
    var attempts = [{ name: "direct", url: url }];
    (CFG.FETCH_PROXIES || []).forEach(function (p) {
      try { attempts.push({ name: p.name, url: p.url(url) }); } catch (e) { /* skip bad proxy config */ }
    });
    // A proxy can "succeed" with a block page (HTTP 200 carrying a
    // Cloudflare 403 notice) — that is a failed leg, not an article:
    // the chain must advance so the next proxy gets its chance
    // (v1.4.5). If every leg fails this way, the final error carries
    // blockPage so the caller can say "blocked" instead of "couldn't
    // reach" — the site refused, the network did not fail.
    var sawBlockPage = false;
    var chain = Promise.reject(new Error("start"));
    attempts.forEach(function (a) {
      chain = chain.catch(function () {
        return fetchWithTimeout(a.url, 15000).then(function (resp) {
          if (!resp.ok) throw new Error(a.name + " returned HTTP " + resp.status);
          // resp.url is the FINAL url after redirects — but only the
          // direct attempt's value means anything (a proxy's url is
          // the proxy itself). Used for the real destination after a
          // news.google.com redirect, and for "Open the original
          // link" after a fetch.
          return resp.text().then(function (text) {
            if (isBlockPageText(text)) { sawBlockPage = true; throw new Error(a.name + " returned a block page"); }
            return { via: a.name, text: text, finalUrl: a.name === "direct" ? (resp.url || null) : null };
          });
        });
      });
    });
    return chain.catch(function (err) {
      if (sawBlockPage) { try { err.blockPage = true; } catch (e) {} }
      throw err;
    });
  }

  // rawUrl may be a bare link, a caption with a link in it, or a
  // Google redirect wrapper. fallbackText/fallbackTitle (from Paste
  // Text) are the user's own words, kept as the read-aloud fallback
  // when the page itself can't be fetched.
  function readUrl(rawUrl, fallbackText, fallbackTitle) {
    var input = (rawUrl || "").trim();
    // Pull the first link out of whatever was pasted — caption text
    // around it is fine, and stays as the fallback (v1.4.4).
    var urls = extractUrls(input);
    var caption = "";
    var url;
    if (urls.length) {
      url = unwrapGoogleUrl(urls[0]);
      var rest = (fallbackText != null && fallbackText !== "") ? fallbackText : input.split(urls[0]).join(" ");
      caption = String(rest || "").replace(/\s+/g, " ").trim();
      if (url !== urls[0]) caption = caption.split(url).join(" ").replace(/\s+/g, " ").trim();
    } else {
      url = input;
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    var parsed;
    try { parsed = new URL(url); } catch (e) {
      // No usable link at all: if the user pasted a decent chunk of
      // text, just read it — never make them re-paste (v1.4.4).
      if (wordsOf(input) >= 5) {
        openArticle((fallbackTitle || deriveTitleFromText(input)), "Pasted text", "Pasted by you · " + wordsOf(input) + " words", input);
        return;
      }
      showStatus("error", "That link doesn't look right", "Check the URL and try again — it should start with <strong>https://</strong>.");
      return;
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      showStatus("error", "Only web pages can be read", "Auralis reads public <strong>http(s)</strong> pages. Paste text instead for anything else.");
      return;
    }
    // v1.6.1 (d): a fallback title on its own (Browse passes the
    // headline) is worth keeping even with no caption text — the
    // fetch may extract no usable title at all (Jina markdown has
    // no <title>, so extractFromHtml falls back to the URL itself).
    // hasFallback still needs real caption words: a bare title must
    // never offer "read what you pasted" for text that was never pasted.
    var fallback = (wordsOf(caption) >= 5 || (fallbackTitle || "").trim()) ? { text: caption, title: fallbackTitle || "" } : null;
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
        fetchArticleGeneric(url, btn, parsed, fallback);
      });
      return;
    }
    showStatus("", "Fetching the article…", "Trying the page directly, then free public reader proxies if the site blocks cross-site reading. This usually takes a few seconds.");
    // Google share / news links never serve the article themselves:
    // resolve them to the real destination first (v1.4.4).
    resolveRedirectorUrl(url).then(function (resolved) {
      var target = parsed;
      if (resolved !== url) { try { target = new URL(resolved); } catch (e) { target = parsed; } }
      fetchArticleGeneric(resolved, btn, target, fallback);
    });
  }

  // Generic (non-X) article fetch, shared by the X fallback path.
  // `fallback` is the user's own pasted caption ({ text, title }),
  // offered as the read-aloud fallback whenever the page itself
  // can't be read — reading the visitor's own words bypasses
  // nothing. Every failure explains itself in plain words and
  // offers "Open the original link" — never a bare dead end.
  function fetchArticleGeneric(url, btn, parsed, fallback) {
    var openUrl = url; // replaced by the fetch's final URL when known
    var hasFallback = !!(fallback && wordsOf(fallback.text || "") >= 5);
    function errWithFallback(title, html) {
      setBusy(btn, false, "▶  Listen");
      if (hasFallback) {
        showStatus("error", title, html,
          "Read what you pasted instead", function () { openFallbackText(fallback, openUrl); },
          "Open the original link", function () { openExternal(openUrl); });
      } else {
        showStatus("error", title, html,
          "Open the original link", function () { openExternal(openUrl); },
          "Paste text instead", openPasteModal);
      }
    }
    fetchArticle(url).then(function (res) {
      var text = res.text || "";
      if (res.finalUrl) openUrl = res.finalUrl;
      var extracted = extractFromHtml(text, openUrl);
      var visible = extracted.text || "";
      // Blocked/paywall hints are judged on the VISIBLE text, never
      // on raw HTML (v1.4.4): a real article page routinely embeds
      // reCAPTCHA scripts for its own forms, and the word "captcha"
      // in a script is not a block — that false positive is exactly
      // what told Carl his share.google link was "blocked". A
      // genuine block page has no article text at all, so its
      // visible text is what carries the "verify you are human"
      // wording. And when real article text IS there (40+ words),
      // a WEAK "blocked" hint is ignored outright — but a block
      // page stays a block page no matter how long it is (v1.4.5):
      // Jina's Cloudflare 403 page is 128 words of "article", and
      // the old length override let it through as readable content
      // and the app read it aloud. The strong patterns
      // (isBlockPageText) are verbatim Jina/Cloudflare wording, so
      // they never fire on a real article.
      var blockKind = looksBlockedOrPaywalled(visible, extracted.title || "");
      if (isBlockPageText(visible) || isBlockPageText(extracted.title || "")) blockKind = "blocked";
      else if (wordsOf(visible) >= 40 && blockKind === "blocked") blockKind = null;
      if (blockKind === "blocked") {
        errWithFallback("This page blocked the reader",
          "The site refused to share its text with a reader (bot protection or an access block). <strong>Auralis never tries to bypass blocks or paywalls.</strong>" + (hasFallback ? " Your pasted text is yours to read, though — hear that instead, or open the original page in your browser." : " You can open the original page in your browser, or copy the article text yourself and use <strong>Paste text</strong>."));
        return;
      }
      if (!extracted.text || wordsOf(extracted.text) < 40) {
        if (blockKind === "paywall") {
          errWithFallback("This looks paywalled",
            "The page we could reach asks readers to subscribe before showing the article. <strong>Auralis doesn't bypass paywalls.</strong>" + (hasFallback ? " Your pasted text is yours to read, though — hear that instead, or open the original page in your browser." : " If you have access, copy the text and use <strong>Paste text</strong> instead, or open the original page in your browser."));
          return;
        }
        errWithFallback("Couldn't find the article text",
          "We reached the page via <strong>" + esc(res.via) + "</strong>, but couldn't find enough article text — it may be mostly images, video, or a script-heavy page." + (hasFallback ? " Your pasted text is yours to read, though — hear that instead, or open the original page in your browser." : " Try <strong>Paste text</strong> with the article copied from the page, or open the original page in your browser."));
        return;
      }
      setBusy(btn, false, "▶  Listen");
      // Show the DESTINATION host when the fetch followed a redirect
      // (e.g. news.google.com → the publisher), not the redirector.
      var displayHost = parsed.hostname;
      try { if (res.finalUrl) displayHost = new URL(res.finalUrl).hostname; } catch (e) {}
      var byline = extracted.author ? "By " + extracted.author + " · " + displayHost : displayHost + " · via " + res.via;
      // v1.6.1 (d): the extraction's title is the page URL itself
      // when the fetched page carries no usable title (Jina markdown
      // for a BBC article) — the headline the visitor tapped (or the
      // title they typed when pasting) is the real title then. A
      // real extracted title always wins; a URL-like one never does.
      var displayTitle = extracted.title;
      if ((!displayTitle || /^https?:\/\//i.test(displayTitle) || displayTitle === openUrl) && fallback && (fallback.title || "").trim()) displayTitle = fallback.title.trim();
      openArticle(displayTitle, displayHost, byline, extracted.text, extracted.clutterRemoved || 0);
    }).catch(function (err) {
      setBusy(btn, false, "▶  Listen");
      if (parseXUrl(url)) {
        errWithFallback("Couldn't read that X post",
          "Every route failed (" + esc(err && err.message ? err.message : "network error") + "). The post may be deleted, protected, or from an account that limits readers. <strong>Auralis never bypasses login walls.</strong>" + (hasFallback ? " Your pasted text is yours to read, though — hear that instead, or open the original post in your browser." : " You can still copy the post text yourself and use <strong>Paste text</strong>, or open the original post in your browser."));
        return;
      }
      // Every proxy leg returned a block page (v1.4.5): the site
      // refused, the network did not fail — say "blocked", not
      // "couldn't reach", and offer the same two ways forward.
      if (err && err.blockPage) {
        errWithFallback("This page blocked the reader",
          "The site refused to share its text with a reader (bot protection or an access block). <strong>Auralis never tries to bypass blocks or paywalls.</strong>" + (hasFallback ? " Your pasted text is yours to read, though — hear that instead, or open the original page in your browser." : " You can open the original page in your browser, or copy the article text yourself and use <strong>Paste text</strong>."));
        return;
      }
      errWithFallback("Couldn't reach that page",
        "Every fetch route failed (" + esc(err && err.message ? err.message : "network error") + "). The site may be down, offline, or blocking readers. Check the link" + (hasFallback ? ", hear your pasted text instead," : "") + " or open the original page in your browser.");
    });
  }

  /* ---------------- paste text + upload ---------------- */
  function openPasteModal() { var m = $("pasteModal"); if (m) { m.hidden = false; var t = $("pasteText"); if (t) t.focus(); } }
  function closePasteModal() { var m = $("pasteModal"); if (m) m.hidden = true; }

  function readPastedText() {
    var text = ($("pasteText").value || "").trim();
    if (wordsOf(text) < 5) { toast("Paste a little more text first — at least a sentence or two."); return; }
    var title = ($("pasteTitle").value || "").trim() || "";
    // A caption with a link in it: load the article, and keep the
    // caption as the fallback if the page can't be fetched (v1.4.4).
    var urls = extractUrls(text);
    if (urls.length) {
      var caption = text.split(urls[0]).join(" ").replace(/\s+/g, " ").trim();
      closePasteModal();
      readUrl(urls[0], caption, title);
      return;
    }
    closePasteModal();
    openArticle(title || "Pasted text", "Pasted text", "Pasted by you · " + wordsOf(text) + " words", text);
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
   * voices appear. Which free engine plays depends on the browser:
   * real Microsoft Edge gets the Microsoft Edge Read Aloud voices
   * (free, no key); every other browser gets Kitten on-device voices
   * (free, no key, no credits — model from Hugging Face). There is
   * NO robotic fallback anywhere in the app: no Google Translate
   * TTS, no device voices, nothing. If no human-sounding engine can
   * play, the app says so honestly and plays nothing.
   * Language first, then a small decisive subset per language —
   * never all languages mixed, never 300 voices. Every Microsoft
   * voice name below was verified against Microsoft's live voice
   * list (Nov 10, 2026); every Kitten voice ID was verified against
   * the model's voice list (Nov 24, 2026). Each
   * entry: voice id, label, plain-language description with a
   * "Best for:" line, accent tag, gender, use-case tag. */
  var VOICE_LANGUAGES = [
    { code: "en", label: "English", sample: "Hello — I'm your reader. I can read any article aloud for you, in a voice that sounds almost human.", voices: [
      { name: "en-US-AriaNeural", label: "Microsoft Aria", desc: "Warm, friendly American woman — our most natural free voice. Best for: articles and news.", accent: "US", gender: "Female", use: "Articles", recommended: true },
      { name: "en-US-JennyNeural", label: "Microsoft Jenny", desc: "Bright, upbeat American woman. Best for: stories and audiobooks.", accent: "US", gender: "Female", use: "Stories" },
      { name: "en-US-GuyNeural", label: "Microsoft Guy", desc: "Calm, steady American man. Best for: long articles and narration.", accent: "US", gender: "Male", use: "Articles" },
      { name: "en-US-EmmaNeural", label: "Microsoft Emma", desc: "Clear, gentle American woman. Best for: news and short articles.", accent: "US", gender: "Female", use: "News" },
      { name: "en-US-ChristopherNeural", label: "Microsoft Christopher", desc: "Steady American man, newsreader style. Best for: news and articles.", accent: "US", gender: "Male", use: "News" },
      { name: "en-GB-SoniaNeural", label: "Microsoft Sonia", desc: "Warm, clear British woman. Best for: articles and essays.", accent: "UK", gender: "Female", use: "Articles" },
      { name: "en-GB-RyanNeural", label: "Microsoft Ryan (UK)", desc: "Warm, clear British man. Best for: news and articles.", accent: "UK", gender: "Male", use: "News" },
      { name: "en-AU-NatashaNeural", label: "Microsoft Natasha", desc: "Warm Australian woman. Best for: stories and articles.", accent: "AU", gender: "Female", use: "Stories" }
    ]},
    { code: "es", label: "Spanish", sample: "Hola, soy Auralis. Puedo leer cualquier artículo en voz alta para ti.", voices: [
      { name: "es-ES-ElviraNeural", label: "Microsoft Elvira", desc: "Warm, clear Spanish woman from Spain. Best for: articles.", accent: "Spain", gender: "Female", use: "Articles" },
      { name: "es-ES-AlvaroNeural", label: "Microsoft Alvaro", desc: "Calm, steady Spanish man from Spain. Best for: articles.", accent: "Spain", gender: "Male", use: "Articles" },
      { name: "es-ES-XimenaNeural", label: "Microsoft Ximena", desc: "Bright, friendly Spanish woman from Spain. Best for: stories.", accent: "Spain", gender: "Female", use: "Stories" },
      { name: "es-MX-DaliaNeural", label: "Microsoft Dalia", desc: "Warm, clear Mexican woman. Best for: stories.", accent: "Mexico", gender: "Female", use: "Articles" },
      { name: "es-MX-JorgeNeural", label: "Microsoft Jorge", desc: "Steady, clear Mexican man. Best for: news.", accent: "Mexico", gender: "Male", use: "News" }
    ]},
    { code: "fr", label: "French", sample: "Bonjour, je suis Auralis. Je peux lire n'importe quel article à voix haute pour vous.", voices: [
      { name: "fr-FR-DeniseNeural", label: "Microsoft Denise", desc: "Warm, clear French woman. Best for: articles.", accent: "France", gender: "Female", use: "Articles" },
      { name: "fr-FR-HenriNeural", label: "Microsoft Henri", desc: "Calm, steady French man. Best for: articles.", accent: "France", gender: "Male", use: "Articles" },
      { name: "fr-FR-EloiseNeural", label: "Microsoft Eloise", desc: "Clear, gentle French woman. Best for: news.", accent: "France", gender: "Female", use: "News" },
      { name: "fr-FR-VivienneMultilingualNeural", label: "Microsoft Vivienne", desc: "Bright, elegant French woman. Best for: stories.", accent: "France", gender: "Female", use: "Stories" },
      { name: "fr-FR-RemyMultilingualNeural", label: "Microsoft Remy", desc: "Warm, conversational French man. Best for: stories.", accent: "France", gender: "Male", use: "Stories" }
    ]},
    { code: "de", label: "German", sample: "Hallo, ich bin Auralis. Ich kann jeden Artikel laut für dich vorlesen.", voices: [
      { name: "de-DE-KatjaNeural", label: "Microsoft Katja", desc: "Warm, clear German woman. Best for: articles.", accent: "Germany", gender: "Female", use: "Articles" },
      { name: "de-DE-ConradNeural", label: "Microsoft Conrad", desc: "Calm, steady German man. Best for: articles.", accent: "Germany", gender: "Male", use: "Articles" },
      { name: "de-DE-AmalaNeural", label: "Microsoft Amala", desc: "Bright, friendly German woman. Best for: stories.", accent: "Germany", gender: "Female", use: "Stories" },
      { name: "de-DE-KillianNeural", label: "Microsoft Killian", desc: "Clear, steady German man. Best for: news.", accent: "Germany", gender: "Male", use: "News" },
      { name: "de-DE-FlorianMultilingualNeural", label: "Microsoft Florian", desc: "Warm German man. Best for: stories.", accent: "Germany", gender: "Male", use: "Stories" },
      { name: "de-DE-SeraphinaMultilingualNeural", label: "Microsoft Seraphina", desc: "Clear, gentle German woman. Best for: news.", accent: "Germany", gender: "Female", use: "News" }
    ]},
    { code: "it", label: "Italian", sample: "Ciao, sono Auralis. Posso leggere qualsiasi articolo ad alta voce per te.", voices: [
      { name: "it-IT-IsabellaNeural", label: "Microsoft Isabella", desc: "Warm, clear Italian woman. Best for: articles.", accent: "Italy", gender: "Female", use: "Articles" },
      { name: "it-IT-DiegoNeural", label: "Microsoft Diego", desc: "Calm, steady Italian man. Best for: articles.", accent: "Italy", gender: "Male", use: "Articles" },
      { name: "it-IT-ElsaNeural", label: "Microsoft Elsa", desc: "Bright, friendly Italian woman. Best for: stories.", accent: "Italy", gender: "Female", use: "Stories" },
      { name: "it-IT-GiuseppeMultilingualNeural", label: "Microsoft Giuseppe", desc: "Warm, conversational Italian man. Best for: stories.", accent: "Italy", gender: "Male", use: "Stories" }
    ]},
    { code: "pt", label: "Portuguese", sample: "Olá, eu sou Auralis. Posso ler qualquer artigo em voz alta para você.", voices: [
      { name: "pt-BR-FranciscaNeural", label: "Microsoft Francisca", desc: "Warm, clear Brazilian woman. Best for: articles.", accent: "Brazil", gender: "Female", use: "Articles" },
      { name: "pt-BR-AntonioNeural", label: "Microsoft Antonio", desc: "Calm, steady Brazilian man. Best for: articles.", accent: "Brazil", gender: "Male", use: "Articles" },
      { name: "pt-BR-ThalitaMultilingualNeural", label: "Microsoft Thalita", desc: "Bright, friendly Brazilian woman. Best for: stories.", accent: "Brazil", gender: "Female", use: "Stories" }
    ]},
    { code: "he", label: "Hebrew", sample: "שלום, אני אורליס. אני יכולה לקרוא כל מאמר בקול רם בשבילך.", voices: [
      { name: "he-IL-HilaNeural", label: "Microsoft Hila", desc: "Warm, clear Hebrew woman. Best for: articles.", accent: "Israel", gender: "Female", use: "Articles" },
      { name: "he-IL-AvriNeural", label: "Microsoft Avri", desc: "Calm, steady Hebrew man. Best for: articles.", accent: "Israel", gender: "Male", use: "Articles" }
    ]},
    { code: "ar", label: "Arabic", sample: "مرحباً، أنا أوراليس. يمكنني قراءة أي مقال بصوت عالٍ لك.", voices: [
      { name: "ar-SA-ZariyahNeural", label: "Microsoft Zariyah", desc: "Warm, clear Arabic woman. Best for: articles.", accent: "Saudi Arabia", gender: "Female", use: "Articles" },
      { name: "ar-SA-HamedNeural", label: "Microsoft Hamed", desc: "Calm, steady Arabic man. Best for: articles.", accent: "Saudi Arabia", gender: "Male", use: "Articles" }
    ]},
    { code: "hi", label: "Hindi", sample: "नमस्ते, मैं औरालिस हूँ। मैं आपके लिए कोई भी लेख ज़ोर से पढ़ सकती हूँ।", voices: [
      { name: "hi-IN-SwaraNeural", label: "Microsoft Swara", desc: "Warm, clear Hindi woman. Best for: articles.", accent: "India", gender: "Female", use: "Articles" },
      { name: "hi-IN-MadhurNeural", label: "Microsoft Madhur", desc: "Calm, steady Hindi man. Best for: articles.", accent: "India", gender: "Male", use: "Articles" }
    ]},
    { code: "ja", label: "Japanese", sample: "こんにちは、私はオーラリスです。どんな記事でも音声で読み上げることができます。", voices: [
      { name: "ja-JP-NanamiNeural", label: "Microsoft Nanami", desc: "Warm, clear Japanese woman. Best for: articles.", accent: "Japan", gender: "Female", use: "Articles" },
      { name: "ja-JP-KeitaNeural", label: "Microsoft Keita", desc: "Calm, steady Japanese man. Best for: articles.", accent: "Japan", gender: "Male", use: "Articles" }
    ]},
    { code: "zh", label: "Chinese (Mandarin)", sample: "你好，我是奥拉里斯。我可以大声朗读任何文章。", voices: [
      { name: "zh-CN-XiaoxiaoNeural", label: "Microsoft Xiaoxiao", desc: "Warm, clear Mandarin woman. Best for: articles.", accent: "China", gender: "Female", use: "Articles" },
      { name: "zh-CN-XiaoyiNeural", label: "Microsoft Xiaoyi", desc: "Clear, gentle Mandarin woman. Best for: news.", accent: "China", gender: "Female", use: "News" },
      { name: "zh-CN-YunyangNeural", label: "Microsoft Yunyang", desc: "Calm, steady Mandarin man. Best for: articles.", accent: "China", gender: "Male", use: "Articles" },
      { name: "zh-CN-YunjianNeural", label: "Microsoft Yunjian", desc: "Warm Mandarin man. Best for: stories.", accent: "China", gender: "Male", use: "Stories" }
    ]}
  ];
  var DEFAULT_EDGE_VOICE = "en-US-AriaNeural";
  var ALL_EDGE_VOICES = [];
  VOICE_LANGUAGES.forEach(function (l) { l.voices.forEach(function (v) { ALL_EDGE_VOICES.push(v); }); });

  /* ---------------- Kitten: the free on-device AI voices ----------------
   * KittenTTS Nano 0.8 (Apache-2.0, StyleTTS2, 15M params) runs 100%
   * in the browser via kitten-tts-js + onnxruntime-web (WASM only —
   * kitten-tts-js 0.1.2 has no WebGPU mode). The model comes from
   * Hugging Face (KittenML/kitten-tts-nano-0.8 — the same weights as
   * onnx-community/KittenTTS-Nano-v0.8-ONNX) and is downloaded ONCE
   * (~60MB: model + voices.npz) on first play, then works offline.
   * No key, no account, no credits, no usage limit, nothing uploaded.
   * This is the free engine in every browser EXCEPT real Microsoft
   * Edge, where the Microsoft voices work and stay the default.
   * Why: Microsoft rejects the Edge Read Aloud WebSocket handshake
   * with 403 unless the User-Agent contains "Edg/" — and a web page
   * cannot set the User-Agent header on a WebSocket. Only a real
   * Edge browser (or an extension) can pass that check, so in Chrome
   * and every other browser the Edge transport is never even tried.
   * English ONLY — KittenTTS Nano is an English-only model with 8
   * US voices, so every non-English language shows an honest empty
   * state in non-Edge browsers (studio voices via a free key, or
   * Microsoft voices in real Edge, still work). Proven Nov 24,
   * 2026: a local generate + faster-whisper transcript of the
   * Bella sample came back word-perfect. */
  var KITTEN_MODEL = "KittenML/kitten-tts-nano-0.8";
  var KITTEN_CDN = "https://cdn.jsdelivr.net/npm/kitten-tts-js@0.1.2/+esm";
  // Alternate kitten-tts-js entry (esm.sh) — used ONLY if the
  // jsDelivr import itself fails (see ensureKitten). A failed model
  // load is NOT retried on the alt graph: kitten-tts-js has no
  // poisoned-module-state problem (it does not use transformers.js),
  // so a retry on the same graph is a real retry.
  var KITTEN_CDN_ALT = "https://esm.sh/kitten-tts-js@0.1.2";
  // The onnxruntime-web module kitten-tts-js itself imports
  // (verified against the kitten-tts-js 0.1.2 +esm bundle, Nov 24,
  // 2026: its from_pretrained() imports
  // "/npm/onnxruntime-web@1.24.2/+esm"). The app imports this exact
  // URL first and sets wasmPaths on it, so the setting lands on the
  // SAME module instance kitten-tts-js will use (see
  // configureOnnxWasmPaths). The .wasm files live in
  // onnxruntime-web's dist/, NOT next to kitten-tts-js.
  var ONNX_RUNTIME_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/+esm";
  var ONNX_RUNTIME_WASM_PATHS = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/dist/";
  var DEFAULT_KITTEN_VOICE = "Bella";
  var KITTEN_VOICES = {
    en: [
      { name: "Bella", label: "Kitten Bella", desc: "Warm, expressive American woman — Kitten's best-rated voice. Best for: articles and audiobooks.", accent: "US", gender: "Female", use: "Articles", recommended: true },
      { name: "Jasper", label: "Kitten Jasper", desc: "Deep, steady American man. Best for: narration and long articles.", accent: "US", gender: "Male", use: "Articles" },
      { name: "Luna", label: "Kitten Luna", desc: "Bright, clear American woman. Best for: news and short articles.", accent: "US", gender: "Female", use: "News" },
      { name: "Bruno", label: "Kitten Bruno", desc: "Warm, conversational American man. Best for: articles and narration.", accent: "US", gender: "Male", use: "Articles" },
      { name: "Rosie", label: "Kitten Rosie", desc: "Smooth, gentle American woman. Best for: stories and long reads.", accent: "US", gender: "Female", use: "Stories" },
      { name: "Hugo", label: "Kitten Hugo", desc: "Calm, deep American man. Best for: audiobooks and long reads.", accent: "US", gender: "Male", use: "Audiobooks" },
      { name: "Kiki", label: "Kitten Kiki", desc: "Clear, friendly American woman. Best for: articles and news.", accent: "US", gender: "Female", use: "Articles" },
      { name: "Leo", label: "Kitten Leo", desc: "Steady, warm American man. Best for: news and narration.", accent: "US", gender: "Male", use: "News" }
    ]
  };
  function isEdgeBrowser() {
    return /Edg\//i.test((typeof navigator !== "undefined" && navigator.userAgent) || "");
  }
  // The free voices for the current language, from the engine that can
  // actually play in this browser: Microsoft in real Edge (unless the
  // Edge handshake already failed — then Kitten), Kitten everywhere else.
  function freeVoiceList() {
    var lang = currentLanguage();
    if (isEdgeBrowser() && !state.edgeDown) {
      return { engine: "edge", voices: languageEntry(lang).voices };
    }
    return { engine: "kitten", voices: KITTEN_VOICES[lang] || [] };
  }
  function kittenVoiceByName(n) {
    var found = null;
    Object.keys(KITTEN_VOICES).forEach(function (code) {
      KITTEN_VOICES[code].forEach(function (v) { if (v.name === n) found = v; });
    });
    return found || KITTEN_VOICES.en[0];
  }
  // v1.4.9: Kitten is English-only — every Kitten voice speaks
  // English. Any free voice ID (Kitten or Microsoft) -> its
  // language code, or null. (A stale saved Kokoro voice ID from
  // v1.4.8 or earlier matches nothing here, so it returns null and
  // the reset path below falls back to Kitten Bella.)
  function voiceLangOf(name) {
    var found = null;
    Object.keys(KITTEN_VOICES).forEach(function (code) {
      KITTEN_VOICES[code].forEach(function (v) { if (v.name === name) found = code; });
    });
    if (found) return found;
    VOICE_LANGUAGES.forEach(function (l) {
      l.voices.forEach(function (v) { if (v.name === name) found = l.code; });
    });
    return found;
  }
  function freeVoiceLabel(choice) {
    if (!choice) choice = currentVoiceChoice();
    if (choice.engine === "edge") return edgeVoiceByName(choice.edgeVoice).label;
    if (choice.engine === "kitten" && choice.kittenVoice) return kittenVoiceByName(choice.kittenVoice).label;
    return "Kitten Bella";
  }
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
  // v1.4.6: guess the language of a piece of text, so a voice in the
  // wrong language never reads it as garbage. Script first (a text
  // that is mostly CJK/Hebrew/Arabic/Devanagari is that language),
  // then stopwords for Latin-script text. Returns "en", "es", "fr",
  // "de", "it", "pt", "zh", "ja", "he", "ar", "hi", or "latin"
  // (Latin letters, no clear signal — could be any Latin language).
  var TEXT_STOPWORDS = {
    en: ["the", "and", "of", "to", "in", "is", "you", "that", "it", "was", "for", "on", "are", "with", "they", "this", "have", "from", "not", "but", "what", "were", "when", "your", "there", "which", "their", "will", "about", "would", "like", "into", "time", "more", "other", "some", "could", "people", "than", "first", "been", "call", "who", "now", "find", "long", "down", "day", "come", "made", "part"],
    es: ["el", "la", "los", "las", "que", "una", "por", "con", "para", "como", "pero", "sus", "este", "porque", "esta", "entre", "cuando", "muy", "sobre", "hasta", "donde", "desde", "todo", "durante", "todos", "contra", "ellos", "antes", "algunos", "otro", "tanto", "mucho", "quienes", "nada", "muchos", "ella", "estar", "estas", "algo", "nosotros"],
    fr: ["les", "des", "une", "dans", "pour", "qui", "sur", "plus", "avec", "son", "nous", "vous", "ils", "comme", "mais", "tout", "tous", "toute", "toutes", "notre", "votre", "leur", "leurs", "cette", "ces", "être", "avoir", "sans", "sous", "alors", "donc", "aussi", "très", "bien", "peux", "peut", "faire"],
    de: ["der", "die", "das", "und", "ein", "eine", "von", "den", "sich", "des", "auf", "für", "dem", "nicht", "als", "auch", "aus", "hat", "dass", "sie", "nach", "wird", "bei", "einer", "sind", "noch", "wie", "einem", "über", "einen", "nur", "oder", "aber", "vor", "mehr", "durch", "sein", "war", "schon", "jetzt", "heute", "wenn", "dann", "doch", "sehr", "kann", "alle", "viele"],
    it: ["gli", "che", "sono", "ho", "hai", "abbiamo", "avete", "hanno", "lui", "lei", "noi", "voi", "loro", "questo", "questa", "questi", "queste", "quello", "quella", "quelli", "quelle", "come", "perché", "quando", "dove", "cosa", "anche", "molto", "tanto", "poco", "tutto", "tutti", "niente", "nessuno", "ogni", "alcuni", "essere", "avere", "fare", "dire", "andare", "vedere", "sapere", "volere", "potere", "solo", "ancora", "sempre", "oggi", "ieri", "prima", "dopo"],
    pt: ["não", "por", "são", "como", "ele", "ela", "seu", "sua", "seus", "suas", "este", "esta", "estes", "estas", "esse", "essa", "isso", "isto", "aquele", "aquela", "muito", "mais", "também", "ainda", "sempre", "nunca", "agora", "hoje", "ontem", "amanhã", "aqui", "quando", "onde", "porque", "então", "assim", "pouco", "todo", "todos", "toda", "todas", "outro", "outra", "outros", "outras", "nada", "ninguém", "cada", "algum", "alguma", "alguns", "algumas", "fazer", "dizer", "saber", "querer", "poder", "ficar"]
  };
  function guessTextLanguage(text) {
    var t = String(text || "");
    if (!t) return "latin";
    var sample = t.slice(0, 1500);
    var counts = { zh: 0, ja: 0, he: 0, ar: 0, hi: 0, latin: 0 };
    var i, code;
    for (i = 0; i < sample.length; i++) {
      code = sample.charCodeAt(i);
      if (code >= 0x4E00 && code <= 0x9FFF) counts.zh++;
      else if (code >= 0x3040 && code <= 0x30FF) counts.ja++;
      else if (code >= 0x0590 && code <= 0x05FF) counts.he++;
      else if (code >= 0x0600 && code <= 0x06FF) counts.ar++;
      else if (code >= 0x0900 && code <= 0x097F) counts.hi++;
      else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 0x00C0 && code <= 0x024F) || (code >= 0x1E00 && code <= 0x1EFF)) counts.latin++;
    }
    var letters = counts.zh + counts.ja + counts.he + counts.ar + counts.hi + counts.latin;
    if (letters > 0) {
      var best = null, bestN = 0;
      ["zh", "ja", "he", "ar", "hi"].forEach(function (k) { if (counts[k] > bestN) { bestN = counts[k]; best = k; } });
      if (best && bestN / letters > 0.25) return best;
    }
    var words = sample.toLowerCase().split(/[^a-zà-öø-ÿā-ž]+/i).filter(Boolean);
    var seen = {};
    words.forEach(function (w) { seen[w] = true; });
    var bestLang = null, bestScore = 0;
    Object.keys(TEXT_STOPWORDS).forEach(function (lang) {
      var score = 0;
      TEXT_STOPWORDS[lang].forEach(function (w) { if (seen[w]) score++; });
      if (score > bestScore) { bestScore = score; bestLang = lang; }
    });
    if (bestLang && bestScore >= 3) return bestLang;
    return "latin";
  }
  // v1.4.6: refuse to play garbage instead of playing it. A
  // non-English Kitten voice reading English text applies that
  // language's phonetics to English letters — it comes out as
  // random foreign-sounding noise, which is exactly what Carl
  // reported on Nov 16. Same the other way: an English voice
  // cannot read CJK/Hebrew/Arabic/Hindi writing at all. Latin
  // text in an unknown Latin language is allowed (it sounds
  // accented, not garbled), and same-language pairs are allowed.
  // Returns a plain-language reason, or null when the pair is fine.
  function voiceTextMismatch(voiceLang, text) {
    var tl = guessTextLanguage(text);
    var vl = voiceLang || "en";
    if (vl === "en") {
      if (tl === "zh" || tl === "ja" || tl === "he" || tl === "ar" || tl === "hi") {
        return "This article is in " + languageEntry(tl).label + ", but the voice is English — an English voice can't read that writing. Switch the voice language to " + languageEntry(tl).label + " in the Voices section.";
      }
      return null;
    }
    if (tl === "en") {
      return "This voice speaks " + languageEntry(vl).label + ", but this article is in English — it would come out as garbled sounds. Switch the voice language to English in the Voices section, or pick an English voice.";
    }
    if (tl !== "latin" && tl !== vl) {
      return "This voice speaks " + languageEntry(vl).label + ", but this article is in " + languageEntry(tl).label + " — it would come out as garbled sounds. Pick a voice in " + languageEntry(tl).label + ", or switch the voice language.";
    }
    return null;
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
  function currentKittenVoice() { return (currentVoiceChoice().kittenVoice || DEFAULT_KITTEN_VOICE); }
  // The visitor's free voice choice: which engine can play here, and
  // which voice in it. In real Edge the default is Microsoft Aria;
  // everywhere else it is Kitten Bella (on-device, free, no key).
  // "google" and "browser" are legacy values saved by older versions:
  // both migrate to the free default for this browser.
  function currentVoiceChoice() {
    var saved = storeGet(LS.voice, {}) || {};
    if (isEdgeBrowser() && !state.edgeDown) {
      return { engine: "edge", edgeVoice: saved.edgeVoice || DEFAULT_EDGE_VOICE, kittenVoice: "", browserName: "", lang: currentLanguage() };
    }
    var lang = currentLanguage();
    var list = KITTEN_VOICES[lang] || [];
    var kv = saved.kittenVoice || DEFAULT_KITTEN_VOICE;
    var ok = false;
    list.forEach(function (v) { if (v.name === kv) ok = true; });
    if (!ok) {
      // The saved voice is not in this language's list (a stale pair
      // that survived a load, or a voice saved before the language
      // was changed). The LANGUAGE wins: use its first voice, never
      // silently swap in a voice from another language. (An earlier
      // v1.4.6 draft did the opposite — "the voice wins" — and a
      // deliberate Spanish pick then silently played the English
      // voice, which is exactly the bug Carl reported. Stale pairs
      // are already reset to English at load by
      // resetNonEnglishSavedChoice; this is only a safety net.)
      kv = list.length ? list[0].name : "";
      ok = true;
    }
    return { engine: "kitten", edgeVoice: "", kittenVoice: ok ? kv : (list.length ? list[0].name : ""), browserName: "", lang: lang };
  }
  // v1.4.6: the site is English-first, ALWAYS. A stale saved
  // non-English language or voice from an earlier visit is reset
  // to English on load — the saved choice is not trusted, because
  // a persisted Spanish/Japanese choice makes every English
  // article come out as foreign-accented gibberish (Nov 16: that
  // is exactly what Carl reported). A deliberate pick inside THIS
  // visit still sticks; only a choice carried over from an earlier
  // visit is reset, and the voice menu says so in plain text.
  // Returns a plain-language note when it changed something.
  function resetNonEnglishSavedChoice() {
    var saved = storeGet(LS.voice, {}) || {};
    var changed = false;
    if (saved.lang && saved.lang !== "en") { saved.lang = "en"; changed = true; }
    if (saved.kittenVoice) {
      var vlang = voiceLangOf(saved.kittenVoice);
      if (!vlang || vlang !== "en") { saved.kittenVoice = DEFAULT_KITTEN_VOICE; changed = true; }
    }
    if (saved.edgeVoice) {
      var elang = voiceLangOf(saved.edgeVoice);
      if (!elang || elang !== "en") { saved.edgeVoice = DEFAULT_EDGE_VOICE; changed = true; }
    }
    if (changed) storeSet(LS.voice, saved);
    return changed ? "Reset to English — your saved voice language wasn't English. Tap another language in the Voices section if you want it." : null;
  }
  // The voice picker: language-first, curated cards only.
  // No browser/device voice is ever listed or used, and there is no
  // Google voice anywhere — the free engine is Microsoft (real Edge)
  // or Kitten on-device (everywhere else). Every option here is a
  // human-sounding AI voice.
  function renderReaderVoiceSelect() {
    var sel = $("voiceSelect"); if (!sel) return;
    var choice = currentVoiceChoice();
    var free = freeVoiceList();
    sel.innerHTML = "";
    var g1 = document.createElement("optgroup");
    g1.label = (free.engine === "edge" ? "Microsoft AI voices — free, no key" : "Kitten AI voices — free, on your device") + " · " + languageEntry(currentLanguage()).label;
    if (!free.voices.length) {
      var none = el("option", null, "No free on-device voice for this language yet — add a free key below");
      none.disabled = true;
      g1.appendChild(none);
    }
    free.voices.forEach(function (ev) {
      var opt = el("option", null, ev.label + " — " + ev.desc);
      opt.value = free.engine + ":" + ev.name;
      if (choice.engine === free.engine && (free.engine === "edge" ? choice.edgeVoice === ev.name : choice.kittenVoice === ev.name)) opt.selected = true;
      g1.appendChild(opt);
    });
    sel.appendChild(g1);
    if (premiumActive()) {
      var g3 = document.createElement("optgroup");
      g3.label = "Premium voices — your key";
      var popt = el("option", null, "Premium: " + premiumCfg().provider + " (set below)");
      popt.value = "premium:" + premiumCfg().provider;
      g3.appendChild(popt);
      sel.appendChild(g3);
    }
    if (!sel.value && free.voices.length) sel.value = free.engine + ":" + free.voices[0].name;
  }
  function voiceCard(entry, engine) {
    var card = el("div", "voice-card " + (engine === "edge" ? "edge-voice" : "kitten-voice"));
    var choice = currentVoiceChoice();
    var selected = choice.engine === engine && (engine === "edge" ? choice.edgeVoice === entry.name : choice.kittenVoice === entry.name);
    var unavailable = engine === "edge" && !!state.edgeDown;
    if (selected) card.classList.add("selected");
    if (unavailable) {
      card.classList.add("unavailable");
      card.setAttribute("aria-disabled", "true");
    }
    var top = el("div", "voice-card-top");
    top.appendChild(el("span", "voice-card-name", entry.label));
    if (entry.recommended) top.appendChild(el("span", "recommended-badge", "★ Recommended"));
    if (selected) top.appendChild(el("span", "voice-badge selected-badge", "✓ Selected"));
    if (unavailable) top.appendChild(el("span", "voice-badge unavailable-badge", "Unavailable in this browser"));
    card.appendChild(top);
    card.appendChild(el("div", "voice-desc", entry.desc));
    var tags = el("div", "voice-card-tags");
    // v1.4.6: the language, plainly, first — a card must never be
    // tapped without the visitor knowing what language they are
    // about to hear.
    [languageEntry(currentLanguage()).label, entry.accent, entry.gender, entry.use, "Free"].forEach(function (t) {
      tags.appendChild(el("span", "voice-tag", t));
    });
    card.appendChild(tags);
    var actions = el("div", "voice-card-actions");
    var pv = el("button", "btn btn-ghost btn-small", "▶ Preview");
    pv.type = "button";
    pv.disabled = unavailable;
    if (unavailable) pv.title = "Microsoft voices aren't answering in this browser";
    // The card itself is NOT clickable: nested interactive elements
    // meant a Preview tap could be swallowed by the card's own click
    // handler. Only the two buttons below act.
    pv.addEventListener("click", function () { previewFreeVoice(entry, engine, pv); });
    actions.appendChild(pv);
    var use = el("button", "btn btn-dark btn-small", selected ? "✓ Using" : "Use this voice");
    use.type = "button";
    use.disabled = unavailable;
    if (unavailable) use.title = "Microsoft voices aren't answering in this browser";
    use.addEventListener("click", function () { selectVoice(engine, entry.name); });
    actions.appendChild(use);
    card.appendChild(actions);
    return card;
  }
  function renderVoiceCards() {
    var wrap = $("voiceCards"); if (!wrap) return;
    wrap.innerHTML = "";
    var free = freeVoiceList();
    var sel = $("voiceLangSelect");
    if (sel && sel.value !== currentLanguage()) sel.value = currentLanguage();
    if (!free.voices.length) {
      var note = el("p", "muted", "No free on-device voice for this language yet — Kitten is English-only. Add a free ElevenLabs or Cartesia key below for studio voices, or switch the language to English.");
      wrap.appendChild(note);
      return;
    }
    free.voices.forEach(function (v) { wrap.appendChild(voiceCard(v, free.engine)); });
  }
  function updateVoiceEmptyState() {
    var box = $("voiceEmptyState"); if (!box) return;
    var free = freeVoiceList();
    box.hidden = !(free.voices.length === 0 || state.kittenFailed || (isEdgeBrowser() && state.edgeDown && state.kittenFailed));
    // v1.5.1: the visible "Retry download" control lives in the
    // empty state — but only when the voice actually FAILED to
    // download. When the box shows because there is no free voice
    // for the language (Kitten is English-only), retrying the
    // download would not help, so the button stays hidden.
    var row = $("kittenRetryRow"); if (row) row.hidden = !state.kittenFailed;
  }
  // Microsoft voices in real Edge only. If the Edge handshake fails
  // there, the free engine switches to the on-device Kitten voices —
  // still human-sounding, still free — and the banner says so. There
  // is no Google voice anywhere in this app anymore: Google Translate
  // TTS was removed entirely in v1.4.0 because its one flat voice
  // per language is what made every voice sound the same.
  var EDGE_DOWN_MSG = "Microsoft voices aren't answering in Microsoft Edge — you're hearing the free on-device Kitten voices instead. Tap “Retry Microsoft voices” to try again, or add a free ElevenLabs/Cartesia key below for studio voices.";
  function edgeDownToast() { toast(EDGE_DOWN_MSG); }
  function markEdgeDown() {
    state.edgeDown = true;
    state.edgeFailed = true;
    state.freeTransport = null;
    updateEdgeDownUI();
    edgeDownToast();
  }
  function updateEdgeDownUI() {
    var banner = $("edgeDownBanner");
    if (banner) banner.hidden = !state.edgeDown;
    // Re-render the voice UI: in real Edge with Edge down, the free
    // list switches to Kitten (freeVoiceList), so the cards are
    // rebuilt as Kitten cards; the reader dropdown follows.
    renderReaderVoiceSelect();
    renderVoiceCards();
    updateVoiceEmptyState();
    syncBottomBar();
    updateDownloadLabel();
  }
  // Handshake probe on load — REAL MICROSOFT EDGE ONLY. In every other
  // browser the Edge WebSocket handshake is rejected by Microsoft
  // (403 unless the User-Agent contains "Edg/", which a web page
  // cannot set), so probing there would only ever produce a scary
  // error banner for something that was never going to work. In
  // non-Edge browsers the free engine is Kitten from the start and
  // there is nothing to probe.
  function probeEdgeTransport() {
    if (state.edgeProbed) return;
    state.edgeProbed = true;
    if (!isEdgeBrowser()) return; // Kitten is the free engine here — no probe, no banner
    if (typeof WebSocket === "undefined") { markEdgeDown(); return; }
    edgeConnect().then(function () {
      state.edgeFailed = false;
      state.edgeDown = false;
      updateEdgeDownUI();
    }).catch(function () { markEdgeDown(); });
  }
  function loadVoices() {
    updateEdgeDownUI(); // renders select + cards + banner + bottom bar
  }
  function setVoiceLanguage(code) {
    var cur = storeGet(LS.voice, {}) || {};
    cur.lang = code;
    // v1.4.6: the candidate list must come from the NEW language.
    // freeVoiceList() reads the SAVED language, which is still the
    // old one here — the old code therefore kept the old voice, so
    // picking Spanish left the English voice selected with no card
    // marked as selected (reproduced Nov 16 in jsdom: after picking
    // Spanish, the voice was still Bella).
    var list;
    if (isEdgeBrowser() && !state.edgeDown) list = languageEntry(code).voices;
    else list = KITTEN_VOICES[code] || [];
    if (isEdgeBrowser() && !state.edgeDown) {
      var ok = false;
      list.forEach(function (v) { if (v.name === cur.edgeVoice) ok = true; });
      if (!ok) cur.edgeVoice = list.length ? list[0].name : DEFAULT_EDGE_VOICE;
    } else {
      var okK = false;
      list.forEach(function (v) { if (v.name === cur.kittenVoice) okK = true; });
      if (!okK) cur.kittenVoice = list.length ? list[0].name : DEFAULT_KITTEN_VOICE;
    }
    storeSet(LS.voice, cur);
    state.freeTransport = null;
    state.edgeFailed = false; state.kittenFailed = false;
    // v1.4.6: say the change out loud. Before this the language
    // switched silently, and a visitor who tapped the dropdown while
    // exploring could end up with every article read in Japanese
    // without knowing what changed.
    toast("Voice language set to " + languageEntry(code).label + " — previews and reading will be in " + languageEntry(code).label + ". Switch back to English any time.");
    loadVoices();
  }
  function selectVoice(engine, voiceId) {
    if (engine === "edge" && state.edgeDown) { edgeDownToast(); return; } // can't pick what can't play
    var cur = storeGet(LS.voice, {}) || {};
    cur.engine = engine;
    if (engine === "edge") cur.edgeVoice = voiceId || DEFAULT_EDGE_VOICE;
    else cur.kittenVoice = voiceId || DEFAULT_KITTEN_VOICE;
    cur.name = "";
    cur.lang = currentLanguage();
    storeSet(LS.voice, cur);
    state.freeTransport = null; // re-decide the free transport for the new voice
    state.edgeFailed = false;
    loadVoices();
    toast("Voice set to " + freeVoiceLabel({ engine: engine, edgeVoice: cur.edgeVoice, kittenVoice: cur.kittenVoice }) + " (free).");
  }
  function persistVoiceChoice() {
    var sel = $("voiceSelect");
    var val = sel ? sel.value : "";
    if (state.edgeDown && val.indexOf("edge:") === 0) {
      edgeDownToast();
      renderReaderVoiceSelect();
      renderVoiceCards();
      return;
    }
    var cur = storeGet(LS.voice, {}) || {};
    var prev = currentVoiceChoice();
    cur.engine = "edge"; cur.edgeVoice = DEFAULT_EDGE_VOICE; cur.kittenVoice = DEFAULT_KITTEN_VOICE; cur.name = "";
    if (val.indexOf("edge:") === 0) { cur.engine = "edge"; cur.edgeVoice = val.slice(5); }
    else if (val.indexOf("kitten:") === 0) { cur.engine = "kitten"; cur.kittenVoice = val.slice(7); }
    else if (val.indexOf("premium:") === 0) { cur.engine = prev.engine; cur.edgeVoice = prev.edgeVoice; cur.kittenVoice = prev.kittenVoice; }
    cur.lang = currentLanguage();
    var r = $("rateRange"), p = $("pitchRange");
    cur.rate = r ? parseFloat(r.value) : 1; cur.pitch = p ? parseFloat(p.value) : 1;
    storeSet(LS.voice, cur);
    state.freeTransport = null;
    syncBottomBar();
    renderVoiceCards();
  }

  /* ---------------- playback: free AI voices (Microsoft Edge in Edge, Kitten everywhere else) ----------------
   * No key, no account, no credits. In real Microsoft Edge the free
   * engine is Microsoft Edge Read Aloud (Aria, Jenny, Guy…) from
   * speech.platform.bing.com. In every other browser the free engine
   * is Kitten, running 100% on the visitor's own device (see below).
   * Google Translate TTS was REMOVED ENTIRELY in v1.4.0: its one flat
   * voice per language is what made every voice sound the same, and
   * there is no robotic fallback left in this app. If no
   * human-sounding engine can play, playback stops with an honest
   * reason instead of playing a robot. Karaoke highlighting is
   * timer-estimated on this engine (Kitten knows the true audio
   * duration, so its timer is exact). */
  var EDGE_TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
  var EDGE_SEC_MS_GEC_VERSION = "1-143.0.3650.75";
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
    // Promise.resolve().then() so a synchronous throw inside
    // edgeSecMsGec (a runtime missing TextEncoder/crypto) becomes a
    // rejection the probe's .catch handles — never an uncaught timer
    // error with no banner.
    return Promise.resolve().then(edgeSecMsGec).then(function (gec) {
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
  /* ---------------- Kitten: free voices that run on your device ----------------
   * kitten-tts-js (Apache-2.0) runs the KittenTTS Nano 0.8 model 100%
   * in the browser via onnxruntime-web (WASM only — kitten-tts-js
   * 0.1.2 has no WebGPU mode). The model is downloaded ONCE from
   * Hugging Face (~60MB: model + voices.npz) on first play, then
   * cached by the browser and works offline. Nothing is uploaded, no
   * account, no key, no credits, no usage limit. Loaded LAZILY —
   * never on page load — with a clear progress state, so the visitor
   * always knows what is happening. If the model cannot load, the
   * app says so honestly and points at the free ElevenLabs/Cartesia
   * key path — it never falls back to a robotic voice. */
  var kitten = {
    tts: null,           // loaded KittenTTS instance
    loading: null,       // in-flight load promise
    failed: false,       // load failed — do not retry silently
    failReason: "",
    failDetail: "",      // RAW error message (trimmed, no stack) — shown as a small "Details:" line so a real failure can actually be diagnosed (v1.4.2); the plain reason stays the headline
    loadGen: 0           // v1.5.1: generation — a retry abandons the in-flight attempt; its late resolution must not clobber the new attempt's state
  };
  // The raw error, trimmed to one short line for display. Never a
  // stack trace, never unbounded — error strings from onnxruntime can
  // run long and can contain a file path.
  function rawErrorDetail(err) {
    var m = String((err && err.message) || err || "").replace(/\s+/g, " ").trim();
    return m ? m.slice(0, 200) : "";
  }
  // A raw onnxruntime error means nothing to a visitor. Translate
  // it to plain language; anything else passes through (capped).
  function plainKittenError(err) {
    var m = String((err && err.message) || err || "");
    if (/onnxruntime|onnx runtime|wasm|webgpu|gpu adapter|get gpu|device.*not.*(found|available)/i.test(m)) {
      return "The on-device voice model couldn't load in this browser.";
    }
    return m ? m.slice(0, 160) : "The on-device voice model could not be downloaded.";
  }
  function kittenLoadText() { return $("kittenLoadText"); }
  function kittenLoadFill() { return $("kittenLoadFill"); }
  function kittenLoadBox() { return $("kittenLoadBox"); }
  // v1.4.7: the warm-up indicator must be visible at the TOP of
  // the page from the moment the page loads — the old load box
  // lives in the Voices section, below the fold, so a browser
  // check (Nov 16) saw no warm-up indicator on load at all. The
  // banner mirrors the same label + % as the load box.
  function warmupBanner() { return $("warmupBanner"); }
  function showKittenLoading(label, pct) {
    // v1.6.1 (f): a loaded voice never shows loading UI — a show
    // after the model is already here is a leak, not progress.
    if (kitten.tts) { hideKittenLoading(); return; }
    var box = kittenLoadBox();
    if (box) box.hidden = false;
    var t = kittenLoadText();
    if (t) t.textContent = label;
    var f = kittenLoadFill();
    if (f) f.style.width = (typeof pct === "number" ? Math.max(0, Math.min(100, pct)) : 0) + "%";
    var banner = warmupBanner();
    if (banner) {
      banner.hidden = false;
      var bt = $("warmupText");
      if (bt) bt.textContent = label + ((typeof pct === "number" && pct > 0 && String(label).indexOf("%") === -1) ? " " + Math.round(pct) + "%" : "");
      var bf = $("warmupFill");
      if (bf) bf.style.width = (typeof pct === "number" ? Math.max(0, Math.min(100, pct)) : 0) + "%";
    }
    // v1.5.1: a fresh load hides the Retry buttons and restarts the
    // stuck-load timer — after KITTEN_RETRY_MS with no load
    // completing, the download may be stuck (or just slow), so the
    // buttons appear on the load box + banner as the visitor's
    // escape hatch. 30s matches the slow-phone note threshold the
    // watchdogs already use. QA seam: window.__AURALIS_KITTEN_RETRY_MS.
    hideKittenRetryBtns();
    try { if (warmupRetryTimer) clearTimeout(warmupRetryTimer); } catch (e) {}
    warmupRetryTimer = setTimeout(function () {
      warmupRetryTimer = null;
      if (!kitten.loading || kitten.tts) return;
      showKittenRetryBtns();
    }, (typeof window !== "undefined" && typeof window.__AURALIS_KITTEN_RETRY_MS === "number") ? window.__AURALIS_KITTEN_RETRY_MS : 30000);
  }
  function hideKittenLoading() {
    var box = kittenLoadBox();
    if (box) box.hidden = true;
    var banner = warmupBanner();
    if (banner) banner.hidden = true;
    hideKittenRetryBtns();
    try { if (warmupRetryTimer) { clearTimeout(warmupRetryTimer); warmupRetryTimer = null; } } catch (e) {}
  }
  // v1.5.1: the visible "Retry download" buttons on the load box
  // and the warm-up banner (the empty state's button is separate —
  // it shows on failure, these show on a stuck load).
  var warmupRetryTimer = null;
  function hideKittenRetryBtns() {
    ["kittenLoadRetryBtn", "warmupRetryBtn"].forEach(function (id) { var b = $(id); if (b) b.hidden = true; });
  }
  function showKittenRetryBtns() {
    // v1.6.1 (f): the 30s stuck-load timer must never re-show
    // anything once the voice is loaded.
    if (kitten.tts) return;
    var lb = $("kittenLoadRetryBtn");
    if (lb && kittenLoadBox() && !kittenLoadBox().hidden) lb.hidden = false;
    var wb = $("warmupRetryBtn");
    if (wb && warmupBanner() && !warmupBanner().hidden) wb.hidden = false;
  }
  function kittenFail(reason, rawErr, quiet) {
    kitten.failed = true;
    kitten.failReason = reason;
    kitten.failDetail = rawErrorDetail(rawErr);
    kitten.loading = null;
    state.kittenFailed = true;
    // Log the FULL error to the console: v1.4.1 proved the app's
    // generic message hides the cause — a browser check with DevTools
    // open can now read exactly what onnxruntime said.
    try { if (typeof console !== "undefined" && console.error) console.error("[Auralis] Kitten load failed:", rawErr); } catch (e) {}
    hideKittenLoading();
    // v1.4.6: a quiet (background warm-up) failure does not show
    // the empty state — a visitor who only came to read should not
    // meet an error banner. The honest error still shows the moment
    // they tap Play or Preview (which retries).
    if (!quiet) updateVoiceEmptyState();
  }
  // v1.4.6: a failed load used to be sticky for the whole page
  // session, so "Tap Play to retry" (the error message's own
  // advice) instantly failed again with the same stored error.
  // Clear it on a deliberate new tap so a retry really retries —
  // on the fallback device/graph the failure already recorded.
  function resetKittenFailure() {
    kitten.failed = false;
    kitten.failReason = null;
    kitten.failDetail = null;
    state.kittenFailed = false;
    updateVoiceEmptyState();
  }
  // Point onnxruntime-web at its own .wasm files BEFORE kitten-tts-js
  // loads (v1.4.9). kitten-tts-js 0.1.2's from_pretrained() sets
  // ort.env.wasm.wasmPaths ONLY when it is unset — and sets it to
  // the kitten-tts-js module directory, which is WRONG for a CDN
  // import: the .wasm files live in onnxruntime-web's dist/, not
  // next to kitten-tts-js (verified against the kitten-tts-js 0.1.2
  // +esm bundle, Nov 24, 2026). So the app imports the EXACT
  // onnxruntime-web URL the bundle imports
  // (https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.2/+esm —
  // same URL, same module instance) and pre-sets wasmPaths to its
  // dist/ directory. Best-effort and never blocking: if the import
  // fails the load proceeds anyway and kitten-tts-js falls back to
  // its own (possibly wrong) paths. The result is recorded on
  // window.__AURALIS_WASM_ENV ("applied" | "mock-loader" |
  // "unavailable") so a QA run can assert the attempt was made.
  // NOTE (risk #1 for the real-browser check): instance-sharing is
  // inferred from the bundle's import URL, not proven in a live
  // browser — if the first real load fails with a .wasm 404, this
  // pre-set did not land on kitten-tts-js's instance.
  function configureOnnxWasmPaths() {
    try { if (typeof window !== "undefined") window.__AURALIS_WASM_ENV = window.__AURALIS_WASM_ENV || "pending"; } catch (e) {}
    return Promise.resolve().then(function () {
      if (typeof window === "undefined" || typeof window.__AURALIS_KITTEN_LOADER === "function") {
        try { window.__AURALIS_WASM_ENV = "mock-loader"; } catch (e) {}
        return;
      }
      return import(ONNX_RUNTIME_CDN).then(function (ort) {
        if (ort && ort.env && ort.env.wasm) {
          ort.env.wasm.wasmPaths = ONNX_RUNTIME_WASM_PATHS;
        }
        try { window.__AURALIS_WASM_ENV = "applied"; } catch (e) {}
      });
    }).catch(function () {
      try { window.__AURALIS_WASM_ENV = "unavailable"; } catch (e) {}
    });
  }
  // Load the Kitten model (once per page). `opts.quiet` (v1.4.6) marks a
  // background warm-up load: a failure is recorded but shows no
  // empty state until the visitor actually tries to play.
  // kitten-tts-js has NO progress_callback, so the download is
  // indeterminate — the load box says what is happening and the
  // Play/Preview watchdogs show elapsed seconds; there is no %.
  // There is also no WebGPU probe and no alt-graph machinery:
  // kitten-tts-js 0.1.2 is WASM-only via onnxruntime-web and does
  // not use transformers.js, so the poisoned-wasmInitPromise issue
  // does not exist and a failed load can simply be retried on the
  // same graph. The ONE retry is an import retry: if the jsDelivr
  // import itself fails, the esm.sh entry is tried once.
  // Test seam: if the harness sets
  // window.__AURALIS_KITTEN_MOCK, it is used instead of the CDN —
  // that is how QA exercises this path without a 60MB download.
  function ensureKitten(onProgress, opts) {
    // v1.6.1 (f): every early resolve hides the loading UI — a
    // caller that showed the banner (warm-up, retry) and then
    // resolves here used to leave it up forever while playback
    // worked (proven in QA: a retry resolving via this branch kept
    // the banner visible).
    if (kitten.tts) { hideKittenLoading(); return Promise.resolve(kitten.tts); }
    if (kitten.loading) return kitten.loading;
    if (kitten.failed) return Promise.reject(new Error(kitten.failReason || "Kitten voices could not be loaded."));
    if (typeof window !== "undefined" && window.__AURALIS_KITTEN_MOCK) {
      kitten.tts = window.__AURALIS_KITTEN_MOCK;
      hideKittenLoading();
      return Promise.resolve(kitten.tts);
    }
    var firstTime = !storeGet("auralis.kitten.seen", false);
    showKittenLoading((opts && opts.loadingLabel) || (firstTime
      ? "First play downloads the voice model once (~60MB) — then it works offline, even on a plane. Best on Wi-Fi…"
      : "Loading the on-device voices…"), 0);
    // v1.5.1: capture this attempt's generation. A retry bumps
    // kitten.loadGen and abandons this promise — there is no way to
    // cancel a fetch/import in flight, so the stale .then/.catch
    // below must not touch kitten.tts / kitten.loading / failure
    // state that the new attempt now owns.
    var gen = kitten.loadGen || 0;
    // Test seam: if the harness sets window.__AURALIS_KITTEN_LOADER,
    // it replaces the CDN import + from_pretrained step, so QA can
    // simulate a load failure and a retry.
    function attempt(cdnUrl) {
      // Promise.resolve().then() so even a synchronous import() throw
      // (odd runtimes) becomes a rejection the .catch below handles.
      return Promise.resolve().then(function () {
        if (typeof window !== "undefined" && typeof window.__AURALIS_KITTEN_LOADER === "function") {
          return window.__AURALIS_KITTEN_LOADER(KITTEN_MODEL, {}, cdnUrl);
        }
        // No fetch (very old browser / odd runtime): the model cannot
        // be downloaded at all. The final .catch below routes this
        // through kittenFail like any other load failure, so the
        // honest empty state shows.
        if (typeof window === "undefined" || typeof window.fetch === "undefined") {
          throw new Error("This browser can't download the on-device voice model.");
        }
        return import(cdnUrl).then(function (mod) {
          var KittenTTS = mod.KittenTTS;
          if (!KittenTTS) throw new Error("The voice library did not load.");
          return KittenTTS.from_pretrained(KITTEN_MODEL);
        });
      });
    }
    function isImportError(err) {
      var m = String((err && err.message) || err || "");
      return /failed to fetch|network ?error|dynamically imported|loading chunk|script error|import\(\)/i.test(m);
    }
    kitten.loading = configureOnnxWasmPaths().then(function () {
      return attempt(KITTEN_CDN).catch(function (err) {
        // Only a CDN import failure retries on the alternate CDN; a
        // model-load failure is reported as-is after one attempt.
        if (isImportError(err)) {
          showKittenLoading("The voice library didn't load from the first source — trying another…", 0);
          return attempt(KITTEN_CDN_ALT);
        }
        throw err;
      });
    }).then(function (tts) {
      if (gen !== kitten.loadGen) {
        // Stale success: a retry superseded this attempt. The model
        // DID load, so hand the instance back to THIS caller (their
        // Play/Preview can use it) — but touch nothing shared: the
        // new attempt owns kitten.tts / kitten.loading now.
        return kitten.tts || tts;
      }
      kitten.tts = tts;
      kitten.loading = null;
      storeSet("auralis.kitten.seen", true);
      hideKittenLoading();
      return tts;
    }).catch(function (err) {
      if (gen !== kitten.loadGen) {
        // Stale failure: the retry owns the state now. Do NOT call
        // kittenFail — it would mark the NEW attempt failed before
        // it has even had its chance.
        throw err;
      }
      kitten.loading = null;
      kittenFail(plainKittenError(err), err, opts && opts.quiet);
      throw new Error(kitten.failReason);
    });
    return kitten.loading;
  }
  // v1.5.1: the visible "Retry download" control — and the Play /
  // Preview escape hatch for a hung load. Abandons whatever is in
  // flight (a stalled ~60MB download has no timeout and no cancel:
  // the generation token makes its late resolution a no-op), clears
  // the stored failure and progress, and re-runs the full load from
  // scratch. Play/Preview already cleared a stored failure since
  // v1.4.6 — this is the missing half: a load that never settles
  // at all, which Play used to join forever.
  function retryKittenDownload(onProgress, opts) {
    // An abandoned load's late rejection must not surface as an
    // unhandled rejection (browser console noise) — the stale
    // .catch in ensureKitten still runs for the abandoned attempt's
    // own caller; this only marks the shared promise handled.
    if (kitten.loading) kitten.loading.catch(function () {});
    kitten.loadGen = (kitten.loadGen || 0) + 1;
    kitten.loading = null;
    kitten.tts = null;
    resetKittenFailure();
    var retryOpts = opts || {};
    if (!retryOpts.loadingLabel) retryOpts.loadingLabel = "Retrying the voice download…";
    // v1.6.1 (f): a retry that resolves through an early-return
    // path in ensureKitten (mock / already-loaded) hides the banner
    // here too — the button handler itself never hides anything,
    // so it must not rely on the load path to do it.
    var p = ensureKitten(onProgress, retryOpts);
    p.then(function () { if (kitten.tts && !kitten.loading) hideKittenLoading(); }, function () {});
    return p;
  }
  // v1.4.6: warm up the voice in the background, on page load —
  // NOT on first Play. The model used to download on first Play,
  // so the first tap sat silent for ~25s+ while ~60MB downloaded
  // and the first sentence synthesized, which reads as "didn't
  // load at all". Warming up moves that wait to before the tap.
  // The model + voice files are cached by kitten-tts-js (Cache
  // Storage), so the second visit reuses them and the warm-up is
  // near-instant.
  var warmupStarted = false;
  function warmUpVoices() {
    if (warmupStarted || kitten.tts || kitten.loading) return;
    warmupStarted = true;
    state.warmingUp = true;
    showKittenLoading("Getting the voice ready…", 0);
    primeKittenVoiceData();
    // v1.5.1: capture this attempt's generation. A retry supersedes
    // this warm-up — its late completion must not hide the banner
    // while the NEW load is still in flight (the banner + its Retry
    // button are the only sign the voice is still coming).
    var gen = kitten.loadGen || 0;
    ensureKitten(function (p) {
      // Mirror warm-up progress into the Play button too, so the
      // work is visible where the visitor is looking.
      if (!state.playing && p && typeof p.pct === "number") {
        setPlayButtonLabel("⏳ Getting the voice ready… " + p.pct + "%");
      }
    }, { quiet: true, loadingLabel: "Getting the voice ready…" }).then(function () {
      if (gen !== kitten.loadGen) return; // stale: the retry owns the loading UI now
      state.warmingUp = false;
      hideKittenLoading();
      if (!state.playing) setPlayButton(false); // restore "▶ Play"
      warmUpSynthesis();
    }).catch(function () {
      if (gen !== kitten.loadGen) return; // stale failure: the retry owns the state now
      // Quiet failure: the honest error shows when the visitor
      // actually taps Play or Preview (which retries). A visitor
      // who only came to read should not meet an error banner.
      state.warmingUp = false;
      hideKittenLoading();
      if (!state.playing) setPlayButton(false);
    });
  }
  // v1.4.8: warm the TTS engine at load, not at first Play. The
  // model download alone does not heat the ONNX session — the first
  // synthesis after load pays the whole cold-start cost (minutes on
  // Carl's Pixel), and by the time its audio is ready the tap's
  // gesture has expired. So once the model is loaded, synthesize
  // the default-voice preview line right away, in the background:
  // it heats the session AND caches the preview, so a later Preview
  // tap plays instantly. If an article is already open, its first
  // sentence is prefetch-warmed too. Silent and best-effort — a
  // failure here changes nothing; Play synthesizes on demand.
  var warmupSynthDone = false;
  function warmUpSynthesis() {
    if (warmupSynthDone || kitten.failed || !kitten.tts) return;
    if (currentVoiceChoice().engine !== "kitten") return;
    warmupSynthDone = true;
    try {
      var sample = languageEntry(currentLanguage()).sample;
      kittenSynthesize(sample, currentKittenVoice()).catch(function () {});
      prefetchFirstSentence();
    } catch (e) {}
  }
  // Start the warm-up shortly after load, so the page renders
  // first. Skipped where the free engine needs no model (real
  // Edge: Microsoft voices). On a metered or very slow connection
  // the warm-up waits for the first tap/keypress instead of
  // spending the visitor's data unasked.
  function maybeWarmUpVoices() {
    if (typeof window !== "undefined" && window.__AURALIS_DISABLE_WARMUP) return; // QA seam: regression pages run exactly like v1.4.5
    if (isEdgeBrowser() && !state.edgeDown) return;
    var conn = (typeof navigator !== "undefined" && navigator.connection) || null;
    if (conn && (conn.saveData || conn.effectiveType === "slow-2g" || conn.effectiveType === "2g")) {
      var arm = function () {
        warmUpVoices();
        window.removeEventListener("pointerdown", arm);
        window.removeEventListener("keydown", arm);
      };
      window.addEventListener("pointerdown", arm);
      window.addEventListener("keydown", arm);
      return;
    }
    setTimeout(warmUpVoices, 1200);
  }
  // v1.4.9: prime the browser's HTTP cache with the Kitten voice
  // embeddings (~3.3MB, voices.npz — all 8 voices in one file) so a
  // later first synthesis doesn't fetch them mid-playback.
  // Best effort and silent: a failure here changes nothing, the
  // file is simply fetched when first needed. (kitten-tts-js also
  // keeps its own Cache Storage bucket after first use, so repeat
  // visits are fast regardless.)
  function primeKittenVoiceData() {
    if (typeof fetch !== "function") return;
    try {
      fetch("https://huggingface.co/" + KITTEN_MODEL + "/resolve/main/voices.npz", { cache: "force-cache" }).catch(function () {});
    } catch (e) {}
  }
  // Float32 PCM -> 16-bit mono WAV blob (44-byte RIFF header).
  function float32ToWavBlob(samples, sampleRate) {
    var sr = sampleRate || 24000;
    var n = samples.length;
    var buf = new ArrayBuffer(44 + n * 2);
    var v = new DataView(buf);
    function wstr(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
    wstr(0, "RIFF");
    v.setUint32(4, 36 + n * 2, true);
    wstr(8, "WAVE");
    wstr(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); // PCM
    v.setUint16(22, 1, true); // mono
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    wstr(36, "data");
    v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) {
      var s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buf], { type: "audio/wav" });
  }
  // v1.4.8: ONE audio path for every voice, every tap (Carl, Nov 16:
  // "make it so browsers won't block ANY of the voices and it works
  // CONSISTENTLY"). A device-browser test on his Pixel 8 Pro proved
  // the failure: first-sentence/preview synthesis on that phone takes
  // MINUTES, and by the time the audio is ready the tap's user
  // gesture has expired, so the browser blocks audio.play() — and
  // the retry re-synthesized from scratch, so the loop repeated
  // forever. Every play() in the app goes through playAudioElement().
  // It (1) creates/resumes a shared AudioContext — unlockAudio() is
  // called inside the tap gesture itself, so the context is running
  // before any synthesis starts; (2) routes the element through
  // that running context, so playback is governed by the context
  // instead of a gesture from minutes earlier; (3) calls play() and
  // returns its promise. No other code calls .play() on an audio
  // element. Where the browser has no AudioContext (old browsers,
  // the jsdom harness), the element plays directly — same call,
  // same result. audioUnlockCalls is the QA seam: the harness
  // asserts resume() was called from inside the tap handler.
  var audioCtx = null;
  var audioUnlockCalls = 0;
  function ensureAudioContext() {
    if (audioCtx) return audioCtx;
    try {
      var AC = (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) || null;
      if (!AC) return null;
      audioCtx = new AC();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  function unlockAudio() {
    // Call ONLY from inside a tap/keypress handler: creating the
    // context during the gesture is what makes it start "running"
    // instead of "suspended" (a context created later, outside a
    // gesture, starts suspended and its resume() is refused).
    audioUnlockCalls++;
    var ctx = ensureAudioContext();
    if (ctx && ctx.state === "suspended") {
      try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }
    return ctx;
  }
  function routeAudioElement(a) {
    if (!a || a._auralisRouted) return;
    var ctx = ensureAudioContext();
    // Only route through a RUNNING context. Routing through a
    // suspended one would make play() resolve yet stay silent (the
    // context renders nothing) — worse than a refused play(), which
    // at least takes the honest failure path and lets the next tap
    // retry from cache. A suspended context means no tap has
    // unlocked audio yet (e.g. deep-link autoplay); the element
    // then plays directly under the browser's own autoplay policy.
    if (!ctx || ctx.state !== "running" || typeof ctx.createMediaElementSource !== "function") return;
    try {
      var src = ctx.createMediaElementSource(a);
      src.connect(ctx.destination);
      a._auralisRouted = true;
    } catch (e) { /* one source per element: a second call throws; the flag above normally prevents it */ }
  }
  function playAudioElement(a) {
    if (!a) return Promise.reject(new Error("No audio to play."));
    unlockAudio();
    routeAudioElement(a);
    try {
      var p = a.play();
      // v1.6.2 (d): playback has actually started — clear any stale
      // toast (e.g. "Ready — press play to listen.") instead of
      // leaving it over the player while the article plays. A
      // refused play() keeps the toast, so a failure message shown
      // by the caller still has somewhere to go — and nothing
      // re-shows the Ready toast once playback has begun.
      if (p && p.then) return p.then(function () { hideToast(); });
      hideToast();
      return Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  }
  // v1.5.0: Trim silence toggle (default ON). Kitten speaks with
  // natural phrase pauses and each chunk carries leading/trailing
  // silence, so a listen has long dead stretches between words —
  // Carl (Nov 25): "it pauses a lot between words". The toggle is
  // persisted in this browser only. Flipping it drops the synthesis
  // cache, so the very next sentence is made under the new setting
  // instead of replaying audio made under the old one; in-flight
  // audio elements are untouched (they already hold their own blob).
  function trimSilenceEnabled() {
    try {
      var v = storeGet("auralis.trimSilence.v1", null);
      return v === null ? true : !!v;
    } catch (e) { return true; }
  }
  function setTrimSilenceEnabled(on) {
    try { storeSet("auralis.trimSilence.v1", !!on); } catch (e) {}
    synthCache = {}; synthCacheOrder = [];
    var t = $("trimSilenceToggle"); if (t) t.checked = !!on;
    toast(on ? "Trim silence on — pauses between words stay short." : "Trim silence off — pauses play as the voice made them.");
  }
  // v1.5.0: trim silence. Kitten speaks with natural phrase pauses
  // (0.5–1.5s measured) and each chunk carries leading/trailing
  // silence, so a listen has long dead stretches between words and
  // between sentences. trimSilence strips leading/trailing silence
  // and caps any internal silence gap at TRIM_SILENCE_MAX_GAP_MS
  // (200ms). A silence run only counts after TRIM_SILENCE_MIN_RUN_MS
  // (30ms), so quiet consonants and plosives are never clipped.
  // Threshold 0.01 was measured, not guessed: the silent stretches
  // of real Kitten output sit at RMS ~0.002, speech peaks at
  // 0.89–0.91, and 0.01 sits ~5x above the floor and far below
  // quiet speech (at 0.005 the inaudible synth fade-in counts as
  // speech; at 0.02 quiet consonants start counting as silence).
  // Pure function: the input is never mutated; an all-silence input
  // is returned unchanged (a generation that produced nothing stays
  // an error upstream, and the jsdom mock's all-zero audio must pass
  // through untouched). The kept 200ms slice is the FIRST 200ms of
  // the original gap — the natural decay into the pause, with the
  // dead tail cut. Measured on real Kitten audio (Nov 25):
  // 17–26% of duration removed, longest gap 1.5s → exactly 200ms,
  // faster-whisper transcript of the trimmed audio word-perfect
  // (33/33 words) — no word lost or clipped.
  var TRIM_SILENCE_THRESHOLD = 0.01;
  var TRIM_SILENCE_MIN_RUN_MS = 30;
  var TRIM_SILENCE_MAX_GAP_MS = 200;
  function trimSilence(samples, sampleRate) {
    if (!(samples instanceof Float32Array) || !samples.length) return samples;
    var sr = sampleRate || 24000;
    var minRun = Math.max(1, Math.round(sr * TRIM_SILENCE_MIN_RUN_MS / 1000));
    var maxGap = Math.round(sr * TRIM_SILENCE_MAX_GAP_MS / 1000);
    var n = samples.length;
    // 1. Find all silence runs (|x| < threshold for >= minRun samples).
    var runs = [];
    var start = -1;
    var i;
    for (i = 0; i <= n; i++) {
      var silent = i < n && Math.abs(samples[i]) < TRIM_SILENCE_THRESHOLD;
      if (silent && start < 0) start = i;
      if (!silent && start >= 0) {
        if (i - start >= minRun) runs.push([start, i]);
        start = -1;
      }
    }
    // 2. Decide what of each run to keep: leading/trailing runs are
    // dropped entirely; internal runs longer than maxGap keep only
    // their first maxGap samples; shorter internal runs stay whole.
    var keep = [];
    var r;
    for (r = 0; r < runs.length; r++) {
      var s = runs[r][0], e = runs[r][1];
      if (s === 0 || e === n) continue;
      if (e - s > maxGap) keep.push([s, s + maxGap]);
      else keep.push([s, e]);
    }
    // 3. Copy kept spans (plus the speech between runs) into a new array.
    var spans = [];
    var outLen = 0;
    var cursor = 0;
    for (r = 0; r <= runs.length; r++) {
      var runStart = r < runs.length ? runs[r][0] : n;
      var runEnd = r < runs.length ? runs[r][1] : n;
      if (runStart > cursor) { spans.push([cursor, runStart]); outLen += runStart - cursor; }
      if (r < runs.length) {
        var kept = null;
        var k;
        for (k = 0; k < keep.length; k++) { if (keep[k][0] === runStart) { kept = keep[k]; break; } }
        if (kept) { spans.push(kept); outLen += kept[1] - kept[0]; }
      }
      cursor = runEnd;
    }
    if (outLen === 0) return samples; // all silence: return unchanged
    var out = new Float32Array(outLen);
    var w = 0;
    var sp;
    for (sp = 0; sp < spans.length; sp++) {
      out.set(samples.subarray(spans[sp][0], spans[sp][1]), w);
      w += spans[sp][1] - spans[sp][0];
    }
    return out;
  }
  // Synthesize one sentence with Kitten. Returns { blob, durationSec,
  // samples, sampleRate }. kitten-tts-js generate() returns a RawAudio
  // ({ data: Float32Array, sampling_rate: 24000, toBlob() -> WAV Blob })
  // — a consistent shape, so there is no extract step and no
  // empty-audio reload quirk: a null/empty result is a plain error.
  // v1.4.8: synthesized audio is CACHED, keyed by voice + speed +
  // text — a retry after a blocked play() must play the ready audio
  // INSTANTLY, never re-synthesize. The device-browser test proved
  // the old loop: every retry re-synthesized from scratch (minutes
  // on that phone), so its gesture expired too and it blocked again,
  // forever. A failed synthesis is NOT cached (the entry is dropped
  // on rejection, so a later tap really retries — v1.4.6 rule).
  // Synthesis is also serialized through one queue: concurrent
  // generate() calls on the same on-device session are not safe,
  // and the background warm-up synthesis must never race a Play tap.
  // In-flight promises are cached too, so a prefetch and a Play tap
  // for the same sentence share one synthesis instead of paying
  // twice. Bounded (16 entries) so a long article doesn't hold
  // every sentence's audio in memory.
  var synthCache = {};
  var synthCacheOrder = [];
  var SYNTH_CACHE_MAX = 16;
  var synthQueue = Promise.resolve();
  function synthCacheKey(text, voiceId) {
    var speed = Math.max(0.5, Math.min(2, currentRate() || 1));
    return (voiceId || DEFAULT_KITTEN_VOICE) + "|" + speed + "|" + String(text);
  }
  function kittenSynthesize(text, voiceId) {
    var key = synthCacheKey(text, voiceId);
    if (synthCache[key]) return synthCache[key];
    var task = synthQueue.then(function () { return synthOnceKitten(text, voiceId); });
    synthQueue = task.catch(function () {});
    synthCache[key] = task;
    synthCacheOrder.push(key);
    while (synthCacheOrder.length > SYNTH_CACHE_MAX) { delete synthCache[synthCacheOrder.shift()]; }
    task.then(null, function () { if (synthCache[key] === task) delete synthCache[key]; });
    return task;
  }
  function synthOnceKitten(text, voiceId) {
    return ensureKitten().then(function (tts) {
      var speed = Math.max(0.5, Math.min(2, currentRate() || 1));
      return tts.generate(text, { voice: voiceId || DEFAULT_KITTEN_VOICE, speed: speed }).then(function (result) {
        var data = (result && (result.data || result.audio)) || null;
        if (!(data instanceof Float32Array) || !data.length) {
          throw new Error("Kitten generated no audio for this sentence.");
        }
        var sr = (result.sampling_rate || result.sampleRate || 24000);
        // v1.5.0: trim silence (default ON) — the generated audio
        // carries long dead pauses; the blob must match the samples
        // that actually play, so it is always built from the final
        // samples (not the library's toBlob of the raw audio).
        if (trimSilenceEnabled()) data = trimSilence(data, sr);
        var blob = float32ToWavBlob(data, sr);
        return { blob: blob, durationSec: data.length / sr, samples: data, sampleRate: sr };
      });
    });
  }
  function kittenSentenceAudio(text) {
    return kittenSynthesize(text, currentKittenVoice()).then(function (res) {
      var url = URL.createObjectURL(res.blob);
      var a = new Audio(url);
      a._durMs = Math.max(200, Math.round(res.durationSec * 1000));
      a.addEventListener("ended", function () { URL.revokeObjectURL(url); });
      return a;
    });
  }
  // v1.4.8: the Microsoft (Edge) path gets the same cache as Kitten
  // — one rule for every voice: a retry replays ready audio, never
  // re-fetches. The Edge fetch is a fast network call, not minutes
  // of on-device inference, but the retry rule is uniform so no
  // voice can behave differently from the others.
  var edgeCache = {};
  var edgeCacheOrder = [];
  var EDGE_CACHE_MAX = 8;
  function edgeSentenceAudio(text) {
    var v = currentEdgeVoice();
    var key = "edge|" + v + "|" + localeOf(v) + "|" + String(text);
    var p = edgeCache[key];
    if (!p) {
      p = edgeSynthesize(text, v, localeOf(v));
      edgeCache[key] = p;
      edgeCacheOrder.push(key);
      while (edgeCacheOrder.length > EDGE_CACHE_MAX) { delete edgeCache[edgeCacheOrder.shift()]; }
      p.then(null, function () { if (edgeCache[key] === p) delete edgeCache[key]; });
    }
    return p.then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = new Audio(url);
      a.addEventListener("ended", function () { URL.revokeObjectURL(url); });
      return a;
    });
  }
  // v1.4.6: synthesize the first sentence in the background as soon
  // as an article loads, so tapping Play starts audio immediately
  // from a ready buffer instead of waiting on a first synthesis.
  // Only the first sentence (cheap), only the free engine, and never
  // when the voice/language guard would refuse the article anyway.
  function prefetchFirstSentence() {
    if (!state.sentences.length) return;
    if (premiumActive()) return;
    if (currentVoiceChoice().engine !== "kitten") return;
    var s = state.sentences[0];
    var key = (state.title || "") + "\n" + s.text;
    if (state.prefetchKey === key && state.prefetchAudio) return;
    state.prefetchKey = key;
    state.prefetchAudio = null;
    // v1.4.6: non-English languages have NO free on-device voice
    // (Kitten is English-only) — nothing to prefetch; Play refuses plainly
    // with the way out when the visitor taps it.
    if (!(KITTEN_VOICES[currentLanguage()] || []).length) return;
    var mismatch = voiceTextMismatch((currentVoiceChoice().lang || currentLanguage()), articleSampleText());
    if (mismatch) return;
    freeFetchAudio(s.text).then(function (audio) {
      if (state.prefetchKey !== key) return; // a newer article loaded meanwhile
      state.prefetchAudio = audio;
    }).catch(function () { /* Play loads it on demand and shows the real error */ });
  }
  function freeFetchAudio(text) {
    var choice = currentVoiceChoice();
    if (choice.engine === "edge") {
      // Real Edge only: Microsoft first; if it fails mid-play, fall
      // back to the on-device Kitten voices (still human, still free)
      // and say so — never to a robotic voice.
      return edgeSentenceAudio(text).then(function (a) {
        state.freeTransport = "edge";
        state.edgeFailed = false;
        if (state.edgeDown) { state.edgeDown = false; updateEdgeDownUI(); }
        return a;
      }).catch(function () {
        state.freeTransport = "kitten";
        state.edgeFailed = true;
        markEdgeDown();
        return kittenSentenceAudio(text);
      });
    }
    // Everywhere else: Kitten on-device, straight away. The Edge
    // handshake is never even attempted here.
    state.freeTransport = "kitten";
    return kittenSentenceAudio(text);
  }
  function freeWordTimer(s, durationMs) {
    // Timer-estimated karaoke highlighting (the free audio path has no
    // word-boundary events in the browser). Kitten knows the true
    // audio duration, so its timer is exact; Edge/premium estimate
    // from word count.
    var words = s.text.split(/\s+/).filter(Boolean);
    var estMs = (typeof durationMs === "number" && durationMs > 0) ? durationMs : (words.length / (175 * currentRate())) * 60000;
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
  // Show the persistent playback-error box: the plain reason as the
  // headline, plus — when we have one — a small "Details:" line with
  // the ACTUAL error message (v1.4.2). v1.4.1 proved the generic
  // message alone hides the cause; the details line is what a
  // browser check (or Carl, tapping it) needs to see. Toasts stay
  // plain-language only. `detail` is escaped, never raw HTML.
  function showPlaybackError(reason, detail) {
    var err = $("playbackError");
    if (!err) return;
    err.hidden = false;
    var html = esc(reason);
    if (detail) html += "<span class=\"error-detail\">Details: " + esc(detail) + "</span>";
    err.innerHTML = html;
    // The error must be SEEN (v1.4.4): on a phone the reader can be
    // scrolled far from this box, so a blocked-play error used to
    // appear silently off-screen.
    safeScrollIntoView(err);
  }
  // A failed listen stops HERE, on this sentence, with a loud reason.
  // It never advances through errors to 100% and never toasts
  // "Finished" unless every sentence actually played.
  function failPlayback(reason, detail) {
    state.playing = false; state.paused = false;
    clearTimeout(state.freeTimer); clearTimeout(state.premiumTimer); clearTimeout(state.wordTimer);
    if (state.freeAudio) { try { state.freeAudio.pause(); } catch (e) {} state.freeAudio = null; }
    if (state.premiumAudio) { try { state.premiumAudio.pause(); } catch (e) {} state.premiumAudio = null; }
    edgeClose();
    setPlayButton(false);
    showPlaybackError("Playback failed — " + reason + " Tap Play to retry.", detail);
    updateProgress();
    toast("Playback failed — " + reason + " Tap Play to retry.");
  }
  // First few sentences of the open article, for the language check.
  function articleSampleText() {
    if (!state.sentences.length) return "";
    return state.sentences.slice(0, 4).map(function (s) { return s.text; }).join(" ");
  }
  var firstPlayToastShown = false;
  // autoplay (v1.4.7): true when the article was opened by a Listen
  // tap (sample card / "Try a sample"). The tap's intent is to
  // listen, so playback starts by itself once the voice is ready.
  // If the browser refuses the delayed audio.play() because the
  // tap's user gesture has expired (long model download), that is
  // NOT a playback failure — the voice is downloaded now, so the
  // player parks in a plain "voice is ready, tap Play" state and
  // the next tap starts at once. Never the v1.4.4 failure box.
  function playFree(fromIdx, autoplay) {
    if (!state.sentences.length) { toast("Open an article first."); return; }
    // v1.4.6: a previous failed load must not make "tap Play to
    // retry" a lie — a deliberate new tap clears the failure and
    // really retries (on the fallback device the failure recorded).
    if (kitten.failed) resetKittenFailure();
    // v1.4.6: non-English languages have NO free on-device voice
    // (Kitten is English-only). Without this guard the play fell through to
    // currentKittenVoice()'s English default and read the article
    // in English while the menu said German — a silent wrong voice.
    // Refuse plainly instead, with the way out.
    if (currentVoiceChoice().engine === "kitten" && !(KITTEN_VOICES[currentLanguage()] || []).length) {
      state.playing = false; state.paused = false;
      setPlayButton(false);
      var noVoiceMsg = "No free on-device voice for " + languageEntry(currentLanguage()).label + " yet — add a free ElevenLabs or Cartesia key below for studio voices, or switch the language to English.";
      showPlaybackError(noVoiceMsg, null);
      toast(noVoiceMsg);
      return;
    }
    // v1.4.6: never read an article in the wrong language. A
    // non-English voice reading English text comes out as garbled
    // foreign-sounding noise — warn and refuse instead of playing
    // garbage, and say how to fix it (switch the voice language
    // back to English). The free engine only; premium voices are
    // the visitor's own configured voice, whose language Auralis
    // cannot know.
    var mismatch = voiceTextMismatch((currentVoiceChoice().lang || currentLanguage()), articleSampleText());
    if (mismatch) {
      state.playing = false; state.paused = false;
      setPlayButton(false);
      showPlaybackError("Wrong voice language — " + mismatch + " Tap Play to retry after switching.", null);
      toast("Wrong voice language — " + mismatch);
      return;
    }
    state.waitingFirstAudio = true;
    state.playing = true; state.paused = false; state.engine = "free"; state.finished = false;
    var errBox = $("playbackError"); if (errBox) errBox.hidden = true;
    setPlayButton(true);
    var start = typeof fromIdx === "number" ? fromIdx : (state.currentSentence < 0 ? 0 : state.currentSentence);
    var idx = start;
    function next() {
      if (!state.playing || state.engine !== "free") return;
      if (idx >= state.sentences.length) { finishPlayback(); return; }
      var s = state.sentences[idx];
      state.currentSentence = idx;
      highlightSentence(idx);
      // NOTE (v1.4.2): updateProgress is NOT called here. The sentence
      // is only "read" once its audio actually starts playing — the
      // old code counted it the moment it was queued, so a failed
      // first Play jumped the bar to 3% with nothing played.
      state.freeAudio = null;
      // While the on-device model is still loading (first play), the
      // Play button says so right where the visitor is looking —
      // v1.4.0 showed "Pause" + a frozen 7% for 30s with no sign
      // anything was happening. Restored to Pause when audio arrives.
      if (currentVoiceChoice().engine === "kitten" && !kitten.failed) {
        if (!kitten.tts) {
          setPlayButtonLabel("⏳ Loading voices…");
          // Say the wait out loud once (v1.4.4): on a phone the load
          // box lives in the Voices section, below the fold — the
          // visitor looking at the player would otherwise see only a
          // loading label and no reason for it.
          if (!firstPlayToastShown && !storeGet("auralis.kitten.seen", false)) {
            firstPlayToastShown = true;
            toast("First play downloads the voice model once (~60MB) — then it works offline. This can take a minute on a slow connection…");
          }
        } else {
          // v1.4.6: the model is here but the first sentence still
          // has to be synthesized — seconds of on-device inference
          // on a phone, with no sound until it lands. Say so, or
          // the silence reads as "didn't load at all" (Nov 16
          // check: ~25s of silence before the first sound).
          setPlayButtonLabel("⏳ Making the first sounds…");
        }
        // v1.4.6: the watchdog only runs while the FIRST audio is
        // awaited — never between sentences mid-article.
        if (state.waitingFirstAudio) startLoadWatchdog();
      }
      // v1.4.6: the first sentence may already be synthesized from
      // the article-load prefetch — play it straight away instead
      // of synthesizing it again.
      var prefetched = null;
      if (idx === 0 && state.prefetchAudio && state.prefetchKey === (state.title || "") + "\n" + s.text) {
        prefetched = state.prefetchAudio;
      }
      state.prefetchAudio = null; state.prefetchKey = null;
      (prefetched ? Promise.resolve(prefetched) : freeFetchAudio(s.text)).then(function (audio) {
        if (!state.playing || state.engine !== "free") return;
        stopLoadWatchdog();
        state.freeAudio = audio;
        freeWordTimer(s, audio._durMs);
        audio.onended = function () { idx++; next(); };
        audio.onerror = function () { failPlayback("The audio for this sentence failed to play."); };
        if (state.paused) return; // resume will play it
        // v1.4.6: only now — the button must never flip back to
        // "Pause" while paused (a sentence fetched after a pause
        // tap used to do exactly that).
        setPlayButton(true);
        playAudioElement(audio).then(function () {
          // Audio actually started: only now does this sentence
          // count toward the progress bar.
          state.waitingFirstAudio = false;
          state.progressSentence = idx;
          updateProgress();
        }).catch(function () {
          // A play() this late can be refused because the tap's
          // user gesture expired while the model downloaded and
          // the first sounds were made — v1.4.8 routes playback
          // through the AudioContext unlocked by the tap, and the
          // first sounds are cached, so a second tap now plays
          // them at once instead of re-synthesizing (the old
          // message promised an instant start while the
          // retry re-synthesized for minutes and blocked again).
          state.waitingFirstAudio = false;
          stopLoadWatchdog();
          if (autoplay) {
            // v1.4.7: an auto-play that the browser blocked is not
            // a failure — park in "voice ready" and let the next
            // tap start at once, with no failure box.
            state.playing = false; state.paused = false;
            state.engine = "free";
            setPlayButton(false);
            setPlayButtonLabel("▶ Tap to listen — voice is ready");
            toast("The voice is ready — tap Play to start listening.");
            return;
          }
          failPlayback("The browser blocked the sound because the voice took a while to get ready. Tap Play again — the first sounds are ready now and will start at once.");
        });
      }).catch(function (err) {
        // No human-sounding free engine could play. Never fall back
        // to a robotic voice — say so honestly instead, with the
        // real error as a details line (v1.4.2).
        try { if (typeof console !== "undefined" && console.error) console.error("[Auralis] Play failed:", err); } catch (e) {}
        state.waitingFirstAudio = false;
        state.playing = false; state.paused = false;
        stopLoadWatchdog();
        setPlayButton(false);
        updateVoiceEmptyState();
        failPlayback("The free voices aren't answering in this browser — the on-device model couldn't load. Try Microsoft Edge, or add a free ElevenLabs/Cartesia key below.", kitten.failDetail || rawErrorDetail(err));
      });
    }
    next();
  }
  // A Preview tap must NEVER look dead (v1.4.4): on a first tap the
  // model still has to download (~60MB), which takes a while on a
  // phone — so the button says so immediately, and a toast explains
  // the wait. Without this the button sat unchanged for a minute
  // while the download ran, which is exactly what Carl reported.
  function setPreviewBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = !!busy;
    if (busy) { btn.dataset.label = btn.textContent; btn.textContent = "⏳ Loading…"; }
    else if (btn.dataset.label) { btn.textContent = btn.dataset.label; delete btn.dataset.label; }
  }
  function previewEdgeVoice(ev, btn) {
    setPreviewBusy(btn, true);
    state.activePreviewBtn = btn;
    startPreviewWatchdog(btn);
    var myGen = previewGen; // v1.5.1: a newer Preview tap supersedes this attempt — its late completion must not stop the new watchdog or re-enable its button
    var sample = languageEntry(currentLanguage()).sample;
    edgeSynthesize(sample, ev.name, localeOf(ev.name)).then(function (blob) {
      if (myGen !== previewGen) return; // superseded — the new attempt owns the button now
      stopPreviewWatchdog();
      state.activePreviewBtn = null;
      setPreviewBusy(btn, false);
      var a = new Audio(URL.createObjectURL(blob));
      a.onerror = function () { toast("Preview audio failed to play — tap Preview again."); };
      playAudioElement(a).catch(function () { toast("Playback was blocked — tap Preview again, the preview is ready now and will play at once."); });
    }).catch(function () {
      if (myGen !== previewGen) return; // superseded — do not mark Edge down for a stale attempt
      stopPreviewWatchdog();
      state.activePreviewBtn = null;
      setPreviewBusy(btn, false);
      // Same loud handling as playback: say Microsoft is down, switch
      // the free engine to Kitten, and do NOT play any other voice
      // as if it were this one.
      markEdgeDown();
    });
  }
  function previewKittenVoice(ev, btn) {
    // v1.4.6: no free on-device voice for this language (Kitten
    // is English-only) — refuse plainly instead of previewing the
    // English default under a foreign-language label.
    if (!(KITTEN_VOICES[currentLanguage()] || []).length) {
      toast("No free on-device voice for " + languageEntry(currentLanguage()).label + " yet — add a free ElevenLabs or Cartesia key below for studio voices, or switch the language to English.");
      return;
    }
    setPreviewBusy(btn, true);
    state.activePreviewBtn = btn;
    startPreviewWatchdog(btn);
    var myGen = previewGen; // v1.5.1: see previewEdgeVoice — a stale completion must not touch the new attempt's button
    if (kitten.failed) resetKittenFailure();
    var sample = languageEntry(currentLanguage()).sample;
    if (!kitten.tts && !kitten.failed) {
      toast("Loading the on-device voices for the first time (~60MB, once) — this can take a minute on a slow connection…");
    } else if (kitten.tts) {
      // v1.4.6: the model is already here, but the first preview
      // still needs on-device synthesis — seconds of silence on a
      // phone. Say so up front instead of leaving a silent button.
      toast("Making the preview sounds — the first one takes a few seconds on a phone…");
    }
    kittenSynthesize(sample, ev.name).then(function (res) {
      if (myGen !== previewGen) return; // superseded — the new attempt owns the button now
      stopPreviewWatchdog();
      state.activePreviewBtn = null;
      setPreviewBusy(btn, false);
      var a = new Audio(URL.createObjectURL(res.blob));
      a.onerror = function () { toast("Preview audio failed to play — tap Preview again."); };
      playAudioElement(a).catch(function () { toast("Playback was blocked — tap Preview again, the preview is ready now and will play at once."); });
    }).catch(function (err) {
      if (myGen !== previewGen) return; // superseded — the new attempt owns the button now
      stopPreviewWatchdog();
      state.activePreviewBtn = null;
      setPreviewBusy(btn, false);
      try { if (typeof console !== "undefined" && console.error) console.error("[Auralis] Kitten preview failed:", err); } catch (e) {}
      toast("Couldn't load the on-device voices (" + plainKittenError(err) + ") — add a free ElevenLabs/Cartesia key below for studio voices.");
    });
  }
  function previewFreeVoice(entry, engine, btn) {
    unlockAudio(); // v1.4.8: the context must be unlocked by THIS tap — a preview synthesized minutes later plays through it, not through a stale gesture.
    if (engine === "edge") previewEdgeVoice(entry, btn);
    else previewKittenVoice(entry, btn);
  }

  function setPlayButton(playing) {
    var label = playing ? "⏸ Pause" : "▶ Play";
    var b = $("playPauseBtn"); if (b) b.textContent = label;
    var bb = $("playPauseBtnBottom"); if (bb) bb.textContent = label;
    syncBottomBar(); // keeps the "Reading with …" line true while playing
  }
  function setPlayButtonLabel(text) {
    var b = $("playPauseBtn"); if (b) b.textContent = text;
    var bb = $("playPauseBtnBottom"); if (bb) bb.textContent = text;
  }
  // Stuck-load watchdog (v1.4.4): a first load on a phone can take
  // minutes (60MB model on mobile data) with long gaps between
  // progress events — during those gaps the Play button used to sit
  // frozen on "Loading voices…" and look dead. Every 5s while a
  // load is in flight and nothing has arrived yet, the button shows
  // the elapsed time (and the last percentage, when one was reported)
  // so the visitor can see it is still working. Stops itself the
  // moment the model loads, the load fails, or playback stops.
  var loadWatchTimer = null;
  var loadWatchStartedAt = 0;
  function startLoadWatchdog() {
    if (loadWatchTimer) return;
    loadWatchStartedAt = Date.now();
    loadWatchTimer = setInterval(function () {
      // v1.4.6: alive until the first audio exists — the wait covers
      // the model download AND the first synthesis, and a tap during
      // either must see the wait moving, never a dead button.
      if (!state.playing || state.paused || state.freeAudio || kitten.failed) { stopLoadWatchdog(); return; }
      var secs = Math.round((Date.now() - loadWatchStartedAt) / 1000);
      var pct = "";
      try { var f = kittenLoadFill(); if (f && f.style.width) { var n = parseInt(f.style.width, 10); if (!isNaN(n) && n > 0) pct = " " + n + "%"; } } catch (e) {}
      // v1.4.8: past 30s on a slow phone, say so — a spinner with a
      // growing number and no explanation still reads as stuck.
      var slowNote = (secs >= 30) ? " — this phone is slow at it, still working…" : "";
      setPlayButtonLabel(kitten.tts ? "⏳ Making the first sounds… · " + secs + "s" + slowNote : "⏳ Loading voices…" + pct + " · " + secs + "s" + slowNote);
    }, 5000);
  }
  function stopLoadWatchdog() { if (loadWatchTimer) { clearInterval(loadWatchTimer); loadWatchTimer = null; } }
  // v1.4.6: a Preview tap must keep showing it is alive, not just
  // say "Loading…" once. The first preview can sit silent for ~25s
  // (model download, then on-device synthesis) — on a phone longer.
  // Ticks every 5s with elapsed time (and the download % when one
  // was reported) until the preview plays or fails.
  var previewWatchTimer = null;
  var previewWatchStartedAt = 0;
  var previewGen = 0; // v1.5.1: a re-enabled Preview tap starts a new attempt — a stale completion must not stop its watchdog or re-disable its button
  function startPreviewWatchdog(btn) {
    stopPreviewWatchdog();
    previewGen = (previewGen || 0) + 1;
    var gen = previewGen;
    previewWatchStartedAt = Date.now();
    previewWatchTimer = setInterval(function () {
      if (gen !== previewGen) { stopPreviewWatchdog(); return; } // superseded by a newer Preview tap
      if (!btn || btn.disabled === false) { stopPreviewWatchdog(); return; }
      var secs = Math.round((Date.now() - previewWatchStartedAt) / 1000);
      var pct = "";
      try { var f = kittenLoadFill(); if (f && f.style.width) { var n = parseInt(f.style.width, 10); if (!isNaN(n) && n > 0) pct = " " + n + "%"; } } catch (e) {}
      // v1.5.1: the Preview button used to stay disabled FOREVER
      // when the load hung — the visitor could never tap Preview
      // again, and "tap Preview again" was a lie. After
      // PREVIEW_BUSY_MAX_MS (default 120s) the button is re-enabled
      // with its original label, so a new tap starts a fresh
      // attempt. The old attempt keeps running in the background;
      // if it ever completes, its handler is guarded by previewGen
      // and will not clobber the new attempt. QA seam:
      // window.__AURALIS_PREVIEW_BUSY_MAX_MS.
      var maxMs = (typeof window !== "undefined" && typeof window.__AURALIS_PREVIEW_BUSY_MAX_MS === "number") ? window.__AURALIS_PREVIEW_BUSY_MAX_MS : 120000;
      if (Date.now() - previewWatchStartedAt >= maxMs) {
        stopPreviewWatchdog();
        state.activePreviewBtn = null;
        setPreviewBusy(btn, false);
        toast("The voice preview is taking too long — tap Preview again to retry the download.");
        return;
      }
      var slowNote = (secs >= 30) ? " — this phone is slow at it, still working…" : "";
      btn.textContent = kitten.tts ? "⏳ Making the sounds… · " + secs + "s" + slowNote : "⏳ Loading…" + pct + " · " + secs + "s" + slowNote;
    }, 5000);
  }
  function stopPreviewWatchdog() { if (previewWatchTimer) { clearInterval(previewWatchTimer); previewWatchTimer = null; } }
  function syncBottomBar() {
    var nameEl = $("bottomVoiceName");
    var nowEl = $("nowPlayingVoice");
    var voiceText = "Voice: — no free voice for this language yet";
    if (premiumActive()) {
      voiceText = "Voice: " + premiumCfg().provider + " · " + (premiumCfg().voiceId || "default") + " (premium)";
    } else if (state.edgeDown) {
      voiceText = "Voice: Kitten (on-device) — Microsoft voices unavailable in this browser";
    } else {
      var choice = currentVoiceChoice();
      if (choice.engine === "edge") voiceText = "Voice: " + edgeVoiceByName(choice.edgeVoice).label + " · " + languageEntry(choice.lang || currentLanguage()).label + " · Microsoft AI (free)";
      else if (choice.kittenVoice) voiceText = "Voice: " + kittenVoiceByName(choice.kittenVoice).label + " · " + languageEntry(choice.lang || currentLanguage()).label + " · on your device (free)";
    }
    if (nameEl) nameEl.textContent = voiceText;
    // v1.4.6: the main player shows the voice + language too, so
    // while an article is playing the visitor can always see WHAT
    // is reading it — a foreign voice never plays anonymously.
    if (nowEl) nowEl.textContent = (state.playing && !state.paused) ? voiceText.replace(/^Voice: /, "Reading with ") : voiceText;
    updateDownloadLabel();
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
    else { state.currentSentence = target; state.progressSentence = target; highlightSentence(target); updateProgress(); }
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
    state.playing = false; state.paused = false; state.finished = false;
    clearTimeout(state.wordTimer);
    clearTimeout(state.premiumTimer);
    clearTimeout(state.freeTimer);
    if (state.premiumAudio) { try { state.premiumAudio.pause(); } catch (e) {} state.premiumAudio = null; }
    if (state.freeAudio) { try { state.freeAudio.pause(); } catch (e) {} state.freeAudio = null; }
    edgeClose();
    setPlayButton(false);
    if (!silent) { clearHighlight(); }
  }
  // Stop means back to the start: progress resets to 0%.
  function resetProgress() {
    state.currentSentence = -1; state.progressSentence = -1; state.finished = false;
    clearHighlight();
    var err = $("playbackError"); if (err) err.hidden = true;
    updateProgress();
  }
  function finishPlayback() {
    stopPlayback(true);
    state.finished = true;
    state.currentSentence = state.sentences.length - 1;
    state.progressSentence = state.sentences.length - 1;
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
    state.playing = true; state.paused = false; state.engine = "premium"; state.finished = false;
    var errBox = $("playbackError"); if (errBox) errBox.hidden = true;
    setPlayButton(true);
    var start = typeof fromIdx === "number" ? fromIdx : (state.currentSentence < 0 ? 0 : state.currentSentence);
    var queue = state.sentences.slice(start);
    var idx = start;
    function next() {
      if (!state.playing || idx >= state.sentences.length) { if (state.playing) finishPlayback(); return; }
      var s = state.sentences[idx];
      state.currentSentence = idx;
      highlightSentence(idx);
      // NOTE (v1.4.2): no updateProgress() here — a sentence counts
      // as read only once its audio actually starts (see playFree).
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
        playAudioElement(audio).then(function () { state.progressSentence = idx; updateProgress(); }).catch(function () { toast("Playback was blocked — tap Play again, it will start from where it stopped."); state.playing = false; setPlayButton(false); });
      }).catch(function (err) {
        toast("Premium voice failed (" + (err && err.message ? err.message : "error") + ") — using the free Microsoft AI voice instead.");
        state.playing = false;
        playFree(idx);
      });
    }
    next();
  }

  /* ---------------- download the article as one audio file ----------------
   * "⬇ Download audio" renders the whole loaded article — the same
   * cleaned, core-only text, in the currently selected voice — into
   * ONE audio file and downloads it, named after the article title.
   * Kitten (free, on-device): sentences are synthesized to raw
   * samples, joined, and encoded as one WAV. Edge / premium: each
   * sentence is an MP3 stream and the MP3 frames are concatenated —
   * MP3 is a frame stream, so the joined file plays as one track in
   * browsers and podcast players. Only human-sounding engines are
   * ever used — there is no robotic fallback anywhere in this app.
   * Long articles take a while: honest progress ("Rendering
   * audio… sentence 4 of 22") with a Cancel button, so the UI never
   * looks dead. */
  function slugifyTitle(title) {
    var s = String(title || "auralis-reading").toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return s || "auralis-reading";
  }
  function downloadFormat() {
    if (premiumActive()) return "mp3";
    return currentVoiceChoice().engine === "edge" ? "mp3" : "wav";
  }
  function updateDownloadLabel() {
    var btn = $("downloadAudioBtn");
    if (!btn) return;
    var fmt = downloadFormat().toUpperCase();
    btn.textContent = state.downloading ? "Rendering audio…" : "⬇ Download audio (" + fmt + ")";
    btn.disabled = !!state.downloading;
  }
  function showDownloadProgress(label, pct) {
    var box = $("downloadProgressBox");
    if (box) box.hidden = false;
    var t = $("downloadProgressText");
    if (t) t.textContent = label;
    var f = $("downloadProgressFill");
    if (f) f.style.width = (typeof pct === "number" ? Math.max(0, Math.min(100, pct)) : 0) + "%";
  }
  function hideDownloadProgress() {
    var box = $("downloadProgressBox");
    if (box) box.hidden = true;
  }
  function downloadAudio() {
    if (state.downloading) return;
    if (!state.sentences.length) { toast("Open an article first."); return; }
    var total = state.sentences.length;
    var fmt = downloadFormat();
    var isWav = fmt === "wav";
    var choice = currentVoiceChoice();
    var voiceId = isWav ? choice.kittenVoice : (choice.engine === "edge" ? choice.edgeVoice : null);
    state.downloading = true;
    state.downloadCancelled = false;
    updateDownloadLabel();
    showDownloadProgress("Rendering audio… sentence 1 of " + total, 0);
    var parts = []; // Kitten: Float32Arrays · Edge/premium: MP3 blobs
    var sampleRate = 24000;
    var i = 0;
    function renderNext() {
      if (state.downloadCancelled) {
        state.downloading = false;
        hideDownloadProgress();
        updateDownloadLabel();
        toast("Download cancelled.");
        return;
      }
      if (i >= total) { finishDownload(); return; }
      showDownloadProgress("Rendering audio… sentence " + (i + 1) + " of " + total, Math.round(i / total * 100));
      var text = state.sentences[i].text;
      var p;
      if (premiumActive()) p = premiumFetchAudio(text);
      else if (choice.engine === "edge") p = edgeSynthesize(text, voiceId, localeOf(voiceId));
      else p = kittenSynthesize(text, voiceId).then(function (res) { sampleRate = res.sampleRate || 24000; return res.samples; });
      p.then(function (part) {
        if (state.downloadCancelled) { renderNext(); return; }
        parts.push(part);
        i++;
        renderNext();
      }).catch(function (err) {
        state.downloading = false;
        hideDownloadProgress();
        updateDownloadLabel();
        // Toast stays plain-language; the persistent error box
        // carries the real error as a details line (v1.4.2), and the
        // full error goes to the console for diagnosis.
        try { if (typeof console !== "undefined" && console.error) console.error("[Auralis] Download render failed:", err); } catch (e) {}
        showPlaybackError("Couldn't render the audio file (" + plainKittenError(err) + "). Try again, or switch to the free on-device voice.", kitten.failDetail || rawErrorDetail(err));
        toast("Couldn't render the audio file (" + plainKittenError(err) + "). Try again, or switch to the free on-device voice.");
      });
    }
    function finishDownload() {
      var blob;
      if (isWav) {
        // v1.5.0: with Trim silence on, each chunk is stripped of
        // its leading/trailing silence, so joining them raw would
        // run sentences together with no gap at all. A short fixed
        // gap (150ms) between sentences keeps the boundaries
        // audible in the downloaded episode. Trim off joins raw,
        // exactly as before.
        var gapSamples = trimSilenceEnabled() ? Math.round(sampleRate * 0.15) : 0;
        var totalLen = 0;
        parts.forEach(function (s) { totalLen += s.length; });
        if (gapSamples && parts.length > 1) totalLen += gapSamples * (parts.length - 1);
        var joined = new Float32Array(totalLen); // zero-filled = silence
        var off = 0;
        parts.forEach(function (s, idx) {
          if (idx > 0 && gapSamples) off += gapSamples;
          joined.set(s, off); off += s.length;
        });
        blob = float32ToWavBlob(joined, sampleRate);
      } else {
        blob = new Blob(parts, { type: "audio/mpeg" });
      }
      var filename = slugifyTitle(state.title) + "." + fmt;
      // Test seam: QA reads the last download without a real click.
      if (typeof window !== "undefined") window.__AURALIS_LAST_DOWNLOAD = { filename: filename, size: blob.size, type: blob.type, blob: blob };
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      state.downloading = false;
      hideDownloadProgress();
      updateDownloadLabel();
      toast("Audio downloaded: " + filename);
    }
    renderNext();
  }

  // Plain-language status of a first-play wait: download % and
  // elapsed seconds, so a tap during the wait can say something true.
  function loadWaitStatus() {
    var secs = loadWatchStartedAt ? Math.round((Date.now() - loadWatchStartedAt) / 1000) : 0;
    var pct = "";
    try { var f = kittenLoadFill(); if (f && f.style.width) { var n = parseInt(f.style.width, 10); if (!isNaN(n) && n > 0) pct = " " + n + "%"; } } catch (e) {}
    if (kitten.tts) return "Still making the first sounds — " + secs + "s in" + (secs >= 30 ? " — this phone is slow at it, still working" : "") + ". Tap Stop to cancel.";
    return "Still downloading the voice model once (~60MB)" + (pct ? " — " + pct : "") + (secs ? " · " + secs + "s" : "") + ". Tap Stop to cancel.";
  }
  function togglePlayPause() {
    unlockAudio(); // v1.4.8: unlock in THIS tap's gesture, every tap — the audio may only be ready minutes later, and a stale gesture is what the browser blocks.
    if (!state.sentences.length) { toast("Paste a link, some text, or open a sample first."); return; }
    // v1.4.6: while the first sounds are still being prepared
    // (voice model downloading, or first sentence synthesizing),
    // Play is NOT a pause toggle. A second tap used to pause the
    // load: the button flipped back to "▶ Play", the download kept
    // running invisibly, and nothing ever played — "it didn't load
    // at all". Now a tap during the wait just says how far along
    // it is. Stop is the way to cancel a load.
    if (state.playing && !state.paused && state.engine === "free" && state.waitingFirstAudio) {
      toast(loadWaitStatus());
      return;
    }
    if (state.playing && !state.paused) {
      if (state.engine === "premium" && state.premiumAudio) { state.premiumAudio.pause(); state.paused = true; setPlayButton(false); }
      else if (state.engine === "free") { if (state.freeAudio) state.freeAudio.pause(); state.paused = true; setPlayButton(false); }
      return;
    }
    if (state.playing && state.paused) {
      if (state.engine === "premium" && state.premiumAudio) { var pp1 = playAudioElement(state.premiumAudio); state.paused = false; setPlayButton(true); if (pp1 && pp1.then) pp1.then(function () { state.progressSentence = Math.max(state.progressSentence, state.currentSentence); updateProgress(); }).catch(function () {}); }
      else if (state.engine === "free") {
        state.paused = false; setPlayButton(true);
        // Resume: the sentence counts only once its audio actually
        // resumes (v1.4.2 — same rule as a fresh Play).
        if (state.freeAudio) { var pp2 = playAudioElement(state.freeAudio); if (pp2 && pp2.then) pp2.then(function () { state.progressSentence = Math.max(state.progressSentence, state.currentSentence); updateProgress(); }).catch(function () {}); }
      }
      return;
    }
    // Fresh play: premium if configured, else the chosen free AI voice.
    // Pressing play is the user asking to follow along again.
    // After a finish, Play restarts from the top.
    setAutoFollow(true, true);
    var restart = (state.finished || state.currentSentence >= state.sentences.length - 1) ? 0 : undefined;
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
    elevenlabs: { label: "ElevenLabs", keyLabel: "ElevenLabs API key", keyPh: "sk_…", voiceLabel: "Voice ID", voicePh: "21m00Tcm4TlvDq8ikWAM (Rachel)", modelLabel: "Model", modelPh: "eleven_turbo_v2_5", help: "The most realistic voices. Find your key at elevenlabs.io → Profile → API Keys. Voice IDs are listed under each voice in VoiceLab — or load your voices below.", freeNote: "Free tier: about 10,000 characters a month — plenty for short listens, not for whole books. The free voices above (Kitten on your device, Microsoft AI voices in Edge) are unlimited with no key at all." },
    cartesia: { label: "Cartesia Sonic", keyLabel: "Cartesia API key", keyPh: "sk_car_…", voiceLabel: "Voice ID", voicePh: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4 (Skylar)", modelLabel: "Model", modelPh: "sonic-3", help: "Cartesia Sonic is rated the closest rival to ElevenLabs for naturalness. Create a free key at cartesia.ai → API Keys. Voice IDs are UUIDs — load your voices below, or paste a voice ID.", freeNote: "Free tier: 20,000 credits a month (~27 minutes of TTS), renews monthly, no card required. The free voices above (Kitten on your device, Microsoft AI voices in Edge) are unlimited with no key at all." },
    openai: { label: "OpenAI TTS", keyLabel: "OpenAI API key", keyPh: "sk-…", voiceLabel: "Voice", voicePh: "alloy", modelLabel: "Model", modelPh: "tts-1", voices: OPENAI_VOICES, help: "Create a key at platform.openai.com → API Keys. You pay OpenAI's TTS rates only.", freeNote: "No free tier — pay-as-you-go with OpenAI. Kitten on-device voices are free and unlimited (Microsoft AI voices in Edge)." },
    azure: { label: "Azure Speech", keyLabel: "Azure subscription key", keyPh: "Your Azure Speech key", voiceLabel: "Neural voice", voicePh: "en-US-AriaNeural", modelLabel: "Region", modelPh: "eastus", voices: AZURE_VOICES, help: "From the Azure portal → your Speech resource → Keys and Endpoint. Region is the short code, e.g. eastus.", freeNote: "Free tier: 500,000 characters a month for neural voices. Kitten on-device voices are free and unlimited (Microsoft AI voices in Edge)." },
    google: { label: "Google Cloud TTS", keyLabel: "Google Cloud API key", keyPh: "AIza…", voiceLabel: "Voice", voicePh: "en-US-Neural2-F", modelLabel: "—", modelPh: "", voices: GOOGLE_VOICES, help: "Enable Cloud Text-to-Speech in Google Cloud Console and create an API key. You pay Google's TTS rates only.", freeNote: "Free tier: 1 million characters a month for WaveNet/Neural2 (first year). Kitten on-device voices are free and unlimited (Microsoft AI voices in Edge)." },
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
      host.appendChild(el("p", "muted", isEdgeBrowser()
        ? "Using the free Microsoft AI voices. Nothing to configure — press play and listen."
        : "Using the free Kitten AI voices, running on your device. Nothing to configure — press play and listen."));
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
        playAudioElement(audio).catch(function () { toast("Test audio was ready but playback was blocked — tap again."); });
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
      toast("Premium provider removed — back to the free voices.");
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
  // v1.4.6: is this page running inside another app's browser
  // (a feed, a chat, a social app)? Those WebViews never fire
  // beforeinstallprompt and have no menu to install from, so the
  // install button must say so instead of silently doing nothing.
  function isInAppWebView() {
    var ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    if (/;\s*wv\)/.test(ua)) return true; // Android WebView
    if (/FBAN|FBAV|Instagram|Line\/|KAKAOTALK|Snapchat|TikTok|Musical_ly|Pinterest/.test(ua)) return true;
    if (/iPhone|iPad|iPod/.test(ua) && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return true; // iOS in-app browser
    return false;
  }
  function isInstalledApp() {
    try {
      if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      if (typeof navigator !== "undefined" && navigator.standalone) return true;
    } catch (e) {}
    return false;
  }
  // The install button must always say something true about the
  // browser it is in — never sit there silently doing nothing.
  // Called on load and again a few seconds later (Chrome fires
  // beforeinstallprompt shortly after load), and on both install events.
  function updateInstallUI() {
    var btn = $("installAppBtn"), hint = $("installAppHint");
    var copyBtn = $("copyAppLinkBtn"), wv = $("webviewNote");
    if (!btn) return;
    if (isInstalledApp()) {
      btn.disabled = true;
      btn.textContent = "✓ Already installed";
      if (hint) hint.textContent = "Installed — look for the gold A on your home screen or apps list.";
      if (copyBtn) copyBtn.hidden = true;
      if (wv) wv.hidden = true;
      return;
    }
    btn.disabled = false;
    if (deferredInstallPrompt) {
      btn.textContent = "⬇ Install as an app";
      if (hint) hint.textContent = "Your browser is ready — tap the button above to install Auralis.";
      if (copyBtn) copyBtn.hidden = true;
      if (wv) wv.hidden = true;
      return;
    }
    // No install prompt: the button becomes the manual path, and the
    // page says so in plain text — in an in-app browser it also says
    // that browser can't install, with a copy-link button instead.
    btn.textContent = "Install — use your browser's menu";
    if (hint) hint.textContent = "No install prompt right now — open your browser's ⋮ menu and tap “Install app” or “Add to Home screen.” On iPhone Safari: Share → Add to Home Screen.";
    if (copyBtn) copyBtn.hidden = false;
    if (wv) wv.hidden = !isInAppWebView();
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) {}
  }
  function copyAppLink() {
    var url = (typeof location !== "undefined" && location.href) || "https://moretoexplore1234.github.io/auralis-reader/";
    function done() { toast("Link copied — paste it into Chrome to open Auralis."); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); done(); });
        return;
      }
    } catch (e) {}
    fallbackCopy(url); done();
  }
  // The big "Download Auralis" button must actually download
  // something (v1.4.6: it used to be an anchor to #get-the-app —
  // it only scrolled). It points at this version's ZIP on GitHub;
  // when the browser offers a real install prompt, the tap installs
  // instead.
  function setDownloadLinks() {
    var zip = "https://github.com/moretoexplore1234/auralis-reader/archive/refs/tags/" + APP_VERSION + ".zip";
    var d = $("downloadBtn"); if (d) d.href = zip;
    var z = $("zipDownloadBtn"); if (z) z.href = zip;
  }
  function wireInstall() {
    setDownloadLinks();
    var dl = $("downloadBtn");
    if (dl) dl.addEventListener("click", function (ev) {
      if (deferredInstallPrompt) {
        ev.preventDefault();
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(function () { deferredInstallPrompt = null; updateInstallUI(); });
      }
      // Otherwise the link proceeds to the ZIP download.
    });
    window.addEventListener("beforeinstallprompt", function (ev) {
      ev.preventDefault();
      deferredInstallPrompt = ev;
      updateInstallUI();
    });
    window.addEventListener("appinstalled", function () {
      deferredInstallPrompt = null;
      updateInstallUI();
      toast("Auralis installed. Enjoy listening.");
    });
    var btn = $("installAppBtn");
    if (btn) btn.addEventListener("click", function () {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(function () { deferredInstallPrompt = null; updateInstallUI(); });
      } else {
        updateInstallUI();
        toast(isInAppWebView()
          ? "This browser can't install apps — open this page in Chrome to install it, or copy the link below."
          : "To install: open your browser's ⋮ menu and tap “Install app” or “Add to Home screen.”");
      }
    });
    var copyBtn = $("copyAppLinkBtn");
    if (copyBtn) copyBtn.addEventListener("click", copyAppLink);
    updateInstallUI();
    // Chrome fires beforeinstallprompt shortly after load — re-check
    // a few seconds in so the button doesn't wrongly say "no prompt".
    setTimeout(updateInstallUI, 3000);
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
    wireXFeedAndBrowse(); // v1.6.0: X feed + Browse sections

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
      openArticle(s.title, s.source, "Auralis · original sample", s.body, 0, undefined, { autoplay: true });
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
    // v1.5.0: Trim silence toggle (default ON, persisted per browser).
    var trimToggle = $("trimSilenceToggle");
    if (trimToggle) {
      trimToggle.checked = trimSilenceEnabled();
      trimToggle.addEventListener("change", function () { setTrimSilenceEnabled(trimToggle.checked); });
    }
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

    // Auto-paste: if the clipboard holds a link (bare, or inside a
    // caption — v1.4.4), offer it with one tap. Clipboard access
    // needs permission; a denial is silent — no error.
    var clipboardUrl = "";
    function tryClipboardUrl() {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") return;
      navigator.clipboard.readText().then(function (text) {
        var t = String(text || "").trim();
        if (extractUrls(t).length) {
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
    openArticle = function (title, source, byline, bodyText, clutterRemoved, resumeAt, opts) {
      _openArticle(title, source, byline, bodyText, clutterRemoved, resumeAt, opts);
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
    $("stopBtn").addEventListener("click", function () { stopPlayback(false); resetProgress(); toast("Stopped."); });
    $("prevSentenceBtn").addEventListener("click", function () { skipSentence(-1); });
    $("nextSentenceBtn").addEventListener("click", function () { skipSentence(1); });
    $("voiceSelect").addEventListener("change", persistVoiceChoice);
    rate.addEventListener("input", function () {
      $("speedReadout").textContent = parseFloat(rate.value).toFixed(2).replace(/0$/, "") + "×";
      persistVoiceChoice(); updateProgress();
    });
    pitch.addEventListener("input", persistVoiceChoice);
    $("saveToLibraryBtn").addEventListener("click", function () { saveToLibrary(false); });
    $("downloadAudioBtn").addEventListener("click", function () { downloadAudio(); });
    $("downloadCancelBtn").addEventListener("click", function () { state.downloadCancelled = true; });
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
    // so there is nothing to wait for from device voices.
    // Probe the Microsoft transport shortly after load, so a browser
    // where it can't answer says so (banner + greyed-out cards)
    // before the visitor picks a voice.
    // v1.4.6: the site is English-first, always. A stale saved
    // non-English language or voice from an earlier visit is reset
    // to English BEFORE the voice UI renders — with a plain note
    // in the voice menu, so the visitor can pick another language
    // again if they want it.
    var resetNote = resetNonEnglishSavedChoice();
    if (resetNote) {
      // v1.4.7: the reset note lives ONLY here, in the voice menu
      // (#voiceResetNote). The old code ALSO toasted the same
      // sentence, so a text extraction saw it twice — and the long
      // toast was truncated mid-sentence ("…Voices sect"). One
      // message, one place.
      var rn = $("voiceResetNote");
      if (rn) rn.hidden = false;
    }
    // v1.4.6: on the first run of a new version, say which voice
    // and language the app is actually using — no silent defaults.
    // (One toast only: when a reset happened, the note above is the
    // whole message — no second toast saying the same thing.)
    var seenVersion = null;
    try { seenVersion = storeGet("auralis.version.seen", null); } catch (e) {}
    if (seenVersion !== APP_VERSION) {
      try { storeSet("auralis.version.seen", APP_VERSION); } catch (e) {}
      if (!resetNote) {
        var vc0 = currentVoiceChoice();
        toast("Auralis updated to " + APP_VERSION + " — voice: " + freeVoiceLabel(vc0) + " · " + languageEntry(vc0.lang || currentLanguage()).label + ". Change it in the Voices section.");
      }
    }
    var langSel = $("voiceLangSelect");
    if (langSel) {
      langSel.value = currentLanguage();
      langSel.addEventListener("change", function () { setVoiceLanguage(langSel.value); });
    }
    loadVoices();
    // v1.4.6: warm the voice up in the background (page load, not
    // first Play) so the first tap starts sound at once.
    maybeWarmUpVoices();
    setTimeout(probeEdgeTransport, 800);
    var retryBtn = $("edgeRetryBtn");
    if (retryBtn) retryBtn.addEventListener("click", function () {
      state.edgeDown = false; state.edgeFailed = false; state.freeTransport = null; state.edgeProbed = false;
      updateEdgeDownUI();
      toast("Retrying Microsoft voices…");
      probeEdgeTransport();
    });
    // v1.5.1: the three visible "Retry download" controls — empty
    // state (after a failure), warm-up banner + load box (after
    // 30s stuck). Each abandons any in-flight attempt and re-runs
    // the full model download from scratch. A failure after the
    // retry routes through kittenFail again, so the empty state
    // (with its Retry button) comes back — the button never dies.
    ["kittenRetryBtn", "warmupRetryBtn", "kittenLoadRetryBtn"].forEach(function (id) {
      var b = $(id);
      if (!b) return;
      b.addEventListener("click", function () {
        toast("Retrying the voice download…");
        retryKittenDownload().catch(function () { /* kittenFail already showed the empty state */ });
      });
    });
    var verEl = $("appVersion");
    if (verEl) verEl.textContent = APP_VERSION;
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

  // v1.4.6: QA seam (harmless in production) — the jsdom harness
  // drives these helpers directly instead of guessing from the DOM.
  try {
    if (typeof window !== "undefined") {
      window.__AURALIS_TEST = {
        guessTextLanguage: guessTextLanguage,
        voiceTextMismatch: voiceTextMismatch,
        voiceLangOf: voiceLangOf,
        currentVoiceChoice: currentVoiceChoice,
        currentLanguage: currentLanguage,
        isInAppWebView: isInAppWebView,
        resetNonEnglishSavedChoice: resetNonEnglishSavedChoice,
        warmUpVoices: warmUpVoices,
        retryKittenDownload: retryKittenDownload,
        maybeWarmUpVoices: maybeWarmUpVoices,
        prefetchFirstSentence: prefetchFirstSentence,
        warmUpSynthesis: warmUpSynthesis,
        warmupSynthDone: function () { return warmupSynthDone; },
        audioUnlockCalls: function () { return audioUnlockCalls; },
        audioCtxState: function () { return audioCtx ? audioCtx.state : "none"; },
        synthCacheSize: function () { return Object.keys(synthCache).length; },
        kittenState: function () { return { tts: !!kitten.tts, loading: !!kitten.loading, failed: !!kitten.failed, loadGen: kitten.loadGen || 0 }; },
        kittenVoices: KITTEN_VOICES,
        trimSilence: trimSilence,
        trimSilenceEnabled: trimSilenceEnabled,
        setTrimSilenceEnabled: setTrimSilenceEnabled,
        // v1.6.0: X feed + Browse seams (pure parsers + the fetch
        // functions, so the harness drives them with a mocked fetch).
        normalizeXHandle: normalizeXHandle,
        xFollows: xFollows,
        saveXFollows: saveXFollows,
        parseRssXml: parseRssXml,
        parseJinaFeedMarkdown: parseJinaFeedMarkdown,
        parseFeedBody: parseFeedBody,
        mergeXFeedItems: mergeXFeedItems,
        fetchRssText: fetchRssText,
        fetchXFeedForHandle: fetchXFeedForHandle,
        readXFeedItem: readXFeedItem,
        refreshXFeed: refreshXFeed,
        xThreadTextFromFetched: xThreadTextFromFetched,
        extractBrowseLinks: extractBrowseLinks,
        cleanBrowseTitle: cleanBrowseTitle,
        cleanSpokenText: cleanSpokenText, // v1.6.2 (b): unit-test seam
        browseLinkOk: browseLinkOk,
        browseSite: browseSite,
        browseFavs: browseFavs,
        saveBrowseFavs: saveBrowseFavs,
        removeBrowseFav: removeBrowseFav,
        xFeedStale: function () { return xFeedStale; },
        xFeedItems: function () { return xFeedItems; },
        xFeedDown: function () { return xFeedDown; },
        // v1.6.2: loading / cache seams for the harness.
        xFeedLoading: function () { return xFeedLoading; },
        xFeedCacheAt: function () { return xFeedCacheAt; },
        xFeedCacheKey: X_FEED_CACHE_KEY,
        appState: state
      };
    }
  } catch (e) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
