/* Status badges (S-00): reads data/status.json and marks each [data-status] as
   "works today" or "arrives in <version>". Without JavaScript the static text stays. */
(function () {
  try {
    var lang = (document.documentElement.lang || "en").slice(0, 2);
    var T = {
      es: { ok: "Funciona hoy", soon: "Llega en", today: "Hoy", plan: "Al final del plan", label: "Versión que muestra la página" },
      en: { ok: "Works today", soon: "Arrives in", today: "Today", plan: "End of plan", label: "Version shown on the page" },
      pt: { ok: "Funciona hoje", soon: "Chega na", today: "Hoje", plan: "No fim do plano", label: "Versão mostrada na página" }
    };
    var t = T[lang] || T.en;
    function num(v) { return String(v).split(".").map(function (n) { return parseInt(n, 10) || 0; }); }
    function le(a, b) {
      var x = num(a), y = num(b);
      for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); }
      return true;
    }
    fetch("../data/status.json").then(function (r) { return r.json(); }).then(function (data) {
      var mode = "today";
      var els = Array.prototype.slice.call(document.querySelectorAll("[data-status]"));
      function render() {
        els.forEach(function (el) {
          var c = data.components && data.components[el.getAttribute("data-status")];
          if (!c) return;
          var works = mode === "plan" || le(c.since, data.current);
          el.classList.add("st-badge");
          el.classList.toggle("real", works);
          el.classList.toggle("plan", !works);
          el.classList.toggle("is-plan", !works);
          el.textContent = works ? t.ok : t.soon + " " + c.since;
        });
      }
      render();
      var host = document.querySelector("[data-status-switch]");
      if (host) {
        host.setAttribute("role", "group");
        host.setAttribute("aria-label", t.label);
        host.classList.add("st-switch");
        var defs = [["today", t.today + " · " + data.current], ["plan", t.plan + " · " + data.plan]];
        host.textContent = "";
        defs.forEach(function (d) {
          var b = document.createElement("button");
          b.type = "button"; b.textContent = d[1]; b.setAttribute("data-mode", d[0]);
          b.setAttribute("aria-pressed", String(d[0] === mode));
          b.addEventListener("click", function () {
            mode = d[0];
            Array.prototype.forEach.call(host.children, function (x) { x.setAttribute("aria-pressed", String(x === b)); });
            render();
          });
          host.appendChild(b);
        });
      }
    }).catch(function () {});
  } catch (e) {}
})();
