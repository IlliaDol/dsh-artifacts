# Software and process diagrams

10 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Flowchart (data-driven)

**Use it when:** A process with decisions.

**How I do it**

1. Describe the chart as DATA: nodes (id, position, size, shape, label) and edges (from, to, optional label).
2. One generic renderer draws every node (pill, box, diamond) and every edge: the straight line between the two centres is trimmed to the box borders (D.trim) and given an arrowhead from an SVG <marker>.
3. To change the chart you edit the data, never the drawing code. (Mermaid does the layout for you from text; here layout is explicit.)

**Code** (id `flowchart`)

```js
function draw(host, K) {
  const N = { s: { x: 160, y: 24, w: 80, h: 28, type: 'pill', label: 'Start' }, l: { x: 160, y: 74, w: 110, h: 30, label: 'Load data' }, q: { x: 160, y: 130, w: 130, h: 46, type: 'diamond', label: 'Missing values?' }, i: { x: 270, y: 130, w: 80, h: 30, label: 'Impute' }, t: { x: 160, y: 186, w: 110, h: 30, label: 'Train model' }, e: { x: 160, y: 232, w: 80, h: 28, type: 'pill', label: 'End' } };
  Object.values(N).forEach(n => { n.type = n.type || 'box'; });
  const E = [['s', 'l'], ['l', 'q'], ['q', 'i', 'yes'], ['q', 't', 'no'], ['i', 't'], ['t', 'e']], st = K.stage(host, 320, 260, { l: 0, r: 0, t: 0, b: 0 }); D.defs(K, st.g);
  E.forEach(([a, b, lab]) => { const [x1, y1, x2, y2] = D.trim(N[a], N[b]); K.el('line', { x1, y1, x2, y2, stroke: 'var(--text,#555)', 'stroke-width': 1.4, 'marker-end': 'url(#ah)' }, st.g); if (lab) K.text(st.g, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 4, lab); });
  Object.values(N).forEach((n, i) => D.node(K, st.g, n, K.C[n.type === 'diamond' ? 1 : n.type === 'pill' ? 2 : 0]));
}
```

**Combines with:** Add counts on the edges to turn it into a Sankey-like flow; colour nodes by status.

---

## Sequence diagram

**Use it when:** Who calls whom, in what order (API flows, protocols).

**How I do it**

1. One column per participant with a dashed lifeline. Time runs downwards.
2. Messages are a list [from, to, label, isReturn]; message i is drawn at y = top + i * step as a horizontal arrow between the two lifelines with its label above.
3. Return messages are dashed.

**Code** (id `sequence`)

```js
function draw(host, K) {
  const P = ['User', 'App', 'API', 'DB'], M = [['User', 'App', 'click search'], ['App', 'API', 'GET /items'], ['API', 'DB', 'SELECT ...'], ['DB', 'API', 'rows', 1], ['API', 'App', '200 JSON', 1], ['App', 'User', 'render list', 1]];
  const st = K.stage(host, 320, 240, { l: 6, r: 6, t: 6, b: 4 }), x = K.band(P, 0, st.W, 0.5); D.defs(K, st.g);
  P.forEach(p => { const cx = x(p) + x.bw / 2; K.el('rect', { x: x(p) - 4, y: 0, width: x.bw + 8, height: 24, rx: 5, fill: K.C[0], 'fill-opacity': 0.15, stroke: K.C[0] }, st.g); K.text(st.g, cx, 16, p, { 'text-anchor': 'middle', fill: 'var(--text,#222)' }); K.el('line', { x1: cx, x2: cx, y1: 24, y2: st.H, stroke: 'var(--axis,#c3c2b7)', 'stroke-dasharray': '4 4' }, st.g); });
  M.forEach(([a, b, t, ret], i) => { const y = 54 + i * 30, xa = x(a) + x.bw / 2, xb = x(b) + x.bw / 2; K.el('line', { x1: xa, x2: xb + (xb > xa ? -2 : 2), y1: y, y2: y, stroke: 'var(--text,#555)', 'stroke-dasharray': ret ? '5 3' : '', 'marker-end': 'url(#ah)' }, st.g); K.text(st.g, (xa + xb) / 2, y - 5, t, { 'text-anchor': 'middle' }); });
}
```

