# How I make visualizations, and how I combine them

## 1. What actually happens
I do not have a chart engine. For every visual I **write code** (SVG, HTML, JavaScript, sometimes Python or Mermaid text) and the app you use runs it and shows the result. "Making a chart" means: choose a form, shape the data, write the drawing code, check it.

Limits you should know about:
- In chat I cannot see a rendered widget. For this cookbook I added checks (section 6): run every recipe in a simulated browser, click buttons and move sliders by script, and convert the SVG output to PNG pictures that I looked at myself.
- Sample data is generated (seeded random numbers or invented demo values). It teaches the technique and says nothing real. Map "values" are a deterministic hash of the country id.
- Anything that needs the network (D3, map data, Mermaid, Three.js) can fail on your side.

## 2. The seven steps I follow
1. **Decide whether a visual helps at all.** If a sentence answers it, I write the sentence.
2. **Pick the form by the question**: compare (bars, lollipop), distribution (histogram, box, violin), relationship (scatter, heatmap), change over time (line, area), parts of a whole (stacked bar, treemap), flow (Sankey), place (map), process or structure (diagram), a number to track (KPI tile, gauge).
3. **Shape the data** into arrays of rows the drawing code can loop over.
4. **Scales**: functions mapping a data value to a pixel (`K.linear`, `K.band`). Bar baselines start at 0.
5. **Marks**: loop over the data and create one shape per row (rect, circle, path, polygon, text).
6. **Axes, labels, legend** from helpers; direct labels instead of legends when there are few series.
7. **Interaction and theme**: sliders, hover or buttons only when they teach something; colours from CSS variables so light and dark mode both work.

The whole idea in four lines (a bar chart):
```js
const st = Kit.stage(host), x = Kit.band(keys, 0, st.W), y = Kit.linear(0, 80, st.H, 0);
Kit.axisY(st, y, 4);
data.forEach(([k, v]) => Kit.el('rect', { x: x(k), y: y(v), width: x.bw, height: st.H - y(v) }, st.g));
```

## 3. Which route I use for which output
| Goal | Route |
|---|---|
| Quick picture or widget in the chat | inline widget (SVG or HTML, libraries from a CDN) |
| A page you can share by link | published HTML page |
| A FILE: PNG/SVG/PDF, native Excel or PowerPoint chart, Word report | Python in my sandbox (`16_python_file_outputs.md`) |
| Markdown tables, short lists | plain chat text |
| Standard cards (steps, quiz, recipe, weather, places...) | built-in chat cards, no code |
| Diagrams from text | Mermaid (appendix, mostly untested here) |
| Real 3D with shading | Three.js (appendix, untested here) |

## 4. Design rules I follow
Flat look (no shadows, no glow); two font weights; a fixed eight-colour palette used in a fixed order; 4 to 6 ticks per axis; round every printed number; never a second y-axis; never truncate a bar baseline; direct labels over legends; area (not radius) encodes value for circles; text alternatives (`role="img"`, titles) for accessibility; CSS variables for dark mode; seeded random numbers so a picture is the same every time.

## 5. How I combine different types
One principle: **share scales and share state.** Everything below exists as a tested recipe in `15_combining_types.md` unless marked otherwise.

| Pattern | What it is | Recipe ids |
|---|---|---|
| Layering | Several marks on one coordinate system, drawn back to front, after converting to the same units (histogram counts to density) | `combo-layers`, `combo-violin`, `regci`, `pareto`, `fan` |
| Small multiples | Same chart repeated per group; scales computed ONCE from all data so panels are comparable | `combo-multiples`, `combo-sparkgrid` |
| Linked views | One state object; each view is a function of (data, state); controls only change state and call a single update() | `combo-linked`, `combo-tilebar`, `combo-dashboard` |
| Table + chart in sync | One array feeds both; sorting redraws both from the same sorted copy | `combo-tablechart`, `sparktable` |
| Annotation layer | Extra marks (bands, rules, callouts) drawn in the chart's own scales | `combo-annotated` |
| Dashboard composition | KPI tiles + chart + table, one data array, one filter | `combo-dashboard`, `kpi` |
| Chart on a map | Symbols, arcs or dots drawn with the same projection as the base map | `symbolmap`, `flowmap`, `dotdensity` |
| State machine animation | `state`, `step()`, `draw()`; Play calls step() on a timer | `life`, `pendulum`, `particles`, `bubblesort` |
| Diagram driven by data | Nodes and edges described as data; one generic renderer | `flowchart`, `statemachine`, `decisiontree` |
| Visual + file pipeline | Python makes the PNG or native chart, then python-pptx or python-docx embeds it | `06_word_report.py`, `05_powerpoint_native_chart.py` |

