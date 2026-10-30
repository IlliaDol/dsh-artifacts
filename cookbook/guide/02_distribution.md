# Distribution

10 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Histogram

**Use it when:** Shape of ONE numeric variable: centre, spread, skew, gaps.

**How I do it**

1. Choose a range and a number of bins; K.hist counts values per bin.
2. x is a linear scale over the value range; bar height = count.
3. Bin count changes the story: try 10, 25 and 60 before trusting a shape.

**Code** (id `histogram`)

```js
function draw(host, K) {
  const d = K.sample(1, 500, 50, 12), bins = K.hist(d, 10, 90, 24);
  const st = K.stage(host), x = K.linear(10, 90, 0, st.W), y = K.linear(0, Math.max(...bins.map(b => b.n)) * 1.1, st.H, 0);
  K.axisY(st, y, 4);
  bins.forEach(b => K.el('rect', { x: x(b.x0) + 0.5, y: y(b.n), width: x(b.x1) - x(b.x0) - 1, height: st.H - y(b.n), fill: K.C[0], rx: 1.5 }, st.g));
  K.axisX(st, x, 4);
}
```

**Combines with:** Layer a density curve and a rug on top (see Combining recipes).

---

## Density plot (KDE)

**Use it when:** A smooth version of the histogram; good for comparing several groups.

**How I do it**

1. Kernel density: put a small bell curve on every data point and add them up (K.kde).
2. Bandwidth sets smoothness; Silverman's rule (K.bw) is a sensible default.
3. Draw as a filled path closed along the baseline.

**Code** (id `density`)

```js
function draw(host, K) {
  const d = K.sample(2, 400, 50, 12), xs = K.range(10, 90, 120), ys = K.kde(d, K.bw(d), xs);
  const st = K.stage(host), x = K.linear(10, 90, 0, st.W), y = K.linear(0, Math.max(...ys) * 1.1, st.H, 0);
  const pts = xs.map((v, i) => [x(v), y(ys[i])]);
  K.axisY(st, y, 4, v => v.toFixed(2));
  K.el('path', { d: K.path(pts) + `L${st.W} ${st.H}L0 ${st.H}Z`, fill: K.C[0], 'fill-opacity': 0.18 }, st.g);
  K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
  K.axisX(st, x, 4);
}
```

**Combines with:** Overlay several groups with transparency, or stack as a ridgeline.

---

## Box plot

**Use it when:** Compare spread, median and outliers across groups at a glance.

**How I do it**

1. Sort each group; get Q1, median, Q3 with K.quantile.
2. Whiskers reach the furthest points within 1.5 x IQR of the box; the rest are outliers.
3. Draw whisker line, box, median bar, then outlier dots.

**Code** (id `boxplot`)

```js
function draw(host, K) {
  const groups = [['A', K.sample(1, 120, 50, 8)], ['B', K.sample(2, 120, 60, 14)], ['C', K.sample(3, 120, 45, 5)]];
  const st = K.stage(host), x = K.band(groups.map(g => g[0]), 0, st.W, 0.5), y = K.linear(10, 100, st.H, 0);
  K.axisY(st, y, 4);
  groups.forEach(([k, d], j) => {
    const s = K.sorted(d), q1 = K.quantile(s, 0.25), q2 = K.quantile(s, 0.5), q3 = K.quantile(s, 0.75), iqr = q3 - q1;
    const lo = s.find(v => v >= q1 - 1.5 * iqr), hi = [...s].reverse().find(v => v <= q3 + 1.5 * iqr), cx = x(k) + x.bw / 2;
    K.el('line', { x1: cx, x2: cx, y1: y(lo), y2: y(hi), stroke: 'var(--muted,#898781)' }, st.g);
    K.el('rect', { x: x(k), y: y(q3), width: x.bw, height: y(q1) - y(q3), fill: K.C[j], 'fill-opacity': 0.35, stroke: K.C[j], 'stroke-width': 2, rx: 3 }, st.g);
    K.el('line', { x1: x(k), x2: x(k) + x.bw, y1: y(q2), y2: y(q2), stroke: K.C[j], 'stroke-width': 3 }, st.g);
    s.filter(v => v < lo || v > hi).forEach(v => K.el('circle', { cx, cy: y(v), r: 2.5, fill: 'none', stroke: 'var(--muted,#898781)' }, st.g));
  });
  K.axisBand(st, x, groups.map(g => g[0]));
}
```