**Combines with:** Mermaid draws the same from text: sequenceDiagram.

---

## Class diagram

**Use it when:** Object-oriented design: classes, fields, methods and inheritance.

**How I do it**

1. Each class is a box in three compartments (name, fields, methods) separated by lines; the height comes from the number of rows.
2. Inheritance is a line to the parent with a hollow triangle at the parent end.

**Code** (id `classdiagram`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 230, { l: 6, r: 6, t: 6, b: 6 }), cls = (x, y, w, name, f, m, col) => { const rh = 15, h = 20 + (f.length + m.length) * rh + 8; K.el('rect', { x, y, width: w, height: h, rx: 4, fill: 'var(--card,#f4f3ee)', stroke: col }, st.g); K.el('rect', { x, y, width: w, height: 20, rx: 4, fill: col, 'fill-opacity': 0.3 }, st.g); K.text(st.g, x + w / 2, y + 14, name, { 'text-anchor': 'middle', 'font-weight': 500, fill: 'var(--text,#222)' }); K.el('line', { x1: x, x2: x + w, y1: y + 20 + f.length * rh + 4, y2: y + 20 + f.length * rh + 4, stroke: col }, st.g); f.forEach((t, i) => K.text(st.g, x + 6, y + 33 + i * rh, t, { fill: 'var(--text,#333)' })); m.forEach((t, i) => K.text(st.g, x + 6, y + 37 + (f.length + i) * rh, t, { fill: 'var(--text,#333)' })); return h; };
  cls(80, 4, 160, 'Model', ['+name: str'], ['+fit(X, y)', '+predict(X)'], K.C[0]);
  cls(10, 140, 130, 'LinearReg', ['+coef: array'], ['+fit(X, y)'], K.C[1]); cls(180, 140, 130, 'TreeModel', ['+depth: int'], ['+fit(X, y)'], K.C[2]);
  [[75, 140], [245, 140]].forEach(([x, y]) => { K.el('line', { x1: x, y1: y, x2: x, y2: 108, stroke: 'var(--text,#555)' }, st.g); K.el('line', { x1: x, y1: 108, x2: 160, y2: 108, stroke: 'var(--text,#555)' }, st.g); });
  K.el('line', { x1: 160, y1: 108, x2: 160, y2: 98, stroke: 'var(--text,#555)' }, st.g); K.el('polygon', { points: '160,86 152,100 168,100', fill: 'var(--bg,#fff)', stroke: 'var(--text,#555)' }, st.g);
}
```

**Combines with:** Mermaid: classDiagram.

---

## State machine

**Use it when:** Something that is in exactly one state and moves on events (orders, connections, UI).

**How I do it**

1. States are rounded boxes (data: id, position); transitions are [from, to, label] edges.
2. Reuse the flowchart renderer, add a filled start dot and a double-ring end state.

**Code** (id `statemachine`)

```js
function draw(host, K) {
  const N = { d: { x: 44, y: 60, w: 72, h: 32, label: 'Draft' }, r: { x: 160, y: 60, w: 72, h: 32, label: 'Review' }, a: { x: 276, y: 60, w: 72, h: 32, label: 'Approved' }, x: { x: 160, y: 150, w: 72, h: 32, label: 'Rejected' } };
  Object.values(N).forEach(n => { n.type = 'pill'; });
  const E = [['d', 'r', 'submit'], ['r', 'a', 'approve'], ['r', 'x', 'reject'], ['x', 'd', 'revise']], st = K.stage(host, 320, 200, { l: 0, r: 0, t: 0, b: 0 }); D.defs(K, st.g);
  K.el('circle', { cx: 12, cy: 24, r: 5, fill: 'var(--text,#333)' }, st.g); K.el('line', { x1: 14, y1: 28, x2: 40, y2: 48, stroke: 'var(--text,#555)', 'marker-end': 'url(#ah)' }, st.g);
  E.forEach(([a, b, lab]) => { const [x1, y1, x2, y2] = D.trim(N[a], N[b]); K.el('line', { x1, y1, x2, y2, stroke: 'var(--text,#555)', 'marker-end': 'url(#ah)' }, st.g); K.text(st.g, (x1 + x2) / 2 + (a === 'x' ? -34 : 0), (y1 + y2) / 2 - (a === 'x' ? 0 : 6), lab, { 'text-anchor': 'middle' }); });
  Object.values(N).forEach((n, i) => D.node(K, st.g, n, K.C[i % 4]));
  K.el('circle', { cx: 270, cy: 60, r: 21, fill: 'none', stroke: K.C[2], 'stroke-width': 0 }, st.g);
}
```

**Combines with:** Highlight the current state and drive it from buttons (state machine + interactive).

---

## Swimlane (cross-functional) diagram

**Use it when:** A process that passes between people or teams.

**How I do it**

1. One horizontal lane per actor (band scale on y); steps are boxes placed in the lane of the actor who performs them, left to right in time order.
2. Arrows connect consecutive steps; a vertical segment means a hand-off.

**Code** (id `swimlane`)

```js
function draw(host, K) {
  const lanes = ['Customer', 'Support', 'Engineering'], steps = [['Report bug', 0], ['Triage', 1], ['Fix', 2], ['Review', 2], ['Notify', 1], ['Confirm', 0]];
  const st = K.stage(host, 320, 210, { l: 80, r: 6, t: 4, b: 4 }), y = K.band(lanes, 0, st.H, 0.06), bw = 40, step = (st.W - bw) / (steps.length - 1); D.defs(K, st.g);
  lanes.forEach((l, i) => { K.el('rect', { x: 0, y: y(l), width: st.W, height: y.bw, fill: i % 2 ? 'var(--card,#f4f3ee)' : 'none', stroke: 'var(--grid,#e1e0d9)' }, st.g); K.text(st.g, -6, y(l) + y.bw / 2 + 4, l, { 'text-anchor': 'end', fill: 'var(--text,#333)' }); });
  const P = steps.map(([t, l], i) => ({ x: bw / 2 + i * step, y: y(lanes[l]) + y.bw / 2, w: bw, h: 30, label: t }));
  P.slice(1).forEach((b, i) => { const a = P[i]; K.el('path', { d: `M${a.x + bw / 2} ${a.y}H${(a.x + bw / 2 + b.x - bw / 2) / 2}V${b.y}L${b.x - bw / 2} ${b.y}`, fill: 'none', stroke: 'var(--text,#555)', 'marker-end': 'url(#ah)' }, st.g); });
  P.forEach((p, i) => { K.el('rect', { x: p.x - bw / 2, y: p.y - 15, width: bw, height: 30, rx: 5, fill: K.C[steps[i][1]], 'fill-opacity': 0.85 }, st.g); K.text(st.g, p.x, p.y + 3, p.label.split(' ')[0], { 'text-anchor': 'middle', fill: '#fff', 'font-size': 9 }); });
}
```

**Combines with:** Add durations to the boxes to see where time is lost.

---

## Decision tree (classifier)

**Use it when:** Explain how a tree model reaches a decision.

**How I do it**

1. Tree data: internal nodes hold a question, leaves hold a class. K.tree gives positions (depth = row, slot = column).
2. Edges are labelled yes / no; leaves are coloured by class so the reader can see which regions are pure.

**Code** (id `decisiontree`)

```js
function draw(host, K) {
  const t = { q: 'hours > 5?', children: [{ q: 'prior > 60?', children: [{ leaf: 'fail' }, { leaf: 'pass' }] }, { q: 'sleep > 6?', children: [{ leaf: 'pass' }, { leaf: 'pass' }] }] };
  const L = K.tree(t), st = K.stage(host, 320, 220, { l: 10, r: 10, t: 10, b: 10 }), x = K.linear(0, L.leaves - 1, 40, st.W - 40), y = d => d * 76 + 14; D.defs(K, st.g);
  L.nodes.forEach(n => (n.children || []).forEach((c, i) => { K.el('line', { x1: x(n._x), y1: y(n._d) + 14, x2: x(c._x), y2: y(c._d) - 14, stroke: 'var(--text,#555)', 'marker-end': 'url(#ah)' }, st.g); K.text(st.g, (x(n._x) + x(c._x)) / 2 + (i ? 8 : -8), (y(n._d) + y(c._d)) / 2, i ? 'no' : 'yes', { 'text-anchor': i ? 'start' : 'end' }); }));
  L.nodes.forEach(n => { const leaf = !!n.leaf; K.el('rect', { x: x(n._x) - (leaf ? 30 : 38), y: y(n._d) - 14, width: leaf ? 60 : 76, height: 28, rx: leaf ? 14 : 6, fill: leaf ? (n.leaf === 'pass' ? K.C[2] : K.C[7]) : 'var(--card,#f4f3ee)', 'fill-opacity': leaf ? 0.85 : 1, stroke: leaf ? 'none' : K.C[0] }, st.g); K.text(st.g, x(n._x), y(n._d) + 4, n.q || n.leaf, { 'text-anchor': 'middle', fill: leaf ? '#fff' : 'var(--text,#222)' }); });
}
```

**Combines with:** Draw the same tree's splits as lines on a scatter plot (decision boundary recipe).

---

## Network topology diagram

**Use it when:** How devices and services are wired together.

**How I do it**

1. Hub-and-spoke layout: the router in the centre, switches on a ring around it, end devices on a larger ring around their switch.
2. Positions come from K.polar. Use different shapes (circle, square, hexagon) to tell device types apart, with a legend.

**Code** (id `topology`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 240, { l: 4, r: 4, t: 4, b: 18 }), cx = st.W / 2, cy = st.H / 2;
  const sw = [0, 1, 2].map(i => K.polar(cx, cy, 62, i * 2 * Math.PI / 3 + 0.5));
  sw.forEach((p, i) => { K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--axis,#b4b2a9)', 'stroke-width': 2 }, st.g); for (let j = 0; j < 3; j++) { const q = K.polar(p[0], p[1], 38, i * 2 * Math.PI / 3 + 0.5 + (j - 1) * 0.7); K.el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: 'var(--axis,#b4b2a9)' }, st.g); K.el('circle', { cx: q[0], cy: q[1], r: 5, fill: K.C[2] }, st.g); } });
  sw.forEach(p => K.el('rect', { x: p[0] - 9, y: p[1] - 9, width: 18, height: 18, rx: 3, fill: K.C[0] }, st.g));
  K.el('polygon', { points: K.range(0, 5, 6).map(i => K.polar(cx, cy, 15, i * Math.PI / 3).join(',')).join(' '), fill: K.C[1] }, st.g);
  K.legend(st.g, [['router', K.C[1]], ['switch', K.C[0]], ['device', K.C[2]]], 40, st.H + 4, 80);
}
```

