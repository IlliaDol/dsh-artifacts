# Every artifact type, and how to build it in dsh

This is the full catalogue: the Claude artifact taxonomy mapped onto the eight
kinds this plugin implements. Each entry says whether it is **dynamic** or
**static**, where it lives (**inline / published / downloadable**), and the
exact call that produces it.

Two axes matter, and they are independent:

- **Dynamic or static** — does it react to a click, a slider, a keystroke?
- **Where it lives** — in the reply (`inline`), behind its own link
  (`published`), or as a file you download (`downloadable`).

An inline widget can be dynamic. A published page can be static. A file is
never either: it leaves the conversation.

---

## 1. Inline artifacts (live in the reply, no link required)

Rendered by the toolview under the tool call, or placed by a `dsh-artifact`
fence. They can be downloaded (HTML), but they are not shareable links.

### 1.1 Static inline

| Type | What it is | How to build it |
| --- | --- | --- |
| SVG diagram | Flowchart, structural drawing, illustrative mechanism, number line, annotated plot | `widget`, content is a single `<svg viewBox="0 0 680 H" role="img">…</svg>` with `<title>`/`<desc>` |
| Inline chart (drawn) | A chart whose marks are part of the drawing, not a library | `widget`, hand-drawn SVG; use the nine `c-*`-style ramps from the tokens instead |
| Table | A comparison too wide for prose | `widget` with `<table>`, or a `doc` if it is the whole answer |
| Key/value summary | Label/value pairs, a receipt, a spec sheet | `cards` → `profile`, or `widget` |
| Timeline | Ordered events along a line | `widget` (SVG) or `cards` → `itinerary` |
| Steps | A short procedure, 2–8 steps | `cards` → `steps` |
| Comparison cards | 2–3 options, identical attribute rows | `cards` → `compare` |
| Callout | One conclusion, one risk | `widget` with a bordered block, or plain prose |
| Annotated image | A screenshot or figure with callouts | `widget` with `<img src="data:…">` and absolutely positioned labels |
| Mermaid diagram | ERD, sequence, gantt | `widget` with a Mermaid CDN script and `<pre class="mermaid">` |

### 1.2 Dynamic inline

| Type | What it is | How to build it |
| --- | --- | --- |
| Explainer with controls | Sliders/buttons that change a drawing | `widget` + `dshArtifact.send` only when the model must decide; otherwise pure local JS |
| Calculator | Inputs → computed result | `widget`; validate input before showing a result |
| Mini app | Multi-step local state, tabs, filters | `widget`; state in `dshArtifact.state` |
| Quiz | Multiple choice with explanations and score | `cards` → `quiz` (scores locally, no round trip) |
| Flashcards | Reveal-on-click cards | `cards` → `quiz` with one option and an explanation, or a `widget` |
| Simulator | Small physics/logic model | `widget` with `requestAnimationFrame`; respect `prefers-reduced-motion` |
| Chart with controls | Toggle series, switch period | `chart` — legend, click and sliders are built in; `widget` when the interaction is bespoke |
| Form | Fields that collect a brief, then submit | `widget` + `dshArtifact.prompt(...)` on submit |
| Drag/sort | Reorder a list, rank options | `widget`; persist with `dshArtifact.state` |
| Game | Small deterministic game | `widget`; keep the rules in JS, not in the model |
| Timer / tracker | Countdown, habit tracker, log | `widget`; `localStorage` via the state API |

### 1.3 Native charts and native cards (structured tool calls)

These are not free-form markup: the harness draws them, so they stay consistent
and accessible.

| Type | Kind | Shape |
| --- | --- | --- |
| Line chart | `chart` | `{"type":"line","labels":[…],"series":[{"name":…,"values":[…]}]}` |
| Horizontal bars | `chart` | `type:"hbar"`, sorted long→short when rank is the finding |
| Histogram | `chart` | `{"type":"hist","series":[{"name":"durations","values":[…]}]}` — raw observations; `labels` may be empty |
| Box plot | `chart` | `{"type":"box","series":[{"name":"Group A","values":[…]}, …]}` — one series per group |
| Bar / column | `chart` | `type:"bar"` |
| Stacked/grouped bars | `chart` | several series in one bar chart |
| Scatter | `chart` | `{"type":"scatter","series":[{"name":…,"points":[{"x":1,"y":2}]}]}` |
| Area | `chart` | `type:"area"` |
| Donut | `chart` | `type:"donut"`, first series |
| Metric row | `cards` | `{"type":"metric","metrics":[{"label":"Revenue","value":"€1.2M","delta":"+12%"}]}` |
| Recipe | `cards` | `{"type":"recipe","name":…,"servings":4,"time":"30 min","ingredients":[{"item":"Flour","amount":"200 g"}],"steps":[…]}` |
| Itinerary | `cards` | `{"type":"itinerary","title":…,"days":[{"label":"Day 1","stops":[{"time":"09:00","title":"…"}]}]}` |
| Weather | `cards` | `{"type":"weather","location":…,"temp":18,"condition":"…","forecast":[…]}` |
| Translation | `cards` | `{"type":"translation","from":"EN","to":"DE","source":…,"target":…}` |
| Drafted message | `cards` | `{"type":"message","to":…,"subject":…,"body":…}` |
| Profile / record | `cards` | `{"type":"profile","name":…,"role":…,"meta":[{"label":"Email","value":…}]}` |

Charts and cards export to SVG-free HTML, CSV/JSON, and (for chart data) XLSX.

---

## 2. Published artifacts (a document with its own URL)

`surface:"page"` (or `kind:"page"`). The viewer URL is private to the harness —
there is no public hosting service — but it is stable, reopenable and
downloadable.

