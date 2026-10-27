# Changelog

## 0.1.0 — 2026-10-27

First release.

- One `artifact` tool over eight kinds: `widget`, `chart`, `cards`, `page`,
  `slides`, `design`, `doc`, `file`.
- One store under `$DSH_HOME/artifacts`, with an atomic index and rebuild from
  metadata.
- Viewer, source, export and gallery routes with a per-document CSP.
- Inline rendering through a keyed toolview, plus a `dsh-artifact` fence for
  placement in a reply; card actions relay into the owning session.
- Exports: html, md, json, csv, docx, pptx, xlsx; PDF through the print dialog.
- Dependency-free ZIP + OOXML writers; no build step.
- 55 unit tests covering schema, markdown, renderers, OOXML, store, client
  bundle and tool registration.
- Verified end to end in a throwaway dsh profile: plugin row composed, host
  log clean, routes 200, client bundle served in the shell's module combo,
  gallery and artifact documents render in Chromium.

### Known limits

- No public hosting, shared viewer data or in-page model calls.
- No live TSX compilation.
- DOCX/PPTX/XLSX carry text and values only.
