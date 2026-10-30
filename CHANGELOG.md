# Changelog

## 0.2.0 — 2026-10-30

Charts stop being pictures. The renderer is now the bundled interactive kit,
and the same kit is available to every artifact.

- **No CDN.** `renderChart` used Chart.js 4.4.1 from cdnjs. That failed offline,
  failed inside a sandbox with the network blocked, and gave the reader nothing
  to touch. It is replaced by `kit/charts.js`, inlined per document by
  `scripts/build-kit.mjs` → `lib/kit.js`. Every artifact is self-contained
  again.
- **Interaction is the default, not a feature.** Hover readouts, click to
  isolate, legend toggles, a bin slider on histograms, drag-to-zoom and
  double-click reset on lines and areas.
- **Four new chart forms:** `hbar`, `stacked`, `hist`, `box`. The original five
  keep working unchanged; the wire shape (`labels` + `series[].values`) is
  untouched, so stored artifacts render exactly as before — only better.
- **The kit is loaded in widget frames too.** `VK`, `V3` and `VC` are globals, so
  a hand-written SVG or 3D scene can use the same scales, drag and frame loop
  instead of re-implementing them.
- **`kit/`, `recipes/`, `gallery.html`, `PROMPT.md`.** The recipe set and the
  live gallery are in the repo, with `scripts/build-kit.mjs` and
  `scripts/serve-gallery.mjs`. `PROMPT.md` rebuilds or extends the material in
  one prompt.
- Tests: 58 pass, including a new case that every accepted chart form reaches
  `VC.render`, and an assertion that no CDN URL survives.

## 0.1.1 — 2026-10-27

Reliability: the same first-turn gap that made dsh-memory intermittent, plus
the store's cold-start race.

- The bundled `artifacts` skill is read with a synchronous `readFileSync` and
  registered inside `apply`, before the first prompt is assembled. An awaited
  read left the first turn of every fresh process without the skill.
- `ArtifactStore.init()` shares one in-flight open, and `get()` awaits it. Two
  cold callers could each write an empty index, and the slower write dropped
  the entry the other had just recorded; a `get()` on a missing root threw
  instead of returning `undefined`.
- Regression tests: the skill is registered with no timer, 8 parallel first
  writes on a cold store keep every entry, and a cold `get()` does not throw.

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
- Exports opened by real parsers: `python-docx` (3 paragraphs), `python-pptx`
  (2 slides), `openpyxl` (sheet `Data`, header and values intact).

### Known limits

- No public hosting, shared viewer data or in-page model calls.
- No live TSX compilation.
- DOCX/PPTX/XLSX carry text and values only.
