#!/usr/bin/env python3
"""Automatic page checks for the site (card S-19).

Serves site/site on a free local port and drives headless Chromium over every
page (landing, demo, architecture, systems, how, status, help in es/en/pt) at 1280
and 500 px wide, light and dark. It fails on:
  overflow   scrollWidth > clientWidth
  smalltext  rendered text under 12 px (SVG text: font size times the SVG scale)
  svgtext    SVG text wider than its box (or than the SVG itself)
  i18n       ids, heading levels or data-status values that differ between es/en/pt
  links      links, anchors or assets that do not resolve
  journey    the landing journey at steps 1, 8 and 12 (clicks #j-next)

Dev-only, standard library only, not published (it lives outside site/).
Usage (from the repository root):
  python3 tools/check_pages.py               check the site
  python3 tools/check_pages.py --selftest    plant each failure, then check the clean site
Set CHROMIUM to pick a browser binary. With no browser the check fails.
"""
import concurrent.futures as cf
import functools
import html
import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE = Path(__file__).resolve().parent.parent / "site"
LANGS = ["es", "en", "pt"]
PAGE_KINDS = ["", "demo", "architecture", "systems", "how", "status", "help"]
WIDTHS = [1280, 500]
THEMES = ["light", "dark"]
JOURNEY_STEPS = [1, 8, 12]
MIN_PX = 12

# Runs inside the page. Measures the current state and returns findings.
MEASURE_JS = r"""
function measure(label) {
  var out = [];
  var de = document.documentElement;
  if (de.scrollWidth > de.clientWidth)
    out.push({kind: "overflow", where: label, msg: "scrollWidth " + de.scrollWidth + " > clientWidth " + de.clientWidth});
  var skip = {SCRIPT:1, STYLE:1, TITLE:1, NOSCRIPT:1, TEMPLATE:1, DEFS:1, TEXTAREA:1};
  var seen = {};
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var n;
  while ((n = w.nextNode())) {
    var txt = n.nodeValue.replace(/\s+/g, " ").trim();
    if (!txt) continue;
    var el = n.parentElement;
    if (!el || skip[el.tagName.toUpperCase()]) continue;
    if (el.closest("script,style,title,noscript,template,defs")) continue;
    if (!el.checkVisibility({checkVisibilityCSS: true})) continue;
    var r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    var fs = parseFloat(getComputedStyle(el).fontSize), eff = fs, svg = !!el.ownerSVGElement;
    if (svg) {
      var m = el.getScreenCTM();
      if (m) eff = fs * Math.hypot(m.a, m.b);
    }
    if (eff < MIN_PX - 0.01) {
      var key = txt.slice(0, 30) + "|" + eff.toFixed(1);
      if (!seen[key]) { seen[key] = 1; out.push({kind: "smalltext", where: label, msg: eff.toFixed(1) + "px: " + JSON.stringify(txt.slice(0, 40))}); }
    }
  }
  var texts = document.querySelectorAll("svg text");
  for (var i = 0; i < texts.length; i++) {
    var t = texts[i];
    if (!t.checkVisibility({checkVisibilityCSS: true})) continue;
    var b;
    try { b = t.getBBox(); } catch (e) { continue; }
    if (!b.width) continue;
    var tl = t.textContent.trim().slice(0, 40);
    var box = null, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    var sibs = t.parentNode.children;
    for (var j = 0; j < sibs.length; j++) {
      if (sibs[j].tagName.toLowerCase() !== "rect") continue;
      var q = sibs[j].getBBox();
      if (q.width < 20 || q.height < 10) continue;
      if (cy >= q.y && cy <= q.y + q.height && cx >= q.x && cx <= q.x + q.width) { box = q; break; }
    }
    var ok = true, why = "";
    if (box && (b.x < box.x - 0.5 || b.x + b.width > box.x + box.width + 0.5)) { ok = false; why = "text " + b.width.toFixed(0) + " wide, box " + box.width.toFixed(0); }
    var root = t.ownerSVGElement, vb = root && root.viewBox && root.viewBox.baseVal;
    if (ok && vb && vb.width && (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5)) { ok = false; why = "text leaves the SVG (" + b.width.toFixed(0) + " wide)"; }
    if (!ok) out.push({kind: "svgtext", where: label, msg: why + ": " + JSON.stringify(tl)});
  }
  return out;
}
function bodySig() { var s = document.body.innerText, h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function run() {
  var res = {findings: [], innerWidth: innerWidth, path: location.pathname, ids: [], hrefs: [], bg: getComputedStyle(document.body).backgroundColor};
  res.findings = measure("page");
  var next = document.getElementById("j-next");
  if (next) {
    var sigs = [bodySig()];
    for (var step = 1; step <= 12; step++) {
      if (step > 1) {
        if (next.disabled) { res.findings.push({kind: "journey", where: "journey step " + step, msg: "#j-next is disabled before the last step"}); break; }
        next.click();
        var sg = bodySig();
        if (sg === sigs[sigs.length - 1]) res.findings.push({kind: "journey", where: "journey step " + step, msg: "clicking #j-next changed nothing"});
        sigs.push(sg);
      }
      if (JOURNEY_STEPS.indexOf(step) >= 0) {
        res.findings = res.findings.concat(measure("journey step " + step));
        if (step === 12 && !next.disabled) res.findings.push({kind: "journey", where: "journey step 12", msg: "#j-next still enabled on the last step"});
      }
    }
    if (document.querySelectorAll("#j-next").length !== 1) res.findings.push({kind: "journey", where: "journey", msg: "#j-next count is not 1"});
  }
  document.querySelectorAll("[id]").forEach(function (e) { res.ids.push(e.id); });
  document.querySelectorAll("a[href]").forEach(function (e) { res.hrefs.push(e.getAttribute("href")); });
  var pre = document.createElement("pre");
  pre.id = "__fa_result";
  pre.textContent = JSON.stringify(res);
  document.body.appendChild(pre);
}
window.addEventListener("load", function () {
  document.documentElement.setAttribute("data-theme", THEME);
  setTimeout(function () { try { run(); } catch (e) {
    var pre = document.createElement("pre"); pre.id = "__fa_result";
    pre.textContent = JSON.stringify({error: String(e && e.stack || e)}); document.body.appendChild(pre); } }, 600);
});
"""