**Combines with:** Overlay the raw points (jitter) so n and clusters are visible.

---

## Violin plot

**Use it when:** Box plot plus the full shape (bimodality shows up here, not in a box).

**How I do it**

1. Compute a KDE per group over the same y range.
2. Evaluate each KDE only between that group's own min and max so the tails do not become thin spikes.
3. Mirror it around the group centre: walk down the right edge, back up the left, close the path.

**Code** (id `violin`)

```js
function draw(host, K) {
  const g = [['A', K.sample(1, 200, 50, 8)], ['B', K.sample(2, 100, 40, 6).concat(K.sample(3, 100, 72, 6))]];
  const st = K.stage(host), x = K.band(g.map(r => r[0]), 0, st.W, 0.3), y = K.linear(10, 100, st.H, 0);
  K.axisY(st, y, 4);
  g.forEach(([k, d], j) => {
    const ys = K.range(Math.min(...d), Math.max(...d), 60), dens = K.kde(d, K.bw(d), ys), half = x.bw / 2, cx = x(k) + half, m = Math.max(...dens);
    const right = ys.map((v, i) => [cx + dens[i] / m * half, y(v)]), left = ys.map((v, i) => [cx - dens[i] / m * half, y(v)]).reverse();
    K.el('path', { d: K.path(right.concat(left)) + 'Z', fill: K.C[j], 'fill-opacity': 0.35, stroke: K.C[j], 'stroke-width': 1.5 }, st.g);
  });
  K.axisBand(st, x, g.map(r => r[0]));
}
```

**Combines with:** Draw a narrow box plot inside the violin.

---

## Ridgeline (joy) plot

**Use it when:** Compare many distributions that would overlap on one axis.

**How I do it**

1. One KDE per group, each drawn on its own baseline spaced down the page.
2. Draw the top row first so lower rows overlap it; fill with the page background so overlaps hide cleanly.

**Code** (id `ridgeline`)

```js
function draw(host, K) {
  const groups = ['Mon', 'Tue', 'Wed', 'Thu'].map((k, i) => [k, K.sample(i + 5, 200, 40 + i * 8, 7 + i)]);
  const st = K.stage(host, 320, 220, { l: 36 }), x = K.linear(10, 100, 0, st.W), xs = K.range(10, 100, 100);
  groups.forEach(([k, d], i) => {
    const dens = K.kde(d, K.bw(d), xs), base = 50 + i * 42, m = 0.06;
    const pts = xs.map((v, j) => [x(v), base - dens[j] / m * 62]);
    K.el('path', { d: K.path(pts) + `L${st.W} ${base}L0 ${base}Z`, fill: K.C[i], 'fill-opacity': 0.55, stroke: K.C[i], 'stroke-width': 1.5 }, st.g);
    K.text(st.g, -6, base + 3, k, { 'text-anchor': 'end' });
  });
  K.axisX(st, x, 4);
}
```

**Combines with:** Order rows by median to show a trend across groups.

---

## Beeswarm / strip plot

**Use it when:** Show every point (small n) without overlap, plus the shape.

**How I do it**

1. Place points in sorted order along the value axis.
2. For each, try offsets 0, +r, -r, +2r, -2r... until it no longer touches an already placed point.

**Code** (id `beeswarm`)

```js
function draw(host, K) {
  const d = K.sorted(K.sample(3, 110, 50, 12)), st = K.stage(host, 320, 150), x = K.linear(10, 90, 0, st.W), r = 3.2, placed = [];
  d.forEach(v => {
    const px = x(v); let k = 0, off = 0;
    while (placed.some(p => Math.hypot(p.x - px, p.y - off) < 2 * r) && k < 60) { k++; off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * r; }
    placed.push({ x: px, y: off });
  });
  placed.forEach(p => K.el('circle', { cx: p.x, cy: st.H / 2 + p.y, r, fill: K.C[0], 'fill-opacity': 0.8 }, st.g));
  K.axisX(st, x, 4);
}
```

**Combines with:** Add a median tick, or colour points by a second variable.

---

## ECDF (cumulative distribution)

**Use it when:** Read percentiles directly; compare groups without choosing bins.

**How I do it**

1. Sort the data; the curve climbs 1/n at every observation.
2. Draw as steps: horizontal to the value, then up one notch.

**Code** (id `ecdf`)

