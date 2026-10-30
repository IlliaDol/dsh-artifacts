# The visualization cookbook

This is the source library behind `kind:"recipe"` and the in-app
`/plugins/dsh-artifacts/cookbook` gallery: **164 recipes in 15 families**, each
with a real drawing function, the question it answers, the steps it follows, and
what it combines with.

It started as the user's Claude cookbook material (18 guide chapters, 9 recipe
packs, the kit, 3D helpers, 7 Python file-output scripts and the standalone
visual examples). It is vendored here unchanged so the plugin and the gallery
run the same code the documentation prints.

## Layout

| Path | What it is |
| --- | --- |
| `recipes.js` … `recipes_b9.js` | The nine recipe packs. Each entry is data plus `fn(host, K)`. |
| `viz-kit.js` | Scales, axes, statistics, hierarchy/Sankey/force layouts, colour ramps, seeded sample data. Exposed to artifacts as `Kit`. |
| `viz3d.js` | Rotation, perspective projection, canvas, drag and animation-loop helpers. Exposed as `C3` and `Kit.v3`. |
| `manifest.json` | Generated metadata + `fn.toString()` for every recipe. Used by the tool lookup and the `recipe` renderer. |
| `gallery.html` | Generated, self-contained live gallery with search, family filters, code and copy. |
| `guide/` | The 18 cookbook chapters, the design guide, the Python recipes, and the standalone visual examples. |
| `py/` | Seven Python scripts that produce PNG, Excel, PowerPoint and Word files. Run `python py/run_all.py` from this directory. |
| `package.json` | Marks the packs as CommonJS for the build script; the browser ignores it. |

## Use it

From a model turn:

```json
{"action":"cookbook","recipe":"qq"}
```

returns the metadata and exact code, and this draws it without retyping:

```json
{"action":"create","kind":"recipe","title":"Q-Q plot","content":"qq"}
```

From a widget, copy any recipe's `function draw(host, K)` and call
`draw(host, window.Kit)`; the widget frame loads `Kit` and `C3` for exactly this.
Maps need an internet connection to load D3 and `world-atlas`.

## Rebuild

```sh
node scripts/build-cookbook.mjs
```

This regenerates `manifest.json`, `gallery.html` and `docs/RECIPES.md` from the
packs. It refuses duplicate ids, a missing field, or a pack without a `RECIPES`
array.

## Verification

The gallery was mounted in Chromium: **164/164 recipes drew**, with 149 SVGs,
6 canvases, 9 HTML-only cards, zero exceptions, zero `NaN`/`undefined`/
`Infinity` attributes and no console errors. The map recipes were checked with
D3 and `world-atlas` loaded. The `recipe` artifact path was checked separately
for `qq`, `sankey`, `globe`, `lorenz` and `combo-layers`.

The cookbook's own notes are honest about what its author did not run (real
browsers, some HTML-only cards, WebGL). This vendored copy fixes the global
collision between the cookbook's `V3` and the plugin's `V3` by exposing the
cookbook helpers as `C3`; recipes only refer to `Kit.v3`.
