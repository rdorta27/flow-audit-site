/* Decide el idioma antes del primer pintado. Prioridad:
   1. la elección guardada; 2. el navegador, solo en una página inglesa;
   3. la página donde se aterriza. El selector dice a dónde ir. */
(function () {
  var KEY = "flow-audit-lang";

  function valid(value) {
    return value === "en" || value === "es" || value === "pt-BR";
  }

  function saved() {
    try {
      var value = localStorage.getItem(KEY);
      return valid(value) ? value : "";
    } catch (e) {
      return "";
    }
  }

  function remember(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  function fromBrowser() {
    var list = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];
    for (var i = 0; i < list.length; i++) {
      var lang = String(list[i]).toLowerCase();
      if (lang === "en" || lang.indexOf("en-") === 0) return "en";
      if (lang === "es" || lang.indexOf("es-") === 0) return "es";
      if (lang === "pt" || lang.indexOf("pt-") === 0) return "pt-BR";
    }
    return "en";
  }

  var root = document.documentElement;
  var here = root.lang;
  var entry = root.hasAttribute("data-lang-entry");
  var want = saved() || (entry || here === "en" ? fromBrowser() : here);
  var redirect = entry || want !== here;
  var hide = null;

  if (redirect && document.head) {
    hide = document.createElement("style");
    hide.id = "lang-hide";
    hide.textContent = "html{visibility:hidden}";
    document.head.appendChild(hide);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var links = document.querySelectorAll("a[hreflang]");
    var i;

    for (i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function () {
        var value = this.getAttribute("hreflang");
        if (valid(value)) remember(value);
      });
    }

    var target = null;
    if (redirect) {
      for (i = 0; i < links.length; i++) {
        if (links[i].getAttribute("hreflang") === want) {
          target = links[i];
          break;
        }
      }
    }

    if (target) {
      location.replace(target.href + location.search + location.hash);
      return;
    }
    if (hide) hide.remove();
  });
})();
