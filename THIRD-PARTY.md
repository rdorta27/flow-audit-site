# Third-party components

The code of this site is MIT (see `LICENSE`). The fonts and the systems the tool reads
keep their own licenses. This file separates them.

## Distributed with this repository

| Component | Files | License | Notes |
|---|---|---|---|
| P052 | `site/fonts/p052/*.woff2` | GNU AGPL-3.0 with the font-embedding exception | Converted from OTF to WOFF2 without changing the design. `LICENSE` and `COPYING` sit in the same folder; the origin is in `SOURCE.md`. |
| Source Sans 3 | `site/fonts/source-sans-3/*.woff2` | SIL Open Font License 1.1 | Latin subset, weights 400 to 700. `OFL.txt` sits in the same folder. |

The format conversion of P052 is the only change made to the font. The original files and
the license texts stay available at the address in `SOURCE.md`, so anyone who receives the
font can find its source.

## Used only for testing, not distributed

| System | License | How we use it |
|---|---|---|
| bss-oss-rust | Apache-2.0 plus additional terms on `crates/tmf-apis/`; MIT declared per crate elsewhere | Local Docker, `GET` on the TMF APIs. See `../specs/flow-audit_BACKLOG.md`, M0-05 |
| Openslice | Apache-2.0 | Fallback candidate, not yet evaluated |

No code from these systems is copied, vendored or linked, and no capture taken from them
is committed. They are not distributed with this site.

## Content

The MIT license covers this repository as distributed. The name and the logo are
trademarks and are not part of the grant (see `TRADEMARKS.md`). A report generated for a
client belongs to that engagement, not to this repository.

## Trademarks

See `TRADEMARKS.md`.
