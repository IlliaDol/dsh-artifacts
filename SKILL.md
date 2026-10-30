---
name: artifacts
description: "Build visual artifacts in DeepSeek Harness with the `artifact` tool: inline widgets, charts, native cards, published pages, slide decks, design canvases, documents and downloadable files. Use when a visual, a deck, a mockup, a document or a file explains better than prose."
---

# Artifacts

One tool builds everything visual: `artifact`. It stores the source under the
harness home, renders a self-contained document, and returns an id plus a view
URL. The card renders inline; your prose stays in the reply.

## Choosing a kind

| You need | Kind | Content | Surface |
| --- | --- | --- | --- |
| A diagram, a plotted mechanism, a small interactive explainer | `widget` | HTML fragment or one `<svg>` | inline |
| A line/bar/scatter/area/donut chart of real numbers | `chart` | JSON | inline |
| A recipe, itinerary, quiz, checklist, comparison, stat row, profile, weather strip, translation, draft message | `cards` | JSON | inline |
| A shareable page, app, dashboard, calculator | `page` | full HTML or fragment | page |
| A presentation | `slides` | JSON deck | canvas |
| Website / UI mockups, posters, social posts on one canvas | `design` | JSON artboards | canvas |
| A report, memo, plan, essay, resume | `doc` | Markdown | page |
| A file to download | `file` | raw bytes as text | page |

If the request names a format ("Word", "PowerPoint", "Excel", "PDF"), build the
nearest renderable kind and export it — do not hand-write OOXML.

## Calls

```json
{"action":"create","kind":"chart","title":"Revenue by quarter",
 "content":"{\"type\":\"bar\",\"labels\":[\"Q1\",\"Q2\"],\"series\":[{\"name\":\"Revenue\",\"values\":[12,19]}]}"}
```

The returned `id` (looks like `art_1a2b3c4d5e`) is the handle for every later
action: `update`, `export`, `open`, `delete`. `list` shows recent ids.

Revise by resending the whole source:

```json
{"action":"update","id":"art_1a2b3c4d5e","content":"…new source…"}
```

Export with `{"action":"export","id":"…","format":"docx"}`. The tool returns the
absolute path. PDF is produced by the viewer's print dialog (`export` with
`format:"pdf"` returns a document that opens its print dialog).

## Kind details

### widget

An inline HTML fragment. No `<!doctype>`, `<html>`, `<head>`, `<body>`. No
`position:fixed`. Start HTML with a screen-reader summary:

```html
<h2 class="sr-only">A number line showing 4.75% observed against 5.17% expected.</h2>
```

Available tokens (both themes): `--text`, `--text-2`, `--muted`, `--surface`,
`--surface-2`, `--border`, `--accent`, `--accent-ink`, `--font-serif`,
`--font-sans`, `--font-mono`, `--radius`. Never hardcode colors.

Interaction: score, sort, toggle and compute locally. A widget also gets the
bundled kit as globals — `VK` (scales, axes, tooltip, pointer drag, frame loop),
`V3` (rotation, projection, orbit) and `VC` (the chart renderer). Use them
instead of hand-writing a chart or loading a library; the frame has no network.
Use `dshArtifact.send("action-name", {…})` only when the next step needs the model;
`dshArtifact.prompt("text")` posts a message; `dshArtifact.state.get/set` keeps
per-viewer state.

### chart

```json
{"type":"line","labels":["Jan","Feb"],"series":[{"name":"Signups","values":[120,180]}]}
```

`type` is one of `line`, `area`, `bar`, `hbar`, `stacked`, `scatter`, `donut`,
`hist`, `box`, `density`, `ecdf`, `violin`, `heat`, `stat`, `waterfall`,
`dumbbell`, `slope`, `pareto`, `funnel`, `bullet`.

Most forms take `labels` and `series:[{name, values}]`. The exceptions:

- `dumbbell` and `slope` need exactly two series: before, then after.
- `heat` takes `rows`, `cols` and a `values` matrix (numbers or null).
- `stat` takes `items:[{label, value, delta?}]`.
- `bullet` takes one series and an optional `targets` array, one per label.
- `waterfall`, `pareto` and `funnel` read the first series.
- `density`, `ecdf` and `violin` read raw observations from each series'
  `values`; they do not need labels.
- `hist` and `box` also read raw observations; `scatter` takes
  `points:[{x,y}]` and ignores `labels`.

Rules: one y-axis; ≤8 series (the palette has eight, never cycled); ≤2000
points; `pareto` and `funnel` need non-negative values; a heatmap is limited to
4,000 cells. A data table is rendered under the chart for accessibility.

Every chart is interactive without extra work: hover for values, click to
isolate, legend to toggle, a bin slider on histograms, drag-to-zoom on lines and
areas. Do not describe those controls in prose — write what the shape means.

Pick the form from the question, not from habit:

