# Relationships and correlation

10 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Scatter plot

**Use it when:** Relationship between two numeric variables; spot clusters and outliers.

**How I do it**

1. Two linear scales (do not force zero if the data sits far from it).
2. One semi-transparent circle per row so overlaps stay visible.
3. Label only the points that matter (outliers), not all of them.

**Code** (id `scatter`)

```js
function draw(host, K) {
  const r = K.rng(5), pts = Array.from({ length: 80 }, () => { const a = 50 + 15 * K.normal(r); return [a, 0.6 * a + 10 + 7 * K.normal(r)]; });
  pts.push([85, 30]);
  const st = K.stage(host), x = K.linear(10, 100, 0, st.W), y = K.linear(10, 80, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  pts.forEach(([a, b]) => K.el('circle', { cx: x(a), cy: y(b), r: 3.4, fill: K.C[0], 'fill-opacity': 0.6 }, st.g));
  K.el('circle', { cx: x(85), cy: y(30), r: 6, fill: 'none', stroke: K.C[1], 'stroke-width': 2 }, st.g);
  K.text(st.g, x(85) - 8, y(30) - 10, 'outlier', { 'text-anchor': 'end', fill: K.C[1] });
}
```

**Combines with:** Add a regression line, marginal histograms or colour by a third variable.

---

## Bubble chart

**Use it when:** A third numeric variable is shown by size.

**How I do it**

1. Map the third variable to AREA, not radius: r = sqrt(v) * k, otherwise big values look far too big.
2. Draw the biggest bubbles first so small ones remain visible on top.

**Code** (id `bubble`)

```js
function draw(host, K) {
  const d = [['A', 20, 30, 40], ['B', 40, 60, 90], ['C', 55, 35, 20], ['D', 70, 75, 60], ['E', 85, 45, 120], ['F', 30, 80, 10]];
  const st = K.stage(host), x = K.linear(0, 100, 0, st.W), y = K.linear(0, 100, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  d.slice().sort((a, b) => b[3] - a[3]).forEach(([k, a, b, v], i) => {
    K.el('circle', { cx: x(a), cy: y(b), r: Math.sqrt(v) * 2.2, fill: K.C[d.findIndex(q => q[0] === k) % 8], 'fill-opacity': 0.6, stroke: 'var(--bg,#fff)' }, st.g);
    K.text(st.g, x(a), y(b) + 4, k, { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 500 });
  });
}
```

**Combines with:** Add colour for a fourth (categorical) variable.

---

## Scatter-plot matrix

**Use it when:** Look at every pairwise relationship in a small set of variables.

**How I do it**

1. A grid: cell (i, j) plots variable j (x) against variable i (y); the diagonal shows each variable's histogram.
2. Each variable gets its own scale, shared by its row and its column.

**Code** (id `splom`)

```js
function draw(host, K) {
  const r = K.rng(6), N = 90, A = K.sample(1, N, 0, 1), B = A.map(v => 0.8 * v + 0.6 * K.normal(r)), C = A.map(v => -0.5 * v + 0.9 * K.normal(r));
  const vars = [['A', A], ['B', B], ['C', C]], c = 92, st = K.stage(host, 320, 300, { l: 20, t: 6, r: 8, b: 8 });
  const sc = d => K.linear(Math.min(...d), Math.max(...d), 0, c - 12);
  vars.forEach(([ni, di], i) => vars.forEach(([nj, dj], j) => {
    const g = K.el('g', { transform: `translate(${j * (c + 4)},${i * (c + 4)})` }, st.g), x = sc(dj), y = K.linear(Math.min(...di), Math.max(...di), c - 12, 0);
    K.el('rect', { x: 0, y: 0, width: c - 12, height: c - 12, fill: 'none', stroke: 'var(--grid,#e1e0d9)' }, g);
    if (i === j) { const b = K.hist(di, Math.min(...di), Math.max(...di) + 1e-6, 8), m = Math.max(...b.map(q => q.n)); b.forEach(q => K.el('rect', { x: x(q.x0), y: (c - 12) - q.n / m * (c - 12), width: x(q.x1) - x(q.x0) - 1, height: q.n / m * (c - 12), fill: K.C[i] }, g)); }
    else di.forEach((v, k) => K.el('circle', { cx: x(dj[k]), cy: y(v), r: 1.8, fill: K.C[0], 'fill-opacity': 0.55 }, g));
    if (j === 0) K.text(g, -4, (c - 12) / 2 + 4, ni, { 'text-anchor': 'end' });
    if (i === 2) K.text(g, (c - 12) / 2, c + 2, nj, { 'text-anchor': 'middle' });
  }));
}
```

