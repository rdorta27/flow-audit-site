/* Status badges (S-00): reads data/status.json and marks each [data-status] as
   "works today" or "arrives in <version>". Without JavaScript the static text stays. */
(function () {
  try {
    var lang = (document.documentElement.lang || "en").slice(0, 2);
    var T = {
      es: { ok: "Funciona hoy", soon: "Llega en" },
      en: { ok: "Works today", soon: "Arrives in" },
      pt: { ok: "Funciona hoje", soon: "Chega na" }
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
      var mode = "today"; // the release switch is gone; "plan" stays available through window.FlowStatus
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
    }).catch(function () {});
  } catch (e) {}
})();
