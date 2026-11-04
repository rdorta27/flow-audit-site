/* The journey of one order (S-07, S-13). Wording per step kind lives in #journey-text
   (three languages). Steps 1–8 and the records of steps 9–12 are drawn from
   engine/findings.json journeys[].story, so replacing that file redraws the journey.
   Without JavaScript the static numbered list inside #journey stays. No dependencies. */
(function () {
  var root = document.getElementById("journey");
  var raw = document.getElementById("journey-text");
  if (!root || !raw) return;
  var T;
  try { T = JSON.parse(raw.textContent); } catch (e) { return; }
  var NS = "http://www.w3.org/2000/svg";
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduce() { return !!(mq && mq.matches); }
  var SYS = T.systems, STEPS = T.steps, IDX = {};
  // Steps 1..LAST are the order's trip; the steps after it (phase: "fa") show what Flow
  // Audit does with the notes the trip left behind.
  var LAST = 0; STEPS.forEach(function (s, i) { if (s.phase !== "fa") LAST = i; });
  function tripStep() { return Math.min(step, LAST); }
  SYS.forEach(function (s, i) { IDX[s.id] = i; });
  function col(id) { return "var(--s-" + id + ")"; }
  function sysOf(id) { return SYS[IDX[id]]; }
  function works() { return true; } // the story explains how it works; status lives on the status page

  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function btn(id, cls, label, title) {
    var b = h("button", "j-btn " + cls, label);
    b.type = "button"; b.id = id; if (title) b.title = title;
    return b;
  }

  var X0 = 100, DX = 200, NY = 150, NW = 160, NH = 74, TY = 252, TH = 26, FAY = 372;
  var SPAN = 69.5;
  function cx(id) { return X0 + IDX[id] * DX; }
  function hopPath(i) {
    var a = STEPS[i - 1].sys, b = STEPS[i].sys, fwd = IDX[b] > IDX[a];
    var x1 = cx(a) + (fwd ? 24 : -24), x2 = cx(b) + (fwd ? -24 : 24);
    var lift = 34 + Math.abs(IDX[b] - IDX[a]) * 22 + (fwd ? 0 : 18), y = NY - 2;
    return { d: "M" + x1 + "," + y + " C" + x1 + "," + (y - lift) + " " + x2 + "," + (y - lift) + " " + x2 + "," + y,
      mx: (x1 + x2) / 2, my: y - lift * 0.75 - 6 };
  }

  // Build the interactive structure (replaces the static list) ---------------------
  var bar = h("div", "j-controls"); bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", T.ui.toolbar);
  var bPrev = btn("j-prev", "", T.ui.prev, T.ui.prevKey);
  var bNext = btn("j-next", "primary", T.ui.next, T.ui.nextKey);
  var bPlay = btn("j-play", "", T.ui.play, T.ui.playKey);
  var count = h("span", "j-count");
  var keys = h("span", "j-keys", T.ui.keys);
  [bPrev, bNext, bPlay, count, keys].forEach(function (n) { bar.appendChild(n); });

  var scroll = h("div", "j-scroll");
  var svg = el("svg", { id: "j-flow", viewBox: "0 6 1000 424", role: "img", "aria-labelledby": "j-flow-title" });
  svg.appendChild(el("title", { id: "j-flow-title" }, T.ui.svgTitle));
  scroll.appendChild(svg);
  var cue = h("p", "j-cue", T.ui.scroll || "");
  cue.setAttribute("aria-hidden", "true");

  var ribbon = h("div", "j-ribbon");
  var rbar = h("div", "j-ribbon-bar");
  var axis = h("div", "j-ribbon-axis", T.ui.axis.map(function (a) { return "<span>" + a + "</span>"; }).join(""));
  var rkey = h("div", "j-ribbon-key");
  ribbon.appendChild(rbar); ribbon.appendChild(axis); ribbon.appendChild(rkey);
  var panel = h("div", "j-panel"); panel.setAttribute("aria-live", "polite");

  var stage = h("div", "j-stage");
  [bar, cue, scroll, ribbon, panel].forEach(function (n) { stage.appendChild(n); });

  // Time ribbon: segments in the systems' colours; the 60 h gap dominates on purpose.
  (function () {
    var out = "";
    T.segments.forEach(function (s) {
      var w = (s.to - s.from) / 69.5 * 100;
      out += s.gap ? '<span class="gap" style="width:' + w + '%">' + s.label + "</span>"
        : '<span title="' + s.label + '" style="width:' + w + "%;background:" + col(s.sys) + '"></span>';
    });
    out += '<span style="width:' + (0.5 / 69.5 * 100) + '%;background:var(--s-prov)"></span>';
    rbar.innerHTML = out + '<i class="j-marker" id="j-marker"></i>';
    rkey.innerHTML = SYS.slice(1).map(function (s) {
      return '<span><i style="background:' + col(s.id) + '"></i>' + s.name + "</span>";
    }).join("") + '<span><i style="background:var(--crit)"></i>' + T.ui.gapKey + "</span>";
  })();

  var step = 0, timer = null, anim = null;

  function drawFlow(animateHop) {
    while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild);
    var defs = el("defs");
    SYS.forEach(function (s) {
      var m = el("marker", { id: "j-ar-" + s.id, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse" });
      m.appendChild(el("path", { d: "M0,0 L10,5 L0,10 z", style: "fill:" + col(s.id) }));
      defs.appendChild(m);
    });
    svg.appendChild(defs);
    var labels = [];
    var ts = tripStep(), F = STEPS[step].phase === "fa" ? STEPS[step] : null;
    for (var i = 1; i <= ts; i++) {
      var p = hopPath(i), s = STEPS[i], c = s.gap ? "var(--crit)" : col(s.sys);
      svg.appendChild(el("path", { "class": "hop", d: p.d, style: "stroke:" + c + (s.gap ? ";stroke-dasharray:7 6" : ""),
        "marker-end": "url(#j-ar-" + s.sys + ")", opacity: F ? 0.3 : (i === step ? 1 : 0.55), id: i === step ? "j-cur-hop" : null }));
      if (s.gap || (i === step && !F)) labels.push(el("text", { "class": "hop-label" + (s.gap ? " bad" : ""), x: p.mx, y: p.my - (s.gap ? 20 : 0), "text-anchor": "middle" }, s.gap ? (s.gapLabel || T.ui.gapArc) : s.t));
    }
    labels.forEach(function (t) { svg.appendChild(t); });
    SYS.forEach(function (s) {
      var x = cx(s.id), active = !F && STEPS[step].sys === s.id;
      var g = el("g", { "class": "node" });
      g.appendChild(el("rect", { "class": "node-rect", x: x - NW / 2 + 4, y: NY, width: NW - 8, height: NH, rx: 10,
        style: "stroke:" + col(s.id) + (active ? ";fill:" + col(s.id) + ";fill-opacity:.18" : "") }));
      g.appendChild(el("rect", { x: x - NW / 2 + 9, y: NY + 10, width: 4, height: NH - 20, rx: 2, style: "fill:" + col(s.id) }));
      var words = s.name.split(" "), lines = [s.name];
      if (s.name.length > 14 && words.length > 1) {
        var best = 1, half = s.name.length / 2, run = 0;
        for (var w = 0; w < words.length - 1; w++) { run += words[w].length + 1; if (Math.abs(run - half) < Math.abs(words.slice(0, best).join(" ").length + 1 - half)) best = w + 1; }
        lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
      }
      lines.forEach(function (ln, li) {
        g.appendChild(el("text", { "class": "node-name", x: x + 3, y: NY + (lines.length > 1 ? 24 + li * 18 : 31), "text-anchor": "middle" }, ln));
      });
      g.appendChild(el("text", { "class": "node-hint", x: x + 3, y: NY + (lines.length > 1 ? 62 : 54), "text-anchor": "middle" }, s.hint));
      svg.appendChild(g);
    });
    var count = {}, layer = el("g", { "class": "fa-layer" }), rows = {};
    STEPS.forEach(function (s, i) { if (i <= ts) rows[s.sys] = (rows[s.sys] || 0) + 1; });
    var pos = {};
    STEPS.forEach(function (s, i) {
      if (i > ts) return;
      var n = count[s.sys] = (count[s.sys] || 0) + 1;
      var x = cx(s.sys) - 88, y = TY + (n - 1) * (TH + 8);
      pos[i] = { x: x, y: y };
      var hot = F && ((F.mode === "join" && F.links && F.links.some(function (l) { return l.indexOf(i) >= 0; })) || (F.mode === "rules" && s.prob));
      var g = el("g", { "class": "ticket" + (s.bad ? " bad" : "") + (s.unseen ? " dim" : "") + ((i === step || hot) ? " fresh" : "") + (F && !hot && F.mode !== "collect" ? " dim" : "") });
      g.appendChild(el("rect", { x: x, y: y, width: 176, height: TH, rx: 5, style: s.bad ? null : "stroke:" + col(s.sys) }));
      var tx = el("text", { x: x + 8, y: y + 17 }, s.ticket);
      g.appendChild(tx);
      svg.appendChild(g);
      // Fit long notes inside their box: measure once drawn, squeeze only if needed.
      try { if (tx.getComputedTextLength() > 160) { tx.setAttribute("textLength", "160"); tx.setAttribute("lengthAdjust", "spacingAndGlyphs"); } } catch (e) {}
      var lx = cx(s.sys) + (n === 1 ? -30 : 30);
      layer.appendChild(el("line", { "class": "read" + (F && F.mode === "collect" ? " on" : "") + (works(s.status) ? "" : " later"), x1: lx, y1: TY + (rows[s.sys] - 1) * (TH + 8) + TH, x2: lx, y2: FAY }));
    });
    layer.appendChild(el("rect", { "class": "fa-band" + (F ? " on" : ""), x: 14, y: FAY, width: 972, height: 44, rx: 10 }));
    layer.appendChild(el("text", { "class": "fa-text", x: 30, y: FAY + 27 }, F ? F.band : T.ui.band));
    svg.appendChild(layer);
    if (F && F.mode === "rules") {
      STEPS.forEach(function (s, i) {
        if (i > ts || !s.prob || !pos[i]) return;
        // The rule code sits under the station where the pattern shows.
        svg.appendChild(el("text", { "class": "rule-tag", x: cx(s.sys) + NW / 2 - 8, y: NY + NH + 18, "text-anchor": "end" }, s.prob[1]));
      });
    }
    var cs = STEPS[ts];
    var tok = el("circle", { "class": "token", r: 10, cx: cx(cs.sys), cy: NY - 2, style: "fill:" + (cs.gap ? "var(--crit)" : col(cs.sys)) + (F ? ";opacity:.35" : "") });
    svg.appendChild(tok);
    var cur = document.getElementById("j-cur-hop");
    if (animateHop && cur && !reduce()) {
      var len = cur.getTotalLength(), t0 = null, dur = STEPS[step].gap ? 1600 : 800;
      cur.style.strokeDasharray = len; cur.style.strokeDashoffset = len;
      if (anim) cancelAnimationFrame(anim);
      (function frame(ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var pt = cur.getPointAtLength(len * e);
        tok.setAttribute("cx", pt.x); tok.setAttribute("cy", pt.y);
        cur.style.strokeDashoffset = len * (1 - e);
        if (k < 1) anim = requestAnimationFrame(frame);
        else if (STEPS[step].gap) { cur.style.strokeDasharray = "7 6"; cur.style.strokeDashoffset = 0; }
      })(performance.now());
    }
  }

  function drawPanel() {
    var s = STEPS[step], left, right, below = "";
    if (s.phase === "fa") {
      left = '<div><p class="j-when">' + T.ui.step + " " + (step + 1) + " · " + T.ui.faPhase + "</p>" +
        '<p class="j-sysname" style="border-color:var(--fa)">' + s.title + "</p><p>" + s.what + "</p></div>";
      right = '<div><p class="j-muted">' + T.ui.produces + '</p><div class="j-record">' + (s.rec || "") + "</div>" +
        (s.hoursNote ? '<p class="j-muted">' + s.hoursNote + "</p>" : "") + "</div>";
    } else {
      var sy = sysOf(s.sys);
      left = '<div><p class="j-when">' + T.ui.step + " " + (step + 1) + " · " + s.t + "</p>" +
        '<p class="j-sysname" style="border-color:' + col(s.sys) + '">' + sy.name + "</p><p>" + s.what + "</p>" +
        (s.born ? '<span class="j-born">' + s.born + "</span>" : "") +
        (s.prob ? '<p class="j-prob">' + T.ui.problem + ": " + s.prob[0] + "<b>" + s.prob[1] + "</b></p>" : "") + "</div>";
      right = '<div><p class="j-muted">' + T.ui.records.replace("{sys}", sy.name.toLowerCase()) + '</p><div class="j-record">' + s.rec + "</div></div>";
      below = '<div class="j-sees"><h4>' + T.ui.sees + "</h4><p>" + s.no + "</p></div>";
    }
    panel.innerHTML = left + right + below;
    count.textContent = T.ui.stepOf.replace("{n}", step + 1).replace("{total}", STEPS.length);
    bPrev.disabled = step === 0;
    bNext.disabled = step === STEPS.length - 1;
    var hh = s.phase === "fa" ? SPAN : s.h;
    var marker = document.getElementById("j-marker");
    if (marker) marker.style.left = "calc(" + (Math.min(hh, SPAN) / SPAN * 100) + "% - 1px)";
    ribbon.classList.toggle("focus", !!(s.phase === "fa" && s.mode === "time"));
    stage.classList.toggle("fa-phase", s.phase === "fa");
  }

  function go(i, animate) {
    var n = Math.max(0, Math.min(STEPS.length - 1, i)), fwd = n === step + 1;
    step = n; drawFlow(animate && fwd); drawPanel();
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; bPlay.textContent = T.ui.play; } }
  function togglePlay() {
    if (timer) return stop();
    if (step === STEPS.length - 1) go(0);
    bPlay.textContent = T.ui.pause;
    timer = setInterval(function () { if (step === STEPS.length - 1) stop(); else go(step + 1, true); }, 3400);
  }
  bPrev.onclick = function () { stop(); go(step - 1); };
  bNext.onclick = function () { stop(); go(step + 1, true); };
  bPlay.onclick = togglePlay;
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    var k = e.key, used = true;
    if (k === "ArrowRight" || k === "PageDown") { stop(); go(step + 1, true); }
    else if (k === "ArrowLeft" || k === "PageUp") { stop(); go(step - 1); }
    else if (k === "Home") { stop(); go(0); }
    else if (k === "End") { stop(); go(STEPS.length - 1); }
    else if (k === " " && tag !== "BUTTON" && tag !== "A") togglePlay();
    else used = false;
    if (used) e.preventDefault();
  });
  document.addEventListener("flowstatus", function () { drawFlow(false); });

  var st = root.querySelector(".j-static");
  if (st) st.hidden = true;
  root.appendChild(stage);
  go(0);

  // The file leads. journeys[0] is the example the engine wrote; a replaced file redraws.
  var CODE = { CAT: "cat", OMS: "oms", BPM: "bpm", PROV: "prov", SALE: "sale" };
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function numfmt() {
    var es = document.documentElement.lang !== "en";
    var thousands = es ? "." : ",", decimal = es ? "," : ".";
    return {
      int: function (v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, thousands); },
      hours: function (v) { return String(Math.round(v * 10) / 10).replace(".", decimal); }
    };
  }
  function kindOf(what) {
    var w = what || "";
    if (/^The order manager received the order/.test(w)) return "received";
    if (/^The product catalog was checked/.test(w)) return "catalog";
    if (/^A (?:second|third|fourth|number \d+) service order/.test(w)) return "serviceOrderAgain";
    if (/^A service order \(/.test(w)) return "serviceOrder";
    if (/^The process orchestrator started process/.test(w)) return "process";
    if (/^The process orchestrator ran its tasks/.test(w)) return "orchestrator";
    if (/^An activation attempt on .+ failed/.test(w)) return "attemptFailed";
    if (/^An activation attempt on .+ succeeded/.test(w)) return "attemptOk";
    if (/^An activation attempt on .+ is still pending/.test(w)) return "attemptPending";
    if (/^An activation attempt on /.test(w)) return "attemptOther";
    return "other";
  }
  function fill(tmpl, vars) {
    return String(tmpl || "").replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ""; });
  }
  function storySteps(story, fmt) {
    var K = T.ui.kinds || {};
    var times = story.map(function (st) { return st.at ? Date.parse(st.at) : NaN; }).filter(function (t) { return !isNaN(t); });
    var t0 = times.length ? Math.min.apply(null, times) : null;
    var prev = null;
    return story.map(function (st) {
      var kind = kindOf(st.what);
      var pack = K[kind] || K.other || {};
      var sys = CODE[st.system] || "oms";
      var recId = st.record && st.record.id ? st.record.id : "";
      var so = (st.what.match(/service order \(([^)]+)\)/) || [])[1] || "";
      var proc = (st.what.match(/process ([A-Za-z0-9-]+)/) || [])[1] || "";
      var code = (st.what.match(/error ([A-Za-z0-9_]+)/) || [])[1] || "";
      var line = (st.what.match(/for (line \d+|an order line)/) || [])[1] || "";
      var lineNo = (line.match(/^line (\d+)$/) || [])[1];
      var lineWord = lineNo ? " (" + (T.ui.lineWord || "line ") + lineNo + ")" : (line ? " (" + (T.ui.lineAny || line) + ")" : "");
      var vars = {
        record: recId,
        proc: proc ? " " + proc : "",
        code: code ? " (" + code + ")" : "",
        line: lineWord
      };
      var h = st.at && t0 != null ? (Date.parse(st.at) - t0) / 3600000 : (prev != null ? prev : 0);
      var gap = prev != null && st.at && (h - prev) > 12;
      var ticket = fill(pack.ticket, vars).trim() || (st.observed ? recId : (T.ui.unseenTicket || ""));
      var step = {
        sys: sys,
        h: h,
        t: st.at ? (h < 0.02 ? "0 h" : h < 1 ? "+" + Math.max(1, Math.round(h * 60)) + " min" : "+" + fmt.hours(h) + " h") : (T.ui.timeUnknown || ""),
        what: st.observed ? fill(pack.what, vars) : (pack.unseen || fill(pack.what, vars)),
        rec: esc(recId || (st.observed ? "" : (pack.unseen || ""))),
        ticket: ticket || (T.ui.unseenTicket || "—"),
        no: pack.no || "",
        born: pack.born || "",
        bad: !!st.finding,
        unseen: !st.observed,
        gap: gap,
        gapLabel: gap && T.ui.gapHop ? T.ui.gapHop.replace("{h}", fmt.hours(h - prev)) : ""
      };
      if (st.finding && T.ui.problems && T.ui.problems[st.finding]) step.prob = [T.ui.problems[st.finding], st.finding];
      if (st.at) prev = h;
      return step;
    });
  }
  function paintRibbon(journey, spanH) {
    var segs = (journey && journey.segments) || [];
    var out = "", used = 0;
    segs.forEach(function (s) {
      var from = Date.parse(s.from), to = Date.parse(s.to);
      if (isNaN(from) || isNaN(to) || to <= from) return;
      var w = (to - from) / (spanH * 3600000) * 100;
      used += w;
      var sys = CODE[s.system] || "oms";
      out += s.kind === "gap"
        ? '<span class="gap" style="width:' + w.toFixed(2) + '%"></span>'
        : '<span style="width:' + w.toFixed(2) + '%;background:' + col(sys) + '"></span>';
    });
    if (used < 99) out += '<span style="width:' + (100 - used).toFixed(2) + '%;background:var(--s-prov)"></span>';
    rbar.innerHTML = out + '<i class="j-marker" id="j-marker"></i>';
    if (T.ui.axisStart) {
      axis.innerHTML = "<span>" + T.ui.axisStart + "</span><span>" + (T.ui.axisEnd || "{h} h").replace("{h}", numfmt().hours(spanH)) + "</span>";
    }
  }
  function applyEngine(data) {
    var fmt = numfmt();
    var journeys = data.journeys || [];
    var journey = journeys[0];
    if (!journey || !journey.story || !journey.story.length || !T.ui.kinds) return;
    var trip = storySteps(journey.story, fmt);
    var fa = T.steps.filter(function (s) { return s.phase === "fa"; });
    STEPS = trip.concat(fa);
    LAST = trip.length - 1;
    var times = journey.story.map(function (st) { return st.at ? Date.parse(st.at) : NaN; }).filter(function (t) { return !isNaN(t); });
    var span = times.length > 1 ? (Math.max.apply(null, times) - Math.min.apply(null, times)) / 3600000 : 1;
    if (span < 0.1) span = 0.1;
    SPAN = span;
    var gap = 0;
    (journey.segments || []).forEach(function (seg) {
      if (seg.kind !== "gap" || !seg.from || !seg.to) return;
      var h = (Date.parse(seg.to) - Date.parse(seg.from)) / 3600000;
      if (h > gap) gap = h;
    });
    var records = [];
    journey.story.forEach(function (st) {
      if (st.observed && st.record && st.record.id && records.indexOf(st.record.id) < 0) records.push(st.record.id);
    });
    var chain = records.join(" → ");
    var link = journey.correlation && journey.correlation.strong ? (T.ui.linkSure || "") : (T.ui.linkWeak || "");
    var byId = {};
    (data.findings || []).forEach(function (f) { byId[f.id] = f; });
    var net = data.totals && data.totals.net && data.totals.net.hours;
    var note = (T.ui.hoursNote && net != null) ? T.ui.hoursNote.replace("{net}", fmt.hours(net)) : "";
    var orders = data.scope && data.scope.orders;
    fa.forEach(function (s) {
      if (note) s.hoursNote = note;
      if (s.mode === "collect" && T.ui.collectRec) {
        s.rec = esc(fill(T.ui.collectRec, {
          records: records.join(", "),
          sources: data.sources ? String(data.sources.length) : "",
          orders: orders != null ? fmt.int(orders) : ""
        }));
      }
      if (s.mode === "join" && T.ui.joinRec) s.rec = esc(fill(T.ui.joinRec, { chain: chain, link: link }));
      if (s.mode === "time" && T.ui.timeRec) s.rec = esc(T.ui.timeRec.replace("{span}", fmt.hours(span)).replace("{gap}", fmt.hours(gap)));
      if (s.mode === "rules" && T.ui.findingLine) {
        var lines = [];
        Object.keys(byId).sort(function (a, b) { return byId[b].affected_orders - byId[a].affected_orders; }).forEach(function (id) {
          var f = byId[id];
          if (!f.cost) return;
          lines.push(esc(T.ui.findingLine
            .replace("{id}", id)
            .replace("{name}", (T.ui.names && T.ui.names[id]) || f.title)
            .replace("{orders}", fmt.int(f.affected_orders))
            .replace("{unit}", (T.ui.units && (T.ui.units[id] || T.ui.units.default)) || "")
            .replace("{hours}", fmt.hours(f.cost.hours_month))));
        });
        if (lines.length) s.rec = lines.join("\n");
      }
    });
    var title = document.getElementById("j-flow-title");
    if (title && T.ui.svgTitleLive && journey.order_ref) title.textContent = T.ui.svgTitleLive.replace("{order}", journey.order_ref);
    paintRibbon(journey, span);
    stop();
    go(0);
  }
  var src = root.getAttribute("data-src");
  if (src && window.fetch) {
    fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(applyEngine).catch(function () {});
  }
})();
