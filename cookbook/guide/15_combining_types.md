# Combining chart types

9 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Layering: histogram + density + normal fit + rug

**Use it when:** Several marks on ONE set of scales, each answering a different question.

**How I do it**

1. Pick one coordinate system (x value, y density) and make every layer use it.
2. Rescale the histogram to density (count / (n * binWidth)) so it matches the curves.
3. Draw back to front: bars, rug, KDE line, then the fitted normal as a dashed line.

**Code** (id `combo-layers`)

```js
function draw(host, K) {
  const d = K.sample(6, 300, 50, 11), bins = K.hist(d, 10, 90, 24), bw = bins[0].x1 - bins[0].x0;
  const xs = K.range(10, 90, 120), kd = K.kde(d, K.bw(d), xs), m = K.mean(d), s = K.sd(d);
  const nrm = xs.map(v => Math.exp(-0.5 * ((v - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)));
  const st = K.stage(host), x = K.linear(10, 90, 0, st.W), y = K.linear(0, Math.max(...kd, ...bins.map(b => b.n / (d.length * bw))) * 1.15, st.H, 0);
  K.axisY(st, y, 4, v => v.toFixed(2));
  bins.forEach(b => K.el('rect', { x: x(b.x0) + 0.5, y: y(b.n / (d.length * bw)), width: x(b.x1) - x(b.x0) - 1, height: st.H - y(b.n / (d.length * bw)), fill: K.C[0], 'fill-opacity': 0.3 }, st.g));
  d.forEach(v => K.el('line', { x1: x(v), x2: x(v), y1: st.H, y2: st.H - 8, stroke: K.C[0], 'stroke-opacity': 0.4 }, st.g));
  K.el('path', { d: K.path(xs.map((v, i) => [x(v), y(kd[i])])), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
  K.el('path', { d: K.path(xs.map((v, i) => [x(v), y(nrm[i])])), fill: 'none', stroke: K.C[1], 'stroke-width': 2, 'stroke-dasharray': '5 4' }, st.g);
  K.axisX(st, x, 4);
}
```

**Combines with:** The same pattern gives scatter + regression line + confidence band, or bars + target line.

---

## Layering: violin + box + jittered points

**Use it when:** Shape, summary and raw data in one glance.

**How I do it**

1. Violin outline first (light), then a narrow box, then the points on top.
2. Jitter horizontally with a seeded random so the picture is reproducible.

**Code** (id `combo-violin`)

```js
function draw(host, K) {
  const g = [['A', K.sample(1, 90, 50, 8)], ['B', K.sample(2, 90, 60, 12)]], r = K.rng(4);
  const st = K.stage(host), x = K.band(g.map(a => a[0]), 0, st.W, 0.3), y = K.linear(10, 100, st.H, 0);
  K.axisY(st, y, 4);
  g.forEach(([k, d], j) => {
    const ys = K.range(Math.min(...d), Math.max(...d), 60), dens = K.kde(d, K.bw(d), ys), half = x.bw / 2, cx = x(k) + half, m = Math.max(...dens), s = K.sorted(d);
    const R = ys.map((v, i) => [cx + dens[i] / m * half, y(v)]), L = ys.map((v, i) => [cx - dens[i] / m * half, y(v)]).reverse();
    K.el('path', { d: K.path(R.concat(L)) + 'Z', fill: K.C[j], 'fill-opacity': 0.2 }, st.g);
    K.el('rect', { x: cx - 5, y: y(K.quantile(s, 0.75)), width: 10, height: y(K.quantile(s, 0.25)) - y(K.quantile(s, 0.75)), fill: K.C[j] }, st.g);
    K.el('line', { x1: cx - 7, x2: cx + 7, y1: y(K.quantile(s, 0.5)), y2: y(K.quantile(s, 0.5)), stroke: '#fff', 'stroke-width': 2 }, st.g);
    d.forEach(v => K.el('circle', { cx: cx + (r() - 0.5) * x.bw * 0.7, cy: y(v), r: 2, fill: K.C[j], 'fill-opacity': 0.55 }, st.g));
  });
  K.axisBand(st, x, g.map(a => a[0]));
}
```

