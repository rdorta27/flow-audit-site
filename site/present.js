/* Five-minute deck (S-27). Keyboard moves the slides. Figures, when filled,
   come from engine/findings.json. Without JavaScript every slide stays visible. */
(function () {
  var deck = document.getElementById("deck");
  var textEl = document.getElementById("present-text");
  if (!deck) return;
  var slides = Array.prototype.slice.call(deck.querySelectorAll(".slide"));
  if (!slides.length) return;
  var T = {};
  try { T = JSON.parse(textEl && textEl.textContent || "{}"); } catch (e) {}
  var i = 0;
  var count = document.getElementById("deck-count");
  var prev = document.getElementById("deck-prev");
  var next = document.getElementById("deck-next");

  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
    if (count && T.stepOf) count.textContent = T.stepOf.replace("{n}", i + 1).replace("{total}", slides.length);
    deck.style.setProperty("--p", ((i + 1) / slides.length * 100) + "%");
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === slides.length - 1;
    var hash = slides[i].id;
    if (hash && location.hash !== "#" + hash) {
      try { history.replaceState(null, "", "#" + hash); } catch (e) {}
    }
  }
  deck.classList.add("is-live");
  var start = 0;
  if (location.hash) {
    slides.forEach(function (s, k) { if ("#" + s.id === location.hash) start = k; });
  }
  show(start);
  if (prev) prev.onclick = function () { show(i - 1); };
  if (next) next.onclick = function () { show(i + 1); };
  var print = document.getElementById("deck-print");
  if (print) print.onclick = function () { window.print(); };
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { show(i + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { show(i - 1); e.preventDefault(); }
    else if (e.key === "Home") { show(0); e.preventDefault(); }
    else if (e.key === "End") { show(slides.length - 1); e.preventDefault(); }
  });

  var host = document.getElementById("present-findings");
  if (!host || !window.fetch || !host.getAttribute("data-src")) return;
  var es = document.documentElement.lang !== "en";
  var thousands = es ? "." : ",", decimal = es ? "," : ".";
  function int(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, thousands); }
  function hours(n) { return String(Math.round(n * 10) / 10).replace(".", decimal); }
  fetch(host.getAttribute("data-src")).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
    var by = {};
    (data.findings || []).forEach(function (f) { by[f.id] = f; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-rule]"), function (n) {
      var f = by[n.getAttribute("data-rule")];
      if (!f) return;
      if (n.getAttribute("data-fill") === "orders") n.textContent = int(f.affected_orders);
      if (n.getAttribute("data-fill") === "hours") n.textContent = hours(f.cost.hours_month) + " h";
    });
    var net = data.totals && data.totals.net && data.totals.net.hours;
    var gross = data.totals && data.totals.gross && data.totals.gross.hours;
    var netEl = document.getElementById("present-net");
    var grossEl = document.getElementById("present-gross");
    if (netEl && net != null) netEl.textContent = hours(net) + " h";
    if (grossEl && gross != null) grossEl.textContent = String(Math.round(gross));
    var max = 0;
    (data.findings || []).forEach(function (f) { max = Math.max(max, f.affected_orders); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-bar]"), function (n) {
      var f = by[n.getAttribute("data-bar")];
      if (f && max) n.style.width = Math.max(2, Math.round(f.affected_orders / max * 100)) + "%";
    });
    var ribbon = document.getElementById("present-ribbon");
    var colors = { OMS: "--s-oms", CAT: "--s-cat", BPM: "--s-bpm", PROV: "--s-prov", SALE: "--s-sale" };
    var one = (data.journeys || []).filter(function (j) { return j.order_ref === "ORD-1005"; })[0] || (data.journeys || [])[0];
    if (ribbon && one && one.story) {
      var pts = one.story.filter(function (s) { return s.at; }).map(function (s) { return { t: Date.parse(s.at), sys: s.system }; })
        .sort(function (x, y) { return x.t - y.t; });
      var total = pts.length > 1 ? pts[pts.length - 1].t - pts[0].t : 0;
      if (total > 0) {
        for (var k = 0; k < pts.length - 1; k++) {
          var span = pts[k + 1].t - pts[k].t;
          if (span <= 0) continue;
          var seg = document.createElement("span");
          var long = span / 3600000 >= 12;
          seg.className = "seg" + (long ? " gap" : "");
          seg.style.flex = String(span);
          seg.style.setProperty("--c", "var(" + (colors[pts[k].sys] || "--muted") + ")");
          ribbon.appendChild(seg);
        }
      }
    }
    var journey = (data.journeys || [])[0];
    var spanEl = document.getElementById("present-span");
    if (spanEl && journey && journey.story) {
      var times = journey.story.map(function (s) { return s.at ? Date.parse(s.at) : NaN; }).filter(function (t) { return !isNaN(t); });
      if (times.length > 1) spanEl.textContent = hours((Math.max.apply(null, times) - Math.min.apply(null, times)) / 3600000) + " h";
    }
  }).catch(function () {});
}());