| Type | Dynamic? | How to build it |
| --- | --- | --- |
| Website / landing page | static | `page` with a full HTML document; inline CSS; no external assets outside the allowlist |
| Web app / dashboard | dynamic | `page` with JS; data is baked in at build time (no API calls) |
| Calculator | dynamic | `page`; keep all state in the page |
| Quiz | dynamic | `page`, or `cards` → `quiz` if it belongs inline |
| Game | dynamic | `page`; pin library versions |
| Invitation / poster | static | `design` for a canvas, `page` for a single poster |
| Visual explainer | static | `page` with SVG illustrations |
| Report laid out as a page | static | `doc` (better) or `page` |
| Markdown page | static | `doc` |

Constraints: one self-contained document, under 2 MB of source; external scripts
only from the allowlist; the CSP blocks every other origin.

---

## 3. Slides

`kind:"slides"`, 16:9, arrow keys to page, `PDF` to print (one slide per page).

| Layout | Use |
| --- | --- |
| `cover` | title + subtitle |
| `section` | chapter break (dark ground) |
| `bullets` | up to six parallel lines |
| `quote` | one sentence + attribution |
| `metrics` | three numbers |
| `two-col` | now/next, before/after |
| `image` | a `data:` image with alt text |

Deck JSON:

```json
{"title":"Q3 review","subtitle":"Numbers, plainly","slides":[
  {"layout":"cover","title":"Q3 review","subtitle":"Numbers, plainly"},
  {"layout":"bullets","title":"Three facts","bullets":["Revenue up 12%","Churn flat"]}
]}
```

Export: `pptx` (editable text boxes), `html`, `md`, `pdf` (via print).

---

## 4. Design canvas

`kind:"design"`. Free artboards on a pannable, zoomable canvas. Each board is
its own sandboxed document.

| Board | Size |
| --- | --- |
| Phone app screen | 390×844 |
| Tablet | 834×1194 |
| Desktop page | 1280–1440 wide |
| Poster | 1080×1350 |
| Social post | 1080×1080 |
| Wireframe | any fixed frame |

```json
{"title":"Checkout","boards":[
  {"name":"Cart","w":390,"h":844,"html":"<div style=\"padding:24px\">…</div>"},
  {"name":"Desktop","w":1280,"h":800,"html":"…"}
]}
```

Rules: real `<button>`, `<a href>`, `<input>` even in a static mockup; 44px
touch targets; 4.5:1 text contrast; no fake status bars; no invented stats.

Export: `html` (the canvas), `pdf` (print each board).

---

## 5. Documents

`kind:"doc"`, Markdown source, reading layout, print CSS for A4.

| Type | Notes |
| --- | --- |
| Report / memo / brief | headings + short paragraphs + one table |
| Plan / proposal | numbered sections |
| Essay / article | no headings needed under 400 words |
| Resume / letter | use a `page` for exact layout, `doc` for content |
| Guide / runbook | steps + code blocks |
| Meeting notes | attendees table + decisions list |

Export: `md`, `docx` (real WordprocessingML), `pdf` (print), `html`.

---

## 6. Downloadable files

`kind:"file"` with `format`. This is the only kind that does not render inline.

| Format | Content you write | What you get |
| --- | --- | --- |
| `csv` | comma-separated text | `.csv` |
| `json` | JSON text | `.json` |
| `md` | Markdown | `.md` |
| `html` | HTML | `.html` |
| `txt` | plain text | `.txt` |
| `docx` | Markdown | Word document with headings, lists, quotes, tables |
| `pptx` | deck JSON (same shape as `slides`) | 16:9 deck, one text box per slide |
| `xlsx` | `{"rows":[["label","value"],["a",1]]}` | one-sheet workbook |

`action:"export"` with `format` re-renders any existing artifact into `html`,
`md`, `json`, `csv`, `docx`, `pptx`, `xlsx`, or `pdf` (a print-ready document).

### Fidelity, stated plainly

- DOCX: text, headings, lists, quotes, tables. No images, columns, or styles
  beyond the built-in ones.
- PPTX: title + body text boxes on a 16:9 canvas, one per slide. No images,
  charts as pictures, transitions or speaker notes.
- XLSX: one sheet of strings and numbers. No formulas, formatting or charts.
- PDF: produced by the browser's print dialog, so pagination follows the print
  CSS the viewer ships.

That is a deliberate trade: dependency-free writers that always produce a file
Office opens, rather than a heavy converter with silent failures.

---

## 7. What is not here

| Claude capability | Status here | Why |
| --- | --- | --- |
| Public hosted links | Not implemented | Requires a hosting service and auth; the viewer URL is local to the harness |
| Shared/per-viewer data, "who is viewing" | Not implemented | Needs a server-side store and identity |
| Live model calls from inside a page | Via `dshArtifact.send` | The card messages the model; it cannot call the model directly |
| TSX artifacts compiled live | Not implemented | The dependency-free build has no in-browser compiler; `widget`/`page` cover the result |
| Image generation, photo library | Not implemented | No image model or library in the harness profile |
| Charts from arbitrary uploaded data | `file` + `chart` | Attach the data as a file, then chart it |

---

## 8. Decision table

| The user says | Build |
| --- | --- |
| "show me", "draw", "explain with a diagram" | `widget` |
| "compare these numbers over time" | `chart` |
| "what's the recipe / itinerary / quiz" | `cards` |
| "make me a page / app / calculator I can reopen" | `page` |
| "make a deck / presentation" | `slides` |
| "design a landing page / app screen / poster" | `design` |
| "write a report / memo / plan" | `doc` |
| "give me a Word / Excel / PowerPoint / PDF / CSV" | nearest kind + `export` |
| "show it inline here" | any kind with `surface:"inline"` |