| The question | Use |
| --- | --- |
| Compare categories | `bar`, `hbar` (long names or many rows) |
| Parts of each total | `stacked`; `donut` for five slices or fewer |
| Two moments per item | `dumbbell` (gap) or `slope` (direction) |
| A start becoming an end | `waterfall` |
| The few causes that dominate | `pareto` |
| Loss through stages | `funnel` |
| One value against a target | `bullet` |
| Shape of one variable | `hist`; `density` removes the bin-width choice |
| Compare distributions | `box` (summary), `violin` (shape), `ecdf` (percentiles) |
| Two variables | `scatter` |
| Change over time | `line`; `area` when magnitude matters |
| Two categorical axes | `heat` |
| The headline number | `stat` |

Draw when the picture carries information the prose cannot, even when the user
did not say "chart". Full chooser and design rules: [docs/COOKBOOK.md](docs/COOKBOOK.md).

### cards

`type` is one of `recipe`, `itinerary`, `quiz`, `steps`, `compare`, `metric`,
`profile`, `weather`, `translation`, `message`.

Quiz shape:

```json
{"type":"quiz","title":"Check yourself","questions":[
  {"question":"Which band is ±1 wobble?","options":["4.06–6.28%","2.95–7.39%"],"answer":0,
   "explanation":"±1 wobble is the dark band."}]}
```

Quizzes score in the card. Comparison takes `options` (2–3) and an `attributes`
array of row names; keys inside each option's `attributes` must match.

### page

A whole document, or a fragment that the page shell wraps. This is the surface
to reach for when the user should be able to reopen or share it. Remote assets
are limited to the CDN allowlist.

### slides

```json
{"title":"Q3 review","subtitle":"Numbers, plainly","slides":[
  {"layout":"cover","title":"Q3 review","subtitle":"Numbers, plainly"},
  {"layout":"section","kicker":"Part one","title":"Where we are"},
  {"layout":"bullets","title":"Three facts","bullets":["Revenue up 12%","Churn flat","Two hires"]},
  {"layout":"quote","quote":"The plan survived contact.","attribution":"Ops lead"},
  {"layout":"metrics","title":"By the numbers","metrics":[{"label":"Revenue","value":"€1.2M"}]},
  {"layout":"two-col","title":"Now / next","left":["Ship v2"],"right":["Measure"]}
]}
```

16:9. Arrow keys page, `PDF` prints one slide per page. One idea per slide; six
bullets is already too many. ≤40 slides.

### design

```json
{"title":"Checkout screens","boards":[
  {"name":"Cart","w":390,"h":844,"html":"<div style=\"padding:24px\">…</div>"},
  {"name":"Desktop","w":1280,"h":800,"html":"…"}
]}
```

Phone 390×844, page 1280–1440 wide. Each artboard is sandboxed. Missing facts
become `[YOUR PRICE]`-style placeholders; no lorem ipsum, no invented stats.

### doc

Markdown. Headings, lists, tables, quotes, code and links render. Exports to
Markdown, Word and PDF.

### file

`format` is one of `csv`, `json`, `md`, `html`, `txt`, `docx`, `pptx`, `xlsx`.
`content` is the file body. For `docx`/`pptx`/`xlsx`, write Markdown or JSON
that the writer understands:

- `docx`: Markdown in `content`
- `pptx`: deck JSON in `content`
- `xlsx`: `{"rows":[["label","value"],["a",1]]}` in `content`

## Placing an artifact in a reply

The card already appears under the tool call. To place one exactly where the
prose needs it, emit:

````
```dsh-artifact
{"id":"art_1a2b3c4d5e"}
```
````

Nothing else in that fence is read.

## Design rules

- Text belongs in the reply; the artifact carries the visual. No headings or
  paragraphs of explanation inside it.
- Sentence case. Two weights (400/500). Headings 22/18/16px (decks scale up).
  Body 16px. No emoji, no gradients, no glow.
- One idea per artifact. Three to eight artifacts per answer is a lot.
- Never invent data, quotes, names or statistics. Use bracketed placeholders.
- Contrast 4.5:1; never color alone to distinguish series.
- No credentials, tokens or private file contents in an artifact.

## Limits

- 2,000,000 characters per artifact.
- Slides ≤40, artboards ≤24, cards ≤40 rows, chart series ≤12 (8 in practice).
- Remote assets: `cdnjs.cloudflare.com`, `esm.sh`, `cdn.jsdelivr.net`,
  `unpkg.com`, `fonts.googleapis.com`, `fonts.gstatic.com`. Everything else is
  blocked by CSP.
- Artifacts live under `$DSH_HOME/artifacts`; `artifact` `list` shows what is there.

## Worked examples

**A number line like the one in the screenshot** — `widget`, one SVG, tokens for
color, ±1 and ±2 bands as rects, a dot at the observed value, labels in
`<text class="…">` sized 12–14px.

**A stats dashboard** — `page` when it should be reopenable, `chart` + `cards`
(metric) when it belongs in the reply.

**A three-slide update** — `slides` with a cover, a section and one bullets
slide; export `pptx` for the meeting.

**A poster** — `design`, one artboard 1080×1350, export PDF from the viewer.
