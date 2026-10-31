# How Claude makes a visual, and how this repo encodes it

Reverse-engineered from the user's own material: `00_how_i_work.md`,
`DESIGN_GUIDE.md`, `taste.md`, the eighteen cookbook chapters and the 164
recipe packs. The point is not to copy one picture; it is to make the method
the default of this plugin.

## 1. The loop

From `00_how_i_work.md` §2, in Claude's own order:

1. **Decide whether a visual helps at all.** If a sentence answers it, write the
   sentence.
2. **Pick the form by the question**: compare (bars, lollipop), distribution
   (histogram, box, violin), relationship (scatter, heatmap), change (line, area),
   parts of a whole (stacked bar, treemap), flow (Sankey), place (map), process
   (diagram), a number to track (KPI tile, gauge).
3. **Shape the data** into rows the drawing code can loop over.
4. **Scales** map a value to a pixel; bar baselines start at zero.
5. **Marks**: one shape per row.
6. **Axes, labels, legend**; direct labels beat a legend when there are few series.
7. **Interaction and theme** only when they teach something; colours from tokens.

The renderer already does 4–6 for `chart` and `recipe`. The model still owns 1–3
and 7.

## 2. Placement inside the chat

From `00_how_i_work.md` §7 — the rule that DSH was breaking:

> In the chat, a visual is not a file. It is a tool call that sits at one exact
> point of my reply … The app renders the widget at that position as soon as it
> arrives … Nothing needs to be opened or downloaded.

Rules that follow:

- text before and after every visual (a lead-in, then the picture, then what to
  look at);
- never two visuals back to back; one idea per visual;
- not at the very top unless the picture *is* the answer;
- no talking about the mechanics while doing it.

**Encoded in:** the client renders the artifact at the tool call, at the full
column width, at content height, with no card chrome and no click
(`lib/client.js`); the prompt repeats the placement rules (`lib/index.js`,
`SKILL.md`).

## 3. The design rules

From `DESIGN_GUIDE.md`, verbatim where it matters:

- Flat: no gradients, shadows, glow or textures. Sentence case. **Two weights
  only: 400 and 500.**
- Sizes: **14px labels, 12px subtitles and notes, 11px minimum ticks.**
- Light and dark must both work: CSS variables for text, borders and surfaces;
  never hardcode a dark text colour.
- Round every number that reaches the screen.
- No emoji; a webfont icon set for icons.
- Accessible summary: hidden heading for HTML, `<title>`/`<desc>` for SVG,
  `role="img"` + `aria-label` for canvas.
- Colour encodes meaning: two or three ramps per diagram; the eight chart series
  in fixed order (blue, orange, aqua, yellow, magenta, green, violet, red); past
  eight fold into “Other” or use small multiples; never dual y-axes.
- SVG diagrams: `viewBox="0 0 680 H"`; boxes 60px apart; no more than four or
  five nodes; arrows never cross boxes; 0.5px strokes.
- Charts: explicit height, no default legend (build a small HTML one), **canvas
  cannot read CSS variables so use hex there**, thin quiet grid, no vertical
  gridlines on time axes, bars at most 24px thick, lines 2px.
- Interactive widgets: state in plain JS, no browser storage, sliders for
  continuous values, buttons for modes, animation on opacity/transform and
  reduced-motion aware, `sendPrompt` only when the model must reason.
- Maps: real topology data, keyed to the file's names.
- Mockups: a light surface card; bordered cards and small metric tiles.

**Encoded in:** tokens and the component vocabulary (`lib/theme.js`,
`lib/design.js`); the chart kit (palette order, 2px lines, thin grid, capped bar
thickness); the audit (`canvas-css-variable`, `gradient`, `emoji`, …); the
prompt.

## 4. The verification loop

From `00_how_i_work.md` §6 — Claude did not trust the picture until it was
checked:

- a structure test over every recipe in a simulated browser, failing on
  exceptions, `NaN`, `undefined`, `Infinity` and nearly empty output;
- interaction tests that click, type and slide, failing if the picture does not
  change;
- SVG converted to PNG and looked at as contact sheets (this found about 40 real
  defects);
- canvas scenes checked by recording every drawing call and rasterising frames;
- maps run with real D3 and world-atlas data;
- an explicit list of what was **not** verified.

**Encoded in:** `test/design.test.mjs` (rules), `test/render.test.mjs` (specs),
and `scripts/design-check.mjs` (`npm run design:check`), which renders every
example and the whole gallery in real Chrome, in dark and light, and fails on
horizontal overflow or clipped text.

## 5. What is enforced, what is taught

| Layer | Enforces | File |
| --- | --- | --- |
| Tokens | dark/light grounds, type, palette | `lib/theme.js` |
| Vocabulary | `.step`, `.caption`, `.panels`, `.controls`, … | `lib/design.js` |
| Audit | canvas `var()`, fixed position, hardcoded white/black, gradients, emoji, wide fixed widths, missing summary | `lib/design.js` |
| Renderers | charts, recipes, cards, slides, docs, design boards | `lib/render.js` |
| Client | inline placement, full width, content height, no chrome | `lib/client.js` |
| Prompt | when to draw, which form, placement, house style | `lib/index.js`, `SKILL.md` |
| Gate | overflow and clipping in Chrome | `scripts/design-check.mjs` |

The audit is the part that keeps the method from decaying: a model that has never
read this file still cannot ship a black canvas or a hardcoded white card,
because the tool rejects it and says what to do instead.
