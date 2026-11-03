/* The journey of one order (S-07). All texts come from #journey-text in each landing
   (three languages); step ids match data/status.json. Without JavaScript the static
   numbered list inside #journey stays. No dependencies. */
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
  SYS.forEach(function (s, i) { IDX[s.id] = i; });
  function col(id) { return "var(--s-" + id + ")"; }
  function sysOf(id) { return SYS[IDX[id]]; }
  function works(id) { return !window.FlowStatus || window.FlowStatus.works(id); }

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

  var X0 = 100, DX = 200, NY = 150, NW = 160, NH = 62, TY = 240, TH = 26, FAY = 370;
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
  var bFirst = btn("j-first", "", "⏮", T.ui.first); bFirst.setAttribute("aria-label", T.ui.first);
  var bPrev = btn("j-prev", "", T.ui.prev, T.ui.prevKey);
  var bNext = btn("j-next", "primary", T.ui.next, T.ui.nextKey);
  var bPlay = btn("j-play", "", T.ui.play, T.ui.playKey);
  var count = h("span", "j-count");
  var keys = h("span", "j-keys", T.ui.keys);
  [bFirst, bPrev, bNext, bPlay, count, keys].forEach(function (n) { bar.appendChild(n); });

  var scroll = h("div", "j-scroll");
  var svg = el("svg", { id: "j-flow", viewBox: "0 0 1000 430", role: "img", "aria-labelledby": "j-flow-title" });
  svg.appendChild(el("title", { id: "j-flow-title" }, T.ui.svgTitle));
  scroll.appendChild(svg);

  var ribbon = h("div", "j-ribbon");
  var rbar = h("div", "j-ribbon-bar");
  var axis = h("div", "j-ribbon-axis", T.ui.axis.map(function (a) { return "<span>" + a + "</span>"; }).join(""));
  var rkey = h("div", "j-ribbon-key");
  ribbon.appendChild(rbar); ribbon.appendChild(axis); ribbon.appendChild(rkey);
  var panel = h("div", "j-panel"); panel.setAttribute("aria-live", "polite");

  var stage = h("div", "j-stage");
  [bar, scroll, ribbon, panel].forEach(function (n) { stage.appendChild(n); });

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
    for (var i = 1; i <= step; i++) {
      var p = hopPath(i), s = STEPS[i], c = s.gap ? "var(--crit)" : col(s.sys);
      svg.appendChild(el("path", { "class": "hop", d: p.d, style: "stroke:" + c + (s.gap ? ";stroke-dasharray:7 6" : ""),
        "marker-end": "url(#j-ar-" + s.sys + ")", opacity: i === step ? 1 : 0.55, id: i === step ? "j-cur-hop" : null }));
      if (s.gap || i === step) labels.push(el("text", { "class": "hop-label" + (s.gap ? " bad" : ""), x: p.mx, y: p.my - (s.gap ? 10 : 0), "text-anchor": "middle" }, s.gap ? T.ui.gapArc : s.t));
    }
    labels.forEach(function (t) { svg.appendChild(t); });
    SYS.forEach(function (s) {
      var x = cx(s.id), active = STEPS[step].sys === s.id;
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
        g.appendChild(el("text", { "class": "node-name", x: x + 3, y: NY + (lines.length > 1 ? 22 + li * 16 : 27), "text-anchor": "middle" }, ln));
      });
      g.appendChild(el("text", { "class": "node-hint", x: x + 3, y: NY + (lines.length > 1 ? 55 : 46), "text-anchor": "middle" }, s.hint));
      svg.appendChild(g);
    });
    var count = {}, layer = el("g", { "class": "fa-layer" });
    STEPS.forEach(function (s, i) {
      if (i > step) return;
      var n = count[s.sys] = (count[s.sys] || 0) + 1;
      var x = cx(s.sys) - 88, y = TY + (n - 1) * (TH + 8);
      var g = el("g", { "class": "ticket" + (s.bad ? " bad" : "") + (i === step ? " fresh" : "") });
      g.appendChild(el("rect", { x: x, y: y, width: 176, height: TH, rx: 5, style: s.bad ? null : "stroke:" + col(s.sys) }));
      g.appendChild(el("text", { x: x + 8, y: y + 17, textLength: s.ticket.length > 22 ? 160 : null, lengthAdjust: "spacingAndGlyphs" }, s.ticket));
      svg.appendChild(g);
      var lx = cx(s.sys) + (n === 1 ? -30 : 30);
      layer.appendChild(el("line", { "class": "read" + (works(s.status) ? "" : " later"), x1: lx, y1: y + TH, x2: lx, y2: FAY }));
    });
    layer.appendChild(el("rect", { "class": "fa-band", x: 14, y: FAY, width: 972, height: 44, rx: 10 }));
    layer.appendChild(el("text", { "class": "fa-text", x: 30, y: FAY + 27 }, T.ui.band));
    svg.appendChild(layer);
    var tok = el("circle", { "class": "token", r: 10, cx: cx(STEPS[step].sys), cy: NY - 2, style: "fill:" + (STEPS[step].gap ? "var(--crit)" : col(STEPS[step].sys)) });
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
    var s = STEPS[step], sy = sysOf(s.sys);
    var left = '<div><p class="j-when">' + T.ui.step + " " + (step + 1) + " · " + s.t + "</p>" +
      '<p class="j-sysname" style="border-color:' + col(s.sys) + '">' + sy.name + "</p><p>" + s.what + "</p>" +
      (s.born ? '<span class="j-born">' + s.born + "</span>" : "") +
      (s.prob ? '<p class="j-prob">' + T.ui.problem + ": " + s.prob[0] + "<b>" + s.prob[1] + "</b></p>" : "") + "</div>";
    var right = '<div><p class="j-muted">' + T.ui.records.replace("{sys}", sy.name.toLowerCase()) + '</p><div class="j-record">' + s.rec + "</div></div>";
    var vs = '<div class="j-vs"><div class="without"><h4>' + T.ui.without + "</h4><p>" + s.no + "</p></div>" +
      '<div class="with"><h4>' + T.ui.withFA + ' <span data-status="' + s.status + '"></span></h4><p>' + s.fa + '</p><p class="j-conf j-muted">' + s.conf + "</p></div></div>";
    panel.innerHTML = left + right + vs;
    count.textContent = T.ui.stepOf.replace("{n}", step + 1).replace("{total}", STEPS.length);
    bPrev.disabled = bFirst.disabled = step === 0;
    bNext.disabled = step === STEPS.length - 1;
    document.getElementById("j-marker").style.left = "calc(" + (Math.min(s.h, 69.3) / 69.5 * 100) + "% - 1px)";
    if (window.FlowStatus) window.FlowStatus.refresh();
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
  bFirst.onclick = function () { stop(); go(0); };
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
})();
