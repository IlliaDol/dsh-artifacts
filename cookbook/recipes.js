/* recipes.js: every entry is data (what/why/steps) + a real drawing function.
   The code shown in the docs is fn.toString() of the function that actually runs. */
const RECIPES = [

// =========================== COMPARISON & MAGNITUDE ===========================
{
  id: 'bar', family: 'comparison', name: 'Bar / column chart',
  when: 'One number per category; compare sizes. Always start the value axis at 0.',
  steps: ['Band scale for categories on x, linear scale for values on y (0 at the bottom).',
          'One rect per row: x = band(key), height = y(0) - y(value).',
          'Gridlines and ticks come from the axis helpers; labels sit under each band.'],
  combine: 'Add a second mark layer (target line, error bars) or sort rows to make it a ranking.',
  fn(host, K) {
    const d = K.data.langs, keys = d.map(r => r[0]);
    const st = K.stage(host), x = K.band(keys, 0, st.W, 0.3), y = K.linear(0, 80, st.H, 0);
    K.axisY(st, y, 4);
    d.forEach(([k, v]) => K.el('rect', { x: x(k), y: y(v), width: x.bw, height: st.H - y(v), fill: K.C[0], rx: 3 }, st.g));
    K.axisBand(st, x, keys);
  },
},
{
  id: 'grouped', family: 'comparison', name: 'Grouped bar chart',
  when: 'Compare several series inside each category.',
  steps: ['Same band scale as a bar chart; each band is split into one slot per series.',
          'Slot width = band width / number of series; offset = series index * slot width.',
          'Colour = series (fixed order), never category.'],
  combine: 'Swap to stacked when the total matters more than the individual parts.',
  fn(host, K) {
    const keys = ['Q1', 'Q2', 'Q3', 'Q4'], series = [[30, 42, 38, 55], [24, 35, 46, 50]];
    const st = K.stage(host), x = K.band(keys, 0, st.W, 0.25), y = K.linear(0, 60, st.H, 0);
    const w = x.bw / series.length;
    K.axisY(st, y, 4);
    keys.forEach((k, i) => series.forEach((s, j) =>
      K.el('rect', { x: x(k) + j * w, y: y(s[i]), width: w - 1, height: st.H - y(s[i]), fill: K.C[j], rx: 2 }, st.g)));
    K.axisBand(st, x, keys);
  },
},
{
  id: 'stacked', family: 'comparison', name: 'Stacked bar chart',
  when: 'Totals matter and so do the parts that make them up.',
  steps: ['Keep a running baseline per category, starting at 0.',
          'Each segment: top = y(base + v), height = y(base) - y(base + v); then base += v.',
          'Domain must reach the largest total, not the largest segment.'],
  combine: 'Only the bottom segment is easy to compare across bars. Use grouped if parts matter most.',
  fn(host, K) {
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
  },
},
{
  id: 'stacked100', family: 'comparison', name: '100% stacked bar',
  when: 'Compare composition (shares), not totals.',
  steps: ['Same as stacked, but divide each value by its category total first.',
          'Fixed domain 0 to 1, tick labels formatted as percentages.'],
  combine: 'Pair with a plain stacked chart if totals also matter.',
  fn(host, K) {
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
  },
},
{
  id: 'diverging', family: 'comparison', name: 'Diverging stacked bar (Likert)',
  when: 'Survey scales: show agree vs disagree around a neutral centre.',
  steps: ['Linear x scale symmetric around 0 and wide enough for the longest side (neutral/2 + agree + strongly agree can exceed 80).',
          'Negative side grows leftwards: half of neutral first, then disagree, then strongly disagree.',
          'Positive side grows rightwards the same way. A heavy centre line marks 0.'],
  combine: 'Sort rows by net agreement to turn it into a ranking.',
  fn(host, K) {
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
  },
},
{
  id: 'lollipop', family: 'comparison', name: 'Lollipop chart',
  when: 'Same job as a bar chart with less ink; good for many categories.',
  steps: ['Same scales as a bar chart.', 'Draw a thin line from the baseline to the value, then a circle on top.'],
  combine: 'Highlight one category by changing only its circle colour.',
  fn(host, K) {
    const d = K.data.langs, keys = d.map(r => r[0]);
    const st = K.stage(host), x = K.band(keys, 0, st.W, 0.3), y = K.linear(0, 80, st.H, 0);
    K.axisY(st, y, 4);
    d.forEach(([k, v]) => {
      const cx = x(k) + x.bw / 2;
      K.el('line', { x1: cx, x2: cx, y1: y(0), y2: y(v), stroke: K.C[0], 'stroke-width': 2 }, st.g);
      K.el('circle', { cx, cy: y(v), r: 6, fill: K.C[0] }, st.g);
    });
    K.axisBand(st, x, keys);
  },
},
{
  id: 'dumbbell', family: 'comparison', name: 'Dumbbell chart',
  when: 'Before vs after (or two groups) for each item; the gap is the message.',
  steps: ['Band scale on y (one row per item), linear on x.', 'Connecting line first, then one circle per end so circles sit on top.'],
  combine: 'Sort by gap size. Add arrowheads for direction of change.',
  fn(host, K) {
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
  },
},
{
  id: 'bullet', family: 'comparison', name: 'Bullet chart',
  when: 'One value against a target, with qualitative ranges (poor / ok / good).',
  steps: ['Draw range bands widest first so narrower, darker bands overlay them.',
          'Value bar is thinner than the band; target is a short vertical tick.'],
  combine: 'Stack several in a column to make a compact KPI panel.',
  fn(host, K) {
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
  },
},
{
  id: 'radialbar', family: 'comparison', name: 'Radial bar chart',
  when: 'Decorative alternative to bars; inner rings are shorter, so read with care.',
  steps: ['Each category gets a concentric ring; value maps to an angle (here up to 270 degrees).',
          'Ring shape comes from K.arc(cx, cy, innerR, outerR, startAngle, endAngle).',
          'Labels go in the empty quarter where no ring reaches.'],
  combine: 'Rarely worth combining; prefer a plain bar when accuracy matters.',
  fn(host, K) {
    const d = K.data.langs, st = K.stage(host, 320, 230, { t: 5, b: 5, l: 10, r: 10 }), cx = st.W / 2, cy = st.H / 2;
    d.forEach(([k, v], i) => {
      const r1 = 105 - i * 19, r0 = r1 - 14;
      K.el('path', { d: K.arc(cx, cy, r0, r1, 0, 1.5 * Math.PI), fill: 'var(--grid,#ece9e0)' }, st.g);
      K.el('path', { d: K.arc(cx, cy, r0, r1, 0, v / 80 * 1.5 * Math.PI), fill: K.C[i % 8] }, st.g);
      K.text(st.g, cx - 6, cy - r1 + 11, k, { 'text-anchor': 'end' });
    });
  },
},
{
  id: 'waterfall', family: 'comparison', name: 'Waterfall chart',
  when: 'How a starting value becomes an end value through gains and losses.',
  steps: ['Walk the rows keeping a running total: each bar spans from the old total to the new one.',
          'Colour by sign; the final total bar starts at 0.',
          'Thin connector lines link the end of one bar to the start of the next.'],
  combine: 'Works as the bottom half of a P&L dashboard with a table beside it.',
  fn(host, K) {
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
  },
},
{
  id: 'marimekko', family: 'comparison', name: 'Marimekko (mosaic) chart',
  when: 'Two-way proportions: column width shows one share, segment height another.',
  steps: ['Column width = segment size (x scale 0..100); heights = shares within the column.',
          'Track a running x offset for columns and a running base for segments.'],
  combine: 'Annotate the largest cells; too many cells makes it unreadable.',
  fn(host, K) {
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
  },
},
{
  id: 'waffle', family: 'comparison', name: 'Waffle chart',
  when: 'Shares of a whole that people should read as "out of 100".',
  steps: ['Turn each share into a count of cells out of 100 and build one colour per cell.',
          'Cell i sits at column i % 10, row floor(i / 10); draw rows from the top.'],
  combine: 'Replace squares with icons for a pictogram.',
  fn(host, K) {
    const parts = [['Python', 48], ['SQL', 27], ['R', 15], ['Other', 10]];
    const cells = parts.flatMap(([, n], j) => Array(n).fill(K.C[j]));
    const st = K.stage(host, 320, 220, { l: 20, t: 10, b: 10 }), s = 16;
    cells.forEach((c, i) => K.el('rect', { x: (i % 10) * (s + 2), y: Math.floor(i / 10) * (s + 2), width: s, height: s, rx: 3, fill: c }, st.g));
    parts.forEach(([k, n], j) => {
      K.el('rect', { x: 205, y: 30 + j * 24, width: 12, height: 12, rx: 2, fill: K.C[j] }, st.g);
      K.text(st.g, 223, 41 + j * 24, k + ' ' + n + '%');
    });
  },
},
{
  id: 'funnel', family: 'comparison', name: 'Funnel chart',
  when: 'Stages where each step loses some of the previous one.',
  steps: ['Half-width of each stage = value / max * a fixed maximum half-width, centred on one axis; labels go in a column on the right so narrow stages stay readable.',
          'Between stage i and i+1 draw a trapezoid (polygon) joining their edges.'],
  combine: 'Add conversion % between stages as small labels.',
  fn(host, K) {
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
  },
},
{
  id: 'pareto', family: 'comparison', name: 'Pareto chart',
  when: 'Find the few causes that explain most of the total (the 80/20 view).',
  steps: ['Sort descending, convert to % of total, and draw bars.',
          'Cumulative % line on the SAME 0..100% axis (no second axis needed).'],
  combine: 'Bars + line is the classic two-layer combo; add a dashed 80% reference line.',
  fn(host, K) {
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
  },
},
{
  id: 'pyramid', family: 'comparison', name: 'Population pyramid',
  when: 'Two mirrored distributions over the same categories (age bands by sex, A vs B).',
  steps: ['Symmetric x scale around 0; the left series is drawn with negative width.',
          'Bands on y, oldest at the top; centre line at 0; tick labels use absolute values.'],
  combine: 'Use as a small multiple across years to show change.',
  fn(host, K) {
    const ages = ['60+', '40-59', '20-39', '0-19'], L = [14, 26, 30, 22], R = [16, 27, 29, 21];
    const st = K.stage(host, 320, 190, { l: 44 }), x = K.linear(-35, 35, 0, st.W), y = K.band(ages, 0, st.H, 0.25);
    ages.forEach((a, i) => {
      K.el('rect', { x: x(-L[i]), y: y(a), width: x(0) - x(-L[i]), height: y.bw, fill: K.C[1] }, st.g);
      K.el('rect', { x: x(0), y: y(a), width: x(R[i]) - x(0), height: y.bw, fill: K.C[0] }, st.g);
      K.text(st.g, -6, y(a) + y.bw / 2 + 4, a, { 'text-anchor': 'end' });
    });
    K.axisX(st, x, 4, v => Math.abs(v) + '%');
  },
},
{
  id: 'slope', family: 'comparison', name: 'Slope chart',
  when: 'How each item changed between exactly two moments.',
  steps: ['Two vertical axes (x = left and right); one shared y scale.',
          'One line per item from (left, before) to (right, after); colour by direction of change.'],
  combine: 'With many time points it becomes a line chart; with ranks only, a bump chart.',
  fn(host, K) {
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
  },
},

// ================================ DISTRIBUTION ================================
{
  id: 'histogram', family: 'distribution', name: 'Histogram',
  when: 'Shape of ONE numeric variable: centre, spread, skew, gaps.',
  steps: ['Choose a range and a number of bins; K.hist counts values per bin.',
          'x is a linear scale over the value range; bar height = count.',
          'Bin count changes the story: try 10, 25 and 60 before trusting a shape.'],
  combine: 'Layer a density curve and a rug on top (see Combining recipes).',
  fn(host, K) {
    const d = K.sample(1, 500, 50, 12), bins = K.hist(d, 10, 90, 24);
    const st = K.stage(host), x = K.linear(10, 90, 0, st.W), y = K.linear(0, Math.max(...bins.map(b => b.n)) * 1.1, st.H, 0);
    K.axisY(st, y, 4);
    bins.forEach(b => K.el('rect', { x: x(b.x0) + 0.5, y: y(b.n), width: x(b.x1) - x(b.x0) - 1, height: st.H - y(b.n), fill: K.C[0], rx: 1.5 }, st.g));
    K.axisX(st, x, 4);
  },
},
{
  id: 'density', family: 'distribution', name: 'Density plot (KDE)',
  when: 'A smooth version of the histogram; good for comparing several groups.',
  steps: ['Kernel density: put a small bell curve on every data point and add them up (K.kde).',
          'Bandwidth sets smoothness; Silverman\'s rule (K.bw) is a sensible default.',
          'Draw as a filled path closed along the baseline.'],
  combine: 'Overlay several groups with transparency, or stack as a ridgeline.',
  fn(host, K) {
    const d = K.sample(2, 400, 50, 12), xs = K.range(10, 90, 120), ys = K.kde(d, K.bw(d), xs);
    const st = K.stage(host), x = K.linear(10, 90, 0, st.W), y = K.linear(0, Math.max(...ys) * 1.1, st.H, 0);
    const pts = xs.map((v, i) => [x(v), y(ys[i])]);
    K.axisY(st, y, 4, v => v.toFixed(2));
    K.el('path', { d: K.path(pts) + `L${st.W} ${st.H}L0 ${st.H}Z`, fill: K.C[0], 'fill-opacity': 0.18 }, st.g);
    K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
    K.axisX(st, x, 4);
  },
},
{
  id: 'boxplot', family: 'distribution', name: 'Box plot',
  when: 'Compare spread, median and outliers across groups at a glance.',
  steps: ['Sort each group; get Q1, median, Q3 with K.quantile.',
          'Whiskers reach the furthest points within 1.5 x IQR of the box; the rest are outliers.',
          'Draw whisker line, box, median bar, then outlier dots.'],
  combine: 'Overlay the raw points (jitter) so n and clusters are visible.',
  fn(host, K) {
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
  },
},
{
  id: 'violin', family: 'distribution', name: 'Violin plot',
  when: 'Box plot plus the full shape (bimodality shows up here, not in a box).',
  steps: ['Compute a KDE per group over the same y range.',
          'Evaluate each KDE only between that group\'s own min and max so the tails do not become thin spikes.',
          'Mirror it around the group centre: walk down the right edge, back up the left, close the path.'],
  combine: 'Draw a narrow box plot inside the violin.',
  fn(host, K) {
    const g = [['A', K.sample(1, 200, 50, 8)], ['B', K.sample(2, 100, 40, 6).concat(K.sample(3, 100, 72, 6))]];
    const st = K.stage(host), x = K.band(g.map(r => r[0]), 0, st.W, 0.3), y = K.linear(10, 100, st.H, 0);
    K.axisY(st, y, 4);
    g.forEach(([k, d], j) => {
      const ys = K.range(Math.min(...d), Math.max(...d), 60), dens = K.kde(d, K.bw(d), ys), half = x.bw / 2, cx = x(k) + half, m = Math.max(...dens);
      const right = ys.map((v, i) => [cx + dens[i] / m * half, y(v)]), left = ys.map((v, i) => [cx - dens[i] / m * half, y(v)]).reverse();
      K.el('path', { d: K.path(right.concat(left)) + 'Z', fill: K.C[j], 'fill-opacity': 0.35, stroke: K.C[j], 'stroke-width': 1.5 }, st.g);
    });
    K.axisBand(st, x, g.map(r => r[0]));
  },
},
{
  id: 'ridgeline', family: 'distribution', name: 'Ridgeline (joy) plot',
  when: 'Compare many distributions that would overlap on one axis.',
  steps: ['One KDE per group, each drawn on its own baseline spaced down the page.',
          'Draw the top row first so lower rows overlap it; fill with the page background so overlaps hide cleanly.'],
  combine: 'Order rows by median to show a trend across groups.',
  fn(host, K) {
    const groups = ['Mon', 'Tue', 'Wed', 'Thu'].map((k, i) => [k, K.sample(i + 5, 200, 40 + i * 8, 7 + i)]);
    const st = K.stage(host, 320, 220, { l: 36 }), x = K.linear(10, 100, 0, st.W), xs = K.range(10, 100, 100);
    groups.forEach(([k, d], i) => {
      const dens = K.kde(d, K.bw(d), xs), base = 50 + i * 42, m = 0.06;
      const pts = xs.map((v, j) => [x(v), base - dens[j] / m * 62]);
      K.el('path', { d: K.path(pts) + `L${st.W} ${base}L0 ${base}Z`, fill: K.C[i], 'fill-opacity': 0.55, stroke: K.C[i], 'stroke-width': 1.5 }, st.g);
      K.text(st.g, -6, base + 3, k, { 'text-anchor': 'end' });
    });
    K.axisX(st, x, 4);
  },
},
{
  id: 'beeswarm', family: 'distribution', name: 'Beeswarm / strip plot',
  when: 'Show every point (small n) without overlap, plus the shape.',
  steps: ['Place points in sorted order along the value axis.',
          'For each, try offsets 0, +r, -r, +2r, -2r... until it no longer touches an already placed point.'],
  combine: 'Add a median tick, or colour points by a second variable.',
  fn(host, K) {
    const d = K.sorted(K.sample(3, 110, 50, 12)), st = K.stage(host, 320, 150), x = K.linear(10, 90, 0, st.W), r = 3.2, placed = [];
    d.forEach(v => {
      const px = x(v); let k = 0, off = 0;
      while (placed.some(p => Math.hypot(p.x - px, p.y - off) < 2 * r) && k < 60) { k++; off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * r; }
      placed.push({ x: px, y: off });
    });
    placed.forEach(p => K.el('circle', { cx: p.x, cy: st.H / 2 + p.y, r, fill: K.C[0], 'fill-opacity': 0.8 }, st.g));
    K.axisX(st, x, 4);
  },
},
{
  id: 'ecdf', family: 'distribution', name: 'ECDF (cumulative distribution)',
  when: 'Read percentiles directly; compare groups without choosing bins.',
  steps: ['Sort the data; the curve climbs 1/n at every observation.',
          'Draw as steps: horizontal to the value, then up one notch.'],
  combine: 'Overlay two groups; the vertical gap is the difference in percentiles.',
  fn(host, K) {
    const d = K.sorted(K.sample(4, 150, 50, 12)), n = d.length;
    const st = K.stage(host), x = K.linear(10, 90, 0, st.W), y = K.linear(0, 1, st.H, 0);
    let p = `M${x(10)},${y(0)}`;
    d.forEach((v, i) => { p += `L${x(v)},${y(i / n)}L${x(v)},${y((i + 1) / n)}`; });
    p += `L${x(90)},${y(1)}`;
    K.axisY(st, y, 4, v => Math.round(v * 100) + '%');
    K.el('path', { d: p, fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
    K.axisX(st, x, 4);
  },
},
{
  id: 'qq', family: 'distribution', name: 'Q-Q plot',
  when: 'Check whether data follow a normal distribution (or any reference).',
  steps: ['Standardise the sorted data to z-scores.',
          'Pair each with the normal quantile at (i + 0.5) / n using K.invNorm.',
          'Points on the diagonal mean normal; a curve means skew, a tilt in the tails means heavy tails.'],
  combine: 'Place beside a histogram of the same data and the Shapiro-Wilk result.',
  fn(host, K) {
    const raw = K.sorted(K.sample(5, 300, 0, 0.6).map(Math.exp)), m = K.mean(raw), s = K.sd(raw), n = raw.length;
    const st = K.stage(host), x = K.linear(-3.5, 3.5, 0, st.W), y = K.linear(-2, 6, st.H, 0);
    K.axisY(st, y, 4); K.axisX(st, x, 4);
    K.el('line', { x1: x(-2), y1: y(-2), x2: x(3.5), y2: y(3.5), stroke: K.C[1], 'stroke-width': 2, 'stroke-dasharray': '5 4' }, st.g);
    raw.forEach((v, i) => { if (i % 3 === 0) K.el('circle', { cx: x(K.invNorm((i + 0.5) / n)), cy: y((v - m) / s), r: 2.5, fill: K.C[0], 'fill-opacity': 0.75 }, st.g); });
  },
},
{
  id: 'rug', family: 'distribution', name: 'Rug / barcode plot',
  when: 'Raw observation positions for several groups in minimal space.',
  steps: ['One thin vertical tick per observation along a shared value axis.',
          'Semi-transparent ticks pile up into darker regions, which acts as a density cue.'],
  combine: 'Usually drawn under a histogram or density curve as a second layer.',
  fn(host, K) {
    const rows = [['A', K.sample(1, 80, 45, 8)], ['B', K.sample(2, 80, 58, 10)], ['C', K.sample(3, 80, 50, 4)]];
    const st = K.stage(host, 320, 150, { l: 30 }), x = K.linear(10, 90, 0, st.W), y = K.band(rows.map(r => r[0]), 0, st.H, 0.35);
    rows.forEach(([k, d], j) => {
      d.forEach(v => K.el('line', { x1: x(v), x2: x(v), y1: y(k), y2: y(k) + y.bw, stroke: K.C[j], 'stroke-opacity': 0.4, 'stroke-width': 1.5 }, st.g));
      K.text(st.g, -6, y(k) + y.bw / 2 + 4, k, { 'text-anchor': 'end' });
    });
    K.axisX(st, x, 4);
  },
},
{
  id: 'bin2d', family: 'distribution', name: '2D density (binned heatmap)',
  when: 'Scatter plot with too many points; show where they pile up.',
  steps: ['Divide both axes into square bins and count points per bin.',
          'Draw a rect per non-empty bin; opacity = count / max count.'],
  combine: 'Hexagonal bins are the same idea with a different tile shape.',
  fn(host, K) {
    const r = K.rng(9), pts = Array.from({ length: 1500 }, () => { const a = K.normal(r); return [a, 0.7 * a + 0.7 * K.normal(r)]; });
    const k = 16, lo = -3, hi = 3, w = (hi - lo) / k, grid = Array.from({ length: k }, () => Array(k).fill(0));
    pts.forEach(([a, b]) => { const i = Math.floor((a - lo) / w), j = Math.floor((b - lo) / w); if (i >= 0 && i < k && j >= 0 && j < k) grid[i][j]++; });
    const mx = Math.max(...grid.flat()), st = K.stage(host), x = K.linear(lo, hi, 0, st.W), y = K.linear(lo, hi, st.H, 0);
    K.axisY(st, y, 4); K.axisX(st, x, 4);
    grid.forEach((col, i) => col.forEach((n, j) => { if (n) K.el('rect', { x: x(lo + i * w), y: y(lo + (j + 1) * w), width: x(lo + w) - x(lo) + 0.5, height: y(lo) - y(lo + w) + 0.5, fill: K.C[0], 'fill-opacity': n / mx }, st.g); }));
  },
},

// ================================ COMBINING ================================
{
  id: 'combo-layers', family: 'combining', name: 'Layering: histogram + density + normal fit + rug',
  when: 'Several marks on ONE set of scales, each answering a different question.',
  steps: ['Pick one coordinate system (x value, y density) and make every layer use it.',
          'Rescale the histogram to density (count / (n * binWidth)) so it matches the curves.',
          'Draw back to front: bars, rug, KDE line, then the fitted normal as a dashed line.'],
  combine: 'The same pattern gives scatter + regression line + confidence band, or bars + target line.',
  fn(host, K) {
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
  },
},
{
  id: 'combo-violin', family: 'combining', name: 'Layering: violin + box + jittered points',
  when: 'Shape, summary and raw data in one glance.',
  steps: ['Violin outline first (light), then a narrow box, then the points on top.',
          'Jitter horizontally with a seeded random so the picture is reproducible.'],
  combine: 'Same layering idea: any distribution plot can carry the raw points.',
  fn(host, K) {
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
  },
},
{
  id: 'combo-multiples', family: 'combining', name: 'Small multiples (same chart, one panel per group)',
  when: 'Compare many groups without overplotting: repeat one chart with SHARED scales.',
  steps: ['Define the scales once, from the data of ALL groups, so panels are comparable.',
          'Loop over groups; translate a <g> to each grid cell and call the same drawing code.'],
  combine: 'Works for any chart type; this is how to compare 20 regions or 12 months.',
  fn(host, K) {
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
  },
},
{
  id: 'combo-linked', family: 'combining', name: 'Linked views: filter one chart, the other updates',
  when: 'Exploration: select a range in one chart and see what it means in another.',
  steps: ['Keep ONE shared state object (here: the selected x range).',
          'Each chart is a function of (data, state); a single update() redraws all of them.',
          'Controls only change state, then call update(); charts never talk to each other directly.'],
  combine: 'Replace sliders with a drag-brush, or link a map and a table the same way.',
  test: host => { const i = host.querySelector('input[data-k=lo]'), before = host.innerHTML; i.value = 55; i.dispatchEvent(new Event('input', { bubbles: true })); if (host.innerHTML === before) throw new Error('brush did nothing'); },
  fn(host, K) {
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
  },
},
];
if (typeof module !== 'undefined') module.exports = RECIPES; else window.RECIPES = RECIPES;