Patterns described but NOT written as tested recipes: mixing Chart.js (canvas) and hand-written SVG in one page (works by using separate containers and shared constants), and Mermaid + data overlay (I post-processed one Mermaid ER diagram earlier in this chat, but that code is not in the cookbook).

Combining in chat: I alternate sentence, widget, sentence. A click in a widget can send a question back to the chat (`sendPrompt`, which exists only inside the chat).

## 6. How the cookbook was checked
- **Structure test (all 164 browser recipes):** each runs in a simulated browser (jsdom); the test fails on exceptions, on `NaN`, `undefined` or `Infinity` in the output, and on nearly empty output.
- **Interaction tests (30 recipes):** a script clicks buttons, types into inputs, moves sliders and dispatches clicks on shapes, and the test fails if the picture does not change.
- **Looking at the pictures (the 146 recipes that draw an SVG):** the SVG was converted to PNG in my sandbox and I looked at contact sheets. This found and fixed about 40 real problems (clipped axes, overlapping labels, a wrong quadrant, a made-up standard error in the forest plot, spline overshoot in rank charts, survival curves ending early...).
- **Animated and 3D canvas scenes (6 recipes):** a canvas cannot be inspected like SVG, so the test replaces it with a fake canvas that RECORDS every drawing call. Tests advance the animation by hand, fail on any NaN or Infinity sent to the canvas, simulate dragging, and I converted the recorded calls into SVG frames at several moments (start, mid-run, late) and looked at them. This found clipped scenes (cube, Lorenz, wave, Saturn) that were fixed. Real-time smoothness and frame rate are NOT verified; they depend on your device.
- **Maps:** run with real D3, topojson and world-atlas data in Node, then rasterized and viewed.
- **Python scripts (7):** run, then the outputs were opened: the xlsx has 2 native charts, the pptx slide has a native chart with the expected data, the docx has a table and a picture, and I viewed the PNGs.
- **Not verified:** The 12 HTML-only recipes (filterlist, flashcards, form, heattable, hero, kanban, kpi, monthcal, plans, quiz, sorttable, uidash) were tested by structure and interaction, but I have never seen them rendered. No recipe has run in a real browser. The gallery page was run only in the simulated browser. Everything in the appendix is untested.

## 7. How visuals get into the MIDDLE of a message (and open by themselves)
In the chat, a visual is not a file. It is a tool call that sits at one exact point of my reply: I write a paragraph, then call the widget tool with the code, then keep writing. The app renders the widget at that position as soon as it arrives, so you read, see, read, see, in the order I produced them. Nothing needs to be opened or downloaded.

Rules I follow when placing them:
- text before and after every visual (a short lead-in sentence, then the picture, then what to look at);
- never two visuals back to back; one idea per visual; not at the very top unless the picture IS the answer;
- no talking about the mechanics ("calling the tool") while doing it.

What an inline widget can and cannot do:
- It can: draw (SVG, HTML, canvas 2D), animate, react to clicks, sliders and dragging, and load a few allow-listed libraries from a CDN. A click can send a question back into the chat.
- It cannot: share state with another widget (each one runs on its own, so each carries its own helper code), save itself (to keep one you need a file like this cookbook), or be guaranteed to use WebGL.
- Widgets belong to the conversation. The files in this cookbook run the very same code, but in your own browser, outside the chat.
