# Comparison and magnitude

16 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Bar / column chart

**Use it when:** One number per category; compare sizes. Always start the value axis at 0.

**How I do it**

1. Band scale for categories on x, linear scale for values on y (0 at the bottom).
2. One rect per row: x = band(key), height = y(0) - y(value).
3. Gridlines and ticks come from the axis helpers; labels sit under each band.

**Code** (id `bar`)

```js
function draw(host, K) {
  const d = K.data.langs, keys = d.map(r => r[0]);
  const st = K.stage(host), x = K.band(keys, 0, st.W, 0.3), y = K.linear(0, 80, st.H, 0);
  K.axisY(st, y, 4);
  d.forEach(([k, v]) => K.el('rect', { x: x(k), y: y(v), width: x.bw, height: st.H - y(v), fill: K.C[0], rx: 3 }, st.g));
  K.axisBand(st, x, keys);
}
```

**Combines with:** Add a second mark layer (target line, error bars) or sort rows to make it a ranking.

---

## Grouped bar chart

**Use it when:** Compare several series inside each category.

**How I do it**

1. Same band scale as a bar chart; each band is split into one slot per series.
2. Slot width = band width / number of series; offset = series index * slot width.
3. Colour = series (fixed order), never category.

**Code** (id `grouped`)

```js
function draw(host, K) {
  const keys = ['Q1', 'Q2', 'Q3', 'Q4'], series = [[30, 42, 38, 55], [24, 35, 46, 50]];
  const st = K.stage(host), x = K.band(keys, 0, st.W, 0.25), y = K.linear(0, 60, st.H, 0);
  const w = x.bw / series.length;
  K.axisY(st, y, 4);
  keys.forEach((k, i) => series.forEach((s, j) =>
    K.el('rect', { x: x(k) + j * w, y: y(s[i]), width: w - 1, height: st.H - y(s[i]), fill: K.C[j], rx: 2 }, st.g)));
  K.axisBand(st, x, keys);
}
```

**Combines with:** Swap to stacked when the total matters more than the individual parts.

---

## Stacked bar chart

**Use it when:** Totals matter and so do the parts that make them up.

**How I do it**

1. Keep a running baseline per category, starting at 0.
2. Each segment: top = y(base + v), height = y(base) - y(base + v); then base += v.
3. Domain must reach the largest total, not the largest segment.

**Code** (id `stacked`)

```js
function draw(host, K) {
  const keys = ['Q1', 'Q2', 'Q3', 'Q4'], series = [[30, 42, 38, 55], [24, 35, 46, 50]];
  const st = K.stage(host), x = K.band(keys, 0, st.W, 0.25), y = K.linear(0, 120, st.H, 0);
  K.axisY(st, y, 4);
  keys.forEach((k, i) => {
    let base = 0;
    series.forEach((s, j) => {
      K.el('rect', { x: x(k), y: y(base + s[i]), width: x.bw, height: y(base) - y(base + s[i]), fill: K.C[j], stroke: 'var(--bg,#fff)', 'stroke-width': 1 }, st.g);
      base += s[i];
    });
  });
  K.axisBand(st, x, keys);
}
```

**Combines with:** Only the bottom segment is easy to compare across bars. Use grouped if parts matter most.

---

## 100% stacked bar

**Use it when:** Compare composition (shares), not totals.

**How I do it**

1. Same as stacked, but divide each value by its category total first.
2. Fixed domain 0 to 1, tick labels formatted as percentages.

**Code** (id `stacked100`)

```js
function draw(host, K) {
  const keys = ['Q1', 'Q2', 'Q3', 'Q4'], series = [[30, 42, 38, 55], [24, 35, 46, 50]];
  const tot = keys.map((_, i) => series[0][i] + series[1][i]);
  const st = K.stage(host), x = K.band(keys, 0, st.W, 0.25), y = K.linear(0, 1, st.H, 0);
  K.axisY(st, y, 4, v => Math.round(v * 100) + '%');
  keys.forEach((k, i) => {
    let base = 0;
    series.forEach((s, j) => {
      const v = s[i] / tot[i];
      K.el('rect', { x: x(k), y: y(base + v), width: x.bw, height: y(base) - y(base + v), fill: K.C[j] }, st.g);
      base += v;
    });
  });
  K.axisBand(st, x, keys);
}
```

