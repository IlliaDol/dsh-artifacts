# Part-to-whole and hierarchy

11 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Pie chart

**Use it when:** Few parts (2 to 5) of ONE whole, where the question is "which is the biggest share?".

**How I do it**

1. Convert values to angles: angle = value / total * 2 pi; keep a running start angle.
2. Each slice is K.arc(cx, cy, 0, r, a0, a1). Start at 12 o'clock and go clockwise, largest first.
3. Label outside with the value; a legend is not needed with 4 slices.

**Code** (id `pie`)

```js
function draw(host, K) {
  const d = [['Python', 48], ['SQL', 27], ['R', 15], ['Other', 10]], tot = K.sum(d.map(r => r[1]));
  const st = K.stage(host, 320, 220, { l: 10, r: 10, t: 10, b: 10 }), cx = st.W / 2, cy = st.H / 2, R = 78; let a = 0;
  d.forEach(([k, v], j) => {
    const b = a + v / tot * 2 * Math.PI, m = (a + b) / 2, p = K.polar(cx, cy, R + 14, m);
    K.el('path', { d: K.arc(cx, cy, 0, R, a, b), fill: K.C[j], stroke: 'var(--bg,#fff)', 'stroke-width': 2 }, st.g);
    K.text(st.g, p[0], p[1] + 4, k + ' ' + v + '%', { 'text-anchor': p[0] > cx ? 'start' : 'end', fill: 'var(--text,#333)' });
    a = b;
  });
}
```

**Combines with:** Use a donut with the total in the middle, or a bar chart when shares are close.

---

## Donut chart

**Use it when:** Same as a pie, with a total or key number in the hole.

**How I do it**

1. Same angles as a pie, but the inner radius is about 60% of the outer one.
2. The centre carries the total; this is also where a KPI value can sit.

**Code** (id `donut`)

```js
function draw(host, K) {
  const d = [['Done', 62], ['Doing', 23], ['Todo', 15]], tot = K.sum(d.map(r => r[1]));
  const st = K.stage(host, 320, 220, { l: 10, r: 10 }), cx = st.W / 2, cy = st.H / 2; let a = 0;
  d.forEach(([k, v], j) => { const b = a + v / tot * 2 * Math.PI; K.el('path', { d: K.arc(cx, cy, 52, 84, a, b - 0.02), fill: K.C[[2, 0, 3][j]] }, st.g); a = b; });
  K.text(st.g, cx, cy + 6, '62%', { 'text-anchor': 'middle', 'font-size': 26, fill: 'var(--text,#222)', 'font-weight': 500 });
  K.text(st.g, cx, cy + 22, 'complete', { 'text-anchor': 'middle' });
  K.legend(st.g, d.map(([k], j) => [k, K.C[[2, 0, 3][j]]]), cx - 70, st.H - 8, 50);
}
```

**Combines with:** Concentric donuts (rings) compare two periods.

---

## Semi-circle (half) donut

**Use it when:** Parliament-style shares or a gauge-like "x of y".

**How I do it**

1. Use only the angles from -90 to +90 degrees (-pi/2 to pi/2).
2. Everything else is a normal donut: scale values to the half circle instead of the full one.

**Code** (id `semipie`)

```js
function draw(host, K) {
  const d = [['A', 38], ['B', 27], ['C', 20], ['D', 15]], tot = K.sum(d.map(r => r[1]));
  const st = K.stage(host, 320, 170, { l: 10, r: 10, t: 14 }), cx = st.W / 2, cy = st.H - 20; let a = -Math.PI / 2;
  d.forEach(([k, v], j) => { const b = a + v / tot * Math.PI; K.el('path', { d: K.arc(cx, cy, 60, 100, a, b - 0.01), fill: K.C[j] }, st.g); const p = K.polar(cx, cy, 112, (a + b) / 2); K.text(st.g, p[0], p[1] + 4, k, { 'text-anchor': 'middle' }); a = b; });
  K.text(st.g, cx, cy, tot + ' seats', { 'text-anchor': 'middle', 'font-size': 14, fill: 'var(--text,#222)' });
}
```

**Combines with:** Gauges (tables and dashboards family) are the same shape with one value and a needle.

---

## Treemap

**Use it when:** Many parts of a whole in a hierarchy; size shows the share.

**How I do it**

1. Sum values up the tree (K.sumTree) so every group knows its total.
2. Squarify the groups into the full rectangle (K.squarify keeps tiles close to squares), then squarify each group's children inside its tile.
3. Colour by top-level group; print labels only on tiles large enough to hold them.