```js
function draw(host, K) {
  const d = K.sorted(K.sample(4, 150, 50, 12)), n = d.length;
  const st = K.stage(host), x = K.linear(10, 90, 0, st.W), y = K.linear(0, 1, st.H, 0);
  let p = `M${x(10)},${y(0)}`;
  d.forEach((v, i) => { p += `L${x(v)},${y(i / n)}L${x(v)},${y((i + 1) / n)}`; });
  p += `L${x(90)},${y(1)}`;
  K.axisY(st, y, 4, v => Math.round(v * 100) + '%');
  K.el('path', { d: p, fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
  K.axisX(st, x, 4);
}
```

**Combines with:** Overlay two groups; the vertical gap is the difference in percentiles.

---

## Q-Q plot

**Use it when:** Check whether data follow a normal distribution (or any reference).

**How I do it**

1. Standardise the sorted data to z-scores.
2. Pair each with the normal quantile at (i + 0.5) / n using K.invNorm.
3. Points on the diagonal mean normal; a curve means skew, a tilt in the tails means heavy tails.

**Code** (id `qq`)

```js
function draw(host, K) {
  const raw = K.sorted(K.sample(5, 300, 0, 0.6).map(Math.exp)), m = K.mean(raw), s = K.sd(raw), n = raw.length;
  const st = K.stage(host), x = K.linear(-3.5, 3.5, 0, st.W), y = K.linear(-2, 6, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  K.el('line', { x1: x(-2), y1: y(-2), x2: x(3.5), y2: y(3.5), stroke: K.C[1], 'stroke-width': 2, 'stroke-dasharray': '5 4' }, st.g);
  raw.forEach((v, i) => { if (i % 3 === 0) K.el('circle', { cx: x(K.invNorm((i + 0.5) / n)), cy: y((v - m) / s), r: 2.5, fill: K.C[0], 'fill-opacity': 0.75 }, st.g); });
}
```

**Combines with:** Place beside a histogram of the same data and the Shapiro-Wilk result.

---

## Rug / barcode plot

**Use it when:** Raw observation positions for several groups in minimal space.

**How I do it**

1. One thin vertical tick per observation along a shared value axis.
2. Semi-transparent ticks pile up into darker regions, which acts as a density cue.

**Code** (id `rug`)

```js
function draw(host, K) {
  const rows = [['A', K.sample(1, 80, 45, 8)], ['B', K.sample(2, 80, 58, 10)], ['C', K.sample(3, 80, 50, 4)]];
  const st = K.stage(host, 320, 150, { l: 30 }), x = K.linear(10, 90, 0, st.W), y = K.band(rows.map(r => r[0]), 0, st.H, 0.35);
  rows.forEach(([k, d], j) => {
    d.forEach(v => K.el('line', { x1: x(v), x2: x(v), y1: y(k), y2: y(k) + y.bw, stroke: K.C[j], 'stroke-opacity': 0.4, 'stroke-width': 1.5 }, st.g));
    K.text(st.g, -6, y(k) + y.bw / 2 + 4, k, { 'text-anchor': 'end' });
  });
  K.axisX(st, x, 4);
}
```

**Combines with:** Usually drawn under a histogram or density curve as a second layer.

---

## 2D density (binned heatmap)

**Use it when:** Scatter plot with too many points; show where they pile up.

**How I do it**

1. Divide both axes into square bins and count points per bin.
2. Draw a rect per non-empty bin; opacity = count / max count.

**Code** (id `bin2d`)

```js
function draw(host, K) {
  const r = K.rng(9), pts = Array.from({ length: 1500 }, () => { const a = K.normal(r); return [a, 0.7 * a + 0.7 * K.normal(r)]; });
  const k = 16, lo = -3, hi = 3, w = (hi - lo) / k, grid = Array.from({ length: k }, () => Array(k).fill(0));
  pts.forEach(([a, b]) => { const i = Math.floor((a - lo) / w), j = Math.floor((b - lo) / w); if (i >= 0 && i < k && j >= 0 && j < k) grid[i][j]++; });
  const mx = Math.max(...grid.flat()), st = K.stage(host), x = K.linear(lo, hi, 0, st.W), y = K.linear(lo, hi, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  grid.forEach((col, i) => col.forEach((n, j) => { if (n) K.el('rect', { x: x(lo + i * w), y: y(lo + (j + 1) * w), width: x(lo + w) - x(lo) + 0.5, height: y(lo) - y(lo + w) + 0.5, fill: K.C[0], 'fill-opacity': n / mx }, st.g); }));
}
```

**Combines with:** Hexagonal bins are the same idea with a different tile shape.

---