**Combines with:** Same layering idea: any distribution plot can carry the raw points.

---

## Small multiples (same chart, one panel per group)

**Use it when:** Compare many groups without overplotting: repeat one chart with SHARED scales.

**How I do it**

1. Define the scales once, from the data of ALL groups, so panels are comparable.
2. Loop over groups; translate a <g> to each grid cell and call the same drawing code.

**Code** (id `combo-multiples`)

```js
function draw(host, K) {
  const names = ['North', 'South', 'East', 'West'], data = names.map((_, i) => K.sample(i + 1, 200, 40 + i * 6, 9));
  const all = [].concat(...data), pw = 135, ph = 90, st = K.stage(host, 320, 240, { l: 20, r: 10, t: 14, b: 14 });
  const x = K.linear(10, 100, 0, pw - 20), top = Math.max(...data.map(d => Math.max(...K.hist(d, 10, 100, 15).map(b => b.n)))), y = K.linear(0, top, ph - 24, 0);
  data.forEach((d, i) => {
    const cell = K.el('g', { transform: `translate(${(i % 2) * (pw + 12)},${Math.floor(i / 2) * (ph + 24)})` }, st.g);
    K.hist(d, 10, 100, 15).forEach(b => K.el('rect', { x: x(b.x0) + 0.5, y: y(b.n), width: x(b.x1) - x(b.x0) - 1, height: ph - 24 - y(b.n), fill: K.C[i] }, cell));
    K.el('line', { x1: 0, x2: pw - 20, y1: ph - 24, y2: ph - 24, stroke: 'var(--axis,#c3c2b7)' }, cell);
    [10, 55, 100].forEach(v => K.text(cell, x(v), ph - 10, v, { 'text-anchor': 'middle' }));
    K.text(cell, 0, -3, names[i], { 'font-weight': 500, fill: 'var(--text,#333)' });
  });
}
```

**Combines with:** Works for any chart type; this is how to compare 20 regions or 12 months.

---

## Linked views: filter one chart, the other updates

**Use it when:** Exploration: select a range in one chart and see what it means in another.

**How I do it**

1. Keep ONE shared state object (here: the selected x range).
2. Each chart is a function of (data, state); a single update() redraws all of them.
3. Controls only change state, then call update(); charts never talk to each other directly.

**Code** (id `combo-linked`, has an automated interaction test)

```js
function draw(host, K) {
  const r = K.rng(12), pts = Array.from({ length: 160 }, () => { const a = 50 + 15 * K.normal(r); return [a, 0.6 * a + 12 + 6 * K.normal(r)]; });
  const state = { lo: 30, hi: 70 };
  const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px';
  ctl.innerHTML = 'from <input type="range" min="10" max="90" value="30" data-k="lo"> to <input type="range" min="10" max="90" value="70" data-k="hi">';
  host.appendChild(ctl);
  const view = document.createElement('div'); host.appendChild(view);
  function update() {
    view.innerHTML = '';
    const st = K.stage(view, 320, 250, { t: 8, b: 20, l: 34 }), x = K.linear(10, 90, 0, st.W), y = K.linear(20, 80, 110, 0);
    const inSel = p => p[0] >= state.lo && p[0] <= state.hi;
    K.el('rect', { x: x(state.lo), y: 0, width: Math.max(0, x(state.hi) - x(state.lo)), height: 110, fill: K.C[1], 'fill-opacity': 0.08 }, st.g);
    [30, 50, 70].forEach(v => K.text(st.g, -6, y(v) + 4, v, { 'text-anchor': 'end' }));
    [10, 30, 50, 70, 90].forEach(v => K.text(st.g, x(v), 124, v, { 'text-anchor': 'middle' }));
    pts.forEach(p => K.el('circle', { cx: x(p[0]), cy: y(p[1]), r: 2.6, fill: inSel(p) ? K.C[1] : '#b4b2a9', 'fill-opacity': 0.8 }, st.g));
    const sel = pts.filter(inSel).map(p => p[1]), bins = K.hist(sel, 20, 80, 12), g2 = K.el('g', { transform: 'translate(0,150)' }, st.g);
    const hy = K.linear(0, Math.max(5, ...bins.map(b => b.n)), 60, 0), hx = K.linear(20, 80, 0, st.W);
    bins.forEach(b => K.el('rect', { x: hx(b.x0) + 0.5, y: hy(b.n), width: hx(b.x1) - hx(b.x0) - 1, height: 60 - hy(b.n), fill: K.C[1] }, g2));
    [20, 40, 60, 80].forEach(v => K.text(g2, hx(v), 74, v, { 'text-anchor': 'middle' }));
    K.text(st.g, 0, 143, 'y of selected points (' + sel.length + ')');
  }
  ctl.addEventListener('input', e => { state[e.target.dataset.k] = +e.target.value; update(); });
  update();
}
```

