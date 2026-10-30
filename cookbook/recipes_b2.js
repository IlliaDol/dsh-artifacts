const RECIPES_B2 = [
// ================================== TIME ==================================
{
  id: 'line', family: 'time', name: 'Line chart',
  when: 'Change over time for a few series.',
  steps: ['Time (or index) on a linear x scale, value on y; the order of points matters.',
          'One path per series: K.path joins the scaled points; round the line joins.',
          'Direct labels at the line ends replace a legend.'],
  combine: 'Add a shaded band (uncertainty), markers for events, or switch to small multiples when there are more than 4 series.',
  fn(host, K) {
    const n = 24, a = K.series(3, n, 50, 0.9, 10, 3), b = K.series(4, n, 40, 0.5, 6, 3);
    const st = K.stage(host, 320, 220, { r: 46 }), x = K.linear(0, n - 1, 0, st.W), y = K.linear(30, 100, st.H, 0);
    K.axisY(st, y, 4);
    [0, 6, 12, 18, 23].forEach(i => K.text(st.g, x(i), st.H + 16, 'M' + (i + 1), { 'text-anchor': 'middle' }));
    [['Sales', a], ['Cost', b]].forEach(([name, s], j) => {
      K.el('path', { d: K.path(s.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[j], 'stroke-width': 2, 'stroke-linejoin': 'round' }, st.g);
      K.text(st.g, x(n - 1) + 6, y(s[n - 1]) + 4, name, { fill: K.C[j] });
    });
  },
},
{
  id: 'area', family: 'time', name: 'Area chart',
  when: 'Emphasise the magnitude (volume) of one series over time.',
  steps: ['Same scales as a line chart; the baseline must be 0 because the filled area encodes size.',
          'Close the path along the baseline (L x(last) y(0) L x(0) y(0) Z), semi-transparent fill plus a solid top line.'],
  combine: 'Stack several for composition, or overlay two with transparency.',
  fn(host, K) {
    const n = 24, a = K.series(5, n, 40, 1.1, 8, 2.5);
    const st = K.stage(host), x = K.linear(0, n - 1, 0, st.W), y = K.linear(0, 100, st.H, 0), pts = a.map((v, i) => [x(i), y(v)]);
    K.axisY(st, y, 4);
    K.el('path', { d: K.path(pts) + `L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z`, fill: K.C[0], 'fill-opacity': 0.2 }, st.g);
    K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
    [0, 6, 12, 18, 23].forEach(i => K.text(st.g, x(i), st.H + 16, 'M' + (i + 1), { 'text-anchor': 'middle' }));
  },
},
{
  id: 'stackedarea', family: 'time', name: 'Stacked area chart',
  when: 'Total and composition over time.',
  steps: ['Keep a cumulative array per x; band j runs from cum[j-1] to cum[j].',
          'Each band is a polygon: forward along its upper edge, backward along its lower edge.'],
  combine: 'Normalise to 100% to show shares; smooth the edges with K.curve for a streamgraph look.',
  fn(host, K) {
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
  },
},
{
  id: 'stream', family: 'time', name: 'Streamgraph',
  when: 'Many categories over time where the overall shape and rise or fall matter more than exact values.',
  steps: ['Stack like a stacked area, but start the baseline at -total/2 so the whole shape is centred.',
          'Draw each layer\'s edges with K.curve (spline) for the flowing look.'],
  combine: 'Best with direct labels on the thickest layers.',
  fn(host, K) {
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
  },
},
{
  id: 'step', family: 'time', name: 'Step chart',
  when: 'Values that hold until they change (prices, settings, queue length).',
  steps: ['For each new value draw a horizontal run to its x, then a vertical jump to the new level.',
          'Never interpolate between points: a straight line would claim values that never existed.'],
  combine: 'Overlay events (vertical rules) that explain the jumps.',
  fn(host, K) {
    const r = K.rng(8), n = 14, v = []; let cur = 50;
    for (let i = 0; i < n; i++) { if (r() < 0.45) cur = Math.round(K.clamp(cur + (r() - 0.5) * 30, 10, 90)); v.push(cur); }
    const st = K.stage(host), x = K.linear(0, n - 1, 0, st.W), y = K.linear(0, 100, st.H, 0);
    let p = `M${x(0)} ${y(v[0])}`; for (let i = 1; i < n; i++) p += `L${x(i)} ${y(v[i - 1])}L${x(i)} ${y(v[i])}`;
    K.axisY(st, y, 4);
    K.el('path', { d: p, fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
  },
},
{
  id: 'sparkline', family: 'time', name: 'Sparklines',
  when: 'Tiny trends next to numbers in tables and dashboards.',
  steps: ['No axes, no gridlines: one thin line scaled to its own min and max.',
          'Mark only the last point (dot) and print its value beside it.'],
  combine: 'Put one in every row of a table (see "Table with sparklines" in the tables family).',
  fn(host, K) {
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
  },
},
{
  id: 'candlestick', family: 'time', name: 'Candlestick (OHLC) chart',
  when: 'Prices that have an open, high, low and close for every period.',
  steps: ['For each day: wick = line from low to high; body = rect from open to close.',
          'Colour by direction (close above open = up). Body height uses Math.abs so it is never negative.'],
  combine: 'Add a moving-average line and a volume bar chart in a panel below sharing the x scale.',
  fn(host, K) {
    const r = K.rng(21), days = []; let p = 100;
    for (let i = 0; i < 30; i++) { const o = p, c = o + (r() - 0.48) * 6, hi = Math.max(o, c) + r() * 3, lo = Math.min(o, c) - r() * 3; days.push([o, hi, lo, c]); p = c; }
    const st = K.stage(host), x = K.linear(0, 29, 6, st.W - 6), y = K.linear(Math.min(...days.map(d => d[2])) - 2, Math.max(...days.map(d => d[1])) + 2, st.H, 0);
    K.axisY(st, y, 4, v => Math.round(v));
    days.forEach(([o, h, l, c], i) => {
      const col = c >= o ? K.C[2] : K.C[7];
      K.el('line', { x1: x(i), x2: x(i), y1: y(h), y2: y(l), stroke: col }, st.g);
      K.el('rect', { x: x(i) - 3.2, y: y(Math.max(o, c)), width: 6.4, height: Math.max(1, Math.abs(y(o) - y(c))), fill: col }, st.g);
    });
  },
},
{
  id: 'calendar', family: 'time', name: 'Calendar heatmap',
  when: 'Daily activity patterns (weekday vs weekend, streaks, holidays).',
  steps: ['Columns = weeks, rows = weekday (0 to 6); cell = one day.',
          'Colour comes from a sequential ramp K.seq(value / max); empty days stay pale.',
          'Weeks use the day index: week = floor(i / 7), weekday = i % 7.'],
  combine: 'Pair with a bar chart of weekly totals sharing the same week axis.',
  fn(host, K) {
    const r = K.rng(31), weeks = 14, cell = 17, st = K.stage(host, 320, 170, { l: 34, t: 22 });
    ['Mon', 'Wed', 'Fri'].forEach((d, i) => K.text(st.g, -6, i * 2 * (cell + 2) + cell * 0.75, d, { 'text-anchor': 'end' }));
    for (let i = 0; i < weeks * 7; i++) {
      const wk = Math.floor(i / 7), dow = i % 7, v = (dow < 5 ? r() : r() * 0.5) * (0.4 + wk / weeks * 0.6);
      K.el('rect', { x: wk * (cell + 2), y: dow * (cell + 2), width: cell, height: cell, rx: 3, fill: K.seq(v) }, st.g);
    }
    [0, 4, 8, 12].forEach(w => K.text(st.g, w * (cell + 2), -8, 'wk ' + (w + 1)));
  },
},
{
  id: 'gantt', family: 'time', name: 'Gantt chart',
  when: 'A schedule: who or what happens when, and what depends on what.',
  steps: ['x = linear time scale; one row per task (band scale); bar from start to end.',
          'Dependencies are elbow connectors from the end of one bar to the start of the next.'],
  combine: 'Add a "today" line, progress fill inside bars, or colour by owner.',
  fn(host, K) {
    const t = [['Plan', 0, 3], ['Collect', 3, 6], ['Clean', 6, 8], ['Model', 8, 12], ['Report', 12, 14]];
    const st = K.stage(host, 320, 190, { l: 58 }), x = K.linear(0, 14, 0, st.W), y = K.band(t.map(r => r[0]), 0, st.H, 0.3);
    [0, 4, 8, 12].forEach(v => { K.el('line', { x1: x(v), x2: x(v), y1: 0, y2: st.H, stroke: 'var(--grid,#e1e0d9)', 'stroke-width': 0.5 }, st.g); K.text(st.g, x(v), st.H + 16, 'wk ' + v, { 'text-anchor': 'middle' }); });
    t.forEach(([k, a, b], i) => {
      K.el('rect', { x: x(a), y: y(k), width: x(b) - x(a), height: y.bw, rx: 4, fill: K.C[i % 8] }, st.g);
      K.text(st.g, -6, y(k) + y.bw / 2 + 4, k, { 'text-anchor': 'end', fill: 'var(--text,#333)' });
      if (i < t.length - 1) { const k2 = t[i + 1][0]; K.el('path', { d: `M${x(b)} ${y(k) + y.bw / 2}L${x(b) + 4} ${y(k) + y.bw / 2}L${x(b) + 4} ${y(k2) + y.bw / 2}L${x(t[i + 1][1])} ${y(k2) + y.bw / 2}`, fill: 'none', stroke: 'var(--muted,#898781)' }, st.g); }
    });
  },
},
{
  id: 'timeline', family: 'time', name: 'Timeline',
  when: 'A short list of dated events in order.',
  steps: ['One horizontal axis scaled by date; each event is a dot on the axis.',
          'Alternate labels above and below with a stem so neighbours do not collide.'],
  combine: 'Draw it above a line chart so events explain the bumps.',
  fn(host, K) {
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
  },
},
{
  id: 'fan', family: 'time', name: 'Fan chart (forecast with uncertainty)',
  when: 'Forecasts: show the best guess AND how fast certainty is lost.',
  steps: ['History is a normal line; the forecast starts at the last observation.',
          'Uncertainty grows with horizon: band half-width = z * sigma * sqrt(h). Draw wide bands first, narrow on top.'],
  combine: 'Overlay the actual values later to evaluate calibration.',
  fn(host, K) {
    const hist = K.series(9, 18, 40, 1.2, 4, 2), h = 10, last = hist[17], n = 18 + h;
    const st = K.stage(host), x = K.linear(0, n - 1, 0, st.W), y = K.linear(20, 100, st.H, 0), f = Array.from({ length: h + 1 }, (_, i) => last + 1.2 * i);
    K.axisY(st, y, 4);
    [[1.96, 0.15], [1.28, 0.25], [0.67, 0.35]].forEach(([z, o]) => {
      const up = f.map((v, i) => [x(17 + i), y(v + z * 2 * Math.sqrt(i))]), lo = f.map((v, i) => [x(17 + i), y(v - z * 2 * Math.sqrt(i))]).reverse();
      K.el('path', { d: K.path(up.concat(lo)) + 'Z', fill: K.C[0], 'fill-opacity': o }, st.g);
    });
    K.el('path', { d: K.path(hist.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: 'var(--text,#333)', 'stroke-width': 2 }, st.g);
    K.el('path', { d: K.path(f.map((v, i) => [x(17 + i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 2, 'stroke-dasharray': '5 3' }, st.g);
  },
},
{
  id: 'bump', family: 'time', name: 'Bump chart (rank over time)',
  when: 'Who leads, who falls: ranks matter, exact values do not.',
  steps: ['y = rank (1 at the top, so the scale runs 1 to n downwards).',
          'One line with circles per series; labels at both ends so lines can be identified. Use straight segments: a spline would overshoot and suggest ranks that never existed.'],
  combine: 'Highlight one series and grey out the rest.',
  fn(host, K) {
    const d = [['Alpha', [1, 2, 2, 3, 4]], ['Beta', [2, 1, 3, 2, 1]], ['Gamma', [3, 3, 1, 1, 2]], ['Delta', [4, 4, 4, 4, 3]]], t = ['2020', '2021', '2022', '2023', '2024'];
    const st = K.stage(host, 320, 190, { l: 54, r: 54 }), x = K.linear(0, 4, 0, st.W), y = K.linear(1, 4, 10, st.H - 14);
    t.forEach((l, i) => K.text(st.g, x(i), st.H + 14, l, { 'text-anchor': 'middle' }));
    d.forEach(([k, rk], j) => {
      K.el('path', { d: K.path(rk.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[j], 'stroke-width': 3, 'stroke-linejoin': 'round' }, st.g);
      rk.forEach((v, i) => K.el('circle', { cx: x(i), cy: y(v), r: 5, fill: K.C[j] }, st.g));
      K.text(st.g, -9, y(rk[0]) + 4, k, { 'text-anchor': 'end', fill: K.C[j] });
      K.text(st.g, st.W + 9, y(rk[4]) + 4, k, { fill: K.C[j] });
    });
  },
},
{
  id: 'horizon', family: 'time', name: 'Horizon chart',
  when: 'Many time series stacked in little vertical space.',
  steps: ['Slice the value range into bands (here 3). Each band is an area scaled to the full row height.',
          'Draw the bands on top of each other with the same transparency: more layers = darker = larger value.',
          'Positive values are blue, negative red, so one row shows both.'],
  combine: 'Stack one row per region to compare many series at once.',
  fn(host, K) {
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
  },
},

// ================================ RELATIONSHIPS ================================
{
  id: 'scatter', family: 'relationship', name: 'Scatter plot',
  when: 'Relationship between two numeric variables; spot clusters and outliers.',
  steps: ['Two linear scales (do not force zero if the data sits far from it).',
          'One semi-transparent circle per row so overlaps stay visible.',
          'Label only the points that matter (outliers), not all of them.'],
  combine: 'Add a regression line, marginal histograms or colour by a third variable.',
  fn(host, K) {
    const r = K.rng(5), pts = Array.from({ length: 80 }, () => { const a = 50 + 15 * K.normal(r); return [a, 0.6 * a + 10 + 7 * K.normal(r)]; });
    pts.push([85, 30]);
    const st = K.stage(host), x = K.linear(10, 100, 0, st.W), y = K.linear(10, 80, st.H, 0);
    K.axisY(st, y, 4); K.axisX(st, x, 4);
    pts.forEach(([a, b]) => K.el('circle', { cx: x(a), cy: y(b), r: 3.4, fill: K.C[0], 'fill-opacity': 0.6 }, st.g));
    K.el('circle', { cx: x(85), cy: y(30), r: 6, fill: 'none', stroke: K.C[1], 'stroke-width': 2 }, st.g);
    K.text(st.g, x(85) - 8, y(30) - 10, 'outlier', { 'text-anchor': 'end', fill: K.C[1] });
  },
},
{
  id: 'bubble', family: 'relationship', name: 'Bubble chart',
  when: 'A third numeric variable is shown by size.',
  steps: ['Map the third variable to AREA, not radius: r = sqrt(v) * k, otherwise big values look far too big.',
          'Draw the biggest bubbles first so small ones remain visible on top.'],
  combine: 'Add colour for a fourth (categorical) variable.',
  fn(host, K) {
    const d = [['A', 20, 30, 40], ['B', 40, 60, 90], ['C', 55, 35, 20], ['D', 70, 75, 60], ['E', 85, 45, 120], ['F', 30, 80, 10]];
    const st = K.stage(host), x = K.linear(0, 100, 0, st.W), y = K.linear(0, 100, st.H, 0);
    K.axisY(st, y, 4); K.axisX(st, x, 4);
    d.slice().sort((a, b) => b[3] - a[3]).forEach(([k, a, b, v], i) => {
      K.el('circle', { cx: x(a), cy: y(b), r: Math.sqrt(v) * 2.2, fill: K.C[d.findIndex(q => q[0] === k) % 8], 'fill-opacity': 0.6, stroke: 'var(--bg,#fff)' }, st.g);
      K.text(st.g, x(a), y(b) + 4, k, { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 500 });
    });
  },
},
{
  id: 'splom', family: 'relationship', name: 'Scatter-plot matrix',
  when: 'Look at every pairwise relationship in a small set of variables.',
  steps: ['A grid: cell (i, j) plots variable j (x) against variable i (y); the diagonal shows each variable\'s histogram.',
          'Each variable gets its own scale, shared by its row and its column.'],
  combine: 'Colour points by group; replace the upper triangle by correlation numbers (see Correlogram).',
  fn(host, K) {
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
  },
},
{
  id: 'correlogram', family: 'relationship', name: 'Correlation matrix (correlogram)',
  when: 'Which variables move together? A grid of correlation coefficients.',
  steps: ['Compute Pearson r for every pair (K.corr); the matrix is symmetric with 1 on the diagonal.',
          'Map r from -1..1 to a diverging colour ramp (red to neutral to blue) with a neutral midpoint at 0.',
          'Print r in each cell; use light text on dark cells.'],
  combine: 'Cluster rows and columns so correlated variables sit together.',
  fn(host, K) {
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
  },
},
{
  id: 'connected', family: 'relationship', name: 'Connected scatter plot',
  when: 'Two variables that both change over time: see the path they take.',
  steps: ['Plot (x, y) for each period like a scatter plot, then join the points in time order.',
          'Label start, end and a few years; arrowheads or numbers show direction.'],
  combine: 'Same data as two line charts, but this shows how the relationship moves.',
  fn(host, K) {
    const yrs = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022], X = [20, 25, 33, 38, 46, 44, 55, 63], Y = [60, 52, 55, 40, 44, 30, 28, 20];
    const st = K.stage(host), x = K.linear(10, 70, 0, st.W), y = K.linear(10, 70, st.H, 0);
    K.axisY(st, y, 4); K.axisX(st, x, 4);
    K.el('path', { d: K.path(X.map((v, i) => [x(v), y(Y[i])])), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
    X.forEach((v, i) => { K.el('circle', { cx: x(v), cy: y(Y[i]), r: 4, fill: i === 0 || i === 7 ? K.C[1] : K.C[0] }, st.g); if (i % 2 === 0 || i === 7) K.text(st.g, x(v) + 6, y(Y[i]) - 6, yrs[i]); });
  },
},
{
  id: 'regci', family: 'relationship', name: 'Regression line with confidence band',
  when: 'A trend plus how sure we are about it.',
  steps: ['Fit least squares with K.lin: slope b, intercept a, residual standard deviation s.',
          'Standard error of the mean at x0: s * sqrt(1/n + (x0 - mean x)^2 / Sxx); band = fit +/- 1.99 * se (t for ~80 observations).',
          'The band is narrowest near the mean of x and fans out at the edges: this is a polygon built from the upper and lower curves.'],
  combine: 'This is a three-layer combination: points, band, line.',
  fn(host, K) {
    const r = K.rng(5), xs = [], ys = []; for (let i = 0; i < 70; i++) { const a = 20 + 70 * r(); xs.push(a); ys.push(0.5 * a + 8 + 8 * K.normal(r)); }
    const m = K.lin(xs, ys), st = K.stage(host), x = K.linear(10, 100, 0, st.W), y = K.linear(0, 80, st.H, 0), gx = K.range(15, 95, 40);
    const se = v => m.s * Math.sqrt(1 / m.n + (v - m.mx) ** 2 / m.sxx), fit = v => m.a + m.b * v;
    K.axisY(st, y, 4); K.axisX(st, x, 4);
    const up = gx.map(v => [x(v), y(fit(v) + 1.99 * se(v))]), lo = gx.map(v => [x(v), y(fit(v) - 1.99 * se(v))]).reverse();
    K.el('path', { d: K.path(up.concat(lo)) + 'Z', fill: K.C[1], 'fill-opacity': 0.2 }, st.g);
    xs.forEach((v, i) => K.el('circle', { cx: x(v), cy: y(ys[i]), r: 3, fill: K.C[0], 'fill-opacity': 0.55 }, st.g));
    K.el('line', { x1: x(15), y1: y(fit(15)), x2: x(95), y2: y(fit(95)), stroke: K.C[1], 'stroke-width': 2.5 }, st.g);
  },
},
{
  id: 'parallel', family: 'relationship', name: 'Parallel coordinates',
  when: 'Compare many numeric dimensions at once and see groups.',
  steps: ['One vertical axis per variable, each rescaled to its own min and max.',
          'Each row becomes a polyline through its position on every axis; colour by group.'],
  combine: 'Brush an axis range to highlight rows (linked views pattern).',
  fn(host, K) {
    const dims = ['Height', 'Weight', 'Speed', 'Score'], r = K.rng(8), N = 36;
    const mu = [[0.3, 0.7, 0.3, 0.6], [0.5, 0.5, 0.6, 0.4], [0.75, 0.3, 0.8, 0.2]];
    const rows = Array.from({ length: N }, (_, i) => { const g = i % 3; return [g, ...dims.map((_, d) => mu[g][d] + 0.09 * K.normal(r))]; });
    const st = K.stage(host, 320, 210, { l: 20, r: 20, b: 26 }), x = K.linear(0, dims.length - 1, 0, st.W), y = K.linear(0, 1, st.H, 0);
    dims.forEach((d, i) => { K.el('line', { x1: x(i), x2: x(i), y1: 0, y2: st.H, stroke: 'var(--axis,#c3c2b7)' }, st.g); K.text(st.g, x(i), st.H + 16, d, { 'text-anchor': 'middle' }); });
    rows.forEach(([g, ...v]) => K.el('path', { d: K.path(v.map((q, i) => [x(i), y(K.clamp(q, 0, 1))])), fill: 'none', stroke: K.C[g], 'stroke-opacity': 0.55, 'stroke-width': 1.4 }, st.g));
  },
},
{
  id: 'quadrant', family: 'relationship', name: 'Quadrant (2x2) chart',
  when: 'Prioritise items on two criteria (impact vs effort, risk vs reward).',
  steps: ['Two linear axes with the dividing lines at the midpoint (or median) of each.',
          'Name each quadrant in its corner (high impact + low effort = "Do first", top-left here); place items as labelled dots, flipping the label to the left near the right edge.'],
  combine: 'Size the dots by a third variable (becomes a bubble chart).',
  fn(host, K) {
    const it = [['Docs', 20, 30], ['Cache', 70, 80], ['Tests', 35, 70], ['Redesign', 85, 25], ['Alerts', 55, 60], ['Rename', 15, 15]];
    const st = K.stage(host, 320, 220, { l: 24, b: 24 }), x = K.linear(0, 100, 0, st.W), y = K.linear(0, 100, st.H, 0);
    K.el('rect', { x: 0, y: 0, width: x(50), height: y(50), fill: K.C[2], 'fill-opacity': 0.1 }, st.g);
    K.el('line', { x1: x(50), x2: x(50), y1: 0, y2: st.H, stroke: 'var(--axis,#c3c2b7)' }, st.g); K.el('line', { x1: 0, x2: st.W, y1: y(50), y2: y(50), stroke: 'var(--axis,#c3c2b7)' }, st.g);
    K.text(st.g, 4, 12, 'Do first', { 'font-weight': 500 }); K.text(st.g, st.W - 4, 12, 'Plan', { 'text-anchor': 'end' }); K.text(st.g, 4, st.H - 4, 'Fill in'); K.text(st.g, st.W - 4, st.H - 4, 'Skip', { 'text-anchor': 'end' });
    K.text(st.g, st.W / 2, st.H + 18, 'effort  →', { 'text-anchor': 'middle' }); K.text(st.g, -8, st.H / 2, 'impact', { 'text-anchor': 'middle', transform: `rotate(-90 -8 ${st.H / 2})` });
    it.forEach(([k, a, b], i) => { K.el('circle', { cx: x(a), cy: y(b), r: 5, fill: K.C[i % 8] }, st.g); K.text(st.g, a > 75 ? x(a) - 8 : x(a) + 8, y(b) + 4, k, { fill: 'var(--text,#333)', 'text-anchor': a > 75 ? 'end' : 'start' }); });
  },
},
{
  id: 'heatmap', family: 'relationship', name: 'Heatmap (matrix)',
  when: 'A value for every pair of categories (hour by weekday, model by metric).',
  steps: ['Band scales on both axes; one rect per cell.',
          'Fill with a sequential ramp (one hue, light to dark); add a thin gap so cells read as cells.'],
  combine: 'Order rows and columns by similarity (clustering) to reveal blocks.',
  fn(host, K) {
    const rows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], cols = ['8h', '10h', '12h', '14h', '16h', '18h'], r = K.rng(14);
    const st = K.stage(host, 320, 210, { l: 36, t: 26 }), x = K.band(cols, 0, st.W, 0.06), y = K.band(rows, 0, st.H, 0.06);
    rows.forEach(a => cols.forEach(b => { const v = r() * (b === '12h' || b === '14h' ? 1 : 0.6); K.el('rect', { x: x(b), y: y(a), width: x.bw, height: y.bw, rx: 3, fill: K.seq(v) }, st.g); }));
    rows.forEach(a => K.text(st.g, -6, y(a) + y.bw / 2 + 4, a, { 'text-anchor': 'end' }));
    cols.forEach(b => K.text(st.g, x(b) + x.bw / 2, -8, b, { 'text-anchor': 'middle' }));
  },
},
{
  id: 'radar', family: 'relationship', name: 'Radar (spider) chart',
  when: 'Profile of one or a few items across 5 to 8 comparable metrics.',
  steps: ['Axes are spokes at equal angles (2 pi / n); value maps to the distance from the centre.',
          'Rings give the scale; connect the points of each series into a closed polygon.',
          'Metrics must share a scale (0 to 100), otherwise the shape is meaningless.'],
  combine: 'Keep to 2 or 3 series; for more, use small multiples of single radars.',
  fn(host, K) {
    const ax = ['Speed', 'Power', 'Range', 'Cost', 'Safety', 'Comfort'], S = [['A', [80, 60, 70, 50, 90, 65]], ['B', [55, 85, 60, 75, 60, 80]]];
    const st = K.stage(host, 320, 230, { t: 8, b: 8 }), cx = st.W / 2, cy = st.H / 2, R = 78, a = i => i / ax.length * 2 * Math.PI;
    [0.25, 0.5, 0.75, 1].forEach(f => K.el('polygon', { points: ax.map((_, i) => K.polar(cx, cy, R * f, a(i)).join(',')).join(' '), fill: 'none', stroke: 'var(--grid,#e1e0d9)' }, st.g));
    ax.forEach((n, i) => { const p = K.polar(cx, cy, R, a(i)), q = K.polar(cx, cy, R + 14, a(i)); K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--grid,#e1e0d9)' }, st.g); K.text(st.g, q[0], q[1] + 4, n, { 'text-anchor': 'middle' }); });
    S.forEach(([k, v], j) => K.el('polygon', { points: v.map((q, i) => K.polar(cx, cy, R * q / 100, a(i)).join(',')).join(' '), fill: K.C[j], 'fill-opacity': 0.22, stroke: K.C[j], 'stroke-width': 2 }, st.g));
    K.legend(st.g, S.map(([k], j) => [k, K.C[j]]), 0, st.H - 12, 40);
  },
},
];
if (typeof module !== 'undefined') module.exports = RECIPES_B2; else window.RECIPES_B2 = RECIPES_B2;
