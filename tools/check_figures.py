#!/usr/bin/env python3
"""Fail if a figure in the published pages disagrees with site/data/report.json.

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


def main():
    data = json.loads((ROOT / "data" / "report.json").read_text())
    findings = data["findings"]
    # D-21: the site shows hours, not money. Target design: R01 to R04; R05 is shown apart (D-11).
    hours = sum(f["effort"]["hours_month"] for f in findings if f.get("in_total", True))
    errors = []
    if data.get("schema_version") != "findings/1":
        errors.append("report.json: schema_version must be findings/1")
    cfg = data["config"]
    raw = (ROOT / "data" / "report.json").read_text()
    for pat in MONEY_JSON:
        if re.search(pat, raw, re.I):
            errors.append(f"report.json: money key or wording /{pat}/")
    for f in findings:
        e = f["effort"]
        for inp in e["inputs"]:
            v = cfg
            for part in inp["key"].split("."):
                v = v.get(part) if isinstance(v, dict) else None
            if v != inp["value"]:
                errors.append(f"report.json: {f['id']} input {inp['key']} differs from config")
        if not e["formula"]:
            errors.append(f"report.json: {f['id']} has no formula")
        if abs(sum(t["hours"] for t in e["terms"]) - e["hours_month"]) > 1e-6:
            errors.append(f"report.json: {f['id']} hours differ from the sum of its terms")
        want = EXPECTED_HOURS.get(f["id"])
        if want is not None and abs(e["hours_month"] - want) > 1e-6:
            errors.append(f"report.json: {f['id']} hours {e['hours_month']} expected {want}")
    if abs(hours - EXPECTED_TOTAL) > 0.05:
        errors.append(f"report.json: total hours {hours} expected {EXPECTED_TOTAL}")
    for lang, sep in SEP.items():
        landing = (ROOT / lang / "index.html").read_text()
        demo = (ROOT / lang / "demo" / "index.html").read_text()
        dec = "," if sep == "." else "."
        for f in findings:
            h = hfmt(f["effort"]["hours_month"], dec)
            for page, text in (("index.html", landing), ("demo", demo)):
                if re.search(r"(?<![\d.,])" + re.escape(h) + r" h", text) is None:
                    errors.append(f"{lang}/{page}: {f['id']} hours {h} h missing")
        for page, text in (("index.html", landing), ("demo", demo)):
            if "978" not in text:
                errors.append(f"{lang}/{page}: total 978 h missing")
        if hfmt(hours, dec) not in demo and "978" not in demo:
            errors.append(f"{lang}/demo: total hours missing")
        for page, text in (("index.html", landing), ("demo", demo)):
            flat = text.replace(",", "").replace(".", "")
            for old in STALE:
                if old in flat:
                    errors.append(f"{lang}/{page}: stale figure {old}")
    for lang in SEP:
        for rel in ("demo/index.html", "index.html", "systems/index.html", "status/index.html", "help/index.html"):
            low = (ROOT / lang / rel).read_text().lower()
            for ph in STALE_PHRASES:
                if ph in low:
                    errors.append(f"{lang}/{rel}: stale phrase {ph!r}")
            text = visible((ROOT / lang / rel).read_text())
            if rel != "demo/index.html":
                # landing and the pages around it may show the codes as tags next to the plain name
                text = re.sub(r"\b(OMS|BPM)\b", "", text)
            for pat in OLD_NAMES:
                if re.search(pat, text, re.I if "provisi" in pat else 0):
                    errors.append(f"{lang}/{rel}: old name /{pat}/ in visible text")
    for lang in SEP:
        for d in ("systems", "status", "help"):
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
