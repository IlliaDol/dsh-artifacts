# Statistics and machine learning

17 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Residual plot

**Use it when:** Check a regression: are errors patternless and equally spread?

**How I do it**

1. Fit the line (K.lin) and compute residual = observed - fitted for every point.
2. Plot residual (y) against fitted value (x) with a zero line. A fan shape means unequal variance, a curve means a missing non-linear term.

**Code** (id `residuals`)

```js
function draw(host, K) {
  const r = K.rng(4), xs = Array.from({ length: 90 }, () => 10 + 80 * r()), ys = xs.map(x => 0.6 * x + 5 + K.normal(r) * (2 + x / 12)), m = K.lin(xs, ys);
  const fit = xs.map(x => m.a + m.b * x), res = ys.map((y, i) => y - fit[i]), lim = Math.max(...res.map(Math.abs)) * 1.1;
  const st = K.stage(host), x = K.linear(Math.min(...fit), Math.max(...fit), 0, st.W), y = K.linear(-lim, lim, st.H, 0);
  K.axisY(st, y, 4, v => Math.round(v)); K.axisX(st, x, 4, v => Math.round(v));
  K.el('line', { x1: 0, x2: st.W, y1: y(0), y2: y(0), stroke: K.C[1], 'stroke-width': 2, 'stroke-dasharray': '5 4' }, st.g);
  fit.forEach((f, i) => K.el('circle', { cx: x(f), cy: y(res[i]), r: 3, fill: K.C[0], 'fill-opacity': 0.6 }, st.g));
}
```

**Combines with:** Place beside the regression + confidence band recipe: the pair tells whether the fit can be trusted.

---

## ROC curve

**Use it when:** How well a score separates two classes across ALL thresholds.

**How I do it**

1. Sort cases by score, high to low. Sweep the threshold downwards: each case moves either true positives or false positives up by one.
2. Plot (false positive rate, true positive rate) after every step. The diagonal is a coin flip.
3. AUC = area under the curve by the trapezoid rule; 1.0 is perfect, 0.5 is chance.

**Code** (id `roc`)

```js
function draw(host, K) {
  const { pts } = rocPoints(scoresFor(K)); let auc = 0; for (let i = 1; i < pts.length; i++) auc += (pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1]) / 2;
  const st = K.stage(host, 320, 230, { l: 40, b: 40 }), x = K.linear(0, 1, 0, st.W), y = K.linear(0, 1, st.H, 0);
  K.axisY(st, y, 4, v => v.toFixed(1)); K.axisX(st, x, 4, v => v.toFixed(1));
  K.el('line', { x1: x(0), y1: y(0), x2: x(1), y2: y(1), stroke: 'var(--muted,#898781)', 'stroke-dasharray': '4 4' }, st.g);
  K.el('path', { d: K.path(pts.map(p => [x(p[0]), y(p[1])])), fill: 'none', stroke: K.C[0], 'stroke-width': 2.5 }, st.g);
  K.text(st.g, x(0.45), y(0.25), 'AUC = ' + auc.toFixed(2), { 'font-size': 14, fill: 'var(--text,#222)' });
  K.text(st.g, st.W / 2, st.H + 34, 'false positive rate', { 'text-anchor': 'middle' });
}
```

**Combines with:** Draw several models as several lines; add the point for the threshold you actually use.

---

## Precision-recall curve

**Use it when:** Imbalanced classes, where ROC looks too optimistic.

**How I do it**

1. Same threshold sweep as ROC but track precision = TP / (TP + FP) and recall = TP / all positives.
2. The baseline is the share of positives in the data (a horizontal line), not a diagonal.

**Code** (id `prcurve`)

