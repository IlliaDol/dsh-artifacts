# Flow and networks

7 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Sankey diagram

**Use it when:** Quantities moving between stages; the width of a band is the amount.

**How I do it**

1. Assign each node to a layer (column). A node's height = max(total in, total out) * scale.
2. Within a node, links stack top to bottom; each link is a cubic Bezier from the source edge to the target edge drawn with stroke-width = value * scale.
3. K.sankey does the layout; the recipe only draws links first (under) and nodes second.

**Code** (id `sankey`)

```js
function draw(host, K) {
  const nodes = [{ id: 'Visit', layer: 0 }, { id: 'Search', layer: 1 }, { id: 'Direct', layer: 1 }, { id: 'Buy', layer: 2 }, { id: 'Leave', layer: 2 }];
  const links = [{ s: 'Visit', t: 'Search', v: 60 }, { s: 'Visit', t: 'Direct', v: 40 }, { s: 'Search', t: 'Buy', v: 15 }, { s: 'Search', t: 'Leave', v: 45 }, { s: 'Direct', t: 'Buy', v: 22 }, { s: 'Direct', t: 'Leave', v: 18 }];
  const st = K.stage(host, 320, 210, { l: 8, r: 46, t: 6, b: 6 }), S = K.sankey(nodes, links, st.W, st.H, 10, 10);
  S.paths.forEach(p => K.el('path', { d: p.d, fill: 'none', stroke: K.C[nodes.findIndex(n => n.id === p.link.s) % 8], 'stroke-opacity': 0.4, 'stroke-width': p.w }, st.g));
  nodes.forEach((n, i) => { const b = S.nodes[n.id]; K.el('rect', { x: b.x, y: b.y, width: 10, height: b.h, fill: K.C[i % 8] }, st.g); K.text(st.g, b.x + (b.x === 0 ? 14 : -4), b.y + b.h / 2 + 4, n.id, { 'text-anchor': b.x === 0 ? 'start' : (b.x > st.W - 20 ? 'start' : 'end'), fill: 'var(--text,#333)', dx: b.x > st.W - 20 ? 14 : 0 }); });
}
```

**Combines with:** Colour links by source; highlight one path by fading the others.

---

## Alluvial diagram

**Use it when:** How members of categories move between categories over several time points.

**How I do it**

1. Same layout as a Sankey, but every column holds the same categories at a different time.
2. Each link is "people who were in A then and in B now"; stacking order stays consistent across columns.

**Code** (id `alluvial`)

```js
function draw(host, K) {
  const cats = ['Low', 'Mid', 'High'], nodes = [], links = [];
  [0, 1, 2].forEach(t => cats.forEach(c => nodes.push({ id: c + t, layer: t })));
  const M = [[[30, 8, 2], [6, 25, 9], [1, 5, 14]], [[24, 10, 2], [8, 20, 10], [1, 7, 18]]];
  M.forEach((m, t) => cats.forEach((a, i) => cats.forEach((b, j) => links.push({ s: a + t, t: b + (t + 1), v: m[i][j] }))));
  const st = K.stage(host, 320, 210, { l: 14, r: 14, t: 6, b: 22 }), S = K.sankey(nodes, links, st.W, st.H, 10, 10);
  S.paths.forEach(p => K.el('path', { d: p.d, fill: 'none', stroke: K.C[cats.indexOf(p.link.s.slice(0, -1))], 'stroke-opacity': 0.35, 'stroke-width': p.w }, st.g));
  nodes.forEach(n => { const b = S.nodes[n.id]; K.el('rect', { x: b.x, y: b.y, width: 10, height: b.h, fill: K.C[cats.indexOf(n.id.slice(0, -1))] }, st.g); });
  ['2022', '2023', '2024'].forEach((l, i) => K.text(st.g, i * (st.W - 10) / 2 + 5, st.H + 16, l, { 'text-anchor': 'middle' }));
}
```

**Combines with:** Add a time axis label under each column.

