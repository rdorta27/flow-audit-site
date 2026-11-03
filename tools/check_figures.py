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
STALE = ["11250", "41700", "14104", "57319", "1268"]


def fmt(n, sep):
    return f"{round(n):,}".replace(",", sep)


def main():
    data = json.loads((ROOT / "data" / "report.json").read_text())
    findings = data["findings"]
    total = sum(f["impact"]["usdMonth"] for f in findings)
    hours = sum(f["impact"]["hoursMonth"] for f in findings)
    risk = sum(f["impact"]["revenueAtRiskUsd"] for f in findings)
    errors = []
    for lang, sep in SEP.items():
        landing = (ROOT / lang / "index.html").read_text()
        demo = (ROOT / lang / "demo" / "index.html").read_text()
        for f in findings:
            usd = fmt(f["impact"]["usdMonth"], sep)
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
