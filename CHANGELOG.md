# Changelog

## 0.5.0 — 2026-10-31

The look is now a system, not a per-artifact decision. Two artifacts from two
different models should look like the same product.

- **`lib/design.js`: the house style.** `DESIGN_CSS` adds the explainer
  vocabulary every artifact inherits — `.step`, `.caption`, `.kicker`,
  `.figure`, `.panels`/`.panel`, `.controls`, `.note`, `.rule` — so a widget
  composes from the design instead of restating it.
- **`auditDesign` runs on every widget.** Nine rules with stable ids and a
  sentence that names the fix: a canvas painted with `var(…)` and
  `position:fixed` are errors; a hand-written canvas chart, hardcoded
  white/black, gradients, emoji, widths over 980px and a missing `sr-only`
  summary are warnings. The model reads them in the tool result and fixes the
  source before the artifact is stored.
- **The prompt and the skill teach taste, not just API.** Dark first, one
  accent, hierarchy before decoration, the renderer draws and the model
  composes. The full contract is `docs/HOUSE-STYLE.md`.
- **A visual gate.** `npm run design:check` renders every example and the whole
  165-recipe gallery in headless Chrome, in dark and light, and fails on
  horizontal overflow or clipped text. It reported clean for both themes.
- **The sampling recipe is discoverable.** It is named "Sampling distributions
  (SRS, stratified, cluster)" and its `when` mentions Monte Carlo and variance,
  so `action:"cookbook"` finds it for "sampling distribution", "monte carlo" and
  "variance".
- Tests: 77 pass, including a clean house-style widget, one fixture per rule,
  the error/warning split, and a check that every vocabulary class reaches the
  document.

## 0.4.4 — 2026-10-31

The chart was drawn on a `<canvas>` and painted with `ctx.fillStyle =
'var(--text)'`. Canvas cannot resolve CSS variables, so every assignment was
silently ignored and the panels stayed black — text and bars invisible.

- **The tool rejects that pattern now.** A widget that assigns `var(…)` to
  `fillStyle`/`strokeStyle` fails validation with the fix ("resolve with
  `VK.theme(host)`, or use `chart`/`recipe`), so a black-on-black chart cannot
  ship again.
- **Hand-written canvas charts warn**, even with concrete colours: no hover, no
  theme tokens, no accessible table — `chart` and `recipe` draw it properly.
- **Hardcoded white backgrounds warn** — the widget in question set
  `background:#ffffff` inside a dark app.
- **The host theme reaches the frame.** `currentTheme()` now also reads
  `data-color-scheme`, a `dark`/`light` class, `localStorage.dsh-theme` and
  `prefers-color-scheme`, so an artifact opens in the app's theme instead of the
  browser default.
- **Prompt and skill**: never draw a chart by hand; `chart` for the user's
  numbers, `recipe` for prepared drawings; a sampling distribution is
  `recipe:"sampling"`; canvas colours come from `VK.theme(host)`.
- Tests: 70 pass. The user's actual failing widget is rejected by `validate()`
  with the canvas error plus both warnings.

## 0.4.3 — 2026-10-31

The tool works; the chart looked wrong. Three renderer fixes.

- **One series, one colour.** A single-series `bar`/`hbar` painted every bar
  from the categorical palette — seven bars, seven colours — which says "seven
  unrelated things" when the data is one measure across categories. Bars now
  share the first palette colour; `donut` keeps one colour per slice, and a spec
  can still ask for per-category colours with `colorBy:"category"`.
- **No dead space under an artifact.** The frame reported
  `max(body.scrollHeight, root.scrollHeight)`; `root.scrollHeight` is at least
  the iframe's own height, so a 370px chart claimed 800px and the card opened
  with a large empty area. It reports the body's height now.
- **A card that fits its chart.** Artifact cards are capped at 980px (1200 for
  `wide`) and centred instead of stretching across a 1400px conversation column;
  charts use an 880px measure, bar bands are 34% padding instead of 24%, and the
  per-chart control hints ("Hover a bar for its value…") are gone — a histogram
  keeps `n = …`, because the sample size is data.
- Tests: 67 pass, including a spec-level check that a single-series bar carries
  no per-bar colour while a donut still does.

## 0.4.2 — 2026-10-31

0.4.1 put `artifact` in the tool list, and the model called it — then dsh
answered "value is not lossless JSON". This release fixes the result side.

- **Results carried `undefined` members.** `create` always returned an
  `exportPath` key that was undefined for every non-file kind, and `update`
  returned `viewUrl: undefined` for a file. dsh snapshots every tool value with
  `snapshotJsonValue`, which rejects `undefined`, so a successful create was
  reported to the model as an invalid output. Every return path is compacted now.