```js
function draw(host, K) {
  const d = scoresFor(K), { P, s } = rocPoints(d); let tp = 0, fp = 0; const pts = s.map(q => { q.y ? tp++ : fp++; return [tp / P, tp / (tp + fp)]; });
  const st = K.stage(host, 320, 230, { l: 40, b: 40 }), x = K.linear(0, 1, 0, st.W), y = K.linear(0, 1, st.H, 0);
  K.axisY(st, y, 4, v => v.toFixed(1)); K.axisX(st, x, 4, v => v.toFixed(1));
  K.el('line', { x1: 0, x2: st.W, y1: y(P / d.length), y2: y(P / d.length), stroke: 'var(--muted,#898781)', 'stroke-dasharray': '4 4' }, st.g);
  K.el('path', { d: K.path(pts.map(p => [x(p[0]), y(p[1])])), fill: 'none', stroke: K.C[1], 'stroke-width': 2.5 }, st.g);
  K.text(st.g, st.W / 2, st.H + 34, 'recall', { 'text-anchor': 'middle' }); K.text(st.g, 6, y(P / d.length) - 5, 'baseline = share of positives');
}
```

**Combines with:** Show next to ROC; report average precision (area under this curve).

---

## Confusion matrix

**Use it when:** What kinds of mistakes a classifier makes at one chosen threshold.

**How I do it**

1. Apply the threshold (score > 0.65 means "positive") and count the four outcomes: TN, FP, FN, TP.
2. A 2 x 2 grid, darker = more cases; print the count and the row percentage in every cell.

**Code** (id `confusion`)

```js
function draw(host, K) {
  const d = scoresFor(K), th = 0.65, c = { tn: 0, fp: 0, fn: 0, tp: 0 };
  d.forEach(q => { const p = q.s > th; if (q.y && p) c.tp++; else if (q.y) c.fn++; else if (p) c.fp++; else c.tn++; });
  const grid = [[c.tn, c.fp], [c.fn, c.tp]], mx = Math.max(c.tn, c.fp, c.fn, c.tp), st = K.stage(host, 320, 230, { l: 60, t: 30, b: 24 }), w = 100;
  ['pred. 0', 'pred. 1'].forEach((t, j) => K.text(st.g, j * (w + 2) + w / 2, -10, t, { 'text-anchor': 'middle' }));
  ['actual 0', 'actual 1'].forEach((t, i) => K.text(st.g, -6, i * (w - 20 + 2) + (w - 20) / 2 + 4, t, { 'text-anchor': 'end' }));
  grid.forEach((row, i) => row.forEach((n, j) => {
    K.el('rect', { x: j * (w + 2), y: i * (w - 20 + 2), width: w, height: w - 20, rx: 6, fill: K.seq(n / mx) }, st.g);
    K.text(st.g, j * (w + 2) + w / 2, i * (w - 20 + 2) + 34, n, { 'text-anchor': 'middle', 'font-size': 18, fill: n / mx > 0.5 ? '#fff' : '#222' });
    K.text(st.g, j * (w + 2) + w / 2, i * (w - 20 + 2) + 52, Math.round(n / K.sum(row) * 100) + '% of row', { 'text-anchor': 'middle', fill: n / mx > 0.5 ? '#fff' : '#555' });
  }));
}
```

**Combines with:** Move the threshold with a slider and watch the ROC point move (linked views).

---

## Learning curve (train vs validation loss)

**Use it when:** Diagnose over- and under-fitting while a model trains.

**How I do it**

1. x = epoch; two lines: training loss (keeps falling) and validation loss (falls, then rises when the model overfits).
2. Mark the epoch with the lowest validation loss (early-stopping point) with a vertical rule.

**Code** (id `learning`)

```js
function draw(host, K) {
  const r = K.rng(9), E = Array.from({ length: 40 }, (_, i) => i + 1), tr = E.map(e => 0.15 + 1.2 * Math.exp(-e / 7) + 0.01 * K.normal(r)), va = E.map(e => 0.4 + 1.0 * Math.exp(-e / 6) + 0.012 * Math.max(0, e - 17) + 0.015 * K.normal(r));
  const best = va.indexOf(Math.min(...va)), st = K.stage(host, 320, 220, { r: 14 }), x = K.linear(1, 40, 0, st.W), y = K.linear(0, 1.6, st.H, 0);
  K.axisY(st, y, 4, v => v.toFixed(1)); K.axisX(st, x, 4);
  K.el('line', { x1: x(best + 1), x2: x(best + 1), y1: 0, y2: st.H, stroke: 'var(--muted,#898781)', 'stroke-dasharray': '4 3' }, st.g); K.text(st.g, x(best + 1) + 4, 12, 'stop at epoch ' + (best + 1));
  [[tr, K.C[0], 'train'], [va, K.C[1], 'validation']].forEach(([s, c, n]) => { K.el('path', { d: K.path(s.map((v, i) => [x(i + 1), y(v)])), fill: 'none', stroke: c, 'stroke-width': 2 }, st.g); });
  K.legend(st.g, [['train', K.C[0]], ['validation', K.C[1]]], st.W - 150, st.H - 40, 70);
}
```

