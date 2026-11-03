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
  var step = 1, timer = null;

  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }
  function g(s) { return el("g", { "data-s": s }); }

  // Historia del pedido -----------------------------------------------------
  function h(tag, cls, html, s) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    if (s) e.setAttribute("data-s", s);
    return e;
  }
  function rec(sys, id, state, text, when, cls, link) {
    var c = h("div", "rec " + (cls || ""), "", "1");
    c.appendChild(h("div", "sys", sys + " <small>" + when + "</small>"));
    c.appendChild(h("div", "id", id + ' <span class="st">' + state + "</span>"));
    c.appendChild(h("p", "", text));
    c.appendChild(h("div", "chip", link, "2"));
    return c;
  }
  var story = h("div", "story");
  story.setAttribute("role", "group");
  story.setAttribute("aria-label", T.aria);
  var order = h("div", "order", "<b>ORD-1000</b> · " + T.order, "1");
  order.style.gridColumn = "1 / -1";
  story.appendChild(order);
  story.appendChild(h("div", "col-h", T.a_h));
  story.appendChild(h("div", "col-h mid", ""));
  story.appendChild(h("div", "col-h", T.b_h));
  var A = h("div", "col"), B = h("div", "col");
  A.appendChild(rec(T.so, "SO-20000", T.failed, T.so_a, T.day + " 1 · 02:32", "", T.link));
  A.appendChild(rec(T.act, "ACT-70000", T.failed, T.act_a, T.day + " 1 · 03:10", "", T.link));
  B.appendChild(rec(T.so, "SO-30000", T.active, T.so_b, T.day + " 3 · 19:07", "dup", T.link));
  B.appendChild(rec(T.act, "ACT-80000", T.ok, T.act_b, T.day + " 3 · 19:40", "dup", T.link));
  var mid = h("div", "gap", "<span>" + T.wait + "</span>", "3");
  story.appendChild(A); story.appendChild(mid); story.appendChild(B);
  var ban = h("div", "banner", T.banner, "3");
  ban.style.gridColumn = "1 / -1";
  story.appendChild(ban);
  var cost = h("div", "costchip", T.costchip, "4");
  cost.style.gridColumn = "1 / -1";
  story.appendChild(cost);
  root.querySelector(".lanes").appendChild(story);

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
