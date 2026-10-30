# The visualization cookbook

Two layers, one vocabulary:

1. **The native renderer** — `VC.render(host, spec)` with twenty forms. Every
   form is interactive, self-contained and accessible; the wire shape is
   `labels` + `series[].values`, with a few documented exceptions.
2. **The recipe library** — 164 proven drawings in `cookbook/`, exposed as
   `kind:"recipe"` artifacts. The exact function that draws the gallery is the
   function that draws the artifact.

Pick the smallest layer that answers the question. A native form is the right
choice for a chart of real numbers. A recipe is the right choice for a form the
native schema does not carry (a treemap, a Sankey, a Q-Q plot, a 3D scene, a
map, a sortable table). A widget is the right choice when neither layer has the
exact picture and the drawing itself is the answer.

| You need | Use | Why |
| --- | --- | --- |
| One of the twenty standard charts of numbers | `kind:"chart"` | Data-shaped, validated, interactive, data table included |
| A known form outside those twenty | `kind:"recipe"`, `content:"<id>"` | Exact code, zero retyping; ids in [RECIPES.md](RECIPES.md) |
| A bespoke combination or an interaction the recipe does not have | `kind:"widget"` | Full HTML/SVG; `Kit`, `C3`, `VK`, `V3` and `VC` are already loaded |
| Three numbers a reader should quote | `kind:"chart"` type `stat` | Native, compact, accessible |
| A deck, page, doc or design canvas | the matching kind | The visual is only one part of the artifact |

## The recipe library

**164 recipes, 15 families.** Call `artifact` with `action:"cookbook"`:

```json
{"action":"cookbook","family":"distribution","limit":8}
{"action":"cookbook","recipe":"qq"}
```

The first returns metadata. The second returns metadata **and the exact code**.
To draw one:

```json
{"action":"create","kind":"recipe","title":"Q-Q plot","content":"qq"}
```

The live gallery is `/plugins/dsh-artifacts/cookbook`; the full index with ids,
use and combinations is [RECIPES.md](RECIPES.md). Families:

| Family | Recipes | What it covers |
| --- | --- | --- |
| Comparison and magnitude | 16 | bar, grouped, stacked, 100%, diverging, lollipop, dumbbell, bullet, radial, waterfall, marimekko, waffle, funnel, pareto, pyramid, slope |
| Distribution | 10 | histogram, density, box, violin, ridgeline, beeswarm, ECDF, Q-Q, rug, 2D bins |
| Time series | 13 | line, area, stacked area, stream, step, sparkline, candlestick, calendar, gantt, timeline, fan, bump, horizon |
| Relationships | 10 | scatter, bubble, SPLOM, correlogram, connected scatter, regression + CI, parallel coordinates, quadrant, heatmap, radar |
| Part-to-whole and hierarchy | 11 | pie, donut, semi-pie, treemap, sunburst, icicle, circle pack, tree, org chart, rose, mind map |
| Flow and networks | 7 | Sankey, alluvial, chord, arc, network, adjacency matrix, flame graph |
| Maps | 8 | choropleth, symbol map, Dorling, tile grid, globe, flow map, dot density, contours |
| Statistics and ML | 17 | residuals, ROC, PR, confusion, learning curve, importance, PDP, boundary, PCA, forest, Kaplan–Meier, control chart, Bland–Altman, volcano, calibration, error bars, z-shading |
| Math and science | 16 | function plot, Lissajous, polar, ternary, vector field, phase portrait, function heatmap, surface, Mandelbrot, life, spectrum, pendulum, Venn, geometry, unit circle, Fourier |
| Software and process diagrams | 10 | flow chart, sequence, class, state machine, swimlane, decision tree, topology, git graph, architecture, kanban |
| Tables, text and KPI parts | 9 | sortable table, heat table, spark table, KPI, gauge, word cloud, plans, month calendar, filter list |
| Interactive explainers | 7 | bubble sort, gradient descent, binary search, compound interest, quiz, flashcards, timer |
| UI mockups and art | 11 | dashboard, form, hero, poster, icons, Truchet, flow field, mandala, isometric, pixel art, sunset |
| 3D and animation | 10 | cube, scatter 3D, particles, Lorenz, starfield, wave surface, double pendulum, shapes, solar system, SMIL |
| Combining | 9 | layers, violin + box + points, small multiples, linked views, dashboard, annotations, tile + bar, table + chart, spark grid |