---

## Chord diagram

**Use it when:** Many-to-many relationships between a few groups (flows, co-occurrence).

**How I do it**

1. Each group gets an arc on the circle proportional to its total; leave a small gap between arcs.
2. Inside a group's arc, reserve a sub-arc for every partner, sized by the pair's value.
3. A ribbon joins the two sub-arcs of a pair: arc, quadratic curve through the centre, arc, quadratic back.

**Code** (id `chord`)

```js
function draw(host, K) {
  const names = ['A', 'B', 'C', 'D'], M = [[0, 8, 4, 2], [8, 0, 5, 3], [4, 5, 0, 6], [2, 3, 6, 0]], n = 4, gap = 0.08;
  const st = K.stage(host, 320, 230, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2, R = 88, tot = M.map(r => K.sum(r)), k = (2 * Math.PI - gap * n) / K.sum(tot), pt = (a, r = R) => K.polar(cx, cy, r, a);
  let a = 0; const seg = [];
  M.forEach((row, i) => { const a0 = a; let c = a; seg[i] = row.map(v => { const s = { s: c, e: c + v * k }; c = s.e; return s; }); K.el('path', { d: K.arc(cx, cy, R, R + 10, a0, a0 + tot[i] * k), fill: K.C[i] }, st.g); const q = pt(a0 + tot[i] * k / 2, R + 22); K.text(st.g, q[0], q[1] + 4, names[i], { 'text-anchor': 'middle' }); a = a0 + tot[i] * k + gap; });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const A = seg[i][j], B = seg[j][i];
    K.el('path', { d: `M${pt(A.s)}A${R} ${R} 0 0 1 ${pt(A.e)}Q${cx},${cy} ${pt(B.s)}A${R} ${R} 0 0 1 ${pt(B.e)}Q${cx},${cy} ${pt(A.s)}Z`, fill: K.C[i], 'fill-opacity': 0.45, stroke: K.C[i], 'stroke-opacity': 0.6 }, st.g);
  }
}
```

**Combines with:** Order groups to minimise crossing; fade all ribbons except the hovered group.

---

## Arc diagram

**Use it when:** Links between ordered items (chapters, timeline, genome positions).

**How I do it**

1. Nodes sit on one line in a meaningful order.
2. Each link is a half-circle above the line: radius = distance / 2, drawn with an SVG arc (A) command with sweep 1.

**Code** (id `arc`)

```js
function draw(host, K) {
  const n = 10, st = K.stage(host, 320, 160, { l: 12, r: 12, t: 6, b: 24 }), x = K.linear(0, n - 1, 0, st.W), E = [[0, 3], [0, 7], [1, 2], [2, 8], [3, 4], [4, 9], [5, 6], [6, 9], [1, 5]];
  E.forEach(([a, b], i) => K.el('path', { d: `M${x(a)} ${st.H}A${(x(b) - x(a)) / 2} ${(x(b) - x(a)) / 2} 0 0 1 ${x(b)} ${st.H}`, fill: 'none', stroke: K.C[i % 8], 'stroke-width': 1.6, 'stroke-opacity': 0.75 }, st.g));
  for (let i = 0; i < n; i++) { K.el('circle', { cx: x(i), cy: st.H, r: 4, fill: 'var(--text,#333)' }, st.g); K.text(st.g, x(i), st.H + 16, 'n' + (i + 1), { 'text-anchor': 'middle' }); }
}
```

**Combines with:** Arc heights show distance, so sort the nodes to reveal clusters.

---

## Force-directed network

**Use it when:** Who is connected to whom; clusters and hubs.

**How I do it**

1. Give every node a random start position. For 250 steps: all pairs push apart (force k^2/d), linked pairs pull together (force d^2/k), and each node moves by that force capped by a cooling temperature (Fruchterman-Reingold).
2. Draw edges first, then nodes sized by degree; colour by cluster.

**Code** (id `network`)

