# Math and science

16 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Function plot

**Use it when:** Show curves y = f(x), their zeros and shape.

**How I do it**

1. Sample the function at 200 evenly spaced x values (K.range) and map each (x, f(x)) to pixels.
2. Draw the axes THROUGH zero (not at the border) and label x in multiples of pi.

**Code** (id `funcplot`)

```js
function draw(host, K) {
  const P = Math.PI, st = K.stage(host, 320, 220, { l: 30, b: 26 }), x = K.linear(-2 * P, 2 * P, 0, st.W), y = K.linear(-1.5, 1.5, st.H, 0), xs = K.range(-2 * P, 2 * P, 200);
  [-1, 0, 1].forEach(v => K.text(st.g, -6, y(v) + 4, v, { 'text-anchor': 'end' }));
  K.el('line', { x1: 0, x2: st.W, y1: y(0), y2: y(0), stroke: 'var(--text,#555)' }, st.g); K.el('line', { x1: x(0), x2: x(0), y1: 0, y2: st.H, stroke: 'var(--text,#555)' }, st.g);
  [-2, -1, 1, 2].forEach(k => K.text(st.g, x(k * P), y(0) + 14, (k < 0 ? '-' : '') + (Math.abs(k) === 1 ? '' : Math.abs(k)) + 'π', { 'text-anchor': 'middle' }));
  [['sin x', v => Math.sin(v), K.C[0]], ['cos x', v => Math.cos(v), K.C[1]], ['damped', v => Math.exp(-Math.abs(v) / 4) * Math.sin(3 * v), K.C[2]]].forEach(([n, f, c], i) => { K.el('path', { d: K.path(xs.map(v => [x(v), y(f(v))])), fill: 'none', stroke: c, 'stroke-width': 2 }, st.g); K.legend(st.g, [[n, c]], i * 70, -2, 70); });
}
```

**Combines with:** Slider for a parameter (frequency, damping) gives an interactive explorer; shade the area under a curve for integrals.

---

## Parametric curve (Lissajous)

**Use it when:** Curves where x and y are BOTH functions of a parameter t.

**How I do it**

1. Sample t from 0 to 2 pi; compute x(t) = sin(a t + delta) and y(t) = sin(b t).
2. Join the points in order. The ratio a : b decides the shape; delta rotates the pattern.

**Code** (id `lissajous`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 230, { l: 10, r: 10, t: 6, b: 6 }), cx = st.W / 2, cy = st.H / 2, ts = K.range(0, 2 * Math.PI, 400);
  [[3, 2, K.C[0]], [5, 4, K.C[1]]].forEach(([a, b, c], i) => K.el('path', { d: K.path(ts.map(t => [cx + (i ? 0.6 : 1) * 105 * Math.sin(a * t + Math.PI / 2), cy + (i ? 0.6 : 1) * 95 * Math.sin(b * t)])), fill: 'none', stroke: c, 'stroke-width': 1.8 }, st.g));
}
```

**Combines with:** Animate t with a Play button, or draw several (a, b) pairs as small multiples.

---

## Polar plot (rose curve)

**Use it when:** Quantities that depend on an angle (antenna patterns, cycles, orbits).

**How I do it**

1. Sample angle theta; compute radius r(theta) = cos(k theta).
2. Convert polar to pixels with K.polar(cx, cy, r, theta); draw rings and spokes for reference.
3. Negative r simply plots on the opposite side, which is what creates the petals.

**Code** (id `polarplot`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 230, { l: 10, r: 10, t: 6, b: 6 }), cx = st.W / 2, cy = st.H / 2, R = 96, ts = K.range(0, 2 * Math.PI, 400);
  [0.5, 1].forEach(f => K.el('circle', { cx, cy, r: R * f, fill: 'none', stroke: 'var(--grid,#e1e0d9)' }, st.g));
  for (let i = 0; i < 8; i++) { const p = K.polar(cx, cy, R, i * Math.PI / 4); K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--grid,#e1e0d9)' }, st.g); }
  K.el('path', { d: K.path(ts.map(t => K.polar(cx, cy, R * Math.cos(3 * t), t))) + 'Z', fill: K.C[0], 'fill-opacity': 0.25, stroke: K.C[0], 'stroke-width': 2 }, st.g);
}
```

