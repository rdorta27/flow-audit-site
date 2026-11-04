#!/usr/bin/env python3
"""Fail if a figure in the published pages disagrees with site/engine/findings.json.

Dev-only, standard library only; not published (it lives outside site/).
Usage: python3 tools/check_figures.py   (from the repository root)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site"
SEP = {"es": ".", "en": ",", "pt": "."}
# Figures that used to be wrong and must not come back.
STALE = ["11250", "41700", "14104", "57319", "1268", "18750", "57482", "54358"]


# Sales or readiness wording that must not come back (D-17, D-18, D-19).
STALE_PHRASES = ["precio fijo", "fixed price", "fixed-price", "preço fixo", "¿se vende?", "is it for sale",
                 "está à venda", "licenciar", "license the tool", "tarifas del propio cliente",
                 "client's own rates", "client&#x27;s own rates", "tarifas do próprio cliente",
                 "precio", "preço", "prices them", "to price", "pricing"]


# Old names that must not return in visible text (lane titles, table cells,
# alt text). Codes such as OMS/BPM stay allowed only as small tags on the landing.
OLD_NAMES = [r"\bOMS\b", r"\bBPM\b", r"provisioning", r"\bprovisi[oó]n\b"]


def visible(html):
    html = re.sub(r"<(script|style|code)\b.*?</\1>", "", html, flags=re.S | re.I)
    metas = re.findall(r'<meta[^>]+(?:alt|description|title)[^>]*content="([^"]*)"', html)
    return re.sub(r"<[^>]+>", " ", html) + " " + " ".join(metas)

# D-21: hours, not money. No money figure or money wording in any page (engine/ excluded).
EXPECTED_HOURS = {"R04": 30, "R01": 283.3, "R02": 347.3, "R03": 317, "R05": 225}
EXPECTED_TOTAL = 977.6
MONEY_JSON = [r"usd", r"arpu", r"revenue", r"currency", r"amount", r"loaded_hour"]
MONEY_VISIBLE = [r"USD", r"US\$", r"\$", r"ARPU", r"\bcost(?:s|o|os|e|es)?\b", r"\bcustos?\b", r"\bdólar", r"\bdollar",
                 r"\bdinero\b", r"\bmoney\b", r"\bdinheiro\b", r"\brevenue\b", r"\bingresos? en riesgo",
                 r"\breceita em risco", r"hora cargada", r"hora carregada", r"loaded hour"]


# D-23: orders lead, hours are a secondary estimate. No headline or description may say hours are lost or wasted.
LOST_HOURS = {
    "es": r"horas?\s+(?:se\s+)?(?:perdid|pierd|desperdici)|(?:perdid|desperdici)\w*\s+(?:de\s+)?horas?|cuántas horas",
    "en": r"hours?\s+(?:were\s+|are\s+|is\s+)?(?:lost|wasted?|wastes)|(?:lost|wasted)\s+hours?|how many hours",
    "pt": r"horas?\s+(?:se\s+)?(?:perdid|perdem|desperdi[cç])|(?:perdid|desperdi[cç])\w*\s+(?:de\s+)?horas?|quantas horas",
}


def check_headlines(lang, rel, html, errors):
    """h1 and every meta description (description, og, twitter) must not talk about hours lost or wasted."""
    heads = [re.sub(r"<[^>]+>", " ", h) for h in re.findall(r"<h1\b.*?</h1>", html, flags=re.S)]
    heads += re.findall(r'<meta[^>]+(?:name|property)="(?:description|og:description|twitter:description)"[^>]*content="([^"]*)"', html)
    for t in heads:
        if re.search(LOST_HOURS[lang], t, re.I):
            errors.append(f"{lang}/{rel}: hours lost/wasted in headline or description: {t[:80]!r}")


def hfmt(n, dec):
    s = f"{n:.1f}".rstrip("0").rstrip(".")
    return s.replace(".", dec)


def check_money(rel, html, errors):
    """Visible text, meta descriptions and the journey JSON must carry no money wording."""
    journey = " ".join(re.findall(r'id="journey-text">(.*?)</script>', html, flags=re.S))
    text = visible(html) + " " + journey
    for pat in MONEY_VISIBLE:
        m = re.search(pat, text, re.I if pat not in (r"USD", r"US\$", r"ARPU") else 0)
        if m:
            errors.append(f"{rel}: money wording /{pat}/ near {text[max(0, m.start()-30):m.end()+30]!r}")


def fmt(n, sep):
    return f"{round(n):,}".replace(",", sep)


def config_value(cfg, key):
    v = cfg
    for part in key.split("."):
        v = v.get(part) if isinstance(v, dict) else None
    if isinstance(v, dict) and "base" in v:
        return v["base"]
    return v


def main():
    src = ROOT / "engine" / "findings.json"
    data = json.loads(src.read_text())
    findings = data["findings"]
    # D-21: the site shows hours, not money. R01 to R04 are in the total; R05 is apart (D-11).
    hours = sum(f["cost"]["hours_month"] for f in findings if f.get("in_total", True))
    net = data["totals"]["net"]["hours"]
    errors = []
    if not str(data.get("schema_version", "")).startswith("findings/"):
        errors.append("findings.json: schema_version must be findings/…")
    if (ROOT / "data" / "report.json").exists():
        errors.append("data/report.json is still the handmade mock; the example page must read engine/findings.json")
    cfg = data["config"]
    assumed = {a["key"]: a["value"] for a in data.get("assumptions") or []}
    if not assumed:
        errors.append("findings.json: assumptions[] is empty")
    raw = src.read_text()
    for pat in MONEY_JSON:
        if re.search(pat, raw, re.I):
            errors.append(f"findings.json: money key or wording /{pat}/")
    for f in findings:
        e = f["cost"]
        for inp in e.get("inputs") or []:
            if config_value(cfg, inp["key"]) != inp["value"]:
                errors.append(f"findings.json: {f['id']} input {inp['key']} differs from config")
            if inp["key"] in assumed and assumed[inp["key"]] != inp["value"]:
                errors.append(f"findings.json: {f['id']} input {inp['key']} differs from assumptions")
        if not e.get("formula"):
            errors.append(f"findings.json: {f['id']} has no formula")
        if abs(sum(t["hours"] for t in e["terms"]) - e["hours_month"]) > 1e-6:
            errors.append(f"findings.json: {f['id']} hours differ from the sum of its terms")
        want = EXPECTED_HOURS.get(f["id"])
        if want is not None and abs(e["hours_month"] - want) > 1e-6:
            errors.append(f"findings.json: {f['id']} hours {e['hours_month']} expected {want}")
    if abs(hours - EXPECTED_TOTAL) > 0.05:
        errors.append(f"findings.json: gross hours {hours} expected {EXPECTED_TOTAL}")
    if abs(data["totals"]["gross"]["hours"] - hours) > 0.05:
        errors.append("findings.json: totals.gross disagrees with the sum of in-total findings")
    for lang, sep in SEP.items():
        landing = (ROOT / lang / "index.html").read_text()
        demo = (ROOT / lang / "demo" / "index.html").read_text()
        dec = "," if sep == "." else "."
        for f in findings:
            h = hfmt(f["cost"]["hours_month"], dec)
            for page, text in (("index.html", landing), ("demo", demo)):
                if re.search(r"(?<![\d.,])" + re.escape(h) + r" h", text) is None:
                    errors.append(f"{lang}/{page}: {f['id']} hours {h} h missing")
        label = {"es": "supuestos de ejemplo", "en": "example assumptions", "pt": "suposições de exemplo"}[lang]
        for page, text in (("index.html", landing), ("demo", demo)):
            if label not in text:
                errors.append(f"{lang}/{page}: hours without the label {label!r}")
            if "978" not in text:
                errors.append(f"{lang}/{page}: total 978 h missing")
        if "engine/findings.json" not in demo:
            errors.append(f"{lang}/demo: does not read engine/findings.json")
        if hfmt(net, dec) + " h" not in demo:
            errors.append(f"{lang}/demo: net hours missing")
        for key in assumed:
            if key.split(".")[-1] not in demo:
                errors.append(f"{lang}/demo: assumption {key} missing")
        for page, text in (("index.html", landing), ("demo", demo)):
            flat = text.replace(",", "").replace(".", "")
            for old in STALE:
                if old in flat:
                    errors.append(f"{lang}/{page}: stale figure {old}")
    for lang in SEP:
        for rel in ("demo/index.html", "index.html", "systems/index.html", "how/index.html", "status/index.html", "help/index.html"):
            low = (ROOT / lang / rel).read_text().lower()
            for ph in STALE_PHRASES:
                if ph in low:
                    errors.append(f"{lang}/{rel}: stale phrase {ph!r}")
            check_headlines(lang, rel, (ROOT / lang / rel).read_text(), errors)
            text = visible((ROOT / lang / rel).read_text())
            if rel != "demo/index.html":
                # landing and the pages around it may show the codes as tags next to the plain name
                text = re.sub(r"\b(OMS|BPM)\b", "", text)
            for pat in OLD_NAMES:
                if re.search(pat, text, re.I if "provisi" in pat else 0):
                    errors.append(f"{lang}/{rel}: old name /{pat}/ in visible text")
    for lang in SEP:
        for extra in ("architecture/index.html",):
            check_headlines(lang, extra, (ROOT / lang / extra).read_text(), errors)
    for lang in SEP:
        for d in ("systems", "how", "status", "help"):
            page = ROOT / lang / d / "index.html"
            if not page.exists():
                errors.append(f"{lang}/{d}/index.html missing")
                continue
            flat = page.read_text().replace(",", "").replace(".", "")
            for old in STALE:
                if old in flat:
                    errors.append(f"{lang}/{d}: stale figure {old}")
    for page in sorted(ROOT.rglob("*.html")):
        rel = page.relative_to(ROOT)
        if rel.parts[0] != "engine":
            check_money(str(rel), page.read_text(), errors)
    status = json.loads((ROOT / "data" / "status.json").read_text())
    comps = status["components"]
    used = set()
    for page in ROOT.rglob("*.html"):
        used.update(re.findall(r'data-status="([^"]+)"', page.read_text()))
    for i in sorted(used - set(comps)):
        errors.append(f"data-status id not in status.json: {i}")
    for i in sorted(set(comps) - used - set(status.get("unused_ok", []))):
        errors.append(f"status.json component never used (add to unused_ok?): {i}")
    if errors:
        print("\n".join(errors))
        return 1
    print(f"figures ok: {len(findings)} findings, {round(hours, 1)} h")
    return 0


sys.exit(main())