**Combines with:** Colour points by group; replace the upper triangle by correlation numbers (see Correlogram).

---

## Correlation matrix (correlogram)

**Use it when:** Which variables move together? A grid of correlation coefficients.

**How I do it**

1. Compute Pearson r for every pair (K.corr); the matrix is symmetric with 1 on the diagonal.
2. Map r from -1..1 to a diverging colour ramp (red to neutral to blue) with a neutral midpoint at 0.
3. Print r in each cell; use light text on dark cells.

**Code** (id `correlogram`)

```js
function draw(host, K) {
  const r = K.rng(7), N = 100, a = K.sample(1, N, 0, 1), vars = [['Hours', a], ['Score', a.map(v => 0.7 * v + 0.6 * K.normal(r))], ['Sleep', a.map(v => 0.3 * v + 0.9 * K.normal(r))], ['Stress', a.map(v => -0.5 * v + 0.8 * K.normal(r))]];
  const st = K.stage(host, 320, 230, { l: 52, t: 28 }), c = 50;
  vars.forEach(([ni, di], i) => {
    K.text(st.g, -6, i * c + c / 2 + 4, ni, { 'text-anchor': 'end' }); K.text(st.g, i * c + c / 2, -8, ni, { 'text-anchor': 'middle' });
    vars.forEach(([nj, dj], j) => {
      const v = K.corr(di, dj);
      K.el('rect', { x: j * c, y: i * c, width: c - 2, height: c - 2, rx: 4, fill: K.div((v + 1) / 2) }, st.g);
      K.text(st.g, j * c + c / 2 - 1, i * c + c / 2 + 3, v.toFixed(2), { 'text-anchor': 'middle', fill: Math.abs(v) > 0.6 ? '#fff' : '#222' });
    });
  });
}
```

**Combines with:** Cluster rows and columns so correlated variables sit together.

---

## Connected scatter plot

**Use it when:** Two variables that both change over time: see the path they take.

**How I do it**

1. Plot (x, y) for each period like a scatter plot, then join the points in time order.
2. Label start, end and a few years; arrowheads or numbers show direction.

**Code** (id `connected`)

```js
function draw(host, K) {
  const yrs = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022], X = [20, 25, 33, 38, 46, 44, 55, 63], Y = [60, 52, 55, 40, 44, 30, 28, 20];
  const st = K.stage(host), x = K.linear(10, 70, 0, st.W), y = K.linear(10, 70, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  K.el('path', { d: K.path(X.map((v, i) => [x(v), y(Y[i])])), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
  X.forEach((v, i) => { K.el('circle', { cx: x(v), cy: y(Y[i]), r: 4, fill: i === 0 || i === 7 ? K.C[1] : K.C[0] }, st.g); if (i % 2 === 0 || i === 7) K.text(st.g, x(v) + 6, y(Y[i]) - 6, yrs[i]); });
}
```

**Combines with:** Same data as two line charts, but this shows how the relationship moves.

---

## Regression line with confidence band

**Use it when:** A trend plus how sure we are about it.

**How I do it**

1. Fit least squares with K.lin: slope b, intercept a, residual standard deviation s.
2. Standard error of the mean at x0: s * sqrt(1/n + (x0 - mean x)^2 / Sxx); band = fit +/- 1.99 * se (t for ~80 observations).
3. The band is narrowest near the mean of x and fans out at the edges: this is a polygon built from the upper and lower curves.

**Code** (id `regci`)

