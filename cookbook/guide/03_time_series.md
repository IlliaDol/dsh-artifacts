# Time series

13 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Line chart

**Use it when:** Change over time for a few series.

**How I do it**

1. Time (or index) on a linear x scale, value on y; the order of points matters.
2. One path per series: K.path joins the scaled points; round the line joins.
3. Direct labels at the line ends replace a legend.

**Code** (id `line`)

```js
function draw(host, K) {
  const n = 24, a = K.series(3, n, 50, 0.9, 10, 3), b = K.series(4, n, 40, 0.5, 6, 3);
  const st = K.stage(host, 320, 220, { r: 46 }), x = K.linear(0, n - 1, 0, st.W), y = K.linear(30, 100, st.H, 0);
  K.axisY(st, y, 4);
  [0, 6, 12, 18, 23].forEach(i => K.text(st.g, x(i), st.H + 16, 'M' + (i + 1), { 'text-anchor': 'middle' }));
  [['Sales', a], ['Cost', b]].forEach(([name, s], j) => {
    K.el('path', { d: K.path(s.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[j], 'stroke-width': 2, 'stroke-linejoin': 'round' }, st.g);
    K.text(st.g, x(n - 1) + 6, y(s[n - 1]) + 4, name, { fill: K.C[j] });
  });
}
```

**Combines with:** Add a shaded band (uncertainty), markers for events, or switch to small multiples when there are more than 4 series.

---

## Area chart

**Use it when:** Emphasise the magnitude (volume) of one series over time.

**How I do it**

1. Same scales as a line chart; the baseline must be 0 because the filled area encodes size.
2. Close the path along the baseline (L x(last) y(0) L x(0) y(0) Z), semi-transparent fill plus a solid top line.

**Code** (id `area`)

```js
function draw(host, K) {
  const n = 24, a = K.series(5, n, 40, 1.1, 8, 2.5);
  const st = K.stage(host), x = K.linear(0, n - 1, 0, st.W), y = K.linear(0, 100, st.H, 0), pts = a.map((v, i) => [x(i), y(v)]);
  K.axisY(st, y, 4);
  K.el('path', { d: K.path(pts) + `L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z`, fill: K.C[0], 'fill-opacity': 0.2 }, st.g);
  K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
  [0, 6, 12, 18, 23].forEach(i => K.text(st.g, x(i), st.H + 16, 'M' + (i + 1), { 'text-anchor': 'middle' }));
}
```

**Combines with:** Stack several for composition, or overlay two with transparency.

---

## Stacked area chart

**Use it when:** Total and composition over time.

**How I do it**

1. Keep a cumulative array per x; band j runs from cum[j-1] to cum[j].
2. Each band is a polygon: forward along its upper edge, backward along its lower edge.

**Code** (id `stackedarea`)

```js
function draw(host, K) {
  const n = 20, S = [K.series(1, n, 20, 0.3, 4, 1), K.series(2, n, 25, 0.6, 5, 1), K.series(3, n, 15, 0.8, 3, 1)];
  const tot = Array.from({ length: n }, (_, i) => K.sum(S.map(s => s[i])));
  const st = K.stage(host, 320, 220, { r: 14 }), x = K.linear(0, n - 1, 0, st.W), y = K.linear(0, Math.max(...tot) * 1.1, st.H, 0);
  K.axisY(st, y, 4);
  let low = new Array(n).fill(0);
  S.forEach((s, j) => {
    const up = low.map((b, i) => b + s[i]);
    const d = K.path(up.map((v, i) => [x(i), y(v)])) + K.path(low.map((v, i) => [x(i), y(v)]).reverse()).replace(/^M/, 'L') + 'Z';
    K.el('path', { d, fill: K.C[j], 'fill-opacity': 0.85, stroke: 'var(--bg,#fff)', 'stroke-width': 1 }, st.g);
    low = up;
  });
  K.legend(st.g, [['A', K.C[0]], ['B', K.C[1]], ['C', K.C[2]]], 0, -2, 46);
}
```

**Combines with:** Normalise to 100% to show shares; smooth the edges with K.curve for a streamgraph look.

---

## Streamgraph

**Use it when:** Many categories over time where the overall shape and rise or fall matter more than exact values.

**How I do it**

1. Stack like a stacked area, but start the baseline at -total/2 so the whole shape is centred.
2. Draw each layer's edges with K.curve (spline) for the flowing look.

**Code** (id `stream`)