**Code** (id `treemap`)

```js
function draw(host, K) {
  const t = { name: 'All', children: [{ name: 'Food', children: [{ name: 'Fruit', value: 30 }, { name: 'Veg', value: 20 }, { name: 'Grain', value: 15 }] }, { name: 'Tech', children: [{ name: 'Phones', value: 40 }, { name: 'PCs', value: 25 }] }, { name: 'Home', children: [{ name: 'Tools', value: 18 }, { name: 'Decor', value: 12 }] }] };
  K.sumTree(t);
  const st = K.stage(host, 320, 220, { l: 4, r: 4, t: 4, b: 4 });
  K.squarify(t.children.slice().sort((a, b) => b.value - a.value), 0, 0, st.W, st.H).forEach((g, gi) => {
    const col = K.C[t.children.indexOf(g.item)];
    K.squarify(g.item.children.slice().sort((a, b) => b.value - a.value), g.x + 1.5, g.y + 1.5, g.w - 3, g.h - 3).forEach(c => {
      K.el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, fill: col, 'fill-opacity': 0.55 + 0.4 * c.item.value / g.item.value, stroke: 'var(--bg,#fff)', 'stroke-width': 1.5 }, st.g);
      if (c.w > 34 && c.h > 18) K.text(st.g, c.x + 5, c.y + 14, c.item.name, { fill: '#fff' });
    });
  });
}
```

**Combines with:** Click-to-zoom into a group (state = current root, then redraw) is the usual interactive extension.

---

## Sunburst chart

**Use it when:** A hierarchy where the path from the centre outwards matters.

**How I do it**

1. K.partition gives every node a fraction range [x0, x1] and a depth.
2. Angle = fraction * 2 pi; ring = depth. Each node is K.arc(cx, cy, ringInner, ringOuter, a0, a1).
3. Children inherit the colour of their top-level parent.

**Code** (id `sunburst`)

```js
function draw(host, K) {
  const t = { name: 'All', children: [{ name: 'Food', children: [{ name: 'Fruit', value: 30 }, { name: 'Veg', value: 20 }, { name: 'Grain', value: 15 }] }, { name: 'Tech', children: [{ name: 'Phones', value: 40 }, { name: 'PCs', value: 25 }] }, { name: 'Home', children: [{ name: 'Tools', value: 18 }, { name: 'Decor', value: 12 }] }] };
  K.sumTree(t);
  const st = K.stage(host, 320, 230, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2, rw = 44;
  K.partition(t).filter(p => p.depth > 0).forEach(p => {
    const top = p.depth === 1 ? p.n : t.children.find(c => c.children && c.children.includes(p.n));
    K.el('path', { d: K.arc(cx, cy, p.depth * rw - 30, p.depth * rw + 12, p.x0 * 2 * Math.PI, p.x1 * 2 * Math.PI - 0.005), fill: K.C[t.children.indexOf(top)], 'fill-opacity': p.depth === 1 ? 1 : 0.6, stroke: 'var(--bg,#fff)' }, st.g);
  });
}
```

**Combines with:** Same data as a treemap; choose a sunburst for paths, a treemap for comparing sizes.

---

## Icicle chart

**Use it when:** A hierarchy as stacked rows; easier to label than a sunburst.

**How I do it**

1. Same K.partition layout as the sunburst, drawn as rectangles: x from x0 to x1, y from depth.
2. Rows are levels; width is share. Labels fit horizontally.

**Code** (id `icicle`)

```js
function draw(host, K) {
  const t = { name: 'All', children: [{ name: 'Food', children: [{ name: 'Fruit', value: 30 }, { name: 'Veg', value: 20 }, { name: 'Grain', value: 15 }] }, { name: 'Tech', children: [{ name: 'Phones', value: 40 }, { name: 'PCs', value: 25 }] }, { name: 'Home', children: [{ name: 'Tools', value: 18 }, { name: 'Decor', value: 12 }] }] };
  K.sumTree(t);
  const st = K.stage(host, 320, 170, { l: 6, r: 6, t: 6, b: 6 }), h = st.H / 3;
  K.partition(t).forEach(p => {
    const top = p.depth === 0 ? null : p.depth === 1 ? p.n : t.children.find(c => c.children && c.children.includes(p.n));
    K.el('rect', { x: p.x0 * st.W, y: p.depth * h, width: (p.x1 - p.x0) * st.W - 1.5, height: h - 2, rx: 3, fill: top ? K.C[t.children.indexOf(top)] : '#898781', 'fill-opacity': p.depth === 2 ? 0.6 : 1 }, st.g);
    if ((p.x1 - p.x0) * st.W > 38) K.text(st.g, p.x0 * st.W + 5, p.depth * h + h / 2 + 3, p.n.name, { fill: '#fff' });
  });
}
```