**Combines with:** Pair with a plain stacked chart if totals also matter.

---

## Diverging stacked bar (Likert)

**Use it when:** Survey scales: show agree vs disagree around a neutral centre.

**How I do it**

1. Linear x scale symmetric around 0 and wide enough for the longest side (neutral/2 + agree + strongly agree can exceed 80).
2. Negative side grows leftwards: half of neutral first, then disagree, then strongly disagree.
3. Positive side grows rightwards the same way. A heavy centre line marks 0.

**Code** (id `diverging`)

```js
function draw(host, K) {
  const rows = [['Course A', [5, 10, 20, 35, 30]], ['Course B', [15, 25, 20, 25, 15]], ['Course C', [2, 8, 15, 40, 35]]];
  const col = ['#e34948', '#f3a6a5', '#c3c2b7', '#8bb8ee', '#2a78d6'];
  const st = K.stage(host, 320, 190, { l: 66 }), x = K.linear(-90, 90, 0, st.W), y = K.band(rows.map(r => r[0]), 0, st.H, 0.35);
  rows.forEach(([name, p]) => {
    let a = 0, b = 0;
    [[p[2] / 2, col[2]], [p[1], col[1]], [p[0], col[0]]].forEach(([v, c]) => {
      K.el('rect', { x: x(-a - v), y: y(name), width: x(0) - x(-v), height: y.bw, fill: c }, st.g); a += v; });
    [[p[2] / 2, col[2]], [p[3], col[3]], [p[4], col[4]]].forEach(([v, c]) => {
      K.el('rect', { x: x(b), y: y(name), width: x(v) - x(0), height: y.bw, fill: c }, st.g); b += v; });
    K.text(st.g, -6, y(name) + y.bw / 2 + 4, name, { 'text-anchor': 'end' });
  });
  K.el('line', { x1: x(0), x2: x(0), y1: 0, y2: st.H, stroke: 'var(--text,#333)' }, st.g);
  K.axisX(st, x, 4, v => Math.abs(v) + '%');
}
```

**Combines with:** Sort rows by net agreement to turn it into a ranking.

---

## Lollipop chart

**Use it when:** Same job as a bar chart with less ink; good for many categories.

**How I do it**

1. Same scales as a bar chart.
2. Draw a thin line from the baseline to the value, then a circle on top.

**Code** (id `lollipop`)

```js
function draw(host, K) {
  const d = K.data.langs, keys = d.map(r => r[0]);
  const st = K.stage(host), x = K.band(keys, 0, st.W, 0.3), y = K.linear(0, 80, st.H, 0);
  K.axisY(st, y, 4);
  d.forEach(([k, v]) => {
    const cx = x(k) + x.bw / 2;
    K.el('line', { x1: cx, x2: cx, y1: y(0), y2: y(v), stroke: K.C[0], 'stroke-width': 2 }, st.g);
    K.el('circle', { cx, cy: y(v), r: 6, fill: K.C[0] }, st.g);
  });
  K.axisBand(st, x, keys);
}
```

**Combines with:** Highlight one category by changing only its circle colour.

---

## Dumbbell chart

**Use it when:** Before vs after (or two groups) for each item; the gap is the message.

**How I do it**

1. Band scale on y (one row per item), linear on x.
2. Connecting line first, then one circle per end so circles sit on top.

**Code** (id `dumbbell`)

```js
function draw(host, K) {
  const rows = [['Maths', 52, 71], ['Stats', 60, 78], ['Coding', 45, 83], ['ML', 38, 66]];
  const st = K.stage(host, 320, 190, { l: 54 }), x = K.linear(0, 100, 0, st.W), y = K.band(rows.map(r => r[0]), 0, st.H, 0.4);
  rows.forEach(([k, a, b]) => {
    const cy = y(k) + y.bw / 2;
    K.el('line', { x1: x(a), x2: x(b), y1: cy, y2: cy, stroke: 'var(--grid,#c3c2b7)', 'stroke-width': 3 }, st.g);
    K.el('circle', { cx: x(a), cy, r: 6, fill: K.C[1] }, st.g);
    K.el('circle', { cx: x(b), cy, r: 6, fill: K.C[0] }, st.g);
    K.text(st.g, -6, cy + 4, k, { 'text-anchor': 'end' });
  });
  K.axisX(st, x, 5);
}
```