**Combines with:** Overlay two patterns for comparison.

---

## Ternary plot

**Use it when:** Three components that sum to 100% (soil, alloys, votes in three-party races).

**How I do it**

1. Each point is (a, b, c) with a + b + c = 1. Place it with barycentric coordinates: x = b + c / 2, y = c * sqrt(3) / 2 inside an equilateral triangle.
2. Corners are 100% of one component; gridlines run parallel to the opposite side.

**Code** (id `ternary`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 240, { l: 20, r: 20, t: 20, b: 24 }), S = 190, X0 = (st.W - S) / 2, H = S * Math.sqrt(3) / 2, pos = (a, b, c) => [X0 + (b + c / 2) * S, H + 4 - c * H];
  K.el('polygon', { points: [pos(1, 0, 0), pos(0, 1, 0), pos(0, 0, 1)].map(p => p.join(',')).join(' '), fill: 'none', stroke: 'var(--text,#555)' }, st.g);
  [0.25, 0.5, 0.75].forEach(f => { [[pos(f, 1 - f, 0), pos(f, 0, 1 - f)], [pos(1 - f, f, 0), pos(0, f, 1 - f)], [pos(1 - f, 0, f), pos(0, 1 - f, f)]].forEach(([p, q]) => K.el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: 'var(--grid,#e1e0d9)' }, st.g)); });
  [['Sand', pos(1, 0, 0)], ['Silt', pos(0, 1, 0)], ['Clay', pos(0, 0, 1)]].forEach(([n, p], i) => K.text(st.g, p[0], p[1] + (i === 2 ? -8 : 16), n, { 'text-anchor': 'middle', 'font-weight': 500, fill: 'var(--text,#333)' }));
  const r = K.rng(5); for (let i = 0; i < 40; i++) { const a = r() ** 2, b = r() * (1 - a), c = 1 - a - b, p = pos(a, b, c); K.el('circle', { cx: p[0], cy: p[1], r: 3.2, fill: K.C[i % 3], 'fill-opacity': 0.7 }, st.g); }
}
```

**Combines with:** Colour points by a fourth variable.

---

## Vector field

**Use it when:** A direction and magnitude at every point: flow, force, gradients.

**How I do it**

1. Lay a regular grid of sample points and evaluate the field (u, v) at each.
2. Draw a short arrow per point: direction = atan2(v, u), length proportional to magnitude (capped), colour by magnitude.
3. The arrowhead is a small triangle rotated by the same angle.

**Code** (id `vectorfield`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 230, { l: 10, r: 10, t: 8, b: 8 }), n = 14, m = 10, fx = (a, b) => -b + 0.6 * Math.sin(a * 1.5), fy = (a, b) => a + 0.4 * Math.cos(b * 2), mags = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = -2 + 4 * i / (n - 1), b = -1.5 + 3 * j / (m - 1); mags.push(Math.hypot(fx(a, b), fy(a, b))); }
  const mx = Math.max(...mags); let k = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a = -2 + 4 * i / (n - 1), b = -1.5 + 3 * j / (m - 1), u = fx(a, b), v = fy(a, b), mag = mags[k++], ang = Math.atan2(-v, u) * 180 / Math.PI, L = 6 + 14 * mag / mx, cx = 10 + (st.W - 20) * i / (n - 1), cy = 10 + (st.H - 20) * (m - 1 - j) / (m - 1);
    const g = K.el('g', { transform: `translate(${cx},${cy}) rotate(${ang})` }, st.g), c = K.seq(0.3 + 0.7 * mag / mx);
    K.el('line', { x1: -L / 2, y1: 0, x2: L / 2 - 2, y2: 0, stroke: c, 'stroke-width': 1.6 }, g); K.el('polygon', { points: `${L / 2},0 ${L / 2 - 5},-2.6 ${L / 2 - 5},2.6`, fill: c }, g);
  }
}
```

**Combines with:** Overlay streamlines or contour lines of the potential.

---

## Phase portrait (damped pendulum)

**Use it when:** Behaviour of a dynamical system: where trajectories start, spiral and settle.

**How I do it**