```js
function draw(host, K) {
  const r = K.rng(5), xs = [], ys = []; for (let i = 0; i < 70; i++) { const a = 20 + 70 * r(); xs.push(a); ys.push(0.5 * a + 8 + 8 * K.normal(r)); }
  const m = K.lin(xs, ys), st = K.stage(host), x = K.linear(10, 100, 0, st.W), y = K.linear(0, 80, st.H, 0), gx = K.range(15, 95, 40);
  const se = v => m.s * Math.sqrt(1 / m.n + (v - m.mx) ** 2 / m.sxx), fit = v => m.a + m.b * v;
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  const up = gx.map(v => [x(v), y(fit(v) + 1.99 * se(v))]), lo = gx.map(v => [x(v), y(fit(v) - 1.99 * se(v))]).reverse();
  K.el('path', { d: K.path(up.concat(lo)) + 'Z', fill: K.C[1], 'fill-opacity': 0.2 }, st.g);
  xs.forEach((v, i) => K.el('circle', { cx: x(v), cy: y(ys[i]), r: 3, fill: K.C[0], 'fill-opacity': 0.55 }, st.g));
  K.el('line', { x1: x(15), y1: y(fit(15)), x2: x(95), y2: y(fit(95)), stroke: K.C[1], 'stroke-width': 2.5 }, st.g);
}
```

**Combines with:** This is a three-layer combination: points, band, line.

---

## Parallel coordinates

**Use it when:** Compare many numeric dimensions at once and see groups.

**How I do it**

1. One vertical axis per variable, each rescaled to its own min and max.
2. Each row becomes a polyline through its position on every axis; colour by group.

**Code** (id `parallel`)

```js
function draw(host, K) {
  const dims = ['Height', 'Weight', 'Speed', 'Score'], r = K.rng(8), N = 36;
  const mu = [[0.3, 0.7, 0.3, 0.6], [0.5, 0.5, 0.6, 0.4], [0.75, 0.3, 0.8, 0.2]];
  const rows = Array.from({ length: N }, (_, i) => { const g = i % 3; return [g, ...dims.map((_, d) => mu[g][d] + 0.09 * K.normal(r))]; });
  const st = K.stage(host, 320, 210, { l: 20, r: 20, b: 26 }), x = K.linear(0, dims.length - 1, 0, st.W), y = K.linear(0, 1, st.H, 0);
  dims.forEach((d, i) => { K.el('line', { x1: x(i), x2: x(i), y1: 0, y2: st.H, stroke: 'var(--axis,#c3c2b7)' }, st.g); K.text(st.g, x(i), st.H + 16, d, { 'text-anchor': 'middle' }); });
  rows.forEach(([g, ...v]) => K.el('path', { d: K.path(v.map((q, i) => [x(i), y(K.clamp(q, 0, 1))])), fill: 'none', stroke: K.C[g], 'stroke-opacity': 0.55, 'stroke-width': 1.4 }, st.g));
}
```

**Combines with:** Brush an axis range to highlight rows (linked views pattern).

---

## Quadrant (2x2) chart

**Use it when:** Prioritise items on two criteria (impact vs effort, risk vs reward).

**How I do it**

1. Two linear axes with the dividing lines at the midpoint (or median) of each.
2. Name each quadrant in its corner (high impact + low effort = "Do first", top-left here); place items as labelled dots, flipping the label to the left near the right edge.

**Code** (id `quadrant`)

```js
function draw(host, K) {
  const it = [['Docs', 20, 30], ['Cache', 70, 80], ['Tests', 35, 70], ['Redesign', 85, 25], ['Alerts', 55, 60], ['Rename', 15, 15]];
  const st = K.stage(host, 320, 220, { l: 24, b: 24 }), x = K.linear(0, 100, 0, st.W), y = K.linear(0, 100, st.H, 0);
  K.el('rect', { x: 0, y: 0, width: x(50), height: y(50), fill: K.C[2], 'fill-opacity': 0.1 }, st.g);
  K.el('line', { x1: x(50), x2: x(50), y1: 0, y2: st.H, stroke: 'var(--axis,#c3c2b7)' }, st.g); K.el('line', { x1: 0, x2: st.W, y1: y(50), y2: y(50), stroke: 'var(--axis,#c3c2b7)' }, st.g);
  K.text(st.g, 4, 12, 'Do first', { 'font-weight': 500 }); K.text(st.g, st.W - 4, 12, 'Plan', { 'text-anchor': 'end' }); K.text(st.g, 4, st.H - 4, 'Fill in'); K.text(st.g, st.W - 4, st.H - 4, 'Skip', { 'text-anchor': 'end' });
  K.text(st.g, st.W / 2, st.H + 18, 'effort  →', { 'text-anchor': 'middle' }); K.text(st.g, -8, st.H / 2, 'impact', { 'text-anchor': 'middle', transform: `rotate(-90 -8 ${st.H / 2})` });
  it.forEach(([k, a, b], i) => { K.el('circle', { cx: x(a), cy: y(b), r: 5, fill: K.C[i % 8] }, st.g); K.text(st.g, a > 75 ? x(a) - 8 : x(a) + 8, y(b) + 4, k, { fill: 'var(--text,#333)', 'text-anchor': a > 75 ? 'end' : 'start' }); });
}
```