**Combines with:** The flame graph (flow family) is an icicle turned upside down.

---

## Circle packing

**Use it when:** Sizes of many items where area matters and exact position does not.

**How I do it**

1. Radius = sqrt(value) so AREA is proportional to value.
2. K.pack places circles largest first along an outward spiral at the first spot that touches no placed circle.
3. Centre the cloud and scale it to fit the stage.

**Code** (id `circlepack`)

```js
function draw(host, K) {
  const d = [['Python', 68], ['SQL', 57], ['R', 41], ['Java', 29], ['Julia', 12], ['Go', 20], ['C++', 25], ['Rust', 15]];
  const c = K.pack(d.map(r => r[1])), x0 = Math.min(...c.map(p => p.x - p.r)), x1 = Math.max(...c.map(p => p.x + p.r)), y0 = Math.min(...c.map(p => p.y - p.r)), y1 = Math.max(...c.map(p => p.y + p.r));
  const st = K.stage(host, 320, 220, { l: 4, r: 4, t: 4, b: 4 }), k = Math.min(st.W / (x1 - x0), st.H / (y1 - y0));
  c.forEach((p, i) => {
    const cx = (p.x - (x0 + x1) / 2) * k + st.W / 2, cy = (p.y - (y0 + y1) / 2) * k + st.H / 2;
    K.el('circle', { cx, cy, r: p.r * k, fill: K.C[i % 8], 'fill-opacity': 0.75 }, st.g);
    if (p.r * k > 14) K.text(st.g, cx, cy + 4, d[i][0], { 'text-anchor': 'middle', fill: '#fff' });
  });
}
```

**Combines with:** Nest packs inside bigger circles for hierarchy; colour by category.

---

## Tree diagram (dendrogram layout)

**Use it when:** Parent-child structure: taxonomy, file tree, clustering result.

**How I do it**

1. K.tree gives every node a depth (_d) and a vertical slot (_x): leaves get consecutive slots, parents sit at the middle of their children.
2. Map depth to x and slot to y; draw elbow links (horizontal, vertical, horizontal) before the node dots.

**Code** (id `tree`)

```js
function draw(host, K) {
  const t = { name: 'Data', children: [{ name: 'Tabular', children: [{ name: 'CSV' }, { name: 'SQL' }] }, { name: 'Text', children: [{ name: 'Logs' }, { name: 'Docs' }, { name: 'Chat' }] }, { name: 'Media', children: [{ name: 'Image' }] }] };
  const L = K.tree(t), st = K.stage(host, 320, 230, { l: 10, r: 56 }), x = K.linear(0, 2, 0, st.W), y = K.linear(0, L.leaves - 1, 10, st.H - 10);
  L.nodes.forEach(n => (n.children || []).forEach(c => K.el('path', { d: `M${x(n._d)} ${y(n._x)}H${(x(n._d) + x(c._d)) / 2}V${y(c._x)}H${x(c._d)}`, fill: 'none', stroke: 'var(--axis,#b4b2a9)' }, st.g)));
  L.nodes.forEach(n => { K.el('circle', { cx: x(n._d), cy: y(n._x), r: 4.5, fill: n.children ? K.C[0] : K.C[2] }, st.g); K.text(st.g, x(n._d) + (n.children ? -2 : 8), y(n._x) + (n.children ? -8 : 4), n.name, { fill: 'var(--text,#333)', 'text-anchor': n.children && n._d ? 'middle' : 'start' }); });
}
```

**Combines with:** Add leaf values as bars on the right to make a dendrogram with data.

---

## Org chart

**Use it when:** Reporting lines: who belongs to whom.

**How I do it**

1. Same K.tree layout, rotated: depth to y, slot to x.
2. Nodes are rounded boxes with a title; connectors drop from the parent, run sideways, then drop to each child.

**Code** (id `orgchart`)

