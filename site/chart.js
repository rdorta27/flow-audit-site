/* S-25: findings by orders affected, drawn from engine/findings.json at load.
   Without JavaScript, or if the file cannot be read, the table inside #findings-chart stays. */
(function () {
  var host = document.getElementById("findings-chart");
  var textEl = document.getElementById("chart-text");
  if (!host || !textEl || !window.fetch) return;
  var T;
  try { T = JSON.parse(textEl.textContent); } catch (e) { return; }
  var es = document.documentElement.lang !== "en";
  var thousands = es ? "." : ",", decimal = es ? "," : ".";

  function int(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, thousands); }
  function hours(n) { return String(Math.round(n * 10) / 10).replace(".", decimal); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function row(f, max) {
    var id = f.id, name = T.names[id] || f.title;
    var unit = T.units[id] || T.units.default;
    var n = f.affected_orders, h = f.cost.hours_month;
    var li = el("li", "b-row");
    li.appendChild(el("span", "b-name", id + " · " + name));
    var line = el("span", "b-line");
    var bar = el("span", "b-bar");
    bar.setAttribute("aria-hidden", "true");
    bar.style.width = (62 * n / max).toFixed(2) + "%";
    line.appendChild(bar);
    line.appendChild(el("span", "b-n", int(n) + " " + unit));
    li.appendChild(line);
    var est = el("span", "b-h", "≈ " + hours(h) + " h");
    est.appendChild(el("span", "b-est", " · " + T.est));
    li.appendChild(est);
    return li;
  }

  function build(data) {
    var fs = data.findings.filter(function (f) { return typeof f.affected_orders === "number" && f.cost; });
    if (!fs.length) throw new Error("no findings");
    var max = Math.max.apply(null, fs.map(function (f) { return f.affected_orders; }));
    var main = fs.filter(function (f) { return f.in_total !== false; })
      .sort(function (a, b) { return b.affected_orders - a.affected_orders; });
    var apart = fs.filter(function (f) { return f.in_total === false; });
    var box = el("div", "bars");
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", T.label);
    var head = el("div", "b-head");
    head.appendChild(el("span", "", T.ordersHead));
    head.appendChild(el("span", "", T.hoursHead));
    box.appendChild(head);
    var ul = el("ul");
    main.forEach(function (f) { ul.appendChild(row(f, max)); });
    box.appendChild(ul);
    if (apart.length) {
      box.appendChild(el("p", "b-apart", T.apart));
      var ul2 = el("ul");
      apart.forEach(function (f) { ul2.appendChild(row(f, max)); });
      box.appendChild(ul2);
    }
    host.replaceChildren(box);
  }

  fetch(host.getAttribute("data-src"))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(build)
    .catch(function () { /* the static table stays */ });
}());
