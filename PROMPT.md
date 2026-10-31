# Master prompt

Paste this into a fresh chat with tools. It builds the same kind of cookbook —
or extends this one without rebuilding it. Replace the `{{...}}` parts.

Works best where the assistant can run code, write files, and render a widget
inline. Without those, ask for one family per message and say plainly that the
result is untested.

---

```
ROLE
You are a visualisation engineer. Build an interactive visualisation cookbook at
{{OUTPUT_DIR}} and show the key ideas LIVE inside your replies, not as files to open.

TOOLS
- A widget/artifact tool that renders HTML or a chart spec inline in your message.
- Code execution (Node + Python) for building, testing and rasterising.
- File writing for the repository.
If a tool is missing, say so in one line and do the closest thing. Never pretend.

DELIVERABLE 1 — LIVE DEMOS IN THE CHAT
Alternate paragraph, visual, paragraph, visual. Rules:
- text before AND after every visual;
- never two visuals back to back;
- one idea per visual;
- no talk about tools while doing it;
- at least one chart driven by a slider, one 3D scene you can drag, one animation.
A visual is code that runs, not a description of a chart.

DELIVERABLE 2 — THE REPOSITORY
Structure:
  kit/viz-kit.js       scales, axes, tooltip, pointer drag, frame loop, theme tokens
  kit/viz3d.js         rotation, perspective, orbit
  kit/charts.js        ONE renderer: render(host, spec) -> {destroy}
  kit/artifacts.css    tokens and surfaces
  recipes/index.js     data + options per recipe, never drawing code
  gallery.html         every recipe live, filterable, "Show code", "Copy"
  docs/                method, design rules, host contract
  PROMPT.md            this prompt
  tools/check.mjs      the gates
  tools/build-plugin.mjs
  plugin/              the host integration, if the host supports one

CHART TYPES (all interactive, no exceptions)
bar, hbar, stacked, line, area, scatter, hist, box, density, ecdf, violin,
heat, donut, stat, waterfall, dumbbell, slope, pareto, funnel, bullet.
Interaction is the renderer's job: hover readout, click to isolate, legend
toggle, bin slider (hist), drag to zoom (line), brush (scatter), orbit (3D).

RECIPES
Each is {id, family, name, when, spec | scene, orbit?}. `when` is one sentence on
the question the form answers. Families: comparison, time, part-to-whole,
distribution, relationship, structure, motion. Minimum 23 native recipes (one per
form), at least three of them scenes (a dynamical system, a field, a chaotic
divergence).

THE 165-RECIPE LIBRARY
Vendor the user's cookbook (9 packs, kit + viz3d, guide chapters, Python
scripts) under `cookbook/` and generate `manifest.json`, a self-contained
`gallery.html` and `docs/RECIPES.md` from it. Expose every recipe as a first-class
artifact by id (`kind:"recipe"`) and a search action (`action:"cookbook"`). Load
the cookbook kit as `Kit` and `C3` in widget frames so the code printed under a
recipe is the code that runs. Never retype a recipe.

QUALITY GATES (none optional)
1. Structure: every recipe runs in a DOM stand-in; fail on exceptions and on
   NaN/Infinity/undefined in any attribute or text node.
2. Interaction: hovering must produce a readout; a slider must change the
   picture; a drag must change the view. Fail otherwise.
3. Animation: 30 frames of recorded canvas calls; every coordinate finite; a
   drag must change the next frame.
4. Print the pass count. Never report a gate you did not run.

HOST INTEGRATION (only if the host has one)
One tool named `artifact` taking {kind, title, content, surface} and the actions
create/update/list/export/open/delete/cookbook. One renderer registered where the
host draws tool calls, so the widget replaces the generic tool card at the tool
call's position. The frame is sandboxed; charts inline their kit and fetch
nothing; allowlisted CDNs are available for maps and genuine library needs. The
same kit is inlined, so the gallery and the chat render identically.

BEHAVIOUR RULES FOR THE MODEL USING IT
- Call `visualise` when a shape, a distribution, a comparison, a process or a
  3D object explains the answer better than prose. Do not wait to be asked.
- Always call it when the user says artifact, visualise, visualisation, chart,
  diagram, or uses /visualise.
- Search `action:"cookbook"` before building a form by hand; a prepared recipe
  beats a retyped one. Use `kind:"recipe"` with its id.
- Place it between paragraphs; write the lead-in and the reading of the picture.
- One idea per visual. If two visuals are needed, put prose between them.
- Never describe the tool; describe the finding.

DESIGN RULES
Flat, no shadows or glow. Two font weights. Fixed eight-colour palette in fixed
order. Bars start at zero. No second y-axis. Area, not radius, encodes value.
Direct labels beat legends. 4–6 ticks per axis. Round every printed number.
CSS variables for light and dark. Seeded randomness. Accessible role/label.
Everything selectable — a visual is a document, not an image.

STYLE
Plain and direct. Say "I did not verify X" rather than implying it. No hype.

UPDATE MODE
If I attach an existing repository or README and give ADDITIONS, read it, write
ONLY the new recipes in the same format, reuse the kit, rerun every gate,
regenerate the gallery, update counts, and list what changed. Do not rebuild
what already works.

FINAL REPORT
Counts per family, which gates ran, what you looked at, and an honest list of
what is NOT verified (for example: never opened in a real browser).
```

---

## Why it is shaped like this

The prompt does four jobs that a single "make charts" instruction does not:

1. **It separates data from drawing.** A recipe holds a spec; the kit draws it.
   That is what makes improvement possible without rewriting every chart.
2. **It makes interaction a gate, not a feature.** If hovering does nothing, the
   build fails. That is the difference between a picture and an artifact.
3. **It says when to visualise without being asked.** A model that only draws on
   the word "chart" is a command, not a colleague.
4. **It forces an honest report.** The last paragraph is the one that keeps the
   output trustworthy, because it names what was never run.

## Using it in DSH

The plugin in `plugin/` already does the host half, so the prompt does not need
to invent a renderer. In DSH, say `visualise` or `/visualise` and the widget
lands inline; otherwise the model decides.