### Recipes that answer a statistics question directly

The Python snippet that opened this work asks whether
`log(completion_time_min)` is normal. The cookbook has the exact visuals for that
conversation:

| Question | Recipe id | What to look at |
| --- | --- | --- |
| Is the raw distribution right-skewed? | `histogram`, `density` | The long right tail and where the mass sits |
| Did the log transform help? | `combo-layers` | Histogram + KDE + fitted normal on one scale |
| Are the tails normal? | `qq` | Points on the diagonal; a curve means skew, a tilt in the tails means heavy tails |
| How do groups compare at a percentile? | `ecdf` | The vertical gap at a value; no bin-width choice |
| Is the difference stable? | `boxplot`, `violin` | Median, IQR, outliers, shape; the violin shows bimodality |
| Is a model calibrated? | `calibration`, `roc`, `prcurve` | Reliability curve, trade-off, precision/recall |
| Is a coefficient meaningful? | `forest` | Effect size and interval on one scale |

`hist` and `density` are native chart types too; `histogram`, `qq`,
`combo-layers`, `ridgeline` and `beeswarm` are cookbook recipes.

## Choose the native form from the question

| The question | `type` | The shape |
| --- | --- | --- |
| How do categories compare? | `bar`, `hbar` | One number per category; the value axis starts at 0. Use `hbar` when names are long or there are more than ten. |
| How do several series compare inside each category? | `stacked` (or `bar` with several series) | Parts of each total; only the bottom segment compares cleanly across bars. |
| How did each item change between two moments? | `dumbbell`, `slope` | Two values per item; the gap or the direction is the finding. |
| How does a start become an end? | `waterfall` | Running total; gains and losses in sequence. |
| Which few causes explain most of the total? | `pareto` | Bars sorted long to short, cumulative line on the same 0–100% axis. |
| Where does a process lose people? | `funnel` | Stage widths relative to the largest stage; conversion between stages. |
| Is this value on target? | `bullet` | A value bar, a target tick, and qualitative ranges behind it. |
| What is the shape of one variable? | `hist`, `density` | Bins make the shape visible; a KDE removes the bin-width choice. Show both when the bin width changes the story. |
| How do distributions compare? | `box`, `violin`, `ecdf` | `box` for median and spread, `violin` for the full shape, `ecdf` for reading percentiles directly. |
| How do two variables relate? | `scatter` | One point per observation; colour or radius only when the third value matters. |
| What changes over time? | `line`, `area` | One shared y-axis; drag to zoom into a period. |
| What is the part-to-whole? | `donut`, `stacked`, `stat` | Five slices at most for a donut; a stat row when the numbers are the answer. |
| Where are the values concentrated across two categories? | `heat` | A labelled matrix; the eye finds a band faster than a table. |
| What is the headline number? | `stat` | Three or four tiles a reader can quote without reading a chart. |

Forms deliberately absent from the native schema: dual y-axes, 3D bars, pie
charts with many slices, gauges. Each makes a comparison harder, not easier. If
one is genuinely needed, it is a recipe or a widget, and the trade is explicit.

## Design rules

- Flat surfaces. No gradients, shadows, glow or textures inside a chart.
- Sentence case. Two font weights only: 400 and 500.
- Chart ticks at 11px, notes at 12px, body at 14–16px.
- The fixed eight-colour order is the palette. Never cycle past eight; fold the
  rest into “Other” or use small multiples.
- One y-axis. If two measures have different units, make two charts or index
  them to a common base.
- Bars start at zero. A truncated bar axis exaggerates differences.
- Direct labels beat a legend when there are few series. A legend is for
  toggling, not for decoding eight colours.
- Four to six ticks per axis. Round every number that reaches the screen.
- Draw back to front: background bands, grid, marks, annotations, labels.
- Use CSS tokens (`--text`, `--text-2`, `--muted`, `--surface`, `--border`,
  `--accent`, `--grid`, `--axis`, `--card`) so light and dark mode both work.
- Every chart needs an accessible name and, where the data is small enough, a
  data table. `renderChart` adds both; a hand-written widget must do it itself.