```js
function draw(host, K) {
  const cl = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2], r = K.rng(5), E = [];
  for (let i = 0; i < 14; i++) for (let j = i + 1; j < 14; j++) if ((cl[i] === cl[j] && r() < 0.85) || r() < 0.06) E.push([i, j]);
  const st = K.stage(host, 320, 230, { l: 6, r: 6, t: 6, b: 6 }), p = K.force(14, E, st.W, st.H, 250, 3), deg = p.map((_, i) => E.filter(e => e.includes(i)).length);
  E.forEach(([a, b]) => K.el('line', { x1: p[a].x, y1: p[a].y, x2: p[b].x, y2: p[b].y, stroke: 'var(--axis,#b4b2a9)', 'stroke-opacity': 0.7 }, st.g));
  p.forEach((q, i) => K.el('circle', { cx: q.x, cy: q.y, r: 4 + deg[i], fill: K.C[cl[i]], stroke: 'var(--bg,#fff)', 'stroke-width': 1.5 }, st.g));
}
```

**Combines with:** Drag-to-pin and hover-highlight neighbours make it interactive; the same graph as a matrix is below.

---

## Adjacency matrix

**Use it when:** Dense networks where a node-link picture turns into a hairball.

**How I do it**

1. Rows and columns are the nodes (ordered by cluster so groups form blocks).
2. A filled cell means "these two are linked". Blocks on the diagonal reveal communities.

**Code** (id `adjacency`)

```js
function draw(host, K) {
  const cl = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2], r = K.rng(5), n = 14, A = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if ((cl[i] === cl[j] && r() < 0.85) || r() < 0.06) A[i][j] = A[j][i] = 1;
  const st = K.stage(host, 320, 230, { l: 20, t: 20 }), c = 14.4;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) K.el('rect', { x: j * c, y: i * c, width: c - 1, height: c - 1, rx: 2, fill: A[i][j] ? K.C[cl[i] === cl[j] ? cl[i] : 7] : 'var(--grid,#efede6)' }, st.g);
  cl.forEach((g, i) => { K.el('rect', { x: -10, y: i * c, width: 6, height: c - 1, fill: K.C[g] }, st.g); K.el('rect', { x: i * c, y: -10, width: c - 1, height: 6, fill: K.C[g] }, st.g); });
}
```

**Combines with:** Same data as the force network; show both side by side with linked highlighting.

---

## Flame graph

**Use it when:** Where time (or memory) goes in nested function calls.

**How I do it**

1. Build the call tree with the time spent in each node; K.sumTree adds children up.
2. K.partition lays every call out by its share of the total; the root sits at the bottom and callees stack upward.
3. Colour is decorative (warm hues). Wide boxes are the hot spots.

**Code** (id `flame`)

```js
function draw(host, K) {
  const t = { name: 'main', children: [{ name: 'load', children: [{ name: 'read', value: 18 }, { name: 'parse', value: 12 }] }, { name: 'train', children: [{ name: 'fit', children: [{ name: 'grad', value: 30 }, { name: 'step', value: 10 }] }, { name: 'eval', value: 8 }] }, { name: 'plot', value: 7 }] };
  K.sumTree(t);
  const st = K.stage(host, 320, 190, { l: 6, r: 6, t: 6, b: 6 }), h = 26, hot = ['#e34948', '#eb6834', '#eda100', '#eb8b34'];
  K.partition(t).forEach((p, i) => {
    K.el('rect', { x: p.x0 * st.W, y: st.H - (p.depth + 1) * h, width: Math.max(0, (p.x1 - p.x0) * st.W - 1.5), height: h - 2, rx: 2, fill: hot[(i * 7) % 4] }, st.g);
    if ((p.x1 - p.x0) * st.W > 30) K.text(st.g, p.x0 * st.W + 4, st.H - (p.depth + 1) * h + h / 2 + 3, p.n.name, { fill: '#fff' });
  });
}
```

**Combines with:** Click a frame to zoom (make it the new root and redraw).

---