class Static(HTMLParser):
    """Collects ids, heading levels, data-status values and links of one page."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.headings, self.status, self.hrefs, self.assets = [], [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.append(a["id"])
        if a.get("name") and tag == "a":
            self.ids.append(a["name"])
        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append(tag)
        if a.get("data-status"):
            self.status.append(a["data-status"])
        if tag == "a" and a.get("href") is not None:
            self.hrefs.append(a["href"])
        if tag in ("script", "img", "source") and a.get("src"):
            self.assets.append(a["src"])
        if tag == "link" and a.get("href"):
            self.assets.append(a["href"])

    def handle_data(self, data):
        pass


def parse(path):
    p = Static()
    text = path.read_text(encoding="utf-8")
    p.feed(text)
    # Step ids inside the journey JSON also count as data-status values.
    for m in re.finditer(r'<script type="application/json" id="journey-text">(.*?)</script>', text, re.S):
        try:
            p.status += [s["status"] for s in json.loads(m.group(1))["steps"] if "status" in s]
        except (ValueError, KeyError):
            p.status.append("<unparseable journey-text>")
    return p


def page_files(root):
    out = {}
    for lang in LANGS:
        for kind in PAGE_KINDS:
            rel = f"{lang}/{kind}/index.html" if kind else f"{lang}/index.html"
            out[rel] = root / rel
    return out


def check_i18n(root):
    errs = []
    info = {rel: parse(p) for rel, p in page_files(root).items() if p.exists()}
    for rel, p in page_files(root).items():
        if not p.exists():
            errs.append(("i18n", rel, "page is missing"))
    for kind in PAGE_KINDS:
        rels = [f"{l}/{kind}/index.html" if kind else f"{l}/index.html" for l in LANGS]
        if not all(r in info for r in rels):
            continue
        for what, get in (("ids", lambda s: sorted(s.ids)), ("heading levels", lambda s: s.headings),
                          ("data-status values", lambda s: s.status)):
            base = get(info[rels[0]])
            for r in rels[1:]:
                other = get(info[r])
                if other != base:
                    if what == "heading levels":
                        detail = f"{len(base)} vs {len(other)} headings" if len(base) != len(other) else "different order of levels"
                    else:
                        a, b = set(base), set(other)
                        detail = f"only in {rels[0]}: {sorted(a - b)[:4]}; only in {r}: {sorted(b - a)[:4]}"
                        if a == b:
                            detail = "same values, different count or order"
                    errs.append(("i18n", f"{rels[0]} vs {r}", f"{what} differ ({detail})"))
    return errs


def resolve_target(root, from_rel, href):
    """Return (file Path or None, fragment) for an internal href, or None to skip."""
    if re.match(r"^(?:[a-z][a-z0-9+.-]*:|//)", href, re.I):
        return None
    u = urlsplit(href)
    if not u.path:
        return root / from_rel, u.fragment
    base = "/" + from_rel
    if u.path.startswith("/"):
        full = u.path
    else:
        full = os.path.normpath(os.path.join(os.path.dirname(base), unquote(u.path)))
        if u.path.endswith("/"):
            full += "/"
    full = full.lstrip("/")
    f = root / full
    if full == "" or full.endswith("/") or f.is_dir():
        f = f / "index.html"
    return f, u.fragment


def check_links(root, rendered):
    """rendered: {rel: {"ids": set, "hrefs": set}} from the browser runs."""
    errs, idcache = [], {}

    def ids_of(f, rel):
        if f not in idcache:
            idcache[f] = set(parse(f).ids) if f.suffix == ".html" and f.exists() else set()
        extra = rendered.get(rel, {}).get("ids", set())
        return idcache[f] | extra

    files = [(rel, p) for rel, p in page_files(root).items() if p.exists()]
    top = root / "index.html"
    if top.exists():
        files.append(("index.html", top))
    for rel, p in files:
        s = parse(p)
        hrefs = set(s.hrefs) | rendered.get(rel, {}).get("hrefs", set())
        for h in sorted(hrefs):
            r = resolve_target(root, rel, h)
            if r is None:
                continue
            f, frag = r
            if not f.exists():
                errs.append(("links", rel, f"link {h!r} -> missing file"))
            elif frag and f.suffix == ".html":
                target_rel = str(f.relative_to(root))
                if unquote(frag) not in ids_of(f, target_rel):
                    errs.append(("links", rel, f"link {h!r} -> anchor #{frag} not found"))
        for a in s.assets:
            r = resolve_target(root, rel, a)
            if r and not r[0].exists():
                errs.append(("links", rel, f"asset {a!r} is missing"))
    return errs


def find_browser():
    cands = [os.environ.get("CHROMIUM", ""), "chromium", "chromium-browser", "google-chrome",
             "google-chrome-stable", "chrome"]
    for c in cands:
        if c and shutil.which(c):
            return shutil.which(c)
    return None


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root):
    handler = functools.partial(Quiet, directory=str(root))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)  # port 0: a free port
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def browse(browser, root, port, rel, width, theme, tag):
    """One Chromium run on a temporary injected copy of the page."""
    src = root / rel
    tmp = src.with_name(f"__check_{tag}.html")
    text = src.read_text(encoding="utf-8")
    inj = "<script>var MIN_PX=%d,THEME=%s,JOURNEY_STEPS=%s;%s</script>" % (MIN_PX, json.dumps(theme), json.dumps(JOURNEY_STEPS), MEASURE_JS)
    i = text.lower().rfind("</body>")
    text = text[:i] + inj + text[i:] if i >= 0 else text + inj
    prof = tempfile.mkdtemp(prefix="chk-prof-")
    try:
        tmp.write_text(text, encoding="utf-8")
        url = f"http://127.0.0.1:{port}/{str(tmp.relative_to(root))}"
        cmd = [browser, "--headless", "--disable-gpu", "--dump-dom", f"--window-size={width},900",
               "--virtual-time-budget=6000", f"--user-data-dir={prof}", "--hide-scrollbars=false",
               "--no-first-run", "--disable-extensions", "--disable-background-networking"]
        if os.environ.get("CI") or (hasattr(os, "geteuid") and os.geteuid() == 0):
            cmd.append("--no-sandbox")
        cmd.append(url)
        try:
            pr = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
        except subprocess.TimeoutExpired:
            return {"error": "browser timed out"}
        m = re.search(r'<pre id="__fa_result"[^>]*>(.*?)</pre>', pr.stdout, re.S)
        if not m:
            return {"error": "no result from the page (browser exit %d) %s" % (pr.returncode, pr.stderr[-200:])}
        return json.loads(html.unescape(m.group(1)))
    finally:
        tmp.unlink(missing_ok=True)
        shutil.rmtree(prof, ignore_errors=True)


def check_browser(browser, root, pages, widths, themes):
    srv = serve(root)
    port = srv.server_address[1]
    jobs = [(rel, w, t) for rel in pages for w in widths for t in themes]
    errs, rendered = [], {}
    try:
        with cf.ThreadPoolExecutor(max_workers=min(6, os.cpu_count() or 2)) as ex:
            futs = {ex.submit(browse, browser, root, port, rel, w, t, i): (rel, w, t) for i, (rel, w, t) in enumerate(jobs)}
            for fu in cf.as_completed(futs):
                rel, w, t = futs[fu]
                ctx = f"{rel} {w}px {t}"
                res = fu.result()
                if "error" in res:
                    errs.append(("browser", ctx, res["error"]))
                    continue
                if res["innerWidth"] != w:
                    errs.append(("browser", ctx, f"window is {res['innerWidth']} px wide, not {w}"))
                if not res["path"].endswith(f"__check_{jobs.index((rel, w, t))}.html"):
                    errs.append(("browser", ctx, f"page navigated away to {res['path']}"))
                d = rendered.setdefault(rel, {"ids": set(), "hrefs": set()})
                d["ids"] |= set(res["ids"])
                d["hrefs"] |= set(res["hrefs"])
                for f in res["findings"]:
                    errs.append((f["kind"], f"{ctx} [{f['where']}]", f["msg"]))
    finally:
        srv.shutdown()
        srv.server_close()
    return errs, rendered


def run_checks(root, browser, pages, widths, themes):
    errs = check_i18n(root)
    berrs, rendered = check_browser(browser, root, pages, widths, themes)
    return errs + berrs + check_links(root, rendered)


def report(errs):
    """Print each distinct problem once, with the render contexts it appeared in."""
    groups = {}
    for kind, where, msg in sorted(set(errs)):
        m = re.match(r"^(\S+) (\d+px) (\w+)(?: \[(.*)\])?$", where)
        if m:
            key = (kind, m.group(1) + (" [" + m.group(4) + "]" if m.group(4) else ""), msg)
            groups.setdefault(key, []).append(f"{m.group(2)} {m.group(3)}")
        else:
            groups.setdefault((kind, where, msg), [])
    for (kind, where, msg), ctx in groups.items():
        print(f"FAIL {kind:9} {where}: {msg}" + (f"  ({', '.join(ctx)})" if ctx else ""))


def selftest(browser):
    def sub(path, old, new, count=1):
        t = path.read_text(encoding="utf-8")
        assert old in t, f"selftest: {old!r} not in {path}"
        path.write_text(t.replace(old, new, count), encoding="utf-8")

    def append_body(path, frag):
        sub(path, "</body>", frag + "</body>")

    plants = {
        "overflow": ("es/status/index.html", lambda r, p: append_body(p, '<div style="width:3000px;height:2px"></div>')),
        "smalltext": ("en/help/index.html", lambda r, p: append_body(p, '<p style="font-size:8px">tiny words</p>')),
        "smalltext (svg scale)": ("es/architecture/index.html", lambda r, p: sub(p, 'class="p" x="29"', 'class="p" style="font-size:5px" x="29"')),
        "svgtext": ("pt/architecture/index.html", lambda r, p: sub(p, "1 · Ingestão" if "1 · Ingestão" in p.read_text(encoding="utf-8") else "1 · Ingesta",
                                                                   "1 · Um texto muito mais comprido do que a caixa inteira")),
        "i18n ids": ("pt/demo/index.html", lambda r, p: sub(p, ' id="', ' id="x-', 1)),
        "i18n headings": ("en/systems/index.html", lambda r, p: sub(p, "<h2", "<h3", 1)),
        "i18n data-status": ("pt/index.html", lambda r, p: sub(p, 'data-status="finding-r04"', 'data-status="finding-r44"')),
        "links (file)": ("es/help/index.html", lambda r, p: append_body(p, '<a href="nope/index.html">x</a>')),
        "links (anchor)": ("en/demo/index.html", lambda r, p: append_body(p, '<a href="../help/index.html#no-such-anchor">x</a>')),
        "journey": ("en/index.html", lambda r, p: sub(r / "journey.js", "count.textContent =",
                    'if (step === 7) panel.insertAdjacentHTML("beforeend", "<p style=\'font-size:8px\'>tiny journey words</p>"); count.textContent =')),
    }
    expect = {"smalltext (svg scale)": "smalltext", "links (file)": "links", "links (anchor)": "links"}
    ok = True
    for name, (rel, fn) in plants.items():
        kind = expect.get(name, name.split(" ")[0])
        d = Path(tempfile.mkdtemp(prefix="chk-self-"))
        try:
            shutil.copytree(SITE, d / "site")
            root = d / "site"
            fn(root, root / rel)
            errs = run_checks(root, browser, [rel], WIDTHS, ["light"])
            hit = [e for e in errs if e[0] == kind]
            if name == "journey":
                hit = [e for e in errs if "journey step 8" in e[1]]
            print(f"selftest {name:24} {'fails as planted' if hit else 'DID NOT FAIL'}" + (f"  ({hit[0][2][:70]})" if hit else ""))
            ok &= bool(hit)
        finally:
            shutil.rmtree(d, ignore_errors=True)
    print("selftest: clean site ...")
    errs = run_checks(SITE, browser, list(page_files(SITE)), WIDTHS, THEMES)
    report(errs)
    print("selftest clean site:", "passes" if not errs else "FAILS")
    return ok and not errs


def main():
    browser = find_browser()
    if not browser:
        print("FAIL: no Chromium or Chrome found (tried CHROMIUM, chromium, chromium-browser, google-chrome). "
              "The page checks cannot run.")
        return 2
    t0 = time.time()
    if "--selftest" in sys.argv:
        ok = selftest(browser)
        print(f"selftest {'OK' if ok else 'FAILED'} in {time.time() - t0:.0f}s")
        return 0 if ok else 1
    pages = list(page_files(SITE))
    errs = run_checks(SITE, browser, pages, WIDTHS, THEMES)
    report(errs)
    n = len(pages) * len(WIDTHS) * len(THEMES)
    print(f"{'FAIL' if errs else 'ok'}: {len(set(errs))} problem(s), {n} page renders, {time.time() - t0:.0f}s ({browser})")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