- **`presentationMeta` returned `undefined`** for `list` and `cookbook` results,
  which the same snapshot rejects ("output.presentationMeta returned non-lossless
  JSON"). It returns `{}` when there is no card; the client already ignores meta
  without a `viewUrl`.
- **Enum fields are forgiving.** `kind:"Chart"`, `" chart "`, `surface:"Inline"`
  and `action:" CREATE "` are normalised instead of rejected, so a model that
  capitalises a kind does not burn turns on casing.
- Tests: 66 pass, including a lossless-JSON check across every action and its
  `presentationMeta`, and a case-insensitivity check. Verified through the real
  dsh `0.2.1-rc.5` registry: create chart, create recipe, list, open, export,
  update, cookbook exact, cookbook family and delete all return `isError=false`.

## 0.4.1 — 2026-10-31

The artifact tool reaches the model again, and the artifact Claude draws for
"explain this better" is now one call away.

- **The tool was never registered.** `output.schema` put `required: true` on two
  properties. dsh validates that schema with `assertSupportedJsonSchema`, where
  `required` is an array of property names on the object — so `register()` threw,
  cordis swallowed the throw, and every session offered its tools without
  `artifact`. The model answered "draw me something" with ASCII art and "I can't
  render images". The schema is valid JSON Schema now, and a rejected
  registration logs `[dsh-artifacts] artifact tool registration failed: …`
  instead of vanishing.
- **A regression test pins the schema.** `test/plugin.test.mjs` checks the tool's
  `output.schema` with the same rules dsh applies, so a boolean `required` fails
  the suite instead of disappearing at runtime.
- **`sampling`: an interactive explainer recipe.** The interactive family now has
  eight recipes and the library 165. It draws one survey per design — simple
  random, stratified, cluster — as dot grids, then 1,000 surveys per design as
  histograms with spread and bias, plus `Run again`. Call it with
  `kind:"recipe"`, `content:"sampling"`.
- **The prompt and the skill say what "explain better" means.** An explainer may
  carry a one-line step title and short panel captions; the argument stays in the
  reply. A visual request is never answered with ASCII art, and a failed tool
  call must be reported and retried, not silently downgraded to prose.
- Verified against the dsh `0.2.1-rc.5` desktop registry: `artifact` appears in
  the visible tool list, a `recipe` create renders 77 KB of self-contained HTML,
  and the cookbook gallery mounts 165/165 recipes in Chromium with zero failures.
  `npm run check`: 64 tests pass and the package shape check is clean.

## 0.4.0 — 2026-10-30

The 164-recipe cookbook becomes part of the plugin, not just its documentation.

- **A ninth kind: `recipe`.** `content` is a cookbook id such as `"qq"` or
  `{"id":"qq"}`; the renderer loads that recipe's own pack and calls its exact
  `fn(host, Kit)`. The pack is wrapped in its own scope so top-level helpers
  stay in the function's closure. No recipe code is retyped or paraphrased.
- **The whole library is vendored** under `cookbook/`: 164 recipes in 15
  families, the kit, 3D helpers, 18 guide chapters, 7 Python file-output scripts
  and the standalone visual examples. `scripts/build-cookbook.mjs` generates
  `manifest.json`, a self-contained `gallery.html`, and `docs/RECIPES.md`.
- **The gallery is in the app**: `/plugins/dsh-artifacts/cookbook` with search,
  family filters, code and copy. The plugin gallery links to it.
- **The model can search the library**: `artifact` now has
  `action:"cookbook"` with `recipe`, `family` and `limit`. An exact id returns
  metadata **and** the exact code; a family or query returns metadata only.
- **The cookbook kit is loaded in every widget frame** as `Kit` and `C3`, so a
  copied recipe runs verbatim. `lib/kit.js` now embeds it; chart documents stay
  lean and do not load it.
- **Docs and prompt follow the new surface**: `docs/COOKBOOK.md` gains the
  family map, recipe-vs-chart guidance, a statistics section on the log
  transform and Shapiro–Wilk, and the full combination patterns.
  `docs/ARTIFACT-TYPES.md`, `docs/PARITY.md`, `README.md` and `SKILL.md` list
  nine kinds and the cookbook routes; `NOTICE` records provenance.
- **Verified in a real browser**: all 164 recipes mounted in Chromium with zero
  failures, 149 SVGs, 6 canvases, 9 HTML-only cards, no `NaN`/`undefined`/
  `Infinity` attributes and no console errors. The `recipe` path was checked
  separately for `qq`, `sankey`, `globe`, `lorenz` and `combo-layers`.
- Tests: 63 pass (schema, render, markdown, OOXML, store, client and plugin),
  plus the package-shape check and the 164-recipe manifest check.

## 0.3.0 — 2026-10-30

The cookbook lands in the renderer. Every form below is drawn by the same
interactive kit, so it works offline and inside the artifact sandbox.

- **Nine new chart forms:** `waterfall`, `dumbbell`, `slope`, `pareto`,
  `funnel`, `bullet`, `density`, `ecdf` and `violin`. Each answers a question
  the earlier eleven could not: a running total, two moments per item, the few
  causes that dominate, loss through stages, a value against a target, and
  distributions read by shape rather than by box.
- **`heat` and `stat` are now reachable.** The kit already drew them and the
  gallery already showed them, but the schema rejected both because every
  chart was assumed to be `labels` plus `series`. They have their own shapes
  and their own validation now.
- **Validation follows the form.** `dumbbell` and `slope` require exactly two
  equal-length series; `pareto` and `funnel` reject negative values; `bullet`
  checks `targets`; `waterfall` checks `totals`; heatmaps check the matrix;
  stat rows check each item. Errors name the field and the expected length.
- **Accessible data tables** for the new shapes: a matrix table for `heat`, a
  metric table for `stat`, and sample counts for the distribution forms.
- **The chooser is documented** in `docs/COOKBOOK.md`, and the same rules are
  in `SKILL.md` so the model picks the form from the question rather than from
  habit. `README.md`, `ARTIFACT-TYPES.md` and `PROMPT.md` list all twenty forms.
- **The gallery has 23 recipes**, including demos for every new form, and the
  inlined `lib/kit.js` is rebuilt from `kit/*.js`.
- Tests: 60 pass (schema, render, markdown, OOXML, store, client and plugin),
  plus the package-shape check. The gallery was mounted in Chromium and all 23
  recipes drew without a console error or a `NaN` attribute.

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
