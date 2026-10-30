# Tables, text and KPI parts

9 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Sortable table

**Use it when:** Rows the reader wants to rank by different columns.

**How I do it**

1. Keep the data in an array of row objects and a state { column, direction }.
2. Clicking a header sets the state and sorts a COPY of the array (numbers numerically, text alphabetically); then the whole <tbody> is rebuilt.
3. Align numbers right, text left; show an arrow on the sorted column.

**Code** (id `sorttable`, has an automated interaction test)

```js
function draw(host, K) {
  const rows = [{ name: 'Python', users: 68, growth: 12 }, { name: 'SQL', users: 57, growth: 4 }, { name: 'R', users: 41, growth: -3 }, { name: 'Java', users: 29, growth: -6 }, { name: 'Julia', users: 12, growth: 19 }], cols = ['name', 'users', 'growth'], S = { c: 'name', d: 1 };
  const t = document.createElement('table'); t.style.cssText = 'border-collapse:collapse;width:100%;font-size:13px'; host.appendChild(t);
  const draw = () => { const data = rows.slice().sort((a, b) => (a[S.c] > b[S.c] ? 1 : -1) * S.d); t.innerHTML = '<thead><tr>' + cols.map(c => '<th style="cursor:pointer;text-align:' + (c === 'name' ? 'left' : 'right') + ';border-bottom:1px solid var(--axis,#aaa);padding:6px">' + c + (S.c === c ? (S.d > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr></thead><tbody>' + data.map(r => '<tr>' + cols.map(c => '<td style="padding:6px;border-bottom:.5px solid var(--grid,#ddd);text-align:' + (c === 'name' ? 'left' : 'right') + '">' + r[c] + '</td>').join('') + '</tr>').join('') + '</tbody>'; t.querySelectorAll('th').forEach((th, i) => th.addEventListener('click', () => { S.d = S.c === cols[i] ? -S.d : 1; S.c = cols[i]; draw(); })); };
  draw();
}
```

**Combines with:** Feed the same sorted array to a chart (table and chart can never disagree).

---

## Heat table (conditional formatting)

**Use it when:** A table where patterns matter more than exact numbers.

**How I do it**

1. For every numeric column find min and max; map each cell to t = (value - min) / (max - min).
2. Use t as the background colour from a sequential ramp (K.seq); choose white text above t = 0.55 so contrast stays readable.
3. Normalise per COLUMN so different units are comparable.

**Code** (id `heattable`)

```js
function draw(host, K) {
  const head = ['Model', 'Accuracy', 'Recall', 'Time (s)'], rows = [['Linear', 0.82, 0.74, 1.2], ['Tree', 0.86, 0.8, 3.4], ['Forest', 0.91, 0.87, 18], ['Boosting', 0.93, 0.9, 25], ['Neural net', 0.92, 0.89, 90]];
  const t = document.createElement('table'); t.style.cssText = 'border-collapse:collapse;width:100%;font-size:13px'; host.appendChild(t);
  const mm = [1, 2, 3].map(c => [Math.min(...rows.map(r => r[c])), Math.max(...rows.map(r => r[c]))]);
  t.innerHTML = '<tr>' + head.map(h => '<th style="padding:6px;text-align:left">' + h + '</th>').join('') + '</tr>' + rows.map(r => '<tr><td style="padding:6px">' + r[0] + '</td>' + [1, 2, 3].map(c => { const tt = (r[c] - mm[c - 1][0]) / (mm[c - 1][1] - mm[c - 1][0]); return '<td style="padding:6px;background:' + K.seq(c === 3 ? 1 - tt : tt) + ';color:' + ((c === 3 ? 1 - tt : tt) > 0.55 ? '#fff' : '#222') + '">' + r[c] + '</td>'; }).join('') + '</tr>').join('');
}
```

**Combines with:** Add a sparkline column.

---

## Table with sparklines

**Use it when:** Numbers plus their recent trend in one row.

**How I do it**

