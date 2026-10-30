# Appendix: snippets I did NOT run here

Everything in the numbered family files is tested (see README for exactly how). The snippets below are standard, widely used syntax that I know well, but I **did not execute or render them in this session**, except where it says otherwise. Treat them as starting points.

## A. Mermaid (diagrams written as text)
Mermaid draws the layout for you from text. I rendered ONE Mermaid diagram earlier in this chat (an `erDiagram`); the others below were not rendered here. Some newer types (marked beta) depend on the Mermaid version.

How I load it in an HTML page (this exact loader worked for the ER diagram):
```html
<div id="out"></div>
<script type="module">
  import mermaid from 'https://esm.sh/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: false, theme: 'base' });
  const { svg } = await mermaid.render('g1', `PASTE DIAGRAM TEXT HERE`);
  document.getElementById('out').innerHTML = svg;
</script>
```

```text
flowchart LR
  A[Load] --> B{Missing?}
  B -- yes --> C[Impute]
  B -- no --> D[Train]
  C --> D
```
```text
sequenceDiagram
  User->>App: click search
  App->>API: GET /items
  API-->>App: 200 JSON
```
```text
classDiagram
  class Model { +fit(X, y) +predict(X) }
  Model <|-- LinearReg
  Model <|-- TreeModel
```
```text
stateDiagram-v2
  [*] --> Draft
  Draft --> Review: submit
  Review --> Approved: approve
  Review --> Draft: reject
  Approved --> [*]
```
```text
erDiagram
  STUDENT ||--o{ ENROLLMENT : has
  COURSE ||--o{ ENROLLMENT : has
```
```text
gantt
  title Project
  dateFormat YYYY-MM-DD
  section Data
  Collect :a1, 2026-11-02, 10d
  Clean   :after a1, 7d
```
```text
journey
  title Study day
  section Morning
    Coffee: 5: Me
    Lecture: 3: Me
```
```text
pie title Languages
  "Python" : 48
  "SQL" : 27
  "R" : 15
```
```text
quadrantChart
  title Priorities
  x-axis Low effort --> High effort
  y-axis Low impact --> High impact
  Cache: [0.7, 0.8]
  Docs: [0.2, 0.3]
```
```text
mindmap
  root((Project))
    Plan
      Goals
    Build
      Code
      Test
```
```text
timeline
  title History
  2018 : Founded
  2022 : Launch v2
```
```text
gitGraph
  commit
  branch feature
  commit
  checkout main
  merge feature
```
```text
sankey-beta
Visits,Search,60
Visits,Direct,40
Search,Buy,15
```
```text
xychart-beta
  title "Sales"
  x-axis [jan, feb, mar]
  y-axis "units" 0 --> 100
  bar [30, 55, 70]
  line [30, 55, 70]
```

## B. Three.js (real 3D with WebGL)
My tested 3D recipes use plain SVG with my own rotation and projection maths. For real shading, textures and thousands of objects you need WebGL, e.g. Three.js. This snippet is standard but **not tested here** (jsdom has no WebGL).
```html
<div id="c" style="width:100%;height:320px"></div>
<script type="module">
  import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const el = document.getElementById('c'), w = el.clientWidth, h = 320;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 100); cam.position.z = 4;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setSize(w, h); el.appendChild(r.domElement);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshNormalMaterial()); scene.add(mesh);
  (function loop() { mesh.rotation.x += 0.01; mesh.rotation.y += 0.014; r.render(scene, cam); requestAnimationFrame(loop); })();
</script>
```

## C. Plotly (interactive scientific charts)
Plotly adds hover, zoom and 3D out of the box. Not tested here.
```html
<div id="p"></div>
<script src="https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.35.2/plotly.min.js"></script>
<script>
  const z = Array.from({ length: 30 }, (_, i) => Array.from({ length: 30 }, (_, j) => Math.sin(Math.hypot(i - 15, j - 15) / 3)));
  Plotly.newPlot('p', [{ type: 'surface', z }], { margin: { t: 10 } });
</script>
```

## D. Built-in chat cards (not code)
Besides drawing code, the chat has ready-made cards: step-by-step guide, quiz and flashcards, recipe with a servings slider, itinerary, place lists and place maps, weather, sports scores and standings, product comparison, link previews, translation, message drafts, and a simple line, bar or scatter chart card. They are used by describing the content, not by writing code, so there is nothing to export; they appear only inside the chat.