**Combines with:** Add the learning rate schedule as a faint step line underneath (time + layering).

---

## Feature importance with uncertainty

**Use it when:** Which inputs a model relies on, and how stable that ranking is.

**How I do it**

1. For each feature take the mean importance and its standard error over repeated runs (permutation or cross-validation folds).
2. Sort descending, draw horizontal bars and a whisker for +/- 1.96 standard errors.

**Code** (id `importance`)

```js
function draw(host, K) {
  const f = [['hours', 0.34, 0.04], ['prior score', 0.27, 0.05], ['sleep', 0.12, 0.03], ['age', 0.06, 0.04], ['noise', 0.01, 0.03]];
  const st = K.stage(host, 320, 190, { l: 66 }), x = K.linear(-0.1, 0.45, 0, st.W), y = K.band(f.map(r => r[0]), 0, st.H, 0.35);
  K.axisX(st, x, 5, v => v.toFixed(2)); K.el('line', { x1: x(0), x2: x(0), y1: 0, y2: st.H, stroke: 'var(--muted,#898781)' }, st.g);
  f.forEach(([k, m, se]) => { const cy = y(k) + y.bw / 2; K.el('rect', { x: x(0), y: y(k), width: x(m) - x(0), height: y.bw, fill: K.C[0], rx: 3 }, st.g); K.el('line', { x1: x(m - 1.96 * se), x2: x(m + 1.96 * se), y1: cy, y2: cy, stroke: 'var(--text,#222)', 'stroke-width': 1.5 }, st.g); K.text(st.g, -6, cy + 4, k, { 'text-anchor': 'end' }); });
}
```

**Combines with:** Pair with partial dependence plots for the top features.

---

## Partial dependence with ICE lines

**Use it when:** How the prediction changes with one feature, averaged and per individual.

**How I do it**

1. For a grid of feature values, set that feature to each value for every row and predict (ICE = one line per row).
2. The thick line is the average of the ICE lines (partial dependence). Lines that cross the average in different ways reveal interactions.

**Code** (id `pdp`)

```js
function draw(host, K) {
  const r = K.rng(12), grid = K.range(0, 10, 40), ind = Array.from({ length: 18 }, () => ({ a: 0.6 + r() * 0.8, c: (r() - 0.5) * 3 }));
  const f = (x, p) => p.a * 4 * Math.sin(x / 2.2) + p.c * x / 4 + 5, lines = ind.map(p => grid.map(g => f(g, p)));
  const avg = grid.map((_, i) => K.mean(lines.map(l => l[i]))), st = K.stage(host), x = K.linear(0, 10, 0, st.W), y = K.linear(-2, 14, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  lines.forEach(l => K.el('path', { d: K.path(l.map((v, i) => [x(grid[i]), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-opacity': 0.3 }, st.g));
  K.el('path', { d: K.path(avg.map((v, i) => [x(grid[i]), y(v)])), fill: 'none', stroke: K.C[1], 'stroke-width': 3 }, st.g);
}
```

**Combines with:** Stack several features as small multiples.

---

## Decision boundary (k-nearest neighbours)

**Use it when:** See what region of feature space a classifier assigns to each class.

**How I do it**

1. Two simulated classes in 2D. Build a grid of cells covering the plane.
2. Classify every cell centre with k = 7 nearest neighbours (vote share of class 1); colour the cell by the vote (blue to orange).
3. Draw the training points on top.

