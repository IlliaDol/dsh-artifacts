# dsh-artifacts

One plugin for **DeepSeek Harness (dsh)** that gives the model a single artifact
surface: inline widgets, charts, native cards, published pages, slide decks, a
design canvas, documents and downloadable files — the Claude artifact classes,
implemented over the three dsh generative-UI projects.

Built from scratch, dependency-free, no build step: the host half is plain ESM,
the browser half is a hand-written module-loader bundle.

```
dsh plugin --profile web add github:IlliaDol/dsh-artifacts
```

Then restart the profile and open a new session:

> Make a three-slide deck about the Q3 numbers, and a chart of revenue by quarter.

---

## What it merges

| Upstream | Licence | What its protocol contributed here |
| --- | --- | --- |
| [dsh-genui](https://github.com/omdsh-dev/dsh-genui) ★802 | MIT | Declarative `spec` artifacts (charts, widgets, cards) and the action loop back to the model |
| [dsh-visualize](https://github.com/Nagi-ovo/dsh-visualize) ★323 | BSD-3-Clause | Sandboxed inline-HTML cards, the `inline / wide / page` surfaces, the streaming/partial posture |
| [dsh-generative-ui](https://github.com/MindLab-Research/dsh-generative-ui) ★75 | Apache-2.0 | The "artifact reports its own failure" loop and the side-canvas idea (here: `surface:"canvas"` decks and design boards) |

This is a **protocol merge, not a vendored code merge**: no upstream source is
copied. Each project solved one channel; this package exposes one tool and one
store over all of them, then adds what none of them had — slides, design
canvases, docs, OOXML export. See [docs/ENGINES.md](docs/ENGINES.md) for the
honest accounting of what is and is not compatible with each upstream.

## Install

Requires dsh `^0.2.0-rc.1 || ^0.2.1-rc.1` and Node 22.19+ or 24+.

```sh
# from GitHub (no build step; lib/ is committed)
dsh plugin --profile web add github:IlliaDol/dsh-artifacts

# or from a clone
git clone https://github.com/IlliaDol/dsh-artifacts
dsh plugin --profile web add link:/absolute/path/to/dsh-artifacts
```

Restart the profile (`dsh web`), hard-refresh the browser, and start a **new**
session — the prompt section is assembled per session, so an old session keeps
the old tool list.

Verify: the browser console prints `[dsh-artifacts] client active;
channels=toolview+fence`, and `http://127.0.0.1:<port>/plugins/dsh-artifacts/gallery`
lists artifacts.

## Use

The model gets one tool, `artifact`, and a bundled skill with the full
catalogue. You can also drive it directly in a prompt:

- *"Chart our signups by month"* → `chart`
- *"Draw how the cache eviction works"* → `widget` (SVG)
- *"A quiz on chapter 3"* → `cards`
- *"A deck for the board meeting"* → `slides`, then export `pptx`
- *"Mock up the checkout on phone and desktop"* → `design`
- *"Write the launch memo as a Word file"* → `doc` + `export docx`

Artifacts are stored under `$DSH_HOME/artifacts` (`~/.dsh/artifacts` by
default). The gallery is the index; every artifact has **Open**, **Source** and
**Export** links.

## The eight kinds

| Kind | Renders | Dynamic | Exports |
| --- | --- | --- | --- |
| `widget` | inline HTML fragment or SVG | yes | html |
| `chart` | 20 forms: line / area / bar / hbar / stacked / scatter / donut / hist / box / density / ecdf / violin / heat / stat / waterfall / dumbbell / slope / pareto / funnel / bullet | hover, click, legend, bin slider, drag-zoom | html, csv, json, xlsx |
| `cards` | recipe, itinerary, quiz, steps, compare, metric, profile, weather, translation, message | quiz scores locally | html, json, csv |
| `page` | full published document | yes | html, pdf |
| `slides` | 16:9 deck, arrow-key paging, print pagination | paging | html, pptx, md, pdf |
| `design` | artboards on a pannable canvas | pan/zoom | html, pdf |
| `doc` | Markdown reading surface | no | md, docx, html, pdf |
| `file` | nothing (download only) | no | csv, json, md, html, txt, docx, pptx, xlsx |

The exhaustive catalogue — every artifact type, static or dynamic, inline,
published or downloadable, with the exact call — is
[docs/ARTIFACT-TYPES.md](docs/ARTIFACT-TYPES.md).

## Interactive by default

A chart is not a picture. It is drawn by the bundled kit in `kit/` — plain
JavaScript, no CDN, no chart library — and it reads the pointer:

- **hover** gives the exact value at that mark;
- **click** isolates one bar, slice or series;
- **the legend** toggles a series off without redrawing anything;
- **a histogram** has a bin slider, because the shape depends on the width;
- **a line** zooms when you drag across it and resets on double-click;
- **a widget** can use the same kit for a 3D scene: `VK` (scales, drag, frame
  loop), `V3` (rotation, projection) and `VC` (the chart renderer) are loaded
  in every artifact frame.

Nothing is fetched: the kit is inlined into each document by
`scripts/build-kit.mjs`, so an artifact renders offline, in an export, and
inside the sandbox with the network blocked.

[gallery.html](gallery.html) is the live surface for the same recipes — open it
directly, or `node scripts/serve-gallery.mjs 8777`. [PROMPT.md](PROMPT.md) is the
master prompt that rebuilds or extends this material in one go.

## The cookbook, now in the renderer

The twenty forms are not a list of chart names: they are the questions from the
visualisation cookbook, each with the interaction it needs. `waterfall` shows a
running total, `dumbbell` and `slope` show two moments per item, `pareto` puts
the cumulative share on the same 0–100% axis, `funnel` keeps narrow stages
readable, `bullet` puts a value against a target, and `density`, `ecdf` and
`violin` compare distributions without hiding the shape behind a box.

[docs/COOKBOOK.md](docs/COOKBOOK.md) is the chooser: which form answers which
question, the design rules every chart follows, and the four composition
patterns (layering, small multiples, linked views, annotation). The model reads
the same rules in [SKILL.md](SKILL.md), so the artifact and the gallery stay in
step.

## How it works

```
model ──artifact tool──▶ host half ──▶ $DSH_HOME/artifacts/<id>/
                            │              source.* · index.html · meta.json
                            ├─ /plugins/dsh-artifacts/view     (CSP-sandboxed doc)
                            ├─ /plugins/dsh-artifacts/export   (attachment)
                            ├─ /plugins/dsh-artifacts/gallery
                            └─ presentationMeta {id, viewUrl, title}
                                        │
browser ◀── toolview iframe ◀───────────┘
   │  ▲ height messages, theme flips
   └──┴─ dshArtifact.send / prompt ──▶ conversation.send ──▶ next model turn
```

Full detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Security posture

- Every artifact is rendered in an iframe with `sandbox="allow-scripts …"` and
  served with a CSP that allows only `cdnjs.cloudflare.com`, `esm.sh`,
  `cdn.jsdelivr.net`, `unpkg.com` and Google Fonts.
- Artifact ids are `art_` + 10 hex characters; paths are built from the id, and
  every id is re-validated before touching the filesystem.
- Credential-shaped strings in content are rejected at validation time.
- Artifacts cannot reach the harness API; the only channel out is the
  postMessage action bridge, which the host turns into a normal user message.

## Not implemented

Public hosted links, shared per-viewer data, in-page model calls, live TSX
compilation, image generation and image search. Each is listed with its reason
in [docs/PARITY.md](docs/PARITY.md). PDF is produced through the browser's
print dialog, not a PDF writer.

## Development

```sh
npm test        # 60 unit tests: schema, markdown, zip/OOXML, store, renderers
npm run check   # tests + package-shape checks
npm run render  # write examples/ for a visual check
```

No dependencies. No build. Edit `lib/*.js` and restart the profile; the client
bundle is loaded per page.

## Licence

MIT. Upstream attribution and licence texts are in [NOTICE](NOTICE). Not
affiliated with Anthropic; "Claude artifacts" is used descriptively.