```js
function draw(host, K) {
  const n = 20, S = [K.series(1, n, 10, 0.2, 6, 1), K.series(2, n, 14, 0.3, 5, 1), K.series(3, n, 8, 0.4, 4, 1), K.series(4, n, 12, 0.1, 6, 1)];
  const tot = Array.from({ length: n }, (_, i) => K.sum(S.map(s => s[i])));
  const st = K.stage(host, 320, 200, { l: 10 }), x = K.linear(0, n - 1, 0, st.W), y = K.linear(-Math.max(...tot) / 2, Math.max(...tot) / 2, st.H, 0);
  let low = tot.map(t => -t / 2);
  S.forEach((s, j) => {
    const up = low.map((b, i) => b + s[i]);
    const top = K.curve(up.map((v, i) => [x(i), y(v)])), bot = K.curve(low.map((v, i) => [x(i), y(v)]).reverse()).replace(/^M/, 'L');
    K.el('path', { d: top + bot + 'Z', fill: K.C[j], 'fill-opacity': 0.85 }, st.g);
    low = up;
  });
}
```

**Combines with:** Best with direct labels on the thickest layers.

---

## Step chart

**Use it when:** Values that hold until they change (prices, settings, queue length).

**How I do it**

1. For each new value draw a horizontal run to its x, then a vertical jump to the new level.
2. Never interpolate between points: a straight line would claim values that never existed.

**Code** (id `step`)

```js
function draw(host, K) {
  const r = K.rng(8), n = 14, v = []; let cur = 50;
  for (let i = 0; i < n; i++) { if (r() < 0.45) cur = Math.round(K.clamp(cur + (r() - 0.5) * 30, 10, 90)); v.push(cur); }
  const st = K.stage(host), x = K.linear(0, n - 1, 0, st.W), y = K.linear(0, 100, st.H, 0);
  let p = `M${x(0)} ${y(v[0])}`; for (let i = 1; i < n; i++) p += `L${x(i)} ${y(v[i - 1])}L${x(i)} ${y(v[i])}`;
  K.axisY(st, y, 4);
  K.el('path', { d: p, fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
}
```

**Combines with:** Overlay events (vertical rules) that explain the jumps.

---

## Sparklines

**Use it when:** Tiny trends next to numbers in tables and dashboards.

**How I do it**

1. No axes, no gridlines: one thin line scaled to its own min and max.
2. Mark only the last point (dot) and print its value beside it.

**Code** (id `sparkline`)

```js
function draw(host, K) {
  const rows = [['Visits', 11, 1.2], ['Signups', 12, 0.4], ['Churn', 13, -0.6], ['Revenue', 14, 2]];
  const st = K.stage(host, 320, 150, { l: 70, r: 60 });
  rows.forEach(([name, seed, slope], j) => {
    const s = K.series(seed, 20, 50, slope, 5, 3), lo = Math.min(...s), hi = Math.max(...s), x = K.linear(0, 19, 0, st.W), y = K.linear(lo, hi, 22, 0), oy = j * 34 + 4;
    const g = K.el('g', { transform: `translate(0,${oy})` }, st.g);
    K.el('path', { d: K.path(s.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 1.6 }, g);
    K.el('circle', { cx: x(19), cy: y(s[19]), r: 3, fill: K.C[1] }, g);
    K.text(g, -8, 15, name, { 'text-anchor': 'end', fill: 'var(--text,#333)' });
    K.text(g, st.W + 8, 15, s[19].toFixed(1), { fill: 'var(--text,#333)' });
  });
}
```

**Combines with:** Put one in every row of a table (see "Table with sparklines" in the tables family).

---

## Candlestick (OHLC) chart

**Use it when:** Prices that have an open, high, low and close for every period.

**How I do it**

1. For each day: wick = line from low to high; body = rect from open to close.
2. Colour by direction (close above open = up). Body height uses Math.abs so it is never negative.

**Code** (id `candlestick`)

```js
function draw(host, K) {
  const r = K.rng(21), days = []; let p = 100;
  for (let i = 0; i < 30; i++) { const o = p, c = o + (r() - 0.48) * 6, hi = Math.max(o, c) + r() * 3, lo = Math.min(o, c) - r() * 3; days.push([o, hi, lo, c]); p = c; }
  const st = K.stage(host), x = K.linear(0, 29, 6, st.W - 6), y = K.linear(Math.min(...days.map(d => d[2])) - 2, Math.max(...days.map(d => d[1])) + 2, st.H, 0);
  K.axisY(st, y, 4, v => Math.round(v));
  days.forEach(([o, h, l, c], i) => {
    const col = c >= o ? K.C[2] : K.C[7];
    K.el('line', { x1: x(i), x2: x(i), y1: y(h), y2: y(l), stroke: col }, st.g);
    K.el('rect', { x: x(i) - 3.2, y: y(Math.max(o, c)), width: 6.4, height: Math.max(1, Math.abs(y(o) - y(c))), fill: col }, st.g);
  });
}
```

**Combines with:** Add a moving-average line and a volume bar chart in a panel below sharing the x scale.

---

## Calendar heatmap

**Use it when:** Daily activity patterns (weekday vs weekend, streaks, holidays).

