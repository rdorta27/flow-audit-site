# AGENTS

The public site of Flow Audit: static HTML, CSS and a little JavaScript, no build step, in
Spanish (`es`), English (`en`) and Portuguese (`pt`). Everything published lives in
`site/`; `.github/workflows/pages.yml` publishes it on every push to `main`.

- Read first: `README.md`, then `../specs/backlog.md` ("Start here" and "Working a card"),
  then `../specs/design/README.md` and open `../specs/design/site-explainer.html`, the
  approved prototype. Site cards are the `S-…` cards of the backlog.
- **Audience:** someone who knows nothing about telecom or Flow Audit. Plain words first,
  codes (`OMS`, `R04`, `TMF622`) second; every page and every interactive component says in
  one line what you can do with it.
- **One name and one colour per system** (table in `../specs/design/README.md`); Flow Audit
  is never drawn inside the order's path.
- **No number by hand.** Figures come from `site/engine/findings.json`,
  never typed. `tools/check_figures.py` and `tools/check_pages.py` exist; run both.
- **Real vs target.** The site shows the whole target design; each component's state
  ("Works today" / "Arrives in …") comes from `site/data/status.json` (S-00), never from
  text in the HTML. Only the coordinator edits `status.json` when an engine card closes.
- **Three languages, same content.** Write the Spanish text first, then English and
  Portuguese with the same meaning and structure; a change in one language is a change in
  all three in the same commit.
- No build step, no framework, no CDN, no external fonts (the fonts in `site/fonts/` carry
  their licenses). Light and dark through the tokens in `site/style.css`; readable at
  375 px with no horizontal page scroll; visible focus; respect `prefers-reduced-motion`;
  content readable without JavaScript.
- Verify: `python3 tools/check_figures.py` and `python3 tools/check_pages.py` from this
  folder; then `cd site && python3 -m http.server 8000`, and look at each language in light
  and dark and at 375 px.
- Do not edit `../specs/` or the engine (`../core/`) from a site card; report the Result and
  let the coordinator close the card.
- Commits: `<type>: <summary>`, a why paragraph and `Changes:`; no tool attribution lines.
  Do not push, tag or publish without explicit approval: a push to `main` publishes the site.
- The engine is MIT and so is this site; never copy third-party code or assets
  (`THIRD-PARTY.md`).
