# The chart cookbook

The renderer is one function, `VC.render(host, spec)`, with twenty forms. A
recipe is data plus options; the drawing code is never copied per chart. This
page is the chooser: pick the form from the question, then write the finding in
the reply and let the chart carry the shape.

## Choose the form from the question

| The question | `type` | The shape |
| --- | --- | --- |
| How do categories compare? | `bar`, `hbar` | One number per category; the value axis starts at 0. Use `hbar` when names are long or there are more than ten. |
| How do several series compare inside each category? | `stacked` (or `bar` with several series) | Parts of each total; only the bottom segment compares cleanly across bars. |
| How did each item change between two moments? | `dumbbell`, `slope` | Two values per item; the gap or the direction is the finding. `dumbbell` reads as a gap, `slope` as a trend between exactly two moments. |
| How does a start become an end? | `waterfall` | Running total; gains and losses in sequence. |
| Which few causes explain most of the total? | `pareto` | Bars sorted long to short, cumulative line on the same 0–100% axis. |
| Where does a process lose people? | `funnel` | Stage widths relative to the largest stage; conversion between stages. |
| Is this value on target? | `bullet` | A value bar, a target tick, and qualitative ranges behind it. |
| What is the shape of one variable? | `hist`, `density` | Bins make the shape visible; a KDE removes the bin-width choice. Show both when the bin width changes the story. |
| How do distributions compare? | `box`, `violin`, `ecdf` | `box` for median and spread, `violin` for the full shape, `ecdf` for reading percentiles directly. |
| Is the data normal? | `ecdf` + a Q-Q plot in a `widget` | The ECDF shows the distribution; a Q-Q plot shows where the tails leave the line. |
| How do two variables relate? | `scatter` | One point per observation; colour or radius only when the third value matters. |
| What changes over time? | `line`, `area` | One shared y-axis; drag to zoom into a period. |
| What is the part-to-whole? | `donut`, `stacked`, `stat` | Five slices at most for a donut; a stat row when the numbers are the answer. |
| Where are the values concentrated across two categories? | `heat` | A labelled matrix; the eye finds a band faster than a table. |
| What is the headline number? | `stat` | Three or four tiles a reader can quote without reading a chart. |

Forms that are deliberately absent: dual y-axes, 3D bars, pie charts with many
slices, and gauges. Each makes a comparison harder, not easier.

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
  `--accent`) so light and dark mode both work.
- Every chart needs an accessible name and, where the data is small enough, a
  data table. `renderChart` adds both; a hand-written widget must do it itself.
- Never invent data, statistics, quotes or names. Missing facts become
  bracketed placeholders such as `[YOUR PRICE]`.
- Generated demo data teaches the form; it is not evidence. Say so when it
  appears in an artifact.

## Combining forms

The renderer supports four composition patterns without a second library:

1. **Layering.** Put marks on one coordinate system: a histogram plus a KDE
   plus a normal fit; bars plus a target line; a scatter plus a regression
   line. Convert counts to density first so the layers share a y-axis.
2. **Small multiples.** Repeat the same chart per group with scales computed
   once from all groups. This is how twenty regions or twelve months stay
   comparable.
3. **Linked views.** Keep one state object and redraw every view from it. A
   brush in one chart filters the other; the charts never talk to each other
   directly.
4. **Annotation.** Draw reference lines, bands and callouts in the chart's own
   scales. An annotation is part of the finding, not decoration.

For a bespoke combination, use a `widget` and call `VC.render` for the chart
part, then add the extra layer in SVG or canvas with `VK`/`V3`.

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

## Limits and honesty

- The frame has no network. The kit is inlined; CDN libraries are not available
  inside an artifact, and the CSP allowlist is for assets, not a dependency
  strategy.
- Charts accept at most 12 series (8 in practice) and 2,000 points per series.
  Heatmaps are limited to 4,000 cells.
- A chart is a document, not an image: text stays selectable and the data table
  is the fallback when the picture fails.
- Report what was not verified. A rendered SVG is not proof that the reading is
  correct, and generated data is not a measurement.