**Combines with:** Sort by gap size. Add arrowheads for direction of change.

---

## Bullet chart

**Use it when:** One value against a target, with qualitative ranges (poor / ok / good).

**How I do it**

1. Draw range bands widest first so narrower, darker bands overlay them.
2. Value bar is thinner than the band; target is a short vertical tick.

**Code** (id `bullet`)

```js
function draw(host, K) {
  const rows = [['Revenue', 72, 80], ['Profit', 45, 60], ['Retention', 88, 75]];
  const bands = [[100, '#f1efe8'], [85, '#e1dfd6'], [60, '#cfcdc3']];
  const st = K.stage(host, 320, 170, { l: 66 }), x = K.linear(0, 100, 0, st.W), y = K.band(rows.map(r => r[0]), 0, st.H, 0.35);
  rows.forEach(([k, v, t]) => {
    bands.forEach(([to, c]) => K.el('rect', { x: 0, y: y(k), width: x(to), height: y.bw, fill: c }, st.g));
    K.el('rect', { x: 0, y: y(k) + y.bw / 3, width: x(v), height: y.bw / 3, fill: K.C[0] }, st.g);
    K.el('line', { x1: x(t), x2: x(t), y1: y(k) + 3, y2: y(k) + y.bw - 3, stroke: 'var(--text,#222)', 'stroke-width': 3 }, st.g);
    K.text(st.g, -6, y(k) + y.bw / 2 + 4, k, { 'text-anchor': 'end' });
  });
  K.axisX(st, x, 5);
}
```

**Combines with:** Stack several in a column to make a compact KPI panel.

---

## Radial bar chart

**Use it when:** Decorative alternative to bars; inner rings are shorter, so read with care.

**How I do it**

1. Each category gets a concentric ring; value maps to an angle (here up to 270 degrees).
2. Ring shape comes from K.arc(cx, cy, innerR, outerR, startAngle, endAngle).
3. Labels go in the empty quarter where no ring reaches.

**Code** (id `radialbar`)

```js
function draw(host, K) {
  const d = K.data.langs, st = K.stage(host, 320, 230, { t: 5, b: 5, l: 10, r: 10 }), cx = st.W / 2, cy = st.H / 2;
  d.forEach(([k, v], i) => {
    const r1 = 105 - i * 19, r0 = r1 - 14;
    K.el('path', { d: K.arc(cx, cy, r0, r1, 0, 1.5 * Math.PI), fill: 'var(--grid,#ece9e0)' }, st.g);
    K.el('path', { d: K.arc(cx, cy, r0, r1, 0, v / 80 * 1.5 * Math.PI), fill: K.C[i % 8] }, st.g);
    K.text(st.g, cx - 6, cy - r1 + 11, k, { 'text-anchor': 'end' });
  });
}
```

**Combines with:** Rarely worth combining; prefer a plain bar when accuracy matters.

---

## Waterfall chart

**Use it when:** How a starting value becomes an end value through gains and losses.

**How I do it**

1. Walk the rows keeping a running total: each bar spans from the old total to the new one.
2. Colour by sign; the final total bar starts at 0.
3. Thin connector lines link the end of one bar to the start of the next.

**Code** (id `waterfall`)

```js
function draw(host, K) {
  const rows = [['Start', 100], ['Sales', 40], ['Costs', -25], ['Refunds', -10], ['Bonus', 15]];
  let run = 0;
  const bars = rows.map(([k, v], i) => { const from = i === 0 ? 0 : run; run = from + v; return { k, from, to: run, v, total: i === 0 }; });
  bars.push({ k: 'End', from: 0, to: run, v: run, total: true });
  const top = Math.max(...bars.map(b => Math.max(b.from, b.to))) * 1.1, keys = bars.map(b => b.k);
  const st = K.stage(host), x = K.band(keys, 0, st.W, 0.3), y = K.linear(0, top, st.H, 0);
  K.axisY(st, y, 4);
  bars.forEach((b, i) => {
    const col = b.total ? '#898781' : b.v >= 0 ? K.C[2] : K.C[7];
    K.el('rect', { x: x(b.k), y: y(Math.max(b.from, b.to)), width: x.bw, height: Math.abs(y(b.from) - y(b.to)), fill: col, rx: 2 }, st.g);
    if (i < bars.length - 1) K.el('line', { x1: x(b.k) + x.bw, x2: x(bars[i + 1].k), y1: y(b.to), y2: y(b.to), stroke: 'var(--muted,#898781)', 'stroke-dasharray': '2 2' }, st.g);
  });
  K.axisBand(st, x, keys);
}
```