1. Build the table rows from data; for each row add an empty cell.
2. Draw a tiny SVG line (K.path on the row's own series, scaled to its min and max) inside that cell.

**Code** (id `sparktable`)

```js
function draw(host, K) {
  const t = document.createElement('table'); t.style.cssText = 'border-collapse:collapse;width:100%;font-size:13px'; host.appendChild(t);
  t.innerHTML = '<tr><th style="text-align:left;padding:6px">Metric</th><th style="text-align:right">Now</th><th style="text-align:left;padding-left:12px">Last 20 days</th></tr>';
  [['Visits', 11, 1.2], ['Signups', 12, 0.4], ['Churn', 13, -0.6]].forEach(([n, seed, slope]) => { const s = K.series(seed, 20, 50, slope, 5, 3), tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:6px;border-top:.5px solid var(--grid,#ddd)">' + n + '</td><td style="text-align:right;border-top:.5px solid var(--grid,#ddd)">' + s[19].toFixed(1) + '</td><td style="padding-left:12px;border-top:.5px solid var(--grid,#ddd)"></td>'; t.appendChild(tr); const svg = K.el('svg', { viewBox: '0 0 100 24', width: 100, height: 24 }), x = K.linear(0, 19, 2, 98), y = K.linear(Math.min(...s), Math.max(...s), 21, 3); K.el('path', { d: K.path(s.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 1.6 }, svg); K.el('circle', { cx: x(19), cy: y(s[19]), r: 2.5, fill: K.C[1] }, svg); tr.lastChild.appendChild(svg); });
}
```

**Combines with:** Combine with sort: re-drawing the rows keeps the sparklines aligned.

---

## KPI tiles

**Use it when:** The 3 to 5 numbers someone must see first.

**How I do it**

1. Each tile: a label, one big number, and a change versus the previous period (arrow + percent).
2. Colour the change by whether it is GOOD, not by whether it is positive (churn up is bad).

**Code** (id `kpi`)

```js
function draw(host, K) {
  const T = [['Revenue', '€ 48.2k', 6.4, 1], ['Users', '3,120', 2.1, 1], ['Churn', '4.8%', 0.7, -1], ['NPS', '41', -3, 1]], root = document.createElement('div'); root.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px'; host.appendChild(root);
  T.forEach(([l, v, d, good]) => { const up = d > 0, ok = (up ? 1 : -1) * good > 0, c = document.createElement('div'); c.style.cssText = 'background:var(--card,#f4f3ee);border-radius:10px;padding:10px 12px'; c.innerHTML = '<div style="font-size:12px;opacity:.7">' + l + '</div><div style="font-size:22px;font-weight:500">' + v + '</div><div style="font-size:12px;color:' + (ok ? '#1baf7a' : '#e34948') + '">' + (up ? '▲ ' : '▼ ') + Math.abs(d) + '% vs last month</div>'; root.appendChild(c); });
}
```

**Combines with:** Place above charts in a dashboard; clicking a tile filters the charts below.

---

## Gauge (dial)

**Use it when:** One value against a range with good/bad zones (speed, utilisation, score).

**How I do it**

1. Half-circle track from -90 to +90 degrees split into coloured zones with K.arc.
2. Needle angle = -90 + value / max * 180 degrees; draw a line from the centre with K.polar and a hub circle.

**Code** (id `gauge`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 170, { l: 10, r: 10, t: 10, b: 10 }), cx = st.W / 2, cy = st.H - 14, v = 72, Z = [[0, 0.4, K.C[7]], [0.4, 0.7, K.C[3]], [0.7, 1, K.C[2]]];
  Z.forEach(([a, b, c]) => K.el('path', { d: K.arc(cx, cy, 70, 104, -Math.PI / 2 + a * Math.PI, -Math.PI / 2 + b * Math.PI - 0.01), fill: c }, st.g));
  const p = K.polar(cx, cy, 92, -Math.PI / 2 + v / 100 * Math.PI); K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--text,#222)', 'stroke-width': 3, 'stroke-linecap': 'round' }, st.g); K.el('circle', { cx, cy, r: 7, fill: 'var(--text,#222)' }, st.g);
  K.text(st.g, cx, cy - 26, v + '%', { 'text-anchor': 'middle', 'font-size': 20, fill: 'var(--text,#222)', 'font-weight': 500 });
}
```

**Combines with:** Use sparingly: a bullet chart carries the same information with less space.

---

## Word cloud

**Use it when:** A quick look at the most frequent terms (not for precise comparison).

**How I do it**

1. Font size grows with the word's count (linear between 11 and 34 px).
2. Place words biggest first along a spiral from the centre; the first spot whose box (width = characters * size * 0.64, height = size) overlaps no placed word wins.

**Code** (id `wordcloud`)

```js
function draw(host, K) {
  const W = [['data', 40], ['model', 34], ['python', 30], ['plot', 24], ['table', 22], ['stats', 20], ['sql', 18], ['chart', 16], ['code', 15], ['test', 12], ['graph', 11], ['map', 9], ['tree', 8], ['flow', 8]];
  const st = K.stage(host, 320, 200, { l: 0, r: 0, t: 0, b: 0 }), placed = [];
  W.forEach(([w, c], i) => { const fs = 11 + (c - 8) / 32 * 23, bw = w.length * fs * 0.64 + 4, bh = fs; for (let k = 0; k < 4000; k++) { const a = k * 0.35, r = k * 0.09, x = st.W / 2 + r * Math.cos(a) * 1.5 - bw / 2, y = st.H / 2 + r * Math.sin(a) + bh / 3; if (x < 2 || y - bh < 2 || x + bw > st.W - 2 || y > st.H - 2) continue; if (placed.every(p => x > p.x + p.w + 1 || x + bw < p.x - 1 || y - bh > p.y + 1 || y < p.y - p.h - 1)) { placed.push({ x, y, w: bw, h: bh }); K.text(st.g, x, y, w, { 'font-size': fs, fill: K.C[i % 8], 'font-weight': 500 }); break; } } });
}
```

**Combines with:** A bar chart of the top 10 words is easier to read; use the cloud only for mood.

---

## Comparison (pricing) cards

**Use it when:** Two to four options compared on the same features.

**How I do it**

1. Data: options with a price and a feature list. One flex card per option, same feature rows in the same order.
2. Highlight the recommended card with a coloured border.

**Code** (id `plans`)

```js
function draw(host, K) {
  const P = [['Free', '€0', ['1 project', '100 MB', 'Community help']], ['Pro', '€12', ['10 projects', '10 GB', 'Email help'], 1], ['Team', '€30', ['Unlimited', '1 TB', 'Priority help']]], root = document.createElement('div'); root.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap'; host.appendChild(root);
  P.forEach(([n, p, f, hi]) => { const c = document.createElement('div'); c.style.cssText = 'flex:1;min-width:100px;border-radius:10px;padding:12px;border:' + (hi ? '2px solid #2a78d6' : '.5px solid var(--grid,#ccc)'); c.innerHTML = '<div style="font-weight:500">' + n + '</div><div style="font-size:22px">' + p + '<span style="font-size:12px;opacity:.6">/mo</span></div>' + f.map(x => '<div style="font-size:12px;padding:3px 0">✓ ' + x + '</div>').join(''); root.appendChild(c); });
}
```

**Combines with:** A toggle (monthly/yearly) changes prices with one state variable.

---

## Month calendar

**Use it when:** Dates, deadlines and events at a glance.

**How I do it**

1. Find the weekday of the 1st with new Date(Date.UTC(year, month, 1)).getUTCDay() and the number of days in the month.
2. Fill a 7-column grid: blank cells for the offset, then one cell per day; highlight event days.

**Code** (id `monthcal`)

```js
function draw(host, K) {
  const y = 2026, m = 9, first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), ev = { 8: 'Exam', 15: 'Report', 29: 'Today' }, root = document.createElement('div'); host.appendChild(root);
  root.innerHTML = '<div style="font-weight:500;margin-bottom:6px">October ' + y + '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:12px;text-align:center">' + ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => '<div style="opacity:.6">' + d + '</div>').join('') + Array(first).fill('<div></div>').join('') + Array.from({ length: days }, (_, i) => '<div style="padding:6px 0;border-radius:6px;' + (ev[i + 1] ? 'background:#2a78d6;color:#fff' : 'background:var(--card,#f4f3ee)') + '" title="' + (ev[i + 1] || '') + '">' + (i + 1) + '</div>').join('') + '</div>';
}
```

**Combines with:** Colour days by value for the calendar heatmap.

---

## Searchable list (live filter)

**Use it when:** Long lists where the reader knows what they are looking for.

**How I do it**

1. State: the search string. On every input event filter the array with a case-insensitive includes() and redraw the list.
2. Show the count of matches; keep the input focused (redraw only the list, not the input).

**Code** (id `filterlist`, has an automated interaction test)

```js
function draw(host, K) {
  const items = ['Python', 'pandas', 'NumPy', 'SQL', 'scikit-learn', 'Matplotlib', 'PyTorch', 'R', 'Julia'], inp = document.createElement('input'), ul = document.createElement('ul'), n = document.createElement('div'); inp.placeholder = 'search'; inp.style.cssText = 'padding:6px;width:100%;box-sizing:border-box;margin-bottom:6px'; n.style.cssText = 'font-size:12px;opacity:.7'; ul.style.cssText = 'margin:6px 0;padding-left:18px'; host.append(inp, n, ul);
  const draw = q => { const m = items.filter(i => i.toLowerCase().includes(q.toLowerCase())); ul.innerHTML = m.map(i => '<li>' + i + '</li>').join(''); n.textContent = m.length + ' of ' + items.length; };
  inp.addEventListener('input', () => draw(inp.value)); draw('');
}
```

**Combines with:** Combine with a map or chart that highlights the filtered items.

---