1. State = (angle, angular velocity). Equations: angle' = velocity, velocity' = -sin(angle) - 0.15 * velocity.
2. Integrate each starting point with 4th-order Runge-Kutta (four slope evaluations per step, 0.05 time units per step, 400 steps).
3. Plot the path in the (angle, velocity) plane and stop drawing when it leaves the window; all paths spiral into the stable point (0, 0).

**Code** (id `phase`)

```js
function draw(host, K) {
  const f = (t, w) => [w, -Math.sin(t) - 0.15 * w];
  const traj = (t, w) => { const pts = [[t, w]], h = 0.05; for (let i = 0; i < 400; i++) { const a = f(t, w), b = f(t + h / 2 * a[0], w + h / 2 * a[1]), c = f(t + h / 2 * b[0], w + h / 2 * b[1]), d = f(t + h * c[0], w + h * c[1]); t += h / 6 * (a[0] + 2 * b[0] + 2 * c[0] + d[0]); w += h / 6 * (a[1] + 2 * b[1] + 2 * c[1] + d[1]); pts.push([t, w]); } return pts; };
  const st = K.stage(host), x = K.linear(-4, 4, 0, st.W), y = K.linear(-3, 3, st.H, 0);
  K.axisY(st, y, 4); K.axisX(st, x, 4);
  [[-3, 1.5], [-2, -2], [1, 2.4], [2.8, -1], [0.5, 0], [-1, 1]].forEach(([t, w], i) => { K.el('path', { d: K.path(traj(t, w).filter((p, k, a) => a.slice(0, k + 1).every(q => Math.abs(q[0]) <= 4 && Math.abs(q[1]) <= 3)).map(p => [x(p[0]), y(p[1])])), fill: 'none', stroke: K.C[i % 8], 'stroke-width': 1.6, 'stroke-opacity': 0.85 }, st.g); K.el('circle', { cx: x(t), cy: y(w), r: 3, fill: K.C[i % 8] }, st.g); });
}
```

**Combines with:** Overlay a vector field of the same equations underneath.

---

## Heatmap of f(x, y)

**Use it when:** A function of two variables, read as colour.

**How I do it**

1. Evaluate z = sin(x) cos(y) on a 40 x 28 grid.
2. Use a DIVERGING ramp centred on 0 so positive and negative regions are distinguishable.

**Code** (id `fnheat`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 220, { l: 8, r: 8, t: 8, b: 8 }), nx = 40, ny = 28, w = st.W / nx, h = st.H / ny;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const a = -3 + 6 * i / (nx - 1), b = -2 + 4 * j / (ny - 1), z = Math.sin(a * 1.4) * Math.cos(b * 2); K.el('rect', { x: i * w, y: (ny - 1 - j) * h, width: w + 0.4, height: h + 0.4, fill: K.div((z + 1) / 2), 'shape-rendering': 'crispEdges' }, st.g); }
}
```

**Combines with:** Add isolines (contour recipe) and a colour bar.

---

## 3D surface (painter's algorithm)

**Use it when:** A function of two variables as a surface, no WebGL needed.

**How I do it**

1. Sample z = sin(r) on a 24 x 24 grid; rotate every vertex with K.rot (two rotation matrices) and project with a simple perspective divide (K.proj).
2. Each grid cell is a quad. Sort quads by their average depth (far first) and draw in that order, so nearer quads cover farther ones: the painter's algorithm.
3. Colour by height with the diverging ramp.

**Code** (id `surface3d`)

```js
function draw(host, K) {
  const n = 24, st = K.stage(host, 320, 240, { l: 4, r: 4, t: 4, b: 4 }), g = [], f = (a, b) => Math.sin(Math.hypot(a, b) * 1.6) * 0.9 / (1 + 0.25 * Math.hypot(a, b));
  for (let i = 0; i < n; i++) { g[i] = []; for (let j = 0; j < n; j++) { const a = -3 + 6 * i / (n - 1), b = -3 + 6 * j / (n - 1); g[i][j] = K.proj(K.rot([a / 3, f(a, b), b / 3], 0.8, 0.6), st.W / 2, st.H / 2 + 14, 96, 6).concat(f(a, b)); } }
  const quads = []; for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) { const q = [g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]]; quads.push({ q, z: K.mean(q.map(p => p[2])), h: K.mean(q.map(p => p[3])) }); }
  quads.sort((a, b) => a.z - b.z).forEach(({ q, h }) => K.el('polygon', { points: q.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), fill: K.div((h + 1) / 2), stroke: 'var(--bg,#fff)', 'stroke-width': 0.4 }, st.g));
}
```

**Combines with:** Add a slider for rotation (see the rotating cube) or overlay the wireframe of a second surface.

---

## Mandelbrot set (escape-time fractal)

**Use it when:** Illustrate iteration, complex numbers and fractals.

**How I do it**

1. For each pixel c = x + iy, iterate z = z^2 + c from 0. Count the steps until |z| exceeds 2 (max 30).
2. Points that never escape belong to the set (drawn dark); the others are coloured by how fast they escaped.
3. SVG draws a 64 x 40 grid of rectangles; a canvas would allow far higher resolution.

**Code** (id `mandelbrot`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 210, { l: 4, r: 4, t: 4, b: 4 }), nx = 64, ny = 40, w = st.W / nx, h = st.H / ny;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const cr = -2.2 + 3.2 * i / (nx - 1), ci = -1.2 + 2.4 * j / (ny - 1); let zr = 0, zi = 0, k = 0; while (k < 30 && zr * zr + zi * zi < 4) { const t = zr * zr - zi * zi + cr; zi = 2 * zr * zi + ci; zr = t; k++; } K.el('rect', { x: i * w, y: j * h, width: w + 0.3, height: h + 0.3, fill: k === 30 ? '#1b1a3a' : K.seq(Math.sqrt(k / 30)), 'shape-rendering': 'crispEdges' }, st.g); }
}
```