**Combines with:** Works as the bottom half of a P&L dashboard with a table beside it.

---

## Marimekko (mosaic) chart

**Use it when:** Two-way proportions: column width shows one share, segment height another.

**How I do it**

1. Column width = segment size (x scale 0..100); heights = shares within the column.
2. Track a running x offset for columns and a running base for segments.

**Code** (id `marimekko`)

```js
function draw(host, K) {
  const cols = [['Europe', 40, [50, 30, 20]], ['Asia', 35, [30, 40, 30]], ['Americas', 25, [45, 35, 20]]];
  const st = K.stage(host, 320, 210, { b: 22 }), x = K.linear(0, 100, 0, st.W), y = K.linear(0, 100, st.H, 0);
  let x0 = 0;
  cols.forEach(([name, w, parts]) => {
    let base = 0;
    parts.forEach((p, j) => {
      K.el('rect', { x: x(x0), y: y(base + p), width: x(w) - x(0), height: y(base) - y(base + p), fill: K.C[j], stroke: 'var(--bg,#fff)', 'stroke-width': 1.5 }, st.g);
      if (x0 === 0) K.text(st.g, 6, y(base + p / 2) + 4, ['Low', 'Mid', 'High'][j], { fill: '#fff' });
      base += p;
    });
    K.text(st.g, x(x0 + w / 2), st.H + 15, name, { 'text-anchor': 'middle' });
    x0 += w;
  });
}
```

**Combines with:** Annotate the largest cells; too many cells makes it unreadable.

---

## Waffle chart

**Use it when:** Shares of a whole that people should read as "out of 100".

**How I do it**

1. Turn each share into a count of cells out of 100 and build one colour per cell.
2. Cell i sits at column i % 10, row floor(i / 10); draw rows from the top.

**Code** (id `waffle`)

```js
function draw(host, K) {
  const parts = [['Python', 48], ['SQL', 27], ['R', 15], ['Other', 10]];
  const cells = parts.flatMap(([, n], j) => Array(n).fill(K.C[j]));
  const st = K.stage(host, 320, 220, { l: 20, t: 10, b: 10 }), s = 16;
  cells.forEach((c, i) => K.el('rect', { x: (i % 10) * (s + 2), y: Math.floor(i / 10) * (s + 2), width: s, height: s, rx: 3, fill: c }, st.g));
  parts.forEach(([k, n], j) => {
    K.el('rect', { x: 205, y: 30 + j * 24, width: 12, height: 12, rx: 2, fill: K.C[j] }, st.g);
    K.text(st.g, 223, 41 + j * 24, k + ' ' + n + '%');
  });
}
```

**Combines with:** Replace squares with icons for a pictogram.

---

## Funnel chart

**Use it when:** Stages where each step loses some of the previous one.

**How I do it**

1. Half-width of each stage = value / max * a fixed maximum half-width, centred on one axis; labels go in a column on the right so narrow stages stay readable.
2. Between stage i and i+1 draw a trapezoid (polygon) joining their edges.

**Code** (id `funnel`)

```js
function draw(host, K) {
  const s = [['Visits', 1000], ['Signups', 420], ['Trials', 180], ['Paid', 60]];
  const st = K.stage(host, 320, 210, { l: 10, r: 10 }), cx = st.W * 0.33, h = st.H / s.length;
  const hw = v => v / 1000 * st.W * 0.33;
  s.forEach(([k, v], i) => {
    const nxt = i < s.length - 1 ? s[i + 1][1] : v * 0.8;
    const pts = [[cx - hw(v), i * h], [cx + hw(v), i * h], [cx + hw(nxt), (i + 1) * h - 2], [cx - hw(nxt), (i + 1) * h - 2]];
    K.el('polygon', { points: pts.map(p => p.join(',')).join(' '), fill: K.C[0], 'fill-opacity': 1 - i * 0.2 }, st.g);
    K.text(st.g, st.W * 0.72, i * h + h / 2, k + ' ' + v, { fill: 'var(--text,#222)' });
    if (i) K.text(st.g, st.W * 0.72, i * h + h / 2 + 14, Math.round(v / s[i - 1][1] * 100) + '% of previous');
  });
}
```

