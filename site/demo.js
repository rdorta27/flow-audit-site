/* Example page (S-06): cards and the assumptions table from engine/findings.json.
   Orders lead. Hours are a labelled estimate. Without JavaScript, or if the file
   cannot be read, the static markup inside the three hosts stays. */
(function () {
  var findingsHost = document.getElementById("demo-findings");
  var assumeHost = document.getElementById("demo-assumptions");
  var totalsHost = document.getElementById("demo-totals");
  var textEl = document.getElementById("demo-text");
  if (!findingsHost || !assumeHost || !totalsHost || !textEl || !window.fetch) return;
  var T;
  try { T = JSON.parse(textEl.textContent); } catch (e) { return; }
  var es = document.documentElement.lang !== "en";
  var thousands = es ? "." : ",", decimal = es ? "," : ".";

  function int(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, thousands); }
  function hours(n) { return String(Math.round(n * 10) / 10).replace(".", decimal); }
  function pct(n) {
    var v = Math.round(n * 1000) / 10;
    return String(v).replace(".", decimal);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function byId(list) {
    var m = {};
    (list || []).forEach(function (x) { m[x.id || x.key] = x; });
    return m;
  }

  function assumptions(data) {
    var table = el("table", "ftable");
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    T.assumeHead.forEach(function (h) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = document.createElement("tbody");
    (data.assumptions || []).forEach(function (a) {
      var tr = document.createElement("tr");
      var name = (T.assume[a.key] || a.key) + " ";
      var th = document.createElement("th");
      th.scope = "row";
      th.appendChild(document.createTextNode(name));
      th.appendChild(el("code", "", a.key.split(".").pop()));
      var range = a.low === a.high ? T.single : hours(a.low) + T.to + hours(a.high);
      var used = (a.used_by || []).join(", ");
      [null, a.value + " " + (T.unit[a.unit] || a.unit), range, (T.source[a.source] || a.source) + ", " + (a.owner || "") + ", " + (a.date || ""), used].forEach(function (cell, i) {
        if (i === 0) { tr.appendChild(th); return; }
        tr.appendChild(el("td", "", String(cell)));
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    var wrap = el("div", "table-wrap");
    wrap.appendChild(table);
    assumeHost.replaceChildren(wrap);
  }

  function card(f) {
    var art = el("article", "fcard");
    art.id = f.id.toLowerCase();
    art.setAttribute("data-rule", f.id);
    var badge = document.createElement("span");
    badge.setAttribute("data-status", "finding-" + f.id.toLowerCase());
    art.appendChild(badge);
    var h = document.createElement("h3");
    h.appendChild(el("span", "rid", f.id));
    h.appendChild(document.createTextNode(" " + (T.names[f.id] || f.title)));
    art.appendChild(h);
    var dl = el("dl", "fkv");
    var orders = el("div");
    orders.appendChild(el("dt", "", T.orders));
    var dd = document.createElement("dd");
    dd.appendChild(el("strong", "", int(f.affected_orders)));
    dd.appendChild(document.createTextNode(" " + (T.units[f.id] || T.units.default) + " · " + pct(f.share_of_orders) + "% · " + T.measured));
    orders.appendChild(dd);
    var est = el("div");
    est.appendChild(el("dt", "", T.estimate));
    est.appendChild(el("dd", "", hours(f.cost.hours_month) + " h"));
    dl.appendChild(orders);
    dl.appendChild(est);
    art.appendChild(dl);
    if (f.in_total === false) art.appendChild(el("p", "fnote", T.apart));
    art.appendChild(el("p", "fl", T.cause));
    art.appendChild(el("p", "", T.causes[f.id] || f.plain_summary));
    art.appendChild(el("p", "fl", T.proof));
    var level = (T.level[f.evidence_level] || f.evidence_level);
    var conf = (T.conf[f.confidence && f.confidence.level] || "");
    art.appendChild(el("p", "", T.proofLine
      .replace("{n}", int(f.evidence_total != null ? f.evidence_total : f.affected_orders))
      .replace("{level}", level)
      .replace("{conf}", conf)));
    var ul = el("ul", "proof");
    (f.evidence || []).slice(0, 3).forEach(function (ev) {
      var li = document.createElement("li");
      li.appendChild(el("code", "", ev.order_ref || ""));
      if (ev.note) li.appendChild(document.createTextNode(" " + ev.note));
      ul.appendChild(li);
    });
    art.appendChild(ul);
    if (f.cost && f.cost.formula) {
      var pre = el("pre", "fformula");
      pre.appendChild(el("code", "", f.cost.formula));
      art.appendChild(pre);
    }
    art.appendChild(el("p", "fl", T.action));
    art.appendChild(el("p", "", T.actions[f.id] || f.recommendation || ""));
    return art;
  }

  function totals(data) {
    var gross = data.totals && data.totals.gross && data.totals.gross.hours;
    var net = data.totals && data.totals.net && data.totals.net.hours;
    var box = el("div", "callout");
    box.appendChild(el("strong", "", T.totalTitle));
    box.appendChild(document.createElement("br"));
    box.appendChild(document.createTextNode(T.totalBody
      .replace("{gross}", hours(gross))
      .replace("{round}", String(Math.round(gross)))
      .replace("{net}", hours(net))));
    totalsHost.replaceChildren(box);
  }

  function build(data) {
    var fs = (data.findings || []).filter(function (f) { return typeof f.affected_orders === "number" && f.cost; });
    if (!fs.length || !data.assumptions) throw new Error("incomplete");
    fs.sort(function (a, b) { return b.affected_orders - a.affected_orders; });
    assumptions(data);
    var box = el("div", "fcards");
    fs.forEach(function (f) { box.appendChild(card(f)); });
    findingsHost.replaceChildren(box);
    totals(data);
  }

  fetch(findingsHost.getAttribute("data-src"))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(build)
    .catch(function () { /* the static markup stays */ });
}());
