# 3D and animation

10 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Rotating 3D cube (no library)

**Use it when:** A 3D object you can turn, without WebGL.

**How I do it**

1. Eight vertices at (+/-1, +/-1, +/-1); six faces as lists of four vertex indices.
2. Every redraw: rotate vertices (K.rot with the slider angle), project to 2D (K.proj), sort faces by average depth, draw back to front.
3. Flat shading: each face has its own colour; opacity gives a hint of depth.

**Code** (id `cube3d`, has an automated interaction test)

```js
function draw(host, K) {
  const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = 'rotate <input type="range" min="0" max="360" value="35">'; host.appendChild(ctl);
  const view = document.createElement('div'); host.appendChild(view);
  const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], F = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]];
  const draw = d => { view.innerHTML = ''; const st = K.stage(view, 320, 230, { l: 4, r: 4, t: 4, b: 4 }), P = V.map(v => K.proj(K.rot(v, 0.5, d * Math.PI / 180), st.W / 2, st.H / 2, 62, 6));
    F.map((f, i) => ({ f, i, z: K.mean(f.map(k => P[k][2])) })).sort((a, b) => a.z - b.z).forEach(({ f, i }) => K.el('polygon', { points: f.map(k => P[k][0].toFixed(1) + ',' + P[k][1].toFixed(1)).join(' '), fill: K.C[i], 'fill-opacity': 0.8, stroke: 'var(--bg,#fff)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, st.g)); };
  ctl.querySelector('input').addEventListener('input', e => draw(+e.target.value)); draw(35);
}
```

**Combines with:** Add a 3D scatter inside the cube, or auto-rotate with a timer.

---

## 3D scatter plot (rotatable)

**Use it when:** Three numeric variables or three-dimensional clusters.

**How I do it**

1. Centre the data in a unit cube, rotate (K.rot) and project (K.proj) every point on slider change.
2. Size points by depth (nearer = larger) and draw far points first. Draw the cube edges as a frame.

**Code** (id `scatter3d`, has an automated interaction test)

```js
function draw(host, K) {
  const r = K.rng(3), P = []; [[-0.5, -0.4, -0.3], [0.5, 0.3, 0.4], [0, 0.6, -0.5]].forEach((c, k) => { for (let i = 0; i < 40; i++) P.push({ p: c.map(v => v + 0.2 * K.normal(r)), k }); });
  const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = 'rotate <input type="range" min="0" max="360" value="30">'; host.appendChild(ctl);
  const view = document.createElement('div'); host.appendChild(view);
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]], C = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const draw = d => { view.innerHTML = ''; const st = K.stage(view, 320, 230, { l: 4, r: 4, t: 4, b: 4 }), pj = v => K.proj(K.rot(v, 0.45, d * Math.PI / 180), st.W / 2, st.H / 2, 78, 6), Q = C.map(pj);
    E.forEach(([a, b]) => K.el('line', { x1: Q[a][0], y1: Q[a][1], x2: Q[b][0], y2: Q[b][1], stroke: 'var(--axis,#c3c2b7)' }, st.g));
    P.map(q => ({ q, s: pj(q.p.map(v => v * 1.4)) })).sort((a, b) => a.s[2] - b.s[2]).forEach(({ q, s }) => K.el('circle', { cx: s[0], cy: s[1], r: 2.2 + (s[2] + 2) * 0.9, fill: K.C[q.k], 'fill-opacity': 0.8 }, st.g)); };
  ctl.querySelector('input').addEventListener('input', e => draw(+e.target.value)); draw(30);
}
```

**Combines with:** Colour by cluster; add a floor grid for orientation.

---

## Particle system (animation)

**Use it when:** Fountains, sparks, snow: many short-lived moving objects.

**How I do it**

1. State: an array of particles with position, velocity and remaining life.
2. Every step: spawn a few at the emitter, apply gravity to the velocity, move, reduce life, and drop the dead ones.
3. Opacity = remaining life, so particles fade out. Same state/step/draw skeleton as the pendulum.

**Code** (id `particles`, has an automated interaction test)

