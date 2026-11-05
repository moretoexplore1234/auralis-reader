/* Auralis — Read Anything Aloud
 * Vanilla JS, no framework, no build step, no backend.
 * Privacy: API keys live ONLY in this browser's localStorage and are sent
 * only to the provider the user explicitly chose, only when they press play
 * or Run. Nothing is uploaded, tracked, or shared by Auralis itself.
 */
(function () {
  "use strict";

  var CFG = window.AURALIS_CONFIG || {};
  var COFFEE_USER = CFG.BUY_ME_A_COFFEE_USERNAME || "yourname";
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
    var isPlaceholder = !COFFEE_USER || COFFEE_USER === "yourname";
    var url = "https://www.buymeacoffee.com/" + encodeURIComponent(COFFEE_USER);
    ["coffeeBtnHeader", "coffeeBtnFooter", "coffeeLinkFooter"].forEach(function (id) {
      var a = $(id); if (!a) return;
      a.href = url;
      if (isPlaceholder) {
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          toast("Buy Me a Coffee isn't set up yet — set BUY_ME_A_COFFEE_USERNAME in config.js.");
        });
        a.setAttribute("aria-label", "Buy Me a Coffee (not set up yet — set username in config.js)");
      }
    });
    var note = $("coffeeNote");
    if (note && !isPlaceholder) note.textContent = "Auralis is free — coffee keeps it free, no paywall. Thank you for supporting it at buymeacoffee.com/" + COFFEE_USER + ".";
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
    safeScrollIntoView($("reader"), "start");
    updateProgress();
    updateAiAvailability();
  }

  function renderArticle() {
    $("readerTitle").textContent = state.title;
    $("readerSource").textContent = state.source || "";
    $("readerByline").textContent = state.byline || (state.totalWords + " words · " + minutesText(state.totalWords, currentRate()) + " listen");
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

  function highlightWord(globalIndex) {
    var spans = wordSpans();
    spans.forEach(function (sp, i) {
      sp.classList.toggle("active", i === globalIndex);
      sp.classList.toggle("spoken", i < globalIndex);
    });
    if (globalIndex >= 0 && spans[globalIndex]) {
      spans[globalIndex].scrollIntoView({ behavior: "smooth", block: "center" });
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

  function openArticle(title, source, byline, bodyText) {
    if (!bodyText || wordsOf(bodyText) < 20) {
      showStatus("error", "Not enough text to read",
        "That page didn't give us enough readable text (under 20 words). Try <strong>Paste text</strong> instead — you can copy the article text into Auralis directly.",
        "Paste text instead", openPasteModal);
      return;
    }
    hideStatus();
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

  function extractFromHtml(html, pageUrl) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");
    // Remove non-article chrome.
    var junk = "script, style, noscript, iframe, svg, canvas, form, nav, header, footer, aside, " +
      "[role='navigation'], [role='banner'], [role='contentinfo'], .ad, .ads, [class*='paywall'], " +
      "[class*='subscribe'], [class*='newsletter'], [class*='cookie'], [class*='share'], [class*='comment']";
    doc.querySelectorAll(junk).forEach(function (n) { n.remove(); });
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
    candidates.forEach(function (n) {
      var paras = Array.prototype.slice.call(n.querySelectorAll("p, h2, h3, blockquote, li"))
        .map(function (p) { return (p.textContent || "").replace(/\s+/g, " ").trim(); })
        .filter(function (t) { return t.length > 40; });
      var text = paras.join("\n\n");
      if (text.length > bestText.length) bestText = text;
    });
    if (!bestText) {
      var bodyText = (doc.body ? doc.body.textContent : "").replace(/\s+/g, " ").trim();
      if (bodyText.length > 400) bestText = bodyText;
    }
    return { title: title, author: author, text: bestText };
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
    showStatus("", "Fetching the article…", "Trying the page directly, then a free public reader proxy if the site blocks cross-site reading. This usually takes a few seconds.");
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
      openArticle(extracted.title, parsed.hostname, byline, extracted.text);
      saveProgressToLibrary(true);
    }).catch(function (err) {
      setBusy(btn, false, "▶  Listen");
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
      if (/\.html?$/i.test(file.name)) {
        try { text = extractFromHtml(raw, file.name).text || raw.replace(/<[^>]+>/g, " "); } catch (e) { text = raw.replace(/<[^>]+>/g, " "); }
      }
      // Strip markdown headings markers lightly; keep the words.
      text = text.replace(/^#{1,6}\s+/gm, "");
      openArticle(file.name.replace(/\.[^.]+$/, ""), "Uploaded file", file.name + " · " + wordsOf(text) + " words", text);
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
  function voiceScore(v) {
    var name = (v.name || "") + " " + (v.voiceURI || "");
    var score = 0;
    if (/natural|neural|premium|enhanced/i.test(name)) score += 40;
    if (/Microsoft (Aria|Jenny|Guy|Zira|Ryan|Emma)/i.test(name)) score += 30;
    if (/Google US English/i.test(name)) score += 25;
    if (/Samantha|Alex|Daniel|Karen|Moira|Tessa/i.test(name)) score += 15;
    if (/en[-_]US/i.test(v.lang || "")) score += 10;
    else if (/^en/i.test(v.lang || "")) score += 5;
    if (v.default) score += 3;
    if (v.localService) score += 2;
    return score;
  }
  function loadVoices() {
    if (!("speechSynthesis" in window)) {
      var sel = $("voiceSelect");
      if (sel) sel.innerHTML = "<option value=''>Speech not supported in this browser — try Chrome, Edge or Safari</option>";
      var list = $("voiceList");
      if (list) list.innerHTML = "<p class='muted'>This browser doesn't offer speech synthesis. Try Chrome, Edge or Safari — their built-in voices are free.</p>";
      return;
    }
    voices = window.speechSynthesis.getVoices().slice().sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
    if (!voices.length) return; // voiceschanged will fire again
    var sel = $("voiceSelect");
    var saved = storeGet(LS.voice, {}) || {};
    var selectedName = saved.name || "";
    sel.innerHTML = "";
    voices.forEach(function (v) {
      var opt = el("option", null, v.name + " — " + v.lang + (v.localService ? "" : " (online)"));
      opt.value = v.name;
      if (v.name === selectedName) opt.selected = true;
      sel.appendChild(opt);
    });
    if (!selectedName) {
      var pref = (PREFS.preferredNames || []).find(function (frag) {
        return voices.some(function (v) { return v.name.indexOf(frag) !== -1; });
      });
      if (pref) {
        var match = voices.find(function (v) { return v.name.indexOf(pref) !== -1; });
        if (match) sel.value = match.name;
      }
    }
    renderVoiceList();
  }
  function chosenVoice() {
    var sel = $("voiceSelect");
    var name = sel ? sel.value : "";
    return voices.find(function (v) { return v.name === name; }) || voices[0] || null;
  }
  function renderVoiceList() {
    var list = $("voiceList"); if (!list) return;
    list.innerHTML = "";
    if (!voices.length) { list.appendChild(el("p", "muted", "Loading voices…")); return; }
    voices.slice(0, 8).forEach(function (v) {
      var row = el("div", "voice-row");
      var info = el("div", "voice-info");
      info.appendChild(el("div", "voice-name", v.name));
      info.appendChild(el("div", "voice-meta", v.lang + (v.localService ? " · on-device" : " · online") + (/natural|neural/i.test(v.name) ? " · natural" : "")));
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
    if (v) storeSet(LS.voice, { name: v.name, lang: v.lang });
    var r = $("rateRange"), p = $("pitchRange");
    var cur = storeGet(LS.voice, {}) || {};
    cur.rate = r ? parseFloat(r.value) : 1; cur.pitch = p ? parseFloat(p.value) : 1;
    storeSet(LS.voice, cur);
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
    var b = $("playPauseBtn"); if (b) b.textContent = playing ? "⏸" : "▶";
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
    // Fresh play: premium if configured, else browser.
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
  var PROVIDER_META = {
    none: { label: "Browser voice", fields: [] },
    elevenlabs: { label: "ElevenLabs", keyLabel: "ElevenLabs API key", keyPh: "sk_…", voiceLabel: "Voice ID", voicePh: "21m00Tcm4TlvDq8ikWAM (Rachel)", modelLabel: "Model", modelPh: "eleven_turbo_v2_5", help: "Find your key at elevenlabs.io → Profile → API Keys. Voice IDs are listed under each voice in VoiceLab." },
    openai: { label: "OpenAI TTS", keyLabel: "OpenAI API key", keyPh: "sk-…", voiceLabel: "Voice name", voicePh: "alloy (alloy, echo, nova, shimmer…)", modelLabel: "Model", modelPh: "tts-1", help: "Create a key at platform.openai.com → API Keys. You pay OpenAI's TTS rates only." },
    azure: { label: "Azure Speech", keyLabel: "Azure subscription key", keyPh: "Your Azure Speech key", voiceLabel: "Voice name", voicePh: "en-US-AriaNeural", modelLabel: "Region", modelPh: "eastus", help: "From the Azure portal → your Speech resource → Keys and Endpoint. Region is the short code, e.g. eastus." },
    google: { label: "Google Cloud TTS", keyLabel: "Google Cloud API key", keyPh: "AIza…", voiceLabel: "Voice name", voicePh: "en-US-Neural2-F", modelLabel: "—", modelPh: "", help: "Enable Cloud Text-to-Speech in Google Cloud Console and create an API key. You pay Google's TTS rates only." }
  };
  function renderProviderForm() {
    var c = premiumCfg();
    var host = $("providerForm"); if (!host) return;
    host.innerHTML = "";
    document.querySelectorAll(".provider-card").forEach(function (card) {
      var active = card.dataset.provider === c.provider;
      card.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (!c.provider || c.provider === "none") {
      host.appendChild(el("p", "muted", "Using the free browser voice. Nothing to set up — press play and listen."));
      return;
    }
    var meta = PROVIDER_META[c.provider];
    var form = el("div");
    form.appendChild(el("p", "muted", meta.help || ""));
    function field(labelText, id, type, ph, val) {
      var f = el("div", "field");
      f.appendChild(el("label", null, labelText));
      var input = document.createElement("input");
      input.id = id; input.type = type || "text"; input.placeholder = ph || ""; input.value = val || ""; input.autocomplete = "off";
      f.appendChild(input);
      form.appendChild(f);
      return input;
    }
    var keyInput = field(meta.keyLabel, "pvKey", "password", meta.keyPh, c.key || "");
    var voiceInput = field(meta.voiceLabel, "pvVoice", "text", meta.voicePh, c.voiceId || "");
    var modelInput = null;
    if (meta.modelLabel && meta.modelLabel !== "—") modelInput = field(meta.modelLabel, "pvModel", "text", meta.modelPh, (c.provider === "azure" ? (c.region || "") : (c.model || "")));
    var row = el("div"); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
    var save = el("button", "btn btn-gold btn-small", "Save provider");
    save.type = "button";
    save.addEventListener("click", function () {
      var next = premiumCfg();
      next.provider = c.provider;
      next.key = keyInput.value.trim();
      next.voiceId = voiceInput.value.trim();
      if (modelInput) { if (c.provider === "azure") next.region = modelInput.value.trim(); else next.model = modelInput.value.trim(); }
      storeSet(LS.premium, next);
      toast(next.key ? meta.label + " saved — it will be used for narration." : "Saved, but no key yet — add your key to use " + meta.label + ".");
    });
    var test = el("button", "btn btn-ghost btn-small", "▶ Test voice");
    test.type = "button";
    test.addEventListener("click", function () {
      var next = premiumCfg();
      next.provider = c.provider; next.key = keyInput.value.trim(); next.voiceId = voiceInput.value.trim();
      if (modelInput) { if (c.provider === "azure") next.region = modelInput.value.trim(); else next.model = modelInput.value.trim(); }
      storeSet(LS.premium, next);
      if (!next.key) { toast("Paste your " + meta.label + " key first, then test."); return; }
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
      var next = premiumCfg(); next.key = ""; next.provider = "none"; next.voiceId = ""; next.model = ""; next.region = "";
      storeSet(LS.premium, next);
      renderProviderForm();
      toast("Premium provider removed — back to the free browser voice.");
    });
    row.appendChild(save); row.appendChild(test); row.appendChild(clear);
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

  /* ---------------- wire up ---------------- */
  function init() {
    wireCoffee();
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
    $("runAiBtn").addEventListener("click", function () {
      if (!state.paragraphs.length) { toast("Open an article first, then run an AI action on it."); return; }
      var sel = $("aiAppSelect");
      var app = aiApps().find(function (a) { return a.id === (sel ? sel.value : ""); });
      if (!app) { toast("Pick an AI app first — add one above if you haven't yet."); return; }
      if (app.enabled === false) { toast(app.name + " is disabled — enable it on its card first."); return; }
      var action = $("aiAction").value;
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
    });
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