**Combines with:** Replace sliders with a drag-brush, or link a map and a table the same way.

---

## Dashboard with shared state (KPIs + chart + table)

**Use it when:** Several views of the same data that must always agree.

**How I do it**

1. ONE data array and ONE state object ({ region }). Every view is a function render(rows) of the filtered rows.
2. A select changes the state and calls update(), which recomputes the filtered rows once and re-renders the KPI tiles, the bar chart and the table from them.
3. Because all three read the same rows, a number in a tile can never differ from the chart.

**Code** (id `combo-dashboard`, has an automated interaction test)

```js
function draw(host, K) {
  const regions = ['North', 'South', 'East'], r = K.rng(2), rows = []; for (let m = 1; m <= 6; m++) regions.forEach((g, gi) => rows.push({ g, m, v: Math.round(40 + gi * 15 + m * 6 + r() * 20) }));
  const S = { g: 'All' }, root = document.createElement('div'); root.style.fontSize = '13px'; host.appendChild(root);
  root.innerHTML = '<div style="margin-bottom:8px">Region <select><option>All</option>' + regions.map(x => '<option>' + x + '</option>').join('') + '</select></div><div class="kp" style="display:flex;gap:8px;margin-bottom:8px"></div><div class="ch"></div><div class="tb"></div>';
  const update = () => { const f = rows.filter(q => S.g === 'All' || q.g === S.g), tot = K.sum(f.map(q => q.v)), by = [1, 2, 3, 4, 5, 6].map(m => K.sum(f.filter(q => q.m === m).map(q => q.v)));
    root.querySelector('.kp').innerHTML = [['Total', tot], ['Best month', 'M' + (by.indexOf(Math.max(...by)) + 1)], ['Average', Math.round(tot / by.length)]].map(([l, v]) => '<div style="flex:1;background:var(--card,#f4f3ee);border-radius:8px;padding:8px"><div style="opacity:.65;font-size:12px">' + l + '</div><b style="font-size:18px">' + v + '</b></div>').join('');
    const c = root.querySelector('.ch'); c.innerHTML = ''; const st = K.stage(c, 320, 130, { l: 34, t: 4, b: 20 }), x = K.band([1, 2, 3, 4, 5, 6], 0, st.W, 0.3), y = K.linear(0, Math.max(...by, 1) * 1.1, st.H, 0); K.axisY(st, y, 3, v => Math.round(v)); by.forEach((v, i) => K.el('rect', { x: x(i + 1), y: y(v), width: x.bw, height: st.H - y(v), fill: K.C[0], rx: 3 }, st.g)); K.axisBand(st, x, [1, 2, 3, 4, 5, 6]);
    root.querySelector('.tb').innerHTML = '<table style="width:100%;border-collapse:collapse;margin-top:6px">' + f.slice().sort((a, b) => b.v - a.v).slice(0, 3).map(q => '<tr><td style="padding:3px">' + q.g + ' M' + q.m + '</td><td style="text-align:right">' + q.v + '</td></tr>').join('') + '</table>'; };
  root.querySelector('select').addEventListener('change', e => { S.g = e.target.value; update(); }); update();
}
```

**Combines with:** This is the general recipe for dashboards: add a view = add one render function.

---

## Annotated line chart (event band + callout)

**Use it when:** Tell the story: what happened when.

**How I do it**

