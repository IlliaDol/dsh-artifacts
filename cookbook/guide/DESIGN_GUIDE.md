# Design rules behind the visualizations

This is a summary in my own words of the rules I followed, not a verbatim copy of any instruction file.

## General
- Flat look: no gradients, shadows, glow or textures. One exception: a single two-stop gradient is allowed in illustrative diagrams to show a continuous physical property.
- Text and prose go outside the visual. The visual itself holds only the diagram, chart or controls.
- Sentence case everywhere. Two font weights only: 400 and 500.
- Sizes: 14px for labels, 12px for subtitles and notes, 11px minimum for chart ticks.
- Light and dark mode must both work. Use CSS variables for text, borders and surfaces. Never hardcode a dark text color.
- Round every number that reaches the screen (`toFixed`, `Math.round`).
- Interleave visuals with prose. Never stack visuals back to back.
- No emoji. Use a webfont icon set (Tabler outline icons) for icons.
- Add an accessible summary: a hidden heading for HTML widgets, `<title>` and `<desc>` for SVG, `role="img"` plus `aria-label` for canvas charts.

## Color
Use color to encode meaning, and keep to two or three ramps per diagram.

| Ramp | Light fill / stroke | Use |
|---|---|---|
| teal | #E1F5EE / #0F6E56 | data work, calm, success |
| purple | #EEEDFE / #534AB7 | modeling, abstract steps |
| coral | #FAECE7 / #993C1D | warm or active things |
| gray | #F1EFE8 / #5F5E5A | neutral or structural |
| blue, green, amber, red | | reserve for informational, success, warning, error |

Text on a colored fill uses the darkest stop of the same ramp (800 or 900 in light mode).

Chart series colors, in fixed order: blue #2a78d6, orange #eb6834, aqua #1baf7a, yellow #eda100, magenta #e87ba4, green #008300, violet #6250d6, red #e34948. Past eight series, fold into "Other" or use small multiples. Never use dual y-axes.

## SVG diagrams
- Always use `viewBox="0 0 680 H"`. Set H to the lowest element plus about 20 to 40px.
- Keep boxes at least 60px apart (flowcharts) and size each box from its longest label (about 8px per character at 14px).
- No more than four or five nodes per flowchart. Split bigger diagrams into several.
- Arrows must not cross other boxes. Route around them with an L-shaped path.
- Connector paths need `fill="none"`.
- Keep labels inside boxes. Avoid floating labels and rotated text.
- Use 0.5px strokes for diagram borders.
- Cycles are not drawn as rings. Use a stepper, or a return note.

## Charts (Chart.js)
- Wrap the canvas in a div with an explicit height. Set `maintainAspectRatio: false`.
- Disable the default legend and build a small custom HTML legend.
- Canvas cannot read CSS variables, so use hex colors.
- Grid lines are thin and quiet. No vertical gridlines on time axes.
- Bars are at most 24px thick. Lines are 2px.

## Interactive widgets
- Keep state in plain JS variables. No browser storage.
- Controls: sliders for continuous values, buttons for modes. Validate any input.
- Animation is limited to opacity and transform, and respects reduced-motion settings.
- Anything that needs me to think is sent back to chat with `sendPrompt`.

## Maps
- Use real topology data (world-atlas, us-atlas), never hand-drawn coordinates.
- Key any data to the names in the file, not to a list typed from memory.

## UI mockups
- A contained mockup sits on a light surface card. Dashboards use bordered cards and small metric tiles.
- Avoid shadows and disabled buttons. Use a quiet secondary button by default.