**Code** (id `boundary`)

```js
function draw(host, K) {
  const r = K.rng(11), pts = []; for (let i = 0; i < 50; i++) { pts.push([-1 + 0.9 * K.normal(r), -0.5 + 0.9 * K.normal(r), 0]); pts.push([1 + 0.9 * K.normal(r), 0.7 + 0.9 * K.normal(r), 1]); }
  const st = K.stage(host, 320, 230), x = K.linear(-3.5, 3.5, 0, st.W), y = K.linear(-3, 3, st.H, 0), gw = 36, gh = 26, k = 7;
  for (let i = 0; i < gw; i++) for (let j = 0; j < gh; j++) {
    const px = -3.5 + (i + 0.5) / gw * 7, py = -3 + (j + 0.5) / gh * 6, v = pts.map(p => [Math.hypot(p[0] - px, p[1] - py), p[2]]).sort((a, b) => a[0] - b[0]).slice(0, k).reduce((s, q) => s + q[1], 0) / k;
    K.el('rect', { x: x(-3.5 + i / gw * 7), y: y(-3 + (j + 1) / gh * 6), width: st.W / gw + 0.5, height: st.H / gh + 0.5, fill: v > 0.5 ? K.C[1] : K.C[0], 'shape-rendering': 'crispEdges', 'fill-opacity': 0.12 + 0.3 * Math.abs(v - 0.5) * 2 }, st.g);
  }
  pts.forEach(p => K.el('circle', { cx: x(p[0]), cy: y(p[1]), r: 3, fill: K.C[p[2]], stroke: 'var(--bg,#fff)', 'stroke-width': 0.8 }, st.g));
}
```

**Combines with:** Swap the classifier function and keep the drawing code: the pattern works for any model.

---

## PCA biplot

**Use it when:** Squeeze many correlated variables into 2 axes and see which variables drive them.

**How I do it**

1. Standardise the variables and form their correlation matrix.
2. Find the top two eigenvectors by power iteration (multiply a vector by the matrix until its direction stops changing), then subtract the first component and repeat.
3. Scores = data projected on the eigenvectors (dots); loadings = eigenvector * sqrt(eigenvalue) (arrows).

**Code** (id `pca`)

```js
function draw(host, K) {
  const r = K.rng(21), N = 70, F = Array.from({ length: N }, () => [K.normal(r), K.normal(r)]);
  const raw = [F.map(f => f[0] + 0.3 * K.normal(r)), F.map(f => 0.8 * f[0] + 0.4 * K.normal(r)), F.map(f => f[1] + 0.3 * K.normal(r)), F.map(f => -0.7 * f[1] + 0.5 * f[0] + 0.4 * K.normal(r))], names = ['math', 'stats', 'art', 'music'];
  const Z = raw.map(c => { const m = K.mean(c), s = K.sd(c); return c.map(v => (v - m) / s); }), C = Z.map(a => Z.map(b => K.corr(a, b)));
  const pw = M => { let v = [1, 0.6, 0.3, 0.1]; for (let it = 0; it < 200; it++) { const w = M.map(row => K.sum(row.map((a, j) => a * v[j]))), n = Math.hypot(...w); v = w.map(q => q / n); } return [v, K.sum(M.map((row, i) => v[i] * K.sum(row.map((a, j) => a * v[j]))))]; };
  const [v1, l1] = pw(C), [v2, l2] = pw(C.map((row, i) => row.map((a, j) => a - l1 * v1[i] * v1[j])));
  const sc = Array.from({ length: N }, (_, n) => [K.sum(Z.map((c, i) => c[n] * v1[i])), K.sum(Z.map((c, i) => c[n] * v2[i]))]);
  const st = K.stage(host, 320, 230), x = K.linear(-4, 4, 0, st.W), y = K.linear(-4, 4, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  sc.forEach(p => K.el('circle', { cx: x(p[0]), cy: y(p[1]), r: 2.6, fill: K.C[0], 'fill-opacity': 0.45 }, st.g));
  names.forEach((nm, i) => { const ax = v1[i] * Math.sqrt(l1) * 2, ay = v2[i] * Math.sqrt(l2) * 2; K.el('line', { x1: x(0), y1: y(0), x2: x(ax), y2: y(ay), stroke: K.C[1], 'stroke-width': 2 }, st.g); K.text(st.g, x(ax) + (ax > 0 ? 4 : -4), y(ay) + 4 + (i === 1 ? 13 : 0), nm, { fill: K.C[1], 'text-anchor': ax > 0 ? 'start' : 'end' }); });
  K.text(st.g, st.W, 10, 'PC1 ' + Math.round(l1 / 4 * 100) + '%, PC2 ' + Math.round(l2 / 4 * 100) + '% of variance', { 'text-anchor': 'end' });
}
```