```js
function draw(host, K) {
  const t = { name: 'CEO', children: [{ name: 'Eng', children: [{ name: 'Data' }, { name: 'Web' }] }, { name: 'Ops', children: [{ name: 'Sales' }, { name: 'Care' }] }] };
  const L = K.tree(t), st = K.stage(host, 320, 200, { l: 10, r: 10 }), x = K.linear(0, L.leaves - 1, 28, st.W - 28), y = d => d * 62 + 8, bw = 54, bh = 26;
  L.nodes.forEach(n => (n.children || []).forEach(c => K.el('path', { d: `M${x(n._x)} ${y(n._d) + bh}V${y(n._d) + bh + 14}H${x(c._x)}V${y(c._d)}`, fill: 'none', stroke: 'var(--axis,#b4b2a9)' }, st.g)));
  L.nodes.forEach(n => { K.el('rect', { x: x(n._x) - bw / 2, y: y(n._d), width: bw, height: bh, rx: 6, fill: K.C[n._d % 8], 'fill-opacity': 0.9 }, st.g); K.text(st.g, x(n._x), y(n._d) + bh / 2 + 4, n.name, { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 500 }); });
}
```

**Combines with:** Colour boxes by department or add a headcount badge.

---

## Nightingale rose (polar area)

**Use it when:** Cyclical data (months, hours) where the circle reflects the cycle.

**How I do it**

1. Equal angle per category (2 pi / 12), radius = sqrt(value) so AREA, not length, encodes the value.
2. Draw each wedge with K.arc(cx, cy, 0, r, a0, a1); add faint rings for scale.

**Code** (id `rose`)

```js
function draw(host, K) {
  const v = K.series(2, 12, 50, 0, 30, 6).map(Math.abs), m = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const st = K.stage(host, 320, 230, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2, R = 92, mx = Math.max(...v), step = 2 * Math.PI / 12;
  [0.5, 1].forEach(f => K.el('circle', { cx, cy, r: R * f, fill: 'none', stroke: 'var(--grid,#e1e0d9)' }, st.g));
  v.forEach((q, i) => { K.el('path', { d: K.arc(cx, cy, 0, R * Math.sqrt(q / mx), i * step, (i + 1) * step - 0.03), fill: K.C[i % 2 ? 1 : 0], 'fill-opacity': 0.8 }, st.g); const p = K.polar(cx, cy, R + 12, (i + 0.5) * step); K.text(st.g, p[0], p[1] + 4, m[i], { 'text-anchor': 'middle' }); });
}
```

**Combines with:** Stack two series per wedge for a second dimension.

---

## Mind map (radial tree)

**Use it when:** Brainstorm structure around one central idea.

**How I do it**

1. Root in the centre; level-1 nodes spread around it at equal angles on a circle.
2. Each level-2 node sits on a larger circle within its parent's angular sector.

**Code** (id `mindmap`)

```js
function draw(host, K) {
  const t = [['Plan', ['Goals', 'Scope']], ['Build', ['Code', 'Test', 'Docs']], ['Ship', ['Deploy']], ['Learn', ['Retro', 'Metrics']]];
  const st = K.stage(host, 320, 230, { l: 6, r: 6, t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2;
  t.forEach(([k, kids], i) => {
    const a = i / t.length * 2 * Math.PI + 0.4, p = K.polar(cx, cy, 52, a), sector = 2 * Math.PI / t.length * 0.7;
    K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: K.C[i], 'stroke-width': 2 }, st.g);
    kids.forEach((c, j) => { const b = a + (kids.length === 1 ? 0 : (j / (kids.length - 1) - 0.5) * sector), q = K.polar(cx, cy, 104, b); K.el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: K.C[i], 'stroke-opacity': 0.6 }, st.g); K.text(st.g, q[0] + (q[0] > cx ? 4 : -4), q[1] + 4, c, { 'text-anchor': q[0] > cx ? 'start' : 'end', fill: 'var(--text,#333)' }); });
    K.el('circle', { cx: p[0], cy: p[1], r: 15, fill: K.C[i] }, st.g); K.text(st.g, p[0], p[1] + 4, k, { 'text-anchor': 'middle', fill: '#fff', 'font-size': 10 });
  });
  K.el('circle', { cx, cy, r: 20, fill: 'var(--text,#222)' }, st.g); K.text(st.g, cx, cy + 4, 'Project', { 'text-anchor': 'middle', fill: '#fff', 'font-size': 10 });
}
```

**Combines with:** Mermaid can generate the same from text (see the diagrams family).

---