1. Draw the data layer first (line).
2. Add an annotation layer in the SAME coordinates: a shaded rect for a period (x from the start month to the end month), a vertical dashed rule for an event, and a callout (leader line + text) at the peak.
3. Annotations go behind the line (band) or beside it (callout) so they never hide data.

**Code** (id `combo-annotated`)

```js
function draw(host, K) {
  const n = 24, s = K.series(3, n, 50, 0.9, 10, 3), st = K.stage(host, 320, 220, { r: 14 }), x = K.linear(0, n - 1, 0, st.W), y = K.linear(30, 100, st.H, 0), pk = s.indexOf(Math.max(...s));
  K.axisY(st, y, 4); [0, 6, 12, 18, 23].forEach(i => K.text(st.g, x(i), st.H + 16, 'M' + (i + 1), { 'text-anchor': 'middle' }));
  K.el('rect', { x: x(9), y: 0, width: x(14) - x(9), height: st.H, fill: K.C[3], 'fill-opacity': 0.18 }, st.g); K.text(st.g, x(9) + 3, 12, 'campaign');
  K.el('line', { x1: x(17), x2: x(17), y1: 0, y2: st.H, stroke: K.C[7], 'stroke-dasharray': '4 3' }, st.g); K.text(st.g, x(17) + 3, 24, 'price change', { fill: K.C[7] });
  K.el('path', { d: K.path(s.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
  K.el('circle', { cx: x(pk), cy: y(s[pk]), r: 4, fill: K.C[1] }, st.g); K.el('line', { x1: x(pk), y1: y(s[pk]), x2: x(pk) - 26, y2: y(s[pk]) - 22, stroke: K.C[1] }, st.g); K.text(st.g, x(pk) - 28, y(s[pk]) - 26, 'peak ' + s[pk].toFixed(0), { 'text-anchor': 'end', fill: K.C[1], 'font-weight': 500 });
}
```

**Combines with:** Any chart can take this layer: it is just extra marks that use the chart's scales.

---

## Linked map + bar chart (click to select)

**Use it when:** Geography and ranking together, each explaining the other.

**How I do it**

1. One state: the set of selected regions. Both views are redrawn from (values, selection).
2. Clicking a tile or a bar toggles that region in the set; selected regions are orange in BOTH views, others blue.
3. The two views share the colour logic through one function: colourOf(region).

**Code** (id `combo-tilebar`, has an automated interaction test)

```js
function draw(host, K) {
  const T = { SH: [1, 0, 41], HH: [2, 0, 77], MV: [3, 0, 22], NI: [1, 1, 36], ST: [2, 1, 28], BE: [3, 1, 90], BB: [4, 1, 31], HB: [0, 1, 70], NW: [0, 2, 62], HE: [1, 2, 55], TH: [2, 2, 25], SN: [3, 2, 40] }, sel = new Set(), root = document.createElement('div'); host.appendChild(root);
  const col = k => sel.has(k) ? K.C[1] : K.C[0], keys = Object.keys(T);
  const draw = () => { root.innerHTML = ''; const a = K.stage(root, 320, 120, { l: 10, r: 10, t: 4, b: 4 }), c = 30; keys.forEach(k => { const [x, y, v] = T[k], r = K.el('rect', { 'data-k': k, x: x * (c + 3) + 30, y: y * (c + 3), width: c, height: c, rx: 5, fill: col(k), 'fill-opacity': 0.4 + 0.6 * v / 100, cursor: 'pointer' }, a.g); r.addEventListener('click', () => { sel.has(k) ? sel.delete(k) : sel.add(k); draw(); }); K.text(a.g, x * (c + 3) + 30 + c / 2, y * (c + 3) + c / 2 + 4, k, { 'text-anchor': 'middle', fill: '#fff', 'font-size': 10 }); });
    const b = K.stage(root, 320, 120, { l: 10, r: 10, t: 6, b: 22 }), s = keys.slice().sort((p, q) => T[q][2] - T[p][2]), x = K.band(s, 0, b.W, 0.2), y = K.linear(0, 100, b.H, 0); s.forEach(k => { const r = K.el('rect', { x: x(k), y: y(T[k][2]), width: x.bw, height: b.H - y(T[k][2]), fill: col(k), rx: 2, cursor: 'pointer' }, b.g); r.addEventListener('click', () => { sel.has(k) ? sel.delete(k) : sel.add(k); draw(); }); K.text(b.g, x(k) + x.bw / 2, b.H + 12, k, { 'text-anchor': 'middle', 'font-size': 9 }); }); };
  draw();
}
```