**How I do it**

1. Columns = weeks, rows = weekday (0 to 6); cell = one day.
2. Colour comes from a sequential ramp K.seq(value / max); empty days stay pale.
3. Weeks use the day index: week = floor(i / 7), weekday = i % 7.

**Code** (id `calendar`)

```js
function draw(host, K) {
  const r = K.rng(31), weeks = 14, cell = 17, st = K.stage(host, 320, 170, { l: 34, t: 22 });
  ['Mon', 'Wed', 'Fri'].forEach((d, i) => K.text(st.g, -6, i * 2 * (cell + 2) + cell * 0.75, d, { 'text-anchor': 'end' }));
  for (let i = 0; i < weeks * 7; i++) {
    const wk = Math.floor(i / 7), dow = i % 7, v = (dow < 5 ? r() : r() * 0.5) * (0.4 + wk / weeks * 0.6);
    K.el('rect', { x: wk * (cell + 2), y: dow * (cell + 2), width: cell, height: cell, rx: 3, fill: K.seq(v) }, st.g);
  }
  [0, 4, 8, 12].forEach(w => K.text(st.g, w * (cell + 2), -8, 'wk ' + (w + 1)));
}
```

**Combines with:** Pair with a bar chart of weekly totals sharing the same week axis.

---

## Gantt chart

**Use it when:** A schedule: who or what happens when, and what depends on what.

**How I do it**

1. x = linear time scale; one row per task (band scale); bar from start to end.
2. Dependencies are elbow connectors from the end of one bar to the start of the next.

**Code** (id `gantt`)

```js
function draw(host, K) {
  const t = [['Plan', 0, 3], ['Collect', 3, 6], ['Clean', 6, 8], ['Model', 8, 12], ['Report', 12, 14]];
  const st = K.stage(host, 320, 190, { l: 58 }), x = K.linear(0, 14, 0, st.W), y = K.band(t.map(r => r[0]), 0, st.H, 0.3);
  [0, 4, 8, 12].forEach(v => { K.el('line', { x1: x(v), x2: x(v), y1: 0, y2: st.H, stroke: 'var(--grid,#e1e0d9)', 'stroke-width': 0.5 }, st.g); K.text(st.g, x(v), st.H + 16, 'wk ' + v, { 'text-anchor': 'middle' }); });
  t.forEach(([k, a, b], i) => {
    K.el('rect', { x: x(a), y: y(k), width: x(b) - x(a), height: y.bw, rx: 4, fill: K.C[i % 8] }, st.g);
    K.text(st.g, -6, y(k) + y.bw / 2 + 4, k, { 'text-anchor': 'end', fill: 'var(--text,#333)' });
    if (i < t.length - 1) { const k2 = t[i + 1][0]; K.el('path', { d: `M${x(b)} ${y(k) + y.bw / 2}L${x(b) + 4} ${y(k) + y.bw / 2}L${x(b) + 4} ${y(k2) + y.bw / 2}L${x(t[i + 1][1])} ${y(k2) + y.bw / 2}`, fill: 'none', stroke: 'var(--muted,#898781)' }, st.g); }
  });
}
```

**Combines with:** Add a "today" line, progress fill inside bars, or colour by owner.

---

## Timeline

**Use it when:** A short list of dated events in order.

**How I do it**

1. One horizontal axis scaled by date; each event is a dot on the axis.
2. Alternate labels above and below with a stem so neighbours do not collide.

**Code** (id `timeline`)

```js
function draw(host, K) {
  const ev = [[2018, 'Founded'], [2019, 'First user'], [2021, 'Series A'], [2022, 'Launch v2'], [2024, 'Profit'], [2025, 'Expand']];
  const st = K.stage(host, 320, 150, { l: 18, r: 18 }), x = K.linear(2017.5, 2025.5, 0, st.W), cy = st.H / 2;
  K.el('line', { x1: 0, x2: st.W, y1: cy, y2: cy, stroke: 'var(--axis,#c3c2b7)', 'stroke-width': 2 }, st.g);
  ev.forEach(([yr, t], i) => {
    const up = i % 2 === 0, ty = up ? cy - 34 : cy + 40;
    K.el('line', { x1: x(yr), x2: x(yr), y1: cy, y2: up ? cy - 24 : cy + 24, stroke: 'var(--muted,#898781)' }, st.g);
    K.el('circle', { cx: x(yr), cy, r: 5, fill: K.C[i % 8] }, st.g);
    K.text(st.g, x(yr), ty, t, { 'text-anchor': 'middle', fill: 'var(--text,#333)' });
    K.text(st.g, x(yr), ty + 12, yr, { 'text-anchor': 'middle' });
  });
}
```

**Combines with:** Draw it above a line chart so events explain the bumps.

---

## Fan chart (forecast with uncertainty)

