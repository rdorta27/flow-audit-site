/* Old landing anchors moved to pages of their own (S-17). A link such as
   es/#glosario or es/#g-hueco still lands on its content. Runs before first paint. */
(function () {
  var h = location.hash.slice(1);
  if (!h) return;
  var page = null;
  if (h === "que" || h === "requisitos") page = "systems";
  else if (h === "estado") page = "status";
  else if (h === "faq" || h === "glosario" || h.indexOf("g-") === 0) page = "help";
  if (!page) return;
  var dir = location.pathname.replace(/[^\/]*$/, "");
  location.replace(dir + page + "/index.html" + location.search + "#" + h);
})();