**Combines with:** Add conversion % between stages as small labels.

---

## Pareto chart

**Use it when:** Find the few causes that explain most of the total (the 80/20 view).

**How I do it**

1. Sort descending, convert to % of total, and draw bars.
2. Cumulative % line on the SAME 0..100% axis (no second axis needed).

**Code** (id `pareto`)

```js
function draw(host, K) {
  const d = [['Bugs', 48], ['Perf', 27], ['UX', 14], ['Docs', 8], ['Other', 3]], tot = K.sum(d.map(r => r[1])), keys = d.map(r => r[0]);
  const st = K.stage(host), x = K.band(keys, 0, st.W, 0.3), y = K.linear(0, 1, st.H, 0);
  K.axisY(st, y, 4, v => Math.round(v * 100) + '%');
  let cum = 0; const pts = [];
  d.forEach(([k, v]) => {
    K.el('rect', { x: x(k), y: y(v / tot), width: x.bw, height: st.H - y(v / tot), fill: K.C[0], rx: 2 }, st.g);
    cum += v / tot; pts.push([x(k) + x.bw / 2, y(cum)]);
  });
  K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[1], 'stroke-width': 2 }, st.g);
  pts.forEach(p => K.el('circle', { cx: p[0], cy: p[1], r: 3.5, fill: K.C[1] }, st.g));
  K.axisBand(st, x, keys);
}
```

**Combines with:** Bars + line is the classic two-layer combo; add a dashed 80% reference line.

---

## Population pyramid

**Use it when:** Two mirrored distributions over the same categories (age bands by sex, A vs B).

**How I do it**

1. Symmetric x scale around 0; the left series is drawn with negative width.
2. Bands on y, oldest at the top; centre line at 0; tick labels use absolute values.

**Code** (id `pyramid`)

```js
function draw(host, K) {
  const ages = ['60+', '40-59', '20-39', '0-19'], L = [14, 26, 30, 22], R = [16, 27, 29, 21];
  const st = K.stage(host, 320, 190, { l: 44 }), x = K.linear(-35, 35, 0, st.W), y = K.band(ages, 0, st.H, 0.25);
  ages.forEach((a, i) => {
    K.el('rect', { x: x(-L[i]), y: y(a), width: x(0) - x(-L[i]), height: y.bw, fill: K.C[1] }, st.g);
    K.el('rect', { x: x(0), y: y(a), width: x(R[i]) - x(0), height: y.bw, fill: K.C[0] }, st.g);
    K.text(st.g, -6, y(a) + y.bw / 2 + 4, a, { 'text-anchor': 'end' });
  });
  K.axisX(st, x, 4, v => Math.abs(v) + '%');
}
```

**Combines with:** Use as a small multiple across years to show change.

---

## Slope chart

**Use it when:** How each item changed between exactly two moments.

**How I do it**

1. Two vertical axes (x = left and right); one shared y scale.
2. One line per item from (left, before) to (right, after); colour by direction of change.

**Code** (id `slope`)

```js
function draw(host, K) {
  const rows = [['A', 30, 55], ['B', 50, 42], ['C', 22, 60], ['D', 65, 48]];
  const st = K.stage(host, 320, 210, { l: 30, r: 30 }), y = K.linear(0, 70, st.H, 0), L = 40, R = st.W - 40;
  rows.forEach(([k, a, b]) => {
    const c = b >= a ? K.C[2] : K.C[1];
    K.el('line', { x1: L, y1: y(a), x2: R, y2: y(b), stroke: c, 'stroke-width': 2 }, st.g);
    [[L, a], [R, b]].forEach(([px, v]) => K.el('circle', { cx: px, cy: y(v), r: 4, fill: c }, st.g));
    K.text(st.g, L - 8, y(a) + 4, k + ' ' + a, { 'text-anchor': 'end' });
    K.text(st.g, R + 8, y(b) + 4, b + '');
  });
  K.text(st.g, L, st.H + 16, 'before', { 'text-anchor': 'middle' });
  K.text(st.g, R, st.H + 16, 'after', { 'text-anchor': 'middle' });
}
```

**Combines with:** With many time points it becomes a line chart; with ranks only, a bump chart.

---
