#!/usr/bin/env python3
"""Checks that the commands the site prints still exist (card S-29).

Reads every `<code>` and `<pre>` block of every page and requires that each `--flag` and
each `deno task <name>` appears in tools/audit_help.txt, a committed copy of
`deno task audit --help` from the engine. When the engine's help changes, refresh the copy:
  (cd ../core && deno task audit --help | grep -v '^Task ') > tools/audit_help.txt
Dev-only, standard library only, not published.
Usage (from the repository root):
  python3 tools/check_commands.py             check the site
  python3 tools/check_commands.py --selftest  plant a removed flag, then check the clean site
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
HELP = ROOT / "tools" / "audit_help.txt"
# Tasks the help does not name but the engine defines (core/deno.json): client folders and development.
EXTRA_TASKS = {"engagement", "check", "test", "dataset"}


class Code(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        if tag in ("code", "pre"):
            self.depth += 1

    def handle_endtag(self, tag):
        if tag in ("code", "pre") and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if self.depth:
            self.blocks.append(data)


def known(help_text):
    flags = set(re.findall(r"--[a-z][a-z-]*", help_text))
    tasks = set(re.findall(r"deno task ([a-z]+)", help_text)) | EXTRA_TASKS
    return flags, tasks


def problems(help_text, pages):
    flags, tasks = known(help_text)
    out = []
    for path, text in pages:
        parser = Code()
        parser.feed(text)
        for block in parser.blocks:
            for flag in re.findall(r"--[a-z][a-z-]*", block):
                if flag not in flags:
                    out.append(f"{path}: prints {flag}, which the help does not list")
            for task in re.findall(r"deno task ([a-z]+)", block):
                if task not in tasks:
                    out.append(f"{path}: prints `deno task {task}`, which the help does not mention")
    return out


def load_pages():
    return [
        (str(p.relative_to(SITE)), p.read_text(encoding="utf-8"))
        for p in sorted(SITE.rglob("*.html"))
        if "engine" not in p.relative_to(SITE).parts
    ]


def main():
    help_text = HELP.read_text(encoding="utf-8")
    pages = load_pages()
    if "--selftest" in sys.argv:
        planted = pages + [("planted.html", "<p><code>deno task audit --gone-flag</code></p>")]
        if not problems(help_text, planted):
            print("selftest failed: a removed flag was not caught")
            return 1
    found = problems(help_text, pages)
    for line in found:
        print(line)
    if found:
        return 1
    print(f"commands ok: {len(pages)} pages, every printed flag and task is in the help")
    return 0


if __name__ == "__main__":
    sys.exit(main())