**Combines with:** Use a real choropleth instead of tiles, or add a table.

---

## Sortable table + bar chart that stay in sync

**Use it when:** Readers want both the exact numbers and the picture, ordered the same way.

**How I do it**

1. One array of rows and one sort state. A single draw() sorts a copy of the rows and builds BOTH the table and the bars from that sorted copy.
2. Clicking a header changes the state and calls draw(), so the two always have the same order.

**Code** (id `combo-tablechart`, has an automated interaction test)

```js
function draw(host, K) {
  const rows = [['Python', 68], ['SQL', 57], ['R', 41], ['Java', 29], ['Julia', 12]], S = { c: 0, d: 1 }, root = document.createElement('div'); host.appendChild(root);
  const draw = () => { const d = rows.slice().sort((a, b) => (a[S.c] > b[S.c] ? 1 : -1) * S.d); root.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px"><tr>' + ['Language', 'Users'].map(h => '<th style="cursor:pointer;text-align:left;padding:4px">' + h + '</th>').join('') + '</tr>' + d.map(r => '<tr><td style="padding:4px">' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table><div class="c"></div>'; root.querySelectorAll('th').forEach((th, i) => th.addEventListener('click', () => { S.d = S.c === i ? -S.d : 1; S.c = i; draw(); })); const st = K.stage(root.querySelector('.c'), 320, 120, { l: 50, t: 4, b: 4 }), y = K.band(d.map(r => r[0]), 0, st.H, 0.25), x = K.linear(0, 80, 0, st.W); d.forEach(r => { K.el('rect', { x: 0, y: y(r[0]), width: x(r[1]), height: y.bw, fill: K.C[0], rx: 2 }, st.g); K.text(st.g, -6, y(r[0]) + y.bw / 2 + 4, r[0], { 'text-anchor': 'end' }); }); }; draw();
}
```

**Combines with:** Add a filter input (see Searchable list) to the same draw().

---

## Small multiples of lines with a shared scale

**Use it when:** Compare many time series at a glance.

**How I do it**

1. Compute the y range ONCE over all series (shared scale) so a taller line really means a bigger value.
2. Lay panels on a grid; each panel is the same line-chart code with its own title and a dot on the last value.

**Code** (id `combo-sparkgrid`)

```js
function draw(host, K) {
  const names = ['North', 'South', 'East', 'West', 'Centre', 'Coast'], S = names.map((_, i) => K.series(i + 1, 24, 40 + i * 4, 0.3 + i * 0.12, 6, 2.5)), lo = Math.min(...S.map(s => Math.min(...s))), hi = Math.max(...S.map(s => Math.max(...s)));
  const st = K.stage(host, 320, 190, { l: 6, r: 6, t: 6, b: 6 }), pw = 98, ph = 80, x = K.linear(0, 23, 0, pw - 8), y = K.linear(lo, hi, ph - 26, 0);
  S.forEach((s, i) => { const g = K.el('g', { transform: `translate(${(i % 3) * (pw + 6)},${Math.floor(i / 3) * (ph + 10)})` }, st.g); K.text(g, 0, 10, names[i], { fill: 'var(--text,#333)', 'font-weight': 500 }); const p = K.el('g', { transform: 'translate(0,18)' }, g); K.el('line', { x1: 0, x2: pw - 8, y1: ph - 26, y2: ph - 26, stroke: 'var(--axis,#c3c2b7)' }, p); K.el('path', { d: K.path(s.map((v, k) => [x(k), y(v)])), fill: 'none', stroke: K.C[i], 'stroke-width': 1.8 }, p); K.el('circle', { cx: x(23), cy: y(s[23]), r: 3, fill: K.C[i] }, p); });
}
```

**Combines with:** Highlight the panel that deviates most, or sort panels by slope.

---