**Combines with:** Colour the dots by group or cluster; this is the basis for most "embedding scatter" plots.

---

## Forest plot (meta-analysis)

**Use it when:** Combine several studies: each effect with its confidence interval, plus the pooled result.

**How I do it**

1. One row per study: a square at the estimate (size = weight) and a line from the lower to the upper bound.
2. Inverse-variance pooling: each study's standard error comes from its interval, weight = 1 / se^2, pooled estimate = weighted mean, pooled se = 1 / sqrt(sum of weights). The pooled estimate is a diamond whose width is its 95% interval.

**Code** (id `forest`)

```js
function draw(host, K) {
  const rows = [['Study A', 0.42, 0.10, 0.74], ['Study B', 0.18, -0.20, 0.56], ['Study C', 0.55, 0.20, 0.90], ['Study D', 0.05, -0.40, 0.50], ['Study E', 0.38, 0.12, 0.64]];
  const se = rows.map(r => (r[3] - r[2]) / (2 * 1.96)), w = se.map(q => 1 / (q * q)), W = K.sum(w), pe = K.sum(rows.map((r, i) => r[1] * w[i])) / W, pse = 1 / Math.sqrt(W);
  const st = K.stage(host, 320, 210, { l: 58, b: 26 }), x = K.linear(-0.6, 1, 0, st.W), y = K.band(rows.map(r => r[0]).concat('Pooled'), 0, st.H, 0.4);
  K.el('line', { x1: x(0), x2: x(0), y1: 0, y2: st.H, stroke: 'var(--muted,#898781)' }, st.g); K.axisX(st, x, 4, v => v.toFixed(1));
  rows.forEach(([k, e, lo, hi], i) => { const cy = y(k) + y.bw / 2, h = 3 + 8 * w[i] / Math.max(...w); K.el('line', { x1: x(lo), x2: x(hi), y1: cy, y2: cy, stroke: 'var(--text,#333)', 'stroke-width': 1.5 }, st.g); K.el('rect', { x: x(e) - h, y: cy - h, width: 2 * h, height: 2 * h, fill: K.C[0] }, st.g); K.text(st.g, -6, cy + 4, k, { 'text-anchor': 'end' }); });
  const cy = y('Pooled') + y.bw / 2;
  K.el('polygon', { points: [[x(pe - 1.96 * pse), cy], [x(pe), cy - 8], [x(pe + 1.96 * pse), cy], [x(pe), cy + 8]].map(p => p.join(',')).join(' '), fill: K.C[1] }, st.g); K.text(st.g, -6, cy + 4, 'Pooled', { 'text-anchor': 'end', 'font-weight': 500, fill: 'var(--text,#333)' });
}
```

**Combines with:** Sort by year or weight; add heterogeneity statistics as text.

---

## Kaplan-Meier survival curves

**Use it when:** Time until an event (churn, failure, relapse) with censored observations.

**How I do it**

1. Sort observations by time. At each EVENT time the survival estimate is multiplied by (1 - 1/number still at risk); censored cases only reduce the risk set.
2. Plot the estimate as a step function starting at 1; mark censored cases with small ticks.

**Code** (id `km`)