- Never invent data, statistics, quotes or names. Missing facts become
  bracketed placeholders such as `[YOUR PRICE]`.
- Generated demo data teaches the form; it is not evidence. Say so when it
  appears in an artifact.
- Colour is meaning, not decoration: two or three ramps per diagram, not six.
  Text on a coloured fill uses the darkest stop of the same ramp.

## Combining forms

The renderer supports four composition patterns without a second library:

1. **Layering.** Put marks on one coordinate system: a histogram plus a KDE
   plus a normal fit; bars plus a target line; a scatter plus a regression
   line. Convert counts to density first so the layers share a y-axis.
   Recipes: `combo-layers`, `combo-violin`, `regci`, `pareto`, `fan`.
2. **Small multiples.** Repeat the same chart per group with scales computed
   once from all groups. This is how twenty regions or twelve months stay
   comparable. Recipes: `combo-multiples`, `combo-sparkgrid`.
3. **Linked views.** Keep one state object and redraw every view from it. A
   brush in one chart filters the other; the charts never talk to each other
   directly. Recipes: `combo-linked`, `combo-tilebar`, `combo-dashboard`.
4. **Annotation.** Draw reference lines, bands and callouts in the chart's own
   scales. An annotation is part of the finding, not decoration.
   Recipes: `combo-annotated`.

A table and a chart can share one sorted array (`combo-tablechart`,
`sparktable`). A chart can sit on a map when both use the same projection
(`symbolmap`, `flowmap`, `dotdensity`).

For a bespoke combination, use a `widget`: call `VC.render` for the chart part
and add the extra layer in SVG or canvas with `Kit`, `VK` or `V3`.

## Seven steps

1. Decide whether a visual helps at all. If a sentence answers it, write the
   sentence.
2. Pick the form from the question, not from habit.
3. Shape the data into rows the renderer can loop over.
4. Choose the scales. Bars start at zero; time runs left to right.
5. Draw the marks, one shape per row.
6. Add axes, labels and a legend only where they earn the space.
7. Check the result at the real width, in both themes, with a keyboard and a
   screen reader in mind.

## Statistics: the log transform argument, with the visuals

The Python snippet tests `stats.shapiro(np.log(df.completion_time_min))`. The
reason to log is structural, not decorative:

- Durations have a floor at zero and no ceiling. Most finish in a typical range;
  a few take much longer. That is a right tail, and a normal fit is the wrong
  shape for it.
- A log compresses big values much more than small ones: 2→5 minutes is +0.92 on
  the log scale, while 50→53 minutes is +0.06. The tail comes in toward the
  bulk.
- Many duration processes are multiplicative (20% slower for one reason, 30% for
  another). Multiplying independent factors gives a log-normal distribution; by
  definition, if X is log-normal then log(X) is normal.
- On the log scale, a difference is a ratio: “group B is about 15% slower” is a
  coefficient, not a raw minute count.

What to check before trusting the test:

- All values must be > 0. Zeros need `log1p`, or a two-part model.
- Shapiro–Wilk is a test, not a plot. With thousands of rows it rejects tiny,
  practically irrelevant deviations; SciPy itself warns about N > 5000. Pair it
  with a Q-Q plot (`qq`), a histogram (`histogram`) and skewness.
- A large p-value is not proof of normality; it is an absence of evidence
  against it. A small p-value does not tell you which transformation to use.
- If log does not work, try square root, Box–Cox/Yeo–Johnson, or drop the
  normality assumption and use a non-parametric test.

## Limits and honesty

- The chart kit is inlined; charts need no network. A widget or recipe may still
  load an allowlisted CDN library (maps use D3 and `world-atlas`); if the
  connection is blocked, the map says so rather than drawing an empty frame.
- Charts accept at most 12 series (8 in practice) and 2,000 points per series.
  Heatmaps are limited to 4,000 cells.
- A chart is a document, not an image: text stays selectable and the data table
  is the fallback when the picture fails.
- Report what was not verified. A rendered SVG is not proof that the reading is
  correct, and generated data is not a measurement.
- The cookbook's own honesty note still applies: its author tested in a
  simulated browser and converted SVG to PNG, not in a real browser. This
  vendored copy was mounted in Chromium (164/164, zero failures) before shipping.