**Combines with:** Mouse drag to zoom: change the window bounds and redraw.

---

## Cellular automaton (Game of Life)

**Use it when:** Show emergent behaviour from simple local rules.

**How I do it**

1. State: a grid of booleans. One step: count the 8 neighbours (wrapping at the edges); a live cell survives with 2 or 3 neighbours, a dead cell is born with exactly 3.
2. Draw one rect per cell. Step button = one update then redraw; Play repeats it on a timer; clicking a cell toggles it.

**Code** (id `life`, has an automated interaction test)

```js
function draw(host, K) {
  const W = 24, H = 14; let g = Array.from({ length: H }, () => Array(W).fill(0)), timer = null;
  [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2], [10, 5], [11, 5], [12, 5], [18, 9], [19, 9], [18, 10], [19, 10]].forEach(([x, y]) => { g[y][x] = 1; });
  const bar = document.createElement('div'); bar.style.cssText = 'margin-bottom:4px'; bar.innerHTML = '<button>Step</button> <button>Play</button>'; host.appendChild(bar);
  const view = document.createElement('div'); host.appendChild(view);
  const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 190, { l: 4, r: 4, t: 4, b: 4 }), c = st.W / W; g.forEach((row, y) => row.forEach((v, x) => { const r = K.el('rect', { x: x * c, y: y * c, width: c - 1, height: c - 1, rx: 2, fill: v ? K.C[0] : 'var(--grid,#ece9e0)' }, st.g); r.addEventListener('click', () => { g[y][x] ^= 1; draw(); }); })); };
  const step = () => { g = g.map((row, y) => row.map((v, x) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += g[(y + dy + H) % H][(x + dx + W) % W]; return v ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0); })); draw(); };
  const [bs, bp] = bar.querySelectorAll('button'); bs.addEventListener('click', step);
  bp.addEventListener('click', () => { if (timer) { clearInterval(timer); timer = null; bp.textContent = 'Play'; } else { timer = setInterval(step, 250); bp.textContent = 'Pause'; } });
  draw();
}
```

**Combines with:** The same state/step/draw skeleton drives every animated explainer.

---

## Signal and its spectrum (DFT)

**Use it when:** See which frequencies a signal contains.

**How I do it**

1. Build a signal from two sine waves (3 and 9 cycles) plus noise, 64 samples.
2. K.dft computes the discrete Fourier transform: for every frequency k, correlate the signal with a cosine and a sine of that frequency and take the magnitude.
3. Top panel: the signal in time. Bottom panel: amplitude by frequency; peaks appear at 3 and 9.

**Code** (id `spectrum`)

