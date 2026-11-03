/* Flujo interactivo de la landing. Los datos son los de un pedido real del dataset sintético
   (ORD-1000, salida de `deno task explain`); los textos vienen de #flow-text en cada idioma.
   Sin dependencias. Si falla, la página sigue siendo legible sin el diagrama. */
(function () {
  var root = document.getElementById("flowdemo");
  var raw = document.getElementById("flow-text");
  if (!root || !raw) return;
  var T = JSON.parse(raw.textContent);
  var SO = [
    { id: "SO-20000", state: "FAILED", at: "2026-09-01T02:32:27Z" },
    { id: "SO-30000", state: "ACTIVE", at: "2026-09-03T19:07:27Z" }
  ];
  var ACT = [
    { id: "ACT-70000", state: "failed", at: "2026-09-01T03:10:00Z", so: 0 },
    { id: "ACT-80000", state: "succeeded", at: "2026-09-03T19:40:00Z", so: 1 }
  ];
  var NS = "http://www.w3.org/2000/svg";
  var step = 1, timer = null;

  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }
  function g(s) { return el("g", { "data-s": s }); }

  // Carriles ---------------------------------------------------------------
  var W = 860, L = 120, lane = { o: 56, s: 150, a: 244 };
  var t0 = Date.parse(SO[0].at), t1 = Date.parse(SO[1].at);
  var x = function (t) { return L + (Date.parse(t) - t0) / (t1 - t0) * (W - L - 230); };
  var svg = el("svg", { viewBox: "0 0 " + W + " 330", role: "img", "aria-label": T.aria });
  [[T.lanes[0], "TMF622", lane.o], [T.lanes[1], "TMF641", lane.s], [T.lanes[2], "TMF640", lane.a]].forEach(function (r) {
    svg.appendChild(el("line", { "class": "lane", x1: 8, x2: W - 8, y1: r[2] - 16, y2: r[2] - 16 }));
    svg.appendChild(el("text", { x: 10, y: r[2] + 14 }, r[0]));
    svg.appendChild(el("text", { x: 10, y: r[2] + 29, "class": "m" }, r[1]));
  });
  var gp = g("1");
  gp.appendChild(el("rect", { "class": "node", x: L, y: lane.o, width: 150, height: 34, rx: 6 }));
  gp.appendChild(el("text", { x: L + 9, y: lane.o + 21 }, "ORD-1000"));
  svg.appendChild(gp);
  SO.forEach(function (s, i) {
    var cx = x(s.at), grp = g("1");
    grp.appendChild(el("path", { "class": "ln", d: "M" + (L + 75) + " " + (lane.o + 34) + " L" + (cx + 55) + " " + lane.s }));
    grp.appendChild(el("rect", { "class": i ? "err" : "node", x: cx, y: lane.s, width: 110, height: 34, rx: 6 }));
    grp.appendChild(el("text", { x: cx + 9, y: lane.s + 15 }, s.id));
    grp.appendChild(el("text", { x: cx + 9, y: lane.s + 29, "class": "m" }, s.state));
    svg.appendChild(grp);
  });
  ACT.forEach(function (a) {
    var ax = x(a.at), grp = g("2");
    var sx = x(SO[a.so].at) + 55;
    grp.appendChild(el("path", { "class": "ln", d: "M" + sx + " " + (lane.s + 34) + " L" + (ax + 40) + " " + lane.a }));
    grp.appendChild(el("rect", { "class": a.so ? "err" : "node", x: ax, y: lane.a, width: 90, height: 34, rx: 6 }));
    grp.appendChild(el("text", { x: ax + 9, y: lane.a + 15 }, a.id));
    grp.appendChild(el("text", { x: ax + 9, y: lane.a + 29, "class": "m" }, a.state));
    svg.appendChild(grp);
  });
  var gh = g("3"), a = x(SO[0].at) + 110, b = x(SO[1].at);
  gh.appendChild(el("path", { "class": "hot", d: "M" + (L + 75) + " " + (lane.o + 34) + " L" + (b + 55) + " " + lane.s }));
  gh.appendChild(el("path", { "class": "hot", d: "M" + a + " " + (lane.s + 17) + " H" + b }));
  gh.appendChild(el("text", { x: (a + b) / 2 - 70, y: lane.s + 78, "class": "m" }, T.wait));
  svg.appendChild(gh);
  root.querySelector(".lanes").appendChild(svg);

  // Pasos ------------------------------------------------------------------
  var stages = root.querySelectorAll(".stage"), cap = root.querySelector(".cap");
  function go(n, user) {
    step = n;
    root.setAttribute("data-on", n);
    stages.forEach(function (s, i) { s.setAttribute("aria-pressed", String(i + 1 === n)); });
    cap.innerHTML = T.caps[n - 1];
    if (user) stop();
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = T.play; }
  var play = root.querySelector("[data-play]");
  function start() {
    play.textContent = T.pause;
    timer = setInterval(function () { go(step % 4 + 1); }, 4500);
  }
  stages.forEach(function (s, i) { s.addEventListener("click", function () { go(i + 1, true); }); });
  play.addEventListener("click", function () { timer ? stop() : start(); });
  go(1);
  play.textContent = T.play;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) start();
})();