```js
function draw(host, K) {
  const r = K.rng(31), mk = rate => Array.from({ length: 40 }, () => { const t = -Math.log(1 - r()) / rate, c = 5 + 35 * r(); return t <= c ? [t, 1] : [c, 0]; });
  const km = d => { const s = d.slice().sort((a, b) => a[0] - b[0]); let S = 1; const out = [[0, 1]], cens = []; s.forEach(([t, e], i) => { if (e) { S *= 1 - 1 / (s.length - i); out.push([t, S]); } else cens.push([t, S]); }); return { out, cens, tEnd: s[s.length - 1][0], sEnd: S }; };
  const st = K.stage(host, 320, 220), x = K.linear(0, 40, 0, st.W), y = K.linear(0, 1, st.H, 0);
  K.axisY(st, y, 4, v => Math.round(v * 100) + '%'); K.axisX(st, x, 4);
  [[0.04, 0], [0.1, 1]].forEach(([rate, j]) => { const { out, cens, tEnd, sEnd } = km(mk(rate)); let p = `M${x(0)} ${y(1)}`; out.slice(1).forEach(([t, S], i) => { p += `L${x(t)} ${y(out[i][1])}L${x(t)} ${y(S)}`; }); p += `L${x(Math.min(tEnd, 40))} ${y(sEnd)}`; K.el('path', { d: p, fill: 'none', stroke: K.C[j], 'stroke-width': 2 }, st.g); cens.forEach(([t, S]) => K.el('line', { x1: x(t), x2: x(t), y1: y(S) - 4, y2: y(S) + 4, stroke: K.C[j] }, st.g)); });
  K.legend(st.g, [['group A', K.C[0]], ['group B', K.C[1]]], st.W - 160, 6, 80);
}
```

**Combines with:** Add confidence bands and a log-rank p-value in the corner.

---

## Control chart (SPC)

**Use it when:** Is a process stable, or did something change?

**How I do it**

1. Estimate the centre line and sigma from a baseline period (first 20 points).
2. Draw the centre line and the +/- 3 sigma limits; any point outside the limits is flagged.

**Code** (id `control`)

```js
function draw(host, K) {
  const r = K.rng(5), d = Array.from({ length: 36 }, (_, i) => 50 + 2 * K.normal(r) + (i === 27 ? 9 : 0) + (i > 30 ? 2 : 0)), base = d.slice(0, 20), m = K.mean(base), s = K.sd(base);
  const st = K.stage(host), x = K.linear(0, 35, 0, st.W), y = K.linear(40, 64, st.H, 0);
  K.axisY(st, y, 4);
  [[m + 3 * s, 'UCL'], [m, 'mean'], [m - 3 * s, 'LCL']].forEach(([v, n], i) => { K.el('line', { x1: 0, x2: st.W, y1: y(v), y2: y(v), stroke: i === 1 ? 'var(--muted,#898781)' : K.C[7], 'stroke-dasharray': i === 1 ? '' : '5 4' }, st.g); K.text(st.g, st.W - 2, y(v) - 3, n, { 'text-anchor': 'end' }); });
  K.el('path', { d: K.path(d.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 1.5 }, st.g);
  d.forEach((v, i) => K.el('circle', { cx: x(i), cy: y(v), r: v > m + 3 * s || v < m - 3 * s ? 5 : 2.5, fill: v > m + 3 * s || v < m - 3 * s ? K.C[7] : K.C[0] }, st.g));
}
```

**Combines with:** Add run rules (8 points on one side) and annotate known events.

---

## Bland-Altman plot

**Use it when:** Do two measurement methods agree?

**How I do it**

1. For every subject plot the AVERAGE of the two methods (x) against their DIFFERENCE (y).
2. Draw the mean difference (bias) and the limits of agreement: bias +/- 1.96 standard deviations of the differences.

**Code** (id `blandaltman`)