**Combines with:** Size the dots by a third variable (becomes a bubble chart).

---

## Heatmap (matrix)

**Use it when:** A value for every pair of categories (hour by weekday, model by metric).

**How I do it**

1. Band scales on both axes; one rect per cell.
2. Fill with a sequential ramp (one hue, light to dark); add a thin gap so cells read as cells.

**Code** (id `heatmap`)

```js
function draw(host, K) {
  const rows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], cols = ['8h', '10h', '12h', '14h', '16h', '18h'], r = K.rng(14);
  const st = K.stage(host, 320, 210, { l: 36, t: 26 }), x = K.band(cols, 0, st.W, 0.06), y = K.band(rows, 0, st.H, 0.06);
  rows.forEach(a => cols.forEach(b => { const v = r() * (b === '12h' || b === '14h' ? 1 : 0.6); K.el('rect', { x: x(b), y: y(a), width: x.bw, height: y.bw, rx: 3, fill: K.seq(v) }, st.g); }));
  rows.forEach(a => K.text(st.g, -6, y(a) + y.bw / 2 + 4, a, { 'text-anchor': 'end' }));
  cols.forEach(b => K.text(st.g, x(b) + x.bw / 2, -8, b, { 'text-anchor': 'middle' }));
}
```

**Combines with:** Order rows and columns by similarity (clustering) to reveal blocks.

---

## Radar (spider) chart

**Use it when:** Profile of one or a few items across 5 to 8 comparable metrics.

**How I do it**

1. Axes are spokes at equal angles (2 pi / n); value maps to the distance from the centre.
2. Rings give the scale; connect the points of each series into a closed polygon.
3. Metrics must share a scale (0 to 100), otherwise the shape is meaningless.

**Code** (id `radar`)

```js
function draw(host, K) {
  const ax = ['Speed', 'Power', 'Range', 'Cost', 'Safety', 'Comfort'], S = [['A', [80, 60, 70, 50, 90, 65]], ['B', [55, 85, 60, 75, 60, 80]]];
  const st = K.stage(host, 320, 230, { t: 8, b: 8 }), cx = st.W / 2, cy = st.H / 2, R = 78, a = i => i / ax.length * 2 * Math.PI;
  [0.25, 0.5, 0.75, 1].forEach(f => K.el('polygon', { points: ax.map((_, i) => K.polar(cx, cy, R * f, a(i)).join(',')).join(' '), fill: 'none', stroke: 'var(--grid,#e1e0d9)' }, st.g));
  ax.forEach((n, i) => { const p = K.polar(cx, cy, R, a(i)), q = K.polar(cx, cy, R + 14, a(i)); K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--grid,#e1e0d9)' }, st.g); K.text(st.g, q[0], q[1] + 4, n, { 'text-anchor': 'middle' }); });
  S.forEach(([k, v], j) => K.el('polygon', { points: v.map((q, i) => K.polar(cx, cy, R * q / 100, a(i)).join(',')).join(' '), fill: K.C[j], 'fill-opacity': 0.22, stroke: K.C[j], 'stroke-width': 2 }, st.g));
  K.legend(st.g, S.map(([k], j) => [k, K.C[j]]), 0, st.H - 12, 40);
}
```

**Combines with:** Keep to 2 or 3 series; for more, use small multiples of single radars.

---