**Combines with:** Colour links by load to overlay data on the topology.

---

## Git branch graph

**Use it when:** Explain branching and merging.

**How I do it**

1. Each branch is a horizontal lane (y). Each commit is a circle at (x = commit index, y = its lane).
2. Branching: a curve from a commit on the parent lane to the first commit of the new lane; merging: a curve back. Lane colour identifies the branch.

**Code** (id `gitgraph`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 150, { l: 50, r: 10, t: 14, b: 10 }), x = i => 10 + i * 34, y = l => 14 + l * 44, lanes = ['main', 'feature', 'hotfix'];
  const C = [[0, 0], [1, 0], [2, 1], [3, 1], [4, 0], [5, 2], [6, 0], [7, 0]], link = (a, b) => K.el('path', { d: `M${x(C[a][0])} ${y(C[a][1])}C${(x(C[a][0]) + x(C[b][0])) / 2} ${y(C[a][1])} ${(x(C[a][0]) + x(C[b][0])) / 2} ${y(C[b][1])} ${x(C[b][0])} ${y(C[b][1])}`, fill: 'none', stroke: K.C[Math.max(C[a][1], C[b][1])], 'stroke-width': 3 }, st.g);
  [[0, 1], [1, 2], [2, 3], [3, 4], [1, 4], [4, 5], [5, 6], [4, 6], [6, 7]].forEach(([a, b]) => link(a, b));
  C.forEach(([i, l]) => K.el('circle', { cx: x(i), cy: y(l), r: 6, fill: 'var(--bg,#fff)', stroke: K.C[l], 'stroke-width': 3 }, st.g)); lanes.forEach((n, l) => K.text(st.g, -8, y(l) + 4, n, { 'text-anchor': 'end', fill: K.C[l] }));
}
```

**Combines with:** Annotate commits with tags or CI status.

---

## Layered architecture diagram

**Use it when:** High-level structure of a system (UI, services, data).

**How I do it**

1. Three full-width layers stacked top to bottom (band scale); each holds component boxes laid out evenly.
2. Vertical arrows show allowed calls (top layer calls the layer below).

**Code** (id `architecture`)

```js
function draw(host, K) {
  const L = [['Frontend', ['Web app', 'Mobile']], ['Services', ['Auth', 'Search', 'Billing']], ['Data', ['Postgres', 'Cache']]];
  const st = K.stage(host, 320, 230, { l: 4, r: 4, t: 4, b: 4 }), y = K.band(L.map(r => r[0]), 0, st.H, 0.22); D.defs(K, st.g);
  L.forEach(([nm, comps], i) => { K.el('rect', { x: 0, y: y(nm), width: st.W, height: y.bw, rx: 8, fill: K.C[i], 'fill-opacity': 0.12, stroke: K.C[i] }, st.g); K.text(st.g, 8, y(nm) + 14, nm, { fill: K.C[i], 'font-weight': 500 }); const w = (st.W - 20 - (comps.length - 1) * 10) / comps.length; comps.forEach((c, j) => { K.el('rect', { x: 10 + j * (w + 10), y: y(nm) + 24, width: w, height: y.bw - 32, rx: 5, fill: 'var(--bg,#fff)', stroke: K.C[i] }, st.g); K.text(st.g, 10 + j * (w + 10) + w / 2, y(nm) + 24 + (y.bw - 32) / 2 + 4, c, { 'text-anchor': 'middle', fill: 'var(--text,#222)' }); }); if (i < 2) K.el('line', { x1: st.W / 2, y1: y(nm) + y.bw, x2: st.W / 2, y2: y(L[i + 1][0]), stroke: 'var(--text,#555)', 'stroke-width': 1.6, 'marker-end': 'url(#ah)' }, st.g); });
}
```

**Combines with:** Overlay latency or error rate per component.

---

## Kanban board (HTML)

**Use it when:** Work items by status.

**How I do it**

1. Data: columns with a list of cards. HTML grid: one flex column per status.
2. A button on each card moves it to the next column (state change, redraw).

**Code** (id `kanban`, has an automated interaction test)

```js
function draw(host, K) {
  const cols = [['To do', ['Clean data', 'Plot ROC']], ['Doing', ['Train model']], ['Done', ['Load CSV']]], root = document.createElement('div'); host.appendChild(root);
  const draw = () => { root.innerHTML = ''; root.style.cssText = 'display:flex;gap:8px;font-size:12px'; cols.forEach(([name, cards], ci) => { const c = document.createElement('div'); c.style.cssText = 'flex:1;background:var(--card,#f4f3ee);border-radius:8px;padding:8px;min-height:110px'; c.innerHTML = '<b>' + name + ' (' + cards.length + ')</b>'; cards.forEach((t, i) => { const k = document.createElement('div'); k.style.cssText = 'background:var(--bg,#fff);border:.5px solid var(--grid,#ddd);border-radius:6px;padding:6px;margin-top:6px;display:flex;justify-content:space-between;gap:4px'; k.innerHTML = '<span>' + t + '</span>'; if (ci < cols.length - 1) { const b = document.createElement('button'); b.textContent = '→'; b.style.cssText = 'padding:0 6px;font-size:12px'; b.addEventListener('click', () => { cols[ci + 1][1].push(cols[ci][1].splice(i, 1)[0]); draw(); }); k.appendChild(b); } c.appendChild(k); }); root.appendChild(c); }); };
  draw();
}
```

**Combines with:** Count per column feeds a cumulative-flow chart.

---