```js
function draw(host, K) {
  const r = K.rng(8), A = Array.from({ length: 60 }, () => 40 + 40 * r()), B = A.map(a => a + 1.5 + 2.2 * K.normal(r)), mean = A.map((a, i) => (a + B[i]) / 2), diff = A.map((a, i) => B[i] - a), bias = K.mean(diff), sd = K.sd(diff);
  const st = K.stage(host), x = K.linear(35, 85, 0, st.W), y = K.linear(-8, 10, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  [[bias + 1.96 * sd, '+1.96 SD'], [bias, 'bias'], [bias - 1.96 * sd, '-1.96 SD']].forEach(([v, n], i) => { K.el('line', { x1: 0, x2: st.W, y1: y(v), y2: y(v), stroke: i === 1 ? K.C[1] : 'var(--muted,#898781)', 'stroke-dasharray': i === 1 ? '' : '5 4', 'stroke-width': i === 1 ? 2 : 1 }, st.g); K.text(st.g, st.W - 2, y(v) - 3, n, { 'text-anchor': 'end' }); });
  mean.forEach((m, i) => K.el('circle', { cx: x(m), cy: y(diff[i]), r: 3, fill: K.C[0], 'fill-opacity': 0.6 }, st.g));
}
```

**Combines with:** Pair with a scatter plot of method A vs B (which hides bias).

---

## Volcano plot

**Use it when:** Thousands of tests at once: effect size against significance.

**How I do it**

1. x = log2 fold change; y = -log10(p), so smaller p-values rise higher.
2. p comes from z = effect / standard error through the normal CDF; colour points that pass BOTH cut-offs (|log2FC| > 1 and p < 0.05).

**Code** (id `volcano`)

```js
function draw(host, K) {
  const r = K.rng(17), g = Array.from({ length: 400 }, (_, i) => { const fc = (i < 60 ? 1.6 * (r() < 0.5 ? -1 : 1) : 0) + 0.7 * K.normal(r), z = fc / 0.45 + 0.8 * K.normal(r), p = Math.max(1e-12, 2 * (1 - Phi(Math.abs(z)))); return [fc, -Math.log10(p), p]; });
  const st = K.stage(host), x = K.linear(-4, 4, 0, st.W), y = K.linear(0, 10, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  K.el('line', { x1: 0, x2: st.W, y1: y(-Math.log10(0.05)), y2: y(-Math.log10(0.05)), stroke: 'var(--muted,#898781)', 'stroke-dasharray': '4 4' }, st.g);
  g.forEach(([fc, lp, p]) => { const sig = Math.abs(fc) > 1 && p < 0.05; K.el('circle', { cx: x(K.clamp(fc, -4, 4)), cy: y(Math.min(lp, 10)), r: 2.6, fill: sig ? (fc > 0 ? K.C[1] : K.C[0]) : '#b4b2a9', 'fill-opacity': sig ? 0.85 : 0.5 }, st.g); });
}
```

**Combines with:** Label the top few genes; add a threshold line at p = 0.05.

---

## Calibration (reliability) curve

**Use it when:** When a model says "70%", does it happen 70% of the time?

**How I do it**

1. Group predictions into probability bins (0.1 wide).
2. For each bin plot the mean predicted probability (x) against the observed share of positives (y). The diagonal is perfect calibration.
3. Points below the diagonal = over-confident, above = under-confident.

**Code** (id `calibration`)

```js
function draw(host, K) {
  const r = K.rng(23), P = Array.from({ length: 800 }, () => r()), Y = P.map(p => r() < Math.pow(p, 1.35) ? 1 : 0);
  const bins = Array.from({ length: 10 }, (_, b) => { const ix = P.map((p, i) => i).filter(i => P[i] >= b / 10 && P[i] < (b + 1) / 10); return [K.mean(ix.map(i => P[i])), K.mean(ix.map(i => Y[i])), ix.length]; });
  const st = K.stage(host, 320, 230, { l: 40, b: 40 }), x = K.linear(0, 1, 0, st.W), y = K.linear(0, 1, st.H, 0);
  K.axisY(st, y, 4, v => v.toFixed(1)); K.axisX(st, x, 4, v => v.toFixed(1));
  K.el('line', { x1: x(0), y1: y(0), x2: x(1), y2: y(1), stroke: 'var(--muted,#898781)', 'stroke-dasharray': '4 4' }, st.g);
  K.el('path', { d: K.path(bins.map(b => [x(b[0]), y(b[1])])), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
  bins.forEach(b => K.el('circle', { cx: x(b[0]), cy: y(b[1]), r: 3 + b[2] / 60, fill: K.C[0] }, st.g));
  K.text(st.g, st.W / 2, st.H + 34, 'predicted probability', { 'text-anchor': 'middle' });
}
```