```js
function draw(host, K) {
  const r = K.rng(7); let ps = [], timer = null;
  const bar = document.createElement('div'); bar.style.cssText = 'margin-bottom:4px'; bar.innerHTML = '<button>Step</button> <button>Play</button>'; host.appendChild(bar);
  const view = document.createElement('div'); host.appendChild(view);
  const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 210, { l: 4, r: 4, t: 4, b: 4 }); K.el('rect', { x: st.W / 2 - 14, y: st.H - 8, width: 28, height: 8, rx: 3, fill: 'var(--text,#555)' }, st.g); ps.forEach(p => K.el('circle', { cx: p.x, cy: p.y, r: 2 + 3 * p.life, fill: K.C[p.c], 'fill-opacity': p.life }, st.g)); };
  const step = () => { for (let i = 0; i < 6; i++) ps.push({ x: 160, y: 196, vx: (r() - 0.5) * 3.2, vy: -4 - r() * 3, life: 1, c: Math.floor(r() * 4) }); ps.forEach(p => { p.vy += 0.18; p.x += p.vx; p.y += p.vy; p.life -= 0.012; }); ps = ps.filter(p => p.life > 0 && p.y < 200); draw(); };
  const [bs, bp] = bar.querySelectorAll('button'); bs.addEventListener('click', step);
  bp.addEventListener('click', () => { if (timer) { clearInterval(timer); timer = null; bp.textContent = 'Play'; } else { timer = setInterval(step, 40); bp.textContent = 'Pause'; } });
  for (let i = 0; i < 25; i++) step();
}
```

**Combines with:** Add wind as a slider that changes one velocity term.

---

## Declarative SVG animation (SMIL)

**Use it when:** Simple loops (pulsing, travelling dots, spinning) with zero JavaScript timers.

**How I do it**

1. Add <animate> children that change an attribute over time (radius, opacity) with repeatCount="indefinite".
2. <animateMotion> moves an element along a path; <animateTransform> rotates or scales.
3. The browser runs it; the code only describes the loop.

