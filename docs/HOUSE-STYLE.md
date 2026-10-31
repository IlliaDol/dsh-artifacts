# House style

Every artifact is a page in the same product. The renderer owns the look; the
model owns the content. This file is the contract between them, and the reason
two artifacts made by two different models should still look like they came from
the same hand.

## The four decisions

1. **Dark first, light honest.** One token sheet, two grounds. A surface is
   `--surface`, the page is `--bg`, text is `--text`; nothing hardcodes white or
   black. The frame receives the host theme (`?theme=dark`) and the same document
   renders in both without a second stylesheet.
2. **One accent, one measure.** The accent marks the one thing the reader should
   look at; everything else is text or a muted rule. A chart has one y-axis, bars
   start at zero, and a single series is a single colour — the palette encodes
   series, never categories of one measure.
3. **Hierarchy before decoration.** A step title, a caption, the figure. No boxes
   around boxes, no gradients, no glow, no emoji. Whitespace does the separating,
   not borders and shadows.
4. **The renderer draws, the model composes.** A chart is `chart` (the user's
   numbers) or `recipe` (a prepared drawing). A widget is HTML composed from the
   vocabulary below. A hand-written canvas chart is rejected: it gets no hover,
   no theme tokens and no accessible table, and canvas cannot read CSS variables.

## The vocabulary

Defined in `lib/design.js` (`DESIGN_CSS`) and shipped inside every artifact by
the shell. Use the class; do not restate the styles.

| Class | Use |
| --- | --- |
| `.step` | a step title, with an optional `<span class="num">1</span>` |
| `.caption` | one muted line under a figure |
| `.kicker` | a small uppercase label above a title |
| `.figure` | a block that holds one drawing; its `svg` scales to the width |
| `.panels` / `.panel` | small multiples; each panel has an `h4` and a `.caption` |
| `.controls` | a row of buttons and sliders |
| `.legend` / `.swatch` | the key under a drawing |
| `.note` | a footnote |
| `.metric` / `.grid` | a row of headline numbers |
| `.card` | a bordered surface, used sparingly |
| `details.data` | the accessible table under a chart |

Buttons, inputs, sliders, tables and `details.data` already have the house
styling; a widget should use them as they are.

## What the audit enforces

`lib/schema.js` runs `auditDesign` on every widget before it is stored, so the
model sees the finding in the tool result and can fix it. A rule is either an
**error** (the artifact is not stored) or a **warning** (it is stored with a
note).

| Rule | Severity | Why |
| --- | --- | --- |
| `canvas-css-variable` | error | Canvas ignores `var(--…)`; the assignment is dropped and the context keeps black. |
| `fixed-position` | error | The frame sizes itself to its content; `position:fixed` breaks that contract. |
| `canvas-chart` | warning | A hand-written canvas chart has no hover, theme or accessible table. |
| `hardcoded-light-background` | warning | `#fff` cannot follow the theme. |
| `hardcoded-dark-background` | warning | `#000` cannot follow the theme. |
| `gradient` | warning | Flat surfaces only. |
| `emoji` | warning | The type system carries the tone, not emoji. |
| `wide-fixed-width` | warning | A width over 980px overflows the artifact card. |
| `missing-summary` | warning | Every HTML widget starts with an `sr-only` one-sentence summary. |

## The checklist

- Does the artifact answer one question, and only one?
- Is every number real, or labelled as demo data?
- Does it work in dark **and** light, with no hardcoded paint?
- Is there exactly one accent, and does it mark the one thing that matters?
- Would it still read if the colour were removed?
- Does every caption say what the picture shows, rather than repeating the title?
- Is the explanation in the reply, with only step titles and captions inside?

## Where it lives

- Tokens: `lib/theme.js` (`TOKENS_CSS`, `SERIES`).
- Vocabulary: `lib/design.js` (`DESIGN_CSS`).
- Audit: `lib/design.js` (`DESIGN_RULES`), run by `lib/schema.js`.
- Tests: `test/design.test.mjs`.
- Visual gate: `scripts/design-check.mjs` (`npm run design:check`), which
  renders the examples and the cookbook gallery in Chrome in both themes.
- Prompt: the "House style" paragraph in `lib/index.js` and `SKILL.md`.