**Use it when:** Forecasts: show the best guess AND how fast certainty is lost.

**How I do it**

1. History is a normal line; the forecast starts at the last observation.
2. Uncertainty grows with horizon: band half-width = z * sigma * sqrt(h). Draw wide bands first, narrow on top.

**Code** (id `fan`)

```js
function draw(host, K) {
  const hist = K.series(9, 18, 40, 1.2, 4, 2), h = 10, last = hist[17], n = 18 + h;
  const st = K.stage(host), x = K.linear(0, n - 1, 0, st.W), y = K.linear(20, 100, st.H, 0), f = Array.from({ length: h + 1 }, (_, i) => last + 1.2 * i);
  K.axisY(st, y, 4);
  [[1.96, 0.15], [1.28, 0.25], [0.67, 0.35]].forEach(([z, o]) => {
    const up = f.map((v, i) => [x(17 + i), y(v + z * 2 * Math.sqrt(i))]), lo = f.map((v, i) => [x(17 + i), y(v - z * 2 * Math.sqrt(i))]).reverse();
    K.el('path', { d: K.path(up.concat(lo)) + 'Z', fill: K.C[0], 'fill-opacity': o }, st.g);
  });
  K.el('path', { d: K.path(hist.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: 'var(--text,#333)', 'stroke-width': 2 }, st.g);
  K.el('path', { d: K.path(f.map((v, i) => [x(17 + i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 2, 'stroke-dasharray': '5 3' }, st.g);
}
```

**Combines with:** Overlay the actual values later to evaluate calibration.

---

## Bump chart (rank over time)

**Use it when:** Who leads, who falls: ranks matter, exact values do not.

**How I do it**

1. y = rank (1 at the top, so the scale runs 1 to n downwards).
2. One line with circles per series; labels at both ends so lines can be identified. Use straight segments: a spline would overshoot and suggest ranks that never existed.

**Code** (id `bump`)

```js
function draw(host, K) {
  const d = [['Alpha', [1, 2, 2, 3, 4]], ['Beta', [2, 1, 3, 2, 1]], ['Gamma', [3, 3, 1, 1, 2]], ['Delta', [4, 4, 4, 4, 3]]], t = ['2020', '2021', '2022', '2023', '2024'];
  const st = K.stage(host, 320, 190, { l: 54, r: 54 }), x = K.linear(0, 4, 0, st.W), y = K.linear(1, 4, 10, st.H - 14);
  t.forEach((l, i) => K.text(st.g, x(i), st.H + 14, l, { 'text-anchor': 'middle' }));
  d.forEach(([k, rk], j) => {
    K.el('path', { d: K.path(rk.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[j], 'stroke-width': 3, 'stroke-linejoin': 'round' }, st.g);
    rk.forEach((v, i) => K.el('circle', { cx: x(i), cy: y(v), r: 5, fill: K.C[j] }, st.g));
    K.text(st.g, -9, y(rk[0]) + 4, k, { 'text-anchor': 'end', fill: K.C[j] });
    K.text(st.g, st.W + 9, y(rk[4]) + 4, k, { fill: K.C[j] });
  });
}
```

**Combines with:** Highlight one series and grey out the rest.

---

## Horizon chart

**Use it when:** Many time series stacked in little vertical space.

**How I do it**

1. Slice the value range into bands (here 3). Each band is an area scaled to the full row height.
2. Draw the bands on top of each other with the same transparency: more layers = darker = larger value.
3. Positive values are blue, negative red, so one row shows both.

**Code** (id `horizon`)

```js
function draw(host, K) {
  const names = ['North', 'South', 'East'], st = K.stage(host, 320, 160, { l: 44 }), x = K.linear(0, 59, 0, st.W), rowH = 38, band = 10;
  names.forEach((nm, j) => {
    const s = K.series(40 + j, 60, 0, 0, 22, 6), g = K.el('g', { transform: `translate(0,${j * (rowH + 8)})` }, st.g);
    K.el('rect', { x: 0, y: 0, width: st.W, height: rowH, fill: 'var(--grid,#f1efe8)', 'fill-opacity': 0.5 }, g);
    [[1, K.C[0]], [-1, K.C[7]]].forEach(([sign, col]) => {
      for (let b = 0; b < 3; b++) {
        const pts = s.map((v, i) => [x(i), rowH - K.clamp(sign * v - b * band, 0, band) / band * rowH]);
        K.el('path', { d: K.path(pts) + `L${x(59)} ${rowH}L${x(0)} ${rowH}Z`, fill: col, 'fill-opacity': 0.33 }, g);
      }
    });
    K.text(g, -6, rowH / 2 + 4, nm, { 'text-anchor': 'end', fill: 'var(--text,#333)' });
  });
}
```

**Combines with:** Stack one row per region to compare many series at once.

---
