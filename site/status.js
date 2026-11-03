/* Status badges (S-00): reads data/status.json and marks each [data-status] as
   "works today" or "arrives in <version>". Without JavaScript the static text stays. */
(function () {
  try {
    var lang = (document.documentElement.lang || "en").slice(0, 2);
    var T = {
      es: { ok: "Funciona hoy", soon: "Llega en", today: "Hoy", plan: "Al final del plan", label: "Versión que muestra la página", at: "En", dimToday: "Lo atenuado llega en", dimPlan: "Todo funcionando" },
      en: { ok: "Works today", soon: "Arrives in", today: "Today", plan: "End of plan", label: "Version shown on the page", at: "In", dimToday: "Dimmed items arrive in", dimPlan: "Everything working" },
      pt: { ok: "Funciona hoje", soon: "Chega na", today: "Hoje", plan: "No fim do plano", label: "Versão mostrada na página", at: "Na", dimToday: "O que está esmaecido chega na", dimPlan: "Tudo funcionando" }
    };
    var t = T[lang] || T.en;
    var cs = document.currentScript;
    var base = cs && cs.src ? cs.src.replace(/status\.js[^\/]*$/, "") : "../";
    function num(v) { return String(v).split(".").map(function (n) { return parseInt(n, 10) || 0; }); }
    function le(a, b) {
      var x = num(a), y = num(b);
      for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); }
      return true;
    }
    fetch(base + "data/status.json").then(function (r) { return r.json(); }).then(function (data) {
      var mode = "today";
      var api = window.FlowStatus = { mode: mode, data: data, refresh: function () { render(); }, works: function (id) {
        var c = data.components && data.components[id];
        return !c || api.mode === "plan" || le(c.since, data.current);
      } };
      function render() {
        api.mode = mode;
        Array.prototype.slice.call(document.querySelectorAll("[data-status]")).forEach(function (el) {
          var c = data.components && data.components[el.getAttribute("data-status")];
          if (!c) return;
          var works = mode === "plan" || le(c.since, data.current);
          var quiet = /^(system|step|finding)-/.test(el.getAttribute("data-status")) && !(el.closest && el.closest(".fstatus"));
          if (quiet) {
            // Lists stay quiet: no badge per item, the item is dimmed instead (one switch explains it).
            el.textContent = ""; el.hidden = true;
            if (el.parentNode) el.parentNode.classList.toggle("st-dim", !works);
            return;
          }
          el.classList.add("st-badge");
          el.classList.toggle("real", works);
          el.classList.toggle("plan", !works);
          el.classList.toggle("is-plan", !works);
          el.textContent = works ? t.ok : t.soon + " " + c.since;
        });
      }
      function notify() { try { document.dispatchEvent(new CustomEvent("flowstatus", { detail: api })); } catch (e) {} }
      render(); notify();
      var host = document.querySelector("[data-status-switch]");
      if (host) {
        host.setAttribute("role", "group");
        host.setAttribute("aria-label", t.label);
        host.classList.add("st-switch");
        var last = data.current;
        Object.keys(data.components || {}).forEach(function (k) { var v = data.components[k].since; if (!le(v, last)) last = v; });
        var defs = [["today", t.today + " · " + data.current], ["plan", t.at + " " + last]];
        var note = document.createElement("span"); note.className = "st-note";
        function setNote() { note.textContent = mode === "plan" ? t.dimPlan : t.dimToday + " " + last; }
        host.textContent = "";
        defs.forEach(function (d) {
          var b = document.createElement("button");
          b.type = "button"; b.textContent = d[1]; b.setAttribute("data-mode", d[0]);
          b.setAttribute("aria-pressed", String(d[0] === mode));
          b.addEventListener("click", function () {
            mode = d[0];
            Array.prototype.forEach.call(host.children, function (x) { x.setAttribute("aria-pressed", String(x === b)); });
            render(); notify(); setNote();
          });
          host.appendChild(b);
        });
        setNote();
        if (host.parentNode) host.parentNode.appendChild(note);
      }
    }).catch(function () {});
  } catch (e) {}
})();