```js
function draw(host, K) {
  const r = K.rng(4), N = 64, sig = Array.from({ length: N }, (_, n) => Math.sin(2 * Math.PI * 3 * n / N) + 0.5 * Math.sin(2 * Math.PI * 9 * n / N) + 0.15 * K.normal(r)), sp = K.dft(sig);
  const st = K.stage(host, 320, 250, { l: 30, t: 6 }), x = K.linear(0, N - 1, 0, st.W), y = K.linear(-2, 2, 90, 0), bx = K.band(sp.map((_, i) => i), 0, st.W, 0.15), by = K.linear(0, 1.2, 70, 0);
  K.el('path', { d: K.path(sig.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 1.6 }, st.g); K.text(st.g, -6, 14, '+2', { 'text-anchor': 'end' }); K.text(st.g, -6, 94, '-2', { 'text-anchor': 'end' }); K.text(st.g, 0, 108, 'time');
  const g2 = K.el('g', { transform: 'translate(0,125)' }, st.g);
  sp.forEach((a, i) => K.el('rect', { x: bx(i), y: by(a), width: bx.bw, height: 70 - by(a), fill: a > 0.3 ? K.C[1] : '#b4b2a9' }, g2));
  [3, 9].forEach(k => K.text(g2, bx(k) + bx.bw / 2, 84, k, { 'text-anchor': 'middle' })); K.text(g2, st.W, 84, 'frequency (cycles)', { 'text-anchor': 'end' });
}
```

**Combines with:** A spectrogram stacks many such spectra over time (time + heatmap).

---

## Pendulum simulation (animation)

**Use it when:** Physics you can watch: state evolves under an equation of motion.

**How I do it**

1. State: angle and angular velocity. Each tick advances the equation angle'' = -sin(angle) - 0.05 * angle' by two RK4 steps.
2. Draw: rod from the pivot to the bob, plus a fading trail of the last 60 bob positions.
3. Play starts a timer that calls step(); Step advances once (useful for tests and teaching).

**Code** (id `pendulum`, has an automated interaction test)

```js
function draw(host, K) {
  let th = 1.0, w = 0, trail = [], timer = null;
  const f = (t, v) => [v, -Math.sin(t) - 0.05 * v], bar = document.createElement('div'); bar.style.cssText = 'margin-bottom:4px'; bar.innerHTML = '<button>Step</button> <button>Play</button>'; host.appendChild(bar);
  const view = document.createElement('div'); host.appendChild(view);
  const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 210, { l: 4, r: 4, t: 4, b: 4 }), px = st.W / 2, py = 16, L = 140, bx = px + L * Math.sin(th), by = py + L * Math.cos(th); trail.forEach((p, i) => K.el('circle', { cx: p[0], cy: p[1], r: 2.4, fill: K.C[1], 'fill-opacity': i / trail.length * 0.5 }, st.g)); K.el('line', { x1: px, y1: py, x2: bx, y2: by, stroke: 'var(--text,#555)', 'stroke-width': 2 }, st.g); K.el('circle', { cx: px, cy: py, r: 4, fill: 'var(--text,#555)' }, st.g); K.el('circle', { cx: bx, cy: by, r: 12, fill: K.C[0] }, st.g); };
  const step = () => { for (let s = 0; s < 2; s++) { const h = 0.05, a = f(th, w), b = f(th + h / 2 * a[0], w + h / 2 * a[1]), c = f(th + h / 2 * b[0], w + h / 2 * b[1]), d = f(th + h * c[0], w + h * c[1]); th += h / 6 * (a[0] + 2 * b[0] + 2 * c[0] + d[0]); w += h / 6 * (a[1] + 2 * b[1] + 2 * c[1] + d[1]); } trail.push([160 + 140 * Math.sin(th), 16 + 140 * Math.cos(th)]); if (trail.length > 60) trail.shift(); draw(); };
  const [bs, bp] = bar.querySelectorAll('button'); bs.addEventListener('click', step);
  bp.addEventListener('click', () => { if (timer) { clearInterval(timer); timer = null; bp.textContent = 'Play'; } else { timer = setInterval(step, 30); bp.textContent = 'Pause'; } });
  draw();
}
```

**Combines with:** Plot the phase portrait live beside it (same state, two views).

---

## Venn diagram

**Use it when:** Overlaps between 2 or 3 sets.