**Combines with:** Show the histogram of predictions under the curve so sparse bins are not over-read.

---

## Means with confidence intervals

**Use it when:** Compare group averages and show the uncertainty of each.

**How I do it**

1. Mean per group; standard error = sd / sqrt(n); 95% interval = mean +/- 1.96 standard errors.
2. Dot at the mean, whisker with caps for the interval. Non-overlapping intervals suggest a real difference (overlap does not prove there is none).

**Code** (id `errorbars`)

```js
function draw(host, K) {
  const g = [['Control', K.sample(1, 30, 50, 9)], ['Low dose', K.sample(2, 30, 55, 9)], ['High dose', K.sample(3, 30, 64, 9)], ['Placebo', K.sample(4, 30, 51, 9)]];
  const st = K.stage(host), x = K.band(g.map(a => a[0]), 0, st.W, 0.5), y = K.linear(35, 80, st.H, 0);
  K.axisY(st, y, 4); K.axisBand(st, x, g.map(a => a[0]));
  g.forEach(([k, d], j) => { const m = K.mean(d), se = K.sd(d) / Math.sqrt(d.length), cx = x(k) + x.bw / 2; K.el('line', { x1: cx, x2: cx, y1: y(m - 1.96 * se), y2: y(m + 1.96 * se), stroke: K.C[j], 'stroke-width': 2 }, st.g); [m - 1.96 * se, m + 1.96 * se].forEach(v => K.el('line', { x1: cx - 6, x2: cx + 6, y1: y(v), y2: y(v), stroke: K.C[j], 'stroke-width': 2 }, st.g)); K.el('circle', { cx, cy: y(m), r: 5, fill: K.C[j] }, st.g); });
}
```

**Combines with:** Overlay the raw points (jitter) so n and spread stay visible.

---

## Probability shading (interactive)

**Use it when:** Teach or explore p-values and tail areas of a distribution.

**How I do it**

1. Draw the normal density once. A slider holds the cut-off z (state).
2. Shade the area left of z: a path of the density from -4 to z, closed to the baseline. The probability printed is the normal CDF at z (error-function approximation).

**Code** (id `zshade`, has an automated interaction test)

```js
function draw(host, K) {
  const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = 'z <input type="range" min="-3" max="3" step="0.1" value="1.2"> <b></b>'; host.appendChild(ctl);
  const view = document.createElement('div'); host.appendChild(view);
  const pdf = v => Math.exp(-v * v / 2) / Math.sqrt(2 * Math.PI);
  function draw(z) {
    view.innerHTML = ''; const st = K.stage(view, 320, 200), x = K.linear(-4, 4, 0, st.W), y = K.linear(0, 0.42, st.H, 0), xs = K.range(-4, z, 60);
    K.axisX(st, x, 4);
    K.el('path', { d: K.path(xs.map(v => [x(v), y(pdf(v))])) + `L${x(z)} ${y(0)}L${x(-4)} ${y(0)}Z`, fill: K.C[1], 'fill-opacity': 0.35 }, st.g);
    K.el('path', { d: K.path(K.range(-4, 4, 100).map(v => [x(v), y(pdf(v))])), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
    K.el('line', { x1: x(z), x2: x(z), y1: y(0), y2: y(pdf(z)), stroke: K.C[1], 'stroke-width': 2 }, st.g);
    ctl.querySelector('b').textContent = ' z = ' + z.toFixed(1) + '   P(Z < z) = ' + Phi(z).toFixed(3);
  }
  ctl.querySelector('input').addEventListener('input', e => draw(+e.target.value)); draw(1.2);
}
```

**Combines with:** Switch to two-sided mode or overlay a second (alternative) distribution to illustrate power.

---
