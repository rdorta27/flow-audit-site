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


# Old names that must not return in visible text (lane titles, table cells,
# alt text). Codes such as OMS/BPM stay allowed only as small tags on the landing.
OLD_NAMES = [r"\bOMS\b", r"\bBPM\b", r"provisioning", r"\bprovisi[oó]n\b"]


def visible(html):
    html = re.sub(r"<(script|style|code)\b.*?</\1>", "", html, flags=re.S | re.I)
    metas = re.findall(r'<meta[^>]+(?:alt|description|title)[^>]*content="([^"]*)"', html)
    return re.sub(r"<[^>]+>", " ", html) + " " + " ".join(metas)


def fmt(n, sep):
    return f"{round(n):,}".replace(",", sep)


def main():
    data = json.loads((ROOT / "data" / "report.json").read_text())
    findings = data["findings"]
    # Target design: R01 to R04; R05 is shown apart (D-11).
    total = sum(f["cost"]["amount_month"] for f in findings if f.get("in_total", True))  # D-11
    hours = sum(f["cost"]["hours_month"] for f in findings if f.get("in_total", True))
    risk = sum(f["cost"]["revenue_at_risk"]["amount"] for f in findings)
    errors = []
    if data.get("schema_version") != "findings/1":
        errors.append("report.json: schema_version must be findings/1")
    cfg = data["config"]
    for f in findings:
        cost = f["cost"]
        if abs(sum(t["amount"] for t in cost["terms"]) - cost["amount_month"]) > 1e-6:
            errors.append(f"report.json: {f['id']} amount differs from the sum of its terms")
        for inp in cost["inputs"]:
            v = cfg
            for part in inp["key"].split("."):
                v = v.get(part) if isinstance(v, dict) else None
            if v != inp["value"]:
                errors.append(f"report.json: {f['id']} input {inp['key']} differs from config")
        if not cost["formula"]:
            errors.append(f"report.json: {f['id']} has no formula")
    for lang, sep in SEP.items():
        landing = (ROOT / lang / "index.html").read_text()
        demo = (ROOT / lang / "demo" / "index.html").read_text()
        for f in findings:
            usd = fmt(f["cost"]["amount_month"], sep)
            if usd not in landing:
                errors.append(f"{lang}/index.html: {f['id']} cost {usd} missing")
            if usd not in demo:
                errors.append(f"{lang}/demo: {f['id']} cost {usd} missing")
        for page, text in (("index.html", landing), ("demo", demo)):
            if fmt(total, sep) not in text:
                errors.append(f"{lang}/{page}: total {fmt(total, sep)} missing")
            if fmt(risk, sep) not in text:
                errors.append(f"{lang}/{page}: revenue at risk {fmt(risk, sep)} missing")
        if fmt(hours, sep) not in demo:
            errors.append(f"{lang}/demo: total hours {fmt(hours, sep)} missing")
        for page, text in (("index.html", landing), ("demo", demo)):
            flat = text.replace(",", "").replace(".", "")
            for old in STALE:
                if old in flat:
                    errors.append(f"{lang}/{page}: stale figure {old}")
    for lang in SEP:
        for rel in ("demo/index.html", "index.html"):
            text = visible((ROOT / lang / rel).read_text())
            if rel == "index.html":
                # landing may show the codes as tags next to the plain name
                text = re.sub(r"\b(OMS|BPM)\b", "", text)
            for pat in OLD_NAMES:
                if re.search(pat, text, re.I if "provisi" in pat else 0):
                    errors.append(f"{lang}/{rel}: old name /{pat}/ in visible text")
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
    print(f"figures ok: {len(findings)} findings, USD {fmt(total, ',')}, {round(hours, 1)} h")
    return 0


sys.exit(main())