**How I do it**

1. Three equal circles placed so each pair overlaps; semi-transparent fills make the intersections visible.
2. Print the count of each region at its centre: only-A, A and B, all three, and so on.

**Code** (id `venn`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 230, { l: 10, r: 10, t: 6, b: 6 }), R = 64, c = [[st.W / 2 - 38, 88], [st.W / 2 + 38, 88], [st.W / 2, 152]], n = ['Python', 'SQL', 'R'];
  c.forEach(([x, y], i) => { K.el('circle', { cx: x, cy: y, r: R, fill: K.C[i], 'fill-opacity': 0.35, stroke: K.C[i], 'stroke-width': 2 }, st.g); });
  [[c[0][0] - 36, c[0][1] - 30, 'Python'], [c[1][0] + 36, c[1][1] - 30, 'SQL'], [c[2][0], c[2][1] + 52, 'R']].forEach(([x, y, t]) => K.text(st.g, x, y, t, { 'text-anchor': 'middle', 'font-weight': 500, fill: 'var(--text,#333)' }));
  [[st.W / 2, 62, 14], [st.W / 2 - 40, 124, 9], [st.W / 2 + 40, 124, 7], [st.W / 2, 100, 21], [c[0][0] - 28, c[0][1] - 4, 32], [c[1][0] + 28, c[1][1] - 4, 27], [c[2][0], c[2][1] + 30, 18]].forEach(([x, y, v]) => K.text(st.g, x, y, v, { 'text-anchor': 'middle', fill: 'var(--text,#222)', 'font-size': 13 }));
}
```

**Combines with:** For more than 3 sets use an UpSet-style bar chart of intersections.

---

## Geometric construction

**Use it when:** Illustrate a theorem or construction (circumcircle, medians, bisectors).

**How I do it**

1. Place triangle vertices A, B, C. Compute the circumcentre from the perpendicular-bisector formula: D = 2(ax(by - cy) + bx(cy - ay) + cx(ay - by)), then ux and uy from the squared lengths.
2. Draw the triangle, the circle through all three vertices (radius = distance centre to A), the centroid (mean of the vertices) and the three medians.

**Code** (id `geometry`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 240, { l: 4, r: 4, t: 4, b: 4 }), A = [75, 168], B = [235, 158], C = [150, 68], D = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
  const sq = p => p[0] * p[0] + p[1] * p[1], ux = (sq(A) * (B[1] - C[1]) + sq(B) * (C[1] - A[1]) + sq(C) * (A[1] - B[1])) / D, uy = (sq(A) * (C[0] - B[0]) + sq(B) * (A[0] - C[0]) + sq(C) * (B[0] - A[0])) / D, R = Math.hypot(A[0] - ux, A[1] - uy), G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  K.el('circle', { cx: ux, cy: uy, r: R, fill: 'none', stroke: K.C[1], 'stroke-dasharray': '5 4' }, st.g);
  K.el('polygon', { points: [A, B, C].map(p => p.join(',')).join(' '), fill: K.C[0], 'fill-opacity': 0.12, stroke: K.C[0], 'stroke-width': 2 }, st.g);
  [[A, B, C], [B, C, A], [C, A, B]].forEach(([v, p, q]) => K.el('line', { x1: v[0], y1: v[1], x2: (p[0] + q[0]) / 2, y2: (p[1] + q[1]) / 2, stroke: K.C[2], 'stroke-opacity': 0.8 }, st.g));
  [[A, 'A'], [B, 'B'], [C, 'C']].forEach(([p, n]) => { K.el('circle', { cx: p[0], cy: p[1], r: 4, fill: K.C[0] }, st.g); K.text(st.g, p[0] + 6, p[1] - 6, n, { fill: 'var(--text,#333)', 'font-weight': 500 }); });
  K.el('circle', { cx: ux, cy: uy, r: 4, fill: K.C[1] }, st.g); K.text(st.g, ux + 8, uy + 16, 'circumcentre', { fill: K.C[1] }); K.el('circle', { cx: G[0], cy: G[1], r: 4, fill: K.C[2] }, st.g); K.text(st.g, G[0] + 8, G[1] - 6, 'centroid', { fill: K.C[2] });
}
```