**Code** (id `smil`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 160, { l: 10, r: 10, t: 6, b: 6 }), c = K.el('circle', { cx: 60, cy: 70, r: 14, fill: K.C[0] }, st.g);
  K.el('animate', { attributeName: 'r', values: '10;26;10', dur: '1.6s', repeatCount: 'indefinite' }, c); K.el('animate', { attributeName: 'fill-opacity', values: '1;0.3;1', dur: '1.6s', repeatCount: 'indefinite' }, c);
  K.el('path', { id: 'trackSmil', d: 'M130 90C170 10 220 10 250 70S280 130 280 90', fill: 'none', stroke: 'var(--grid,#d8d6cc)', 'stroke-width': 2 }, st.g);
  const dot = K.el('circle', { r: 6, fill: K.C[1] }, st.g); K.el('animateMotion', { dur: '3s', repeatCount: 'indefinite', path: 'M130 90C170 10 220 10 250 70S280 130 280 90' }, dot);
  const sq = K.el('rect', { x: -10, y: -10, width: 20, height: 20, rx: 4, fill: K.C[2], transform: 'translate(60 130)' }, st.g); K.el('animateTransform', { attributeName: 'transform', type: 'rotate', from: '0 60 130', to: '360 60 130', dur: '4s', repeatCount: 'indefinite' }, sq);
}
```

**Combines with:** Use it for loading indicators or to show direction along a Sankey link or network edge.

---

## Rotating 3D solids you can turn with the mouse

**Use it when:** Look at a 3D object from every side without WebGL: cube, torus, sphere, Mobius strip.

**How I do it**

1. A mesh is just data: a list of vertices [x, y, z] and a list of faces (indexes of 3 or 4 vertices). Short functions generate them: cube (8 vertices), torus (a u x v grid wrapped around), icosphere (an icosahedron whose triangles are split twice and pushed onto a sphere), Mobius strip (a strip whose width direction flips half-way round).
2. Every frame: rotate each vertex (V.rot, two angles), project it (V.proj: perspective divide f = d / (d - z), so nearer points get bigger).
3. Lighting: for each face compute the normal with a cross product, flip it to face the camera (two-sided lighting, needed for the one-sided Mobius strip) and take its dot product with a light direction. Brightness = 22% + 48% * that value.
4. Painter's algorithm: sort faces by mean depth, far to near, and fill them in that order so near faces cover far ones.
5. Interaction: dragging changes the two view angles (V.drag); the Spin button adds 0.7 radians per second to the y angle inside the loop; Wireframe skips the fill.

**Code** (id `shapes3d`, has an automated interaction test)

```js
function draw(host, K) {
  const V = K.v3, PI = Math.PI, W = 320, H = 250;
  const cube = () => ({ v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(p => p.map(c => c * 0.62)), f: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]] });
  const torus = (nu = 28, nv = 14, R = 0.82, r = 0.36) => { const v = [], f = []; for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const u = i / nu * 2 * PI, w = j / nv * 2 * PI; v.push([(R + r * Math.cos(w)) * Math.cos(u), r * Math.sin(w), (R + r * Math.cos(w)) * Math.sin(u)]); } for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) f.push([i * nv + j, ((i + 1) % nu) * nv + j, ((i + 1) % nu) * nv + (j + 1) % nv, i * nv + (j + 1) % nv]); return { v, f }; };
  const sphere = () => {
    const t = (1 + Math.sqrt(5)) / 2, nrm = p => { const l = Math.hypot(...p); return p.map(c => c / l); };
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(nrm);
    let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let s = 0; s < 2; s++) { const cache = {}, mid = (a, b) => { const k = Math.min(a, b) + '_' + Math.max(a, b); if (!(k in cache)) { v.push(nrm(v[a].map((c, i) => (c + v[b][i]) / 2))); cache[k] = v.length - 1; } return cache[k]; }; f = f.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; }); }
    return { v: v.map(p => p.map(c => c * 1.05)), f };
  };
  const mobius = (nu = 60, nv = 6) => { const v = [], f = []; for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const u = i / nu * 2 * PI, w = (j / nv - 0.5) * 0.9, k = 1 + w * Math.cos(u / 2); v.push([k * Math.cos(u) * 0.85, w * Math.sin(u / 2) * 0.85, k * Math.sin(u) * 0.85]); } for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) f.push([i * (nv + 1) + j, (i + 1) * (nv + 1) + j, (i + 1) * (nv + 1) + j + 1, i * (nv + 1) + j + 1]); return { v, f }; };
  const shapes = { Cube: [cube(), 210], Torus: [torus(), 28], Sphere: [sphere(), 150], 'Möbius': [mobius(), 330] }, st = { ax: 0.55, ay: 0.6, spin: true, wire: false, shape: 'Torus' };
  const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px'; host.appendChild(bar);
  const mk = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.addEventListener('click', fn); bar.appendChild(b); return b; };
  Object.keys(shapes).forEach(n => mk(n, () => { st.shape = n; })); mk('Spin', () => { st.spin = !st.spin; }); mk('Wireframe', () => { st.wire = !st.wire; });
  const { cv, ctx } = V.canvas(host, W, H); V.drag(cv, st);
  const L = [0.35, 0.55, 0.75].map((c, _, a) => c / Math.hypot(...a));
  host.__loop = V.loop(dt => {
    if (st.spin) st.ay += dt * 0.7;
    const [M, hue] = shapes[st.shape], R = M.v.map(p => V.rot(p, st.ax, st.ay)), P = R.map(p => V.proj(p, W, H, 92, 6));
    const faces = M.f.map(f => { const [a, b, c] = [R[f[0]], R[f[1]], R[f[2]]], u = a.map((x, i) => b[i] - x), w = a.map((x, i) => c[i] - x), n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], len = Math.hypot(...n) || 1, s = n[2] < 0 ? -1 : 1; return { f, sh: Math.max(0, s * (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len), z: f.reduce((q, i) => q + R[i][2], 0) / f.length, y: f.reduce((q, i) => q + R[i][1], 0) / f.length }; }).sort((p, q) => p.z - q.z);
    ctx.clearRect(0, 0, W, H); ctx.lineJoin = 'round';
    faces.forEach(o => { ctx.beginPath(); o.f.forEach((i, k) => ctx[k ? 'lineTo' : 'moveTo'](P[i][0], P[i][1])); ctx.closePath(); if (!st.wire) { ctx.fillStyle = V.hsl(hue + o.y * 25, 65, 22 + o.sh * 48); ctx.fill(); } ctx.strokeStyle = st.wire ? V.hsl(hue, 70, 55) : 'rgba(0,0,0,0.25)'; ctx.lineWidth = st.wire ? 1 : 0.6; ctx.stroke(); });
  });
}
```

**Combines with:** Colour faces by a data value, draw a 3D scatter inside the same scene, or animate the vertices (see the wave surface).

---

## Solar system (orbits in 3D, drag to tilt)

**Use it when:** Show motion that depends on distance, in a scene you can view from any angle.

**How I do it**

1. Each planet has an orbit radius r and an angular speed from Kepler's third law: period ~ r^1.5, so speed ~ r^-1.5 (inner planets are much faster).
2. Every frame the clock t advances by dt * speed (slider). A planet's 3D position is [r cos(w t), 0, r sin(w t)]; the Moon is the Earth's position plus a small fast orbit.
3. Orbits are polylines of 90 points; everything goes through the same rotate + project functions, so dragging tilts the whole system.
4. Drawing order: collect the sun, planets and moon with their depth, sort by depth, draw far to near. Circle size = base size * perspective factor, so nearer planets look bigger.

**Code** (id `solar`, has an automated interaction test)

```js
function draw(host, K) {
  const V = K.v3, W = 320, H = 250, dark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches, ink = dark ? '#d8d6cf' : '#444';
  const P = [['Mercury', 0.45, 3, '#b4b2a9'], ['Venus', 0.7, 5, '#eda100'], ['Earth', 1.0, 5.5, '#2a78d6'], ['Mars', 1.3, 4, '#e34948'], ['Jupiter', 1.85, 10, '#d9a066'], ['Saturn', 2.4, 8, '#e6c870']];
  const st = { ax: 0.75, ay: 0.4, t: 0, speed: 1, run: true }, bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:6px;font-size:12px'; host.appendChild(bar);
  const pb = document.createElement('button'); pb.textContent = 'Pause'; pb.addEventListener('click', () => { st.run = !st.run; pb.textContent = st.run ? 'Pause' : 'Play'; }); bar.appendChild(pb);
  bar.insertAdjacentHTML('beforeend', 'speed <input type="range" min="0.2" max="4" step="0.1" value="1">'); bar.querySelector('input').addEventListener('input', e => { st.speed = +e.target.value; });
  const { cv, ctx } = V.canvas(host, W, H); V.drag(cv, st);
  const at = (r, a) => [r * Math.cos(a), 0, r * Math.sin(a)], pr = p => V.proj(V.rot(p, st.ax, st.ay), W, H, 52, 6);
  host.__loop = V.loop(dt => {
    if (st.run) st.t += dt * st.speed; ctx.clearRect(0, 0, W, H);
    P.forEach(([, r]) => { ctx.beginPath(); for (let i = 0; i <= 90; i++) { const q = pr(at(r, i / 90 * 2 * Math.PI)); ctx[i ? 'lineTo' : 'moveTo'](q[0], q[1]); } ctx.strokeStyle = 'rgba(128,128,128,0.35)'; ctx.lineWidth = 0.8; ctx.stroke(); });
    const objs = [{ z: V.rot([0, 0, 0], st.ax, st.ay)[2], d: () => { const q = pr([0, 0, 0]); [[20, 0.12], [15, 0.25], [11, 1]].forEach(([r, a]) => { ctx.globalAlpha = a; ctx.fillStyle = '#ffc233'; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 2 * Math.PI); ctx.fill(); }); ctx.globalAlpha = 1; } }];
    P.forEach(([name, r, s, col], i) => {
      const a = st.t * 1.6 / Math.pow(r, 1.5), p3 = at(r, a), R = V.rot(p3, st.ax, st.ay);
      objs.push({ z: R[2], d: () => { const q = pr(p3);
        if (name === 'Saturn') { ctx.beginPath(); for (let k = 0; k <= 40; k++) { const e = pr([p3[0] + 0.34 * Math.cos(k / 40 * 2 * Math.PI), 0, p3[2] + 0.34 * Math.sin(k / 40 * 2 * Math.PI)]); ctx[k ? 'lineTo' : 'moveTo'](e[0], e[1]); } ctx.strokeStyle = 'rgba(230,200,112,0.8)'; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(q[0], q[1], s * q[2] * 0.9, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill(); const left = q[0] > W - 70; ctx.font = '10px sans-serif'; ctx.fillStyle = ink; ctx.textAlign = left ? 'right' : 'left'; ctx.fillText(name, q[0] + (left ? -1 : 1) * (s * q[2] + 2), q[1] + 3); ctx.textAlign = 'left'; } });
      if (name === 'Earth') { const m3 = [p3[0] + 0.22 * Math.cos(st.t * 7), 0, p3[2] + 0.22 * Math.sin(st.t * 7)], Rm = V.rot(m3, st.ax, st.ay); objs.push({ z: Rm[2], d: () => { const q = pr(m3); ctx.beginPath(); ctx.arc(q[0], q[1], 1.8 * q[2], 0, 2 * Math.PI); ctx.fillStyle = '#d8d6cf'; ctx.fill(); } }); }
    });
    objs.sort((a, b) => a.z - b.z).forEach(o => o.d());
  });
}
```

**Combines with:** Add a trail per planet (keep the last positions, draw them fading), or plot distance-to-sun against time in a linked line chart.

---

## Lorenz attractor (a 3D curve being drawn live)

**Use it when:** Show chaos: a deterministic system whose path never repeats and never settles.

**How I do it**

1. Three coupled equations: dx = sigma (y - x), dy = x (rho - z) - y, dz = x y - beta z, with sigma = 10, beta = 8/3 and rho from the slider (28 gives the butterfly).
2. Integrate with 4th-order Runge-Kutta: evaluate the slope four times per step and average (more accurate than plain Euler). 6 steps of dt = 0.01 per frame.
3. Keep the last 2500 points. Every frame rotate and project them all and draw them in chunks of 40 points, each chunk with its own colour (old = blue, new = orange) and a line width that grows with perspective.
4. The view rotates slowly by itself; drag to take over. Changing rho resets the trail so you see how the shape changes (below about 24.7 it settles to a point instead of being chaotic).

**Code** (id `lorenz`, has an automated interaction test)

```js
function draw(host, K) {
  const V = K.v3, W = 320, H = 260, st = { ax: 0.35, ay: 0.5, rho: 28, spin: true }, S = 10, B = 8 / 3;
  let p = [1, 1, 1], trail = [];
  const f = ([x, y, z]) => [S * (y - x), x * (st.rho - z) - y, x * y - B * z], add = (a, b, k) => a.map((v, i) => v + b[i] * k);
  const rk4 = (q, h) => { const a = f(q), b = f(add(q, a, h / 2)), c = f(add(q, b, h / 2)), d = f(add(q, c, h)); return q.map((v, i) => v + h / 6 * (a[i] + 2 * b[i] + 2 * c[i] + d[i])); };
  const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:10px;align-items:center;margin-bottom:6px;font-size:12px'; host.appendChild(bar);
  bar.innerHTML = 'rho <input type="range" min="10" max="40" step="1" value="28"> <b>28</b>'; bar.querySelector('input').addEventListener('input', e => { st.rho = +e.target.value; bar.querySelector('b').textContent = st.rho; p = [1, 1, 1]; trail = []; });
  const { cv, ctx } = V.canvas(host, W, H); V.drag(cv, st);
  host.__loop = V.loop(dt => {
    if (st.spin) st.ay += dt * 0.25; for (let i = 0; i < 6; i++) { p = rk4(p, 0.01); trail.push(p); } if (trail.length > 2500) trail.splice(0, trail.length - 2500);
    ctx.clearRect(0, 0, W, H); const Q = trail.map(q => V.proj(V.rot([q[0] / 22, q[1] / 28, (q[2] - 25) / 28], st.ax, st.ay), W, H, 112, 6)), N = Q.length;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let c = 0; c < N - 1; c += 40) { ctx.beginPath(); ctx.moveTo(Q[c][0], Q[c][1]); const end = Math.min(c + 41, N); for (let i = c + 1; i < end; i++) ctx.lineTo(Q[i][0], Q[i][1]); ctx.strokeStyle = V.hsl(215 - 190 * c / Math.max(N, 1), 75, 52); ctx.lineWidth = 1.1 * Q[c][2]; ctx.stroke(); }
    if (N) { ctx.beginPath(); ctx.arc(Q[N - 1][0], Q[N - 1][1], 3.2, 0, 2 * Math.PI); ctx.fillStyle = V.hsl(25, 90, 55); ctx.fill(); }
  });
}
```

**Combines with:** Run a second copy from a start point that differs by 0.001 and draw both: they separate, which is sensitive dependence on initial conditions (see the double pendulum).

---

## Starfield fly-through (steer with the pointer)

**Use it when:** A cheap sense of depth and speed: points rushing past the camera.

**How I do it**

1. Each star has a fixed (x, y) and a depth z that shrinks every frame (z -= speed * dt). When z reaches almost 0 the star is respawned far away at z = 1.
2. Perspective projection by hand: screen = centre + (x / z) * focal length; stars close to the camera fly outwards fast.
3. Draw each star as a short line from its previous screen position to the new one (a streak) and make it bigger and brighter as z falls.
4. Steering: the pointer position moves the vanishing point (the centre everything flies away from).

**Code** (id `starfield`, has an automated interaction test)

```js
function draw(host, K) {
  const V = K.v3, W = 320, H = 220, r = K.rng(5), st = { cx: W / 2, cy: H / 2, tx: W / 2, ty: H / 2 }, { cv, ctx } = V.canvas(host, W, H);
  const S = Array.from({ length: 220 }, () => ({ x: (r() - 0.5) * 2, y: (r() - 0.5) * 2, z: 0.05 + r() * 0.95, px: 0, py: 0 }));
  cv.style.cursor = 'crosshair'; cv.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); st.tx = (e.clientX - b.left) / (b.width || 1) * W; st.ty = (e.clientY - b.top) / (b.height || 1) * H; });
  host.__loop = V.loop(dt => {
    st.cx += (st.tx - st.cx) * 0.08; st.cy += (st.ty - st.cy) * 0.08; ctx.fillStyle = 'rgba(10,12,28,1)'; ctx.fillRect(0, 0, W, H);
    S.forEach(s => { const sx = st.cx + s.x / s.z * 70, sy = st.cy + s.y / s.z * 70; s.z -= dt * 0.35; if (s.z < 0.03 || sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) { s.x = (r() - 0.5) * 2; s.y = (r() - 0.5) * 2; s.z = 1; s.px = 0; return; }
      const nx = st.cx + s.x / s.z * 70, ny = st.cy + s.y / s.z * 70; if (s.px) { ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(nx, ny); ctx.strokeStyle = V.hsl(210 + s.x * 40, 70, 60 + (1 - s.z) * 35); ctx.lineWidth = 0.6 + (1 - s.z) * 2.2; ctx.lineCap = 'round'; ctx.stroke(); } s.px = nx; s.py = ny; });
  });
}
```

**Combines with:** Colour the stars by a data category and you have a 3D scatter you fly through.

---

## Animated 3D wave surface

**Use it when:** A surface that changes over time: ripples, heat, a height field of data.

**How I do it**

1. A height field: a 26 x 26 grid of (x, z) points whose height is y = 0.28 sin(3 r - 2 t) / (1 + 1.5 r), with r the distance from the centre and t the clock. The ripple moves outwards as t grows.
2. Every frame recompute all y values for the current t, rotate, project and sort the 625 quads by depth (painter's algorithm), then fill each with a colour from its mean height.
3. The view turns slowly by itself and can be dragged.

**Code** (id `wave3d`, has an automated interaction test)

```js
function draw(host, K) {
  const V = K.v3, W = 320, H = 240, n = 26, st = { ax: 0.75, ay: 0.5, t: 0 }, { cv, ctx } = V.canvas(host, W, H); V.drag(cv, st);
  const h = (x, z, t) => { const r = Math.hypot(x, z); return 0.28 * Math.sin(3 * r - 2 * t) / (1 + 1.5 * r); };
  host.__loop = V.loop(dt => {
    st.t += dt; st.ay += dt * 0.15; ctx.clearRect(0, 0, W, H); const G = [];
    for (let i = 0; i < n; i++) { G[i] = []; for (let j = 0; j < n; j++) { const x = -1.4 + 2.8 * i / (n - 1), z = -1.4 + 2.8 * j / (n - 1), y = h(x, z, st.t), R = V.rot([x, y * 2.2, z], st.ax, st.ay); G[i][j] = { p: V.proj(R, W, H, 66, 6), z: R[2], y }; } }
    const Q = []; for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) { const q = [G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]]; Q.push({ q, z: (q[0].z + q[2].z) / 2, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 }); }
    Q.sort((a, b) => a.z - b.z).forEach(o => { ctx.beginPath(); o.q.forEach((c, k) => ctx[k ? 'lineTo' : 'moveTo'](c.p[0], c.p[1])); ctx.closePath(); ctx.fillStyle = V.hsl(205 - o.y * 330, 70, 48 + o.y * 60); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.5; ctx.stroke(); });
  });
}
```

**Combines with:** Replace the formula by a grid of real measurements per time step to animate a real field, e.g. temperature.

---

## Double pendulum (chaos: two almost identical starts)

**Use it when:** Show sensitive dependence on initial conditions: tiny differences grow until the motions look unrelated.

**How I do it**

1. State: two angles and two angular velocities. The equations of motion (equal masses and lengths) give the two angular accelerations from the current state; integrate with RK4 (4 slope evaluations per step), 4 steps of dt = 0.01 per frame.
2. Two pendulums start with angles that differ by 0.001 rad. They look identical for a few seconds, then separate completely.
3. Draw rods, bobs and a fading trail of the lower bob of each (last 220 positions).

**Code** (id `doublependulum`, has an automated interaction test)

```js
function draw(host, K) {
  const V = K.v3, W = 320, H = 260, g = 9.81, L = 62, ox = W / 2, oy = 95;
  const acc = ([a, b, w1, w2]) => { const d = a - b, den = 3 - Math.cos(2 * d); return [w1, w2, (-g * 3 * Math.sin(a) - g * Math.sin(a - 2 * b) - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / den, (2 * Math.sin(d) * (2 * w1 * w1 + 2 * g * Math.cos(a) + w2 * w2 * Math.cos(d))) / den]; };
  const rk4 = (s, h) => { const add = (q, d, k) => q.map((v, i) => v + d[i] * k), a = acc(s), b = acc(add(s, a, h / 2)), c = acc(add(s, b, h / 2)), d = acc(add(s, c, h)); return s.map((v, i) => v + h / 6 * (a[i] + 2 * b[i] + 2 * c[i] + d[i])); };
  let P = [{ s: [2.0, 2.4, 0, 0], tr: [], col: K.C[1] }, { s: [2.001, 2.4, 0, 0], tr: [], col: K.C[0] }];
  const bar = document.createElement('div'); bar.style.marginBottom = '6px'; const rb = document.createElement('button'); rb.textContent = 'Restart'; rb.addEventListener('click', () => { P.forEach((p, i) => { p.s = [2.0 + i * 0.001, 2.4, 0, 0]; p.tr = []; }); }); bar.appendChild(rb); host.appendChild(bar);
  const { cv, ctx } = V.canvas(host, W, H);
  host.__loop = V.loop(dt => {
    ctx.clearRect(0, 0, W, H);
    P.forEach(p => { for (let i = 0; i < 4; i++) p.s = rk4(p.s, 0.01); const x1 = ox + L * Math.sin(p.s[0]), y1 = oy + L * Math.cos(p.s[0]), x2 = x1 + L * Math.sin(p.s[1]), y2 = y1 + L * Math.cos(p.s[1]); p.tr.push([x2, y2]); if (p.tr.length > 220) p.tr.shift(); p.xy = [x1, y1, x2, y2]; });
    P.forEach(p => { for (let i = 1; i < p.tr.length; i++) { ctx.beginPath(); ctx.moveTo(p.tr[i - 1][0], p.tr[i - 1][1]); ctx.lineTo(p.tr[i][0], p.tr[i][1]); ctx.strokeStyle = p.col; ctx.globalAlpha = i / p.tr.length * 0.7; ctx.lineWidth = 1.6; ctx.stroke(); } ctx.globalAlpha = 1; });
    P.forEach(p => { const [x1, y1, x2, y2] = p.xy; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.stroke(); [[x1, y1], [x2, y2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fillStyle = p.col; ctx.fill(); }); });
    ctx.beginPath(); ctx.arc(ox, oy, 3.5, 0, 2 * Math.PI); ctx.fillStyle = '#555'; ctx.fill();
  });
}
```

**Combines with:** Plot the distance between the two bobs over time to see the exponential separation (linked line chart).

---
