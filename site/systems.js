/* Systems view (S-03): pick a system, show its detail; fill figures from data/report.json.
   Without JavaScript every detail stays visible and the matrix is a plain table. */
(function () {
  var chain = document.getElementById("chain");
  if (!chain) return;
  var btns = Array.prototype.slice.call(chain.querySelectorAll(".sys"));
  var details = Array.prototype.slice.call(document.querySelectorAll(".sysdetail"));
  function select(id, focus) {
    btns.forEach(function (b) {
      var on = b.getAttribute("data-sys") === id;
      b.setAttribute("aria-pressed", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    details.forEach(function (d) { d.hidden = d.getAttribute("data-sys") !== id; });
  }
  btns.forEach(function (b, i) {
    b.addEventListener("click", function () { select(b.getAttribute("data-sys")); });
    b.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? btns.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      n = Math.max(0, Math.min(btns.length - 1, n));
      select(btns[n].getAttribute("data-sys"), true);
    });
  });
  select("oms");
  function marks() {
    details.forEach(function (d) { d.classList.toggle("is-unread", !!d.querySelector("h3 .st-dim, h3.st-dim")); });
  }
  document.addEventListener("flowstatus", marks);
  marks();
  fetch("../data/report.json").then(function (r) { return r.json(); }).then(function (data) {
    (data.findings || []).forEach(function (f) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-fig="' + f.id + '"]'), function (n) { n.textContent = f.affectedOrders; });
    });
  }).catch(function () {});
})();