**Combines with:** Make the vertices draggable (pointer events + redraw) to explore.

---

## Unit circle explorer (interactive)

**Use it when:** Teach sine and cosine as coordinates on the unit circle.

**How I do it**

1. One state variable: the angle theta (a slider, 0 to 360 degrees).
2. Draw the circle, the radius to (cos t, sin t), the vertical segment of length sin t (orange) and the horizontal segment of length cos t (blue).
3. Print the numbers so the picture and the values are tied together.

**Code** (id `unitcircle`, has an automated interaction test)

```js
function draw(host, K) {
  const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = 'angle <input type="range" min="0" max="360" value="40"> <b></b>'; host.appendChild(ctl);
  const view = document.createElement('div'); host.appendChild(view);
  const draw = d => { view.innerHTML = ''; const st = K.stage(view, 320, 220, { l: 10, r: 10, t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2, R = 88, t = d * Math.PI / 180, px = cx + R * Math.cos(t), py = cy - R * Math.sin(t);
    K.el('circle', { cx, cy, r: R, fill: 'none', stroke: 'var(--axis,#b4b2a9)' }, st.g); K.el('line', { x1: cx - R - 8, x2: cx + R + 8, y1: cy, y2: cy, stroke: 'var(--grid,#d8d6cc)' }, st.g); K.el('line', { x1: cx, x2: cx, y1: cy - R - 8, y2: cy + R + 8, stroke: 'var(--grid,#d8d6cc)' }, st.g);
    K.el('line', { x1: px, y1: cy, x2: px, y2: py, stroke: K.C[1], 'stroke-width': 3 }, st.g); K.el('line', { x1: cx, y1: cy, x2: px, y2: cy, stroke: K.C[0], 'stroke-width': 3 }, st.g); K.el('line', { x1: cx, y1: cy, x2: px, y2: py, stroke: 'var(--text,#333)', 'stroke-width': 2 }, st.g); K.el('circle', { cx: px, cy: py, r: 5, fill: 'var(--text,#333)' }, st.g);
    ctl.querySelector('b').textContent = ' ' + d + '°   cos = ' + Math.cos(t).toFixed(3) + '   sin = ' + Math.sin(t).toFixed(3); };
  ctl.querySelector('input').addEventListener('input', e => draw(+e.target.value)); draw(40);
}
```

**Combines with:** Plot sin and cos against theta on the right (linked views) to see the waves emerge.

---

## Fourier series builder (interactive)

**Use it when:** Show how simple waves add up to a complicated one.

**How I do it**

1. Target: a square wave. Its Fourier series is the sum of odd harmonics: sin(x) + sin(3x)/3 + sin(5x)/5 + ...
2. State: the number of terms n (slider). Draw the sum of the first n terms over the target.
3. More terms hug the target better; the overshoot at the jumps never disappears (Gibbs phenomenon).

**Code** (id `fourier`, has an automated interaction test)

```js
function draw(host, K) {
  const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = 'terms <input type="range" min="1" max="12" value="2"> <b></b>'; host.appendChild(ctl);
  const view = document.createElement('div'); host.appendChild(view);
  const draw = n => { view.innerHTML = ''; const st = K.stage(view, 320, 200, { l: 24, b: 20 }), x = K.linear(0, 4 * Math.PI, 0, st.W), y = K.linear(-1.5, 1.5, st.H, 0), xs = K.range(0, 4 * Math.PI, 400);
    K.axisY(st, y, 3);
    K.el('path', { d: K.path(xs.map(v => [x(v), y(Math.sin(v) >= 0 ? 1 : -1)])), fill: 'none', stroke: 'var(--muted,#b4b2a9)', 'stroke-width': 1.5 }, st.g);
    K.el('path', { d: K.path(xs.map(v => { let s = 0; for (let k = 0; k < n; k++) s += Math.sin((2 * k + 1) * v) / (2 * k + 1); return [x(v), y(4 / Math.PI * s)]; })), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
    ctl.querySelector('b').textContent = ' ' + n + (n === 1 ? ' term' : ' terms'); };
  ctl.querySelector('input').addEventListener('input', e => draw(+e.target.value)); draw(2);
}
```

**Combines with:** Show each term as a thin faint line and the spectrum (bars of 1/k) next to it.

---
