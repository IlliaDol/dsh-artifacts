/* Animated and 3D canvas recipes. They need viz3d.js (K.v3). In tests the animation loop is advanced by hand (K.v3.manual). */
const ticks = (host, n = 5) => { const c = host.querySelector('canvas'), before = c.__ctx.__calls; host.__loop.tick(n); if (c.__ctx.__calls <= before) throw new Error('nothing was drawn'); if (c.__ctx.__bad) throw new Error('NaN or Infinity passed to the canvas'); };
const dragTest = host => { const c = host.querySelector('canvas'), before = c.__ctx.__ops.join(''); const ev = (t, x, y) => { const e = new Event(t, { bubbles: true }); e.clientX = x; e.clientY = y; e.pointerId = 1; c.dispatchEvent(e); }; ev('pointerdown', 10, 10); ev('pointermove', 90, 40); ev('pointerup', 90, 40); host.__loop.tick(1); if (c.__ctx.__ops.join('') === before) throw new Error('dragging did not rotate the scene'); };
const RECIPES_B9 = [
{
  id: 'shapes3d', family: 'threed', name: 'Rotating 3D solids you can turn with the mouse',
  when: 'Look at a 3D object from every side without WebGL: cube, torus, sphere, Mobius strip.',
  steps: ['A mesh is just data: a list of vertices [x, y, z] and a list of faces (indexes of 3 or 4 vertices). Short functions generate them: cube (8 vertices), torus (a u x v grid wrapped around), icosphere (an icosahedron whose triangles are split twice and pushed onto a sphere), Mobius strip (a strip whose width direction flips half-way round).',
          'Every frame: rotate each vertex (V.rot, two angles), project it (V.proj: perspective divide f = d / (d - z), so nearer points get bigger).',
          'Lighting: for each face compute the normal with a cross product, flip it to face the camera (two-sided lighting, needed for the one-sided Mobius strip) and take its dot product with a light direction. Brightness = 22% + 48% * that value.',
          'Painter\'s algorithm: sort faces by mean depth, far to near, and fill them in that order so near faces cover far ones.',
          'Interaction: dragging changes the two view angles (V.drag); the Spin button adds 0.7 radians per second to the y angle inside the loop; Wireframe skips the fill.'],
  combine: 'Colour faces by a data value, draw a 3D scatter inside the same scene, or animate the vertices (see the wave surface).',
  test: host => { ticks(host, 3); dragTest(host); const b = [...host.querySelectorAll('button')].find(x => x.textContent === 'Sphere'), c = host.querySelector('canvas'), before = c.__ctx.__ops.length; b.click(); host.__loop.tick(1); if (c.__ctx.__ops.length === before) throw new Error('shape switch did nothing'); },
  fn(host, K) {
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
  },
},
{
  id: 'solar', family: 'threed', name: 'Solar system (orbits in 3D, drag to tilt)',
  when: 'Show motion that depends on distance, in a scene you can view from any angle.',
  steps: ['Each planet has an orbit radius r and an angular speed from Kepler\'s third law: period ~ r^1.5, so speed ~ r^-1.5 (inner planets are much faster).',
          'Every frame the clock t advances by dt * speed (slider). A planet\'s 3D position is [r cos(w t), 0, r sin(w t)]; the Moon is the Earth\'s position plus a small fast orbit.',
          'Orbits are polylines of 90 points; everything goes through the same rotate + project functions, so dragging tilts the whole system.',
          'Drawing order: collect the sun, planets and moon with their depth, sort by depth, draw far to near. Circle size = base size * perspective factor, so nearer planets look bigger.'],
  combine: 'Add a trail per planet (keep the last positions, draw them fading), or plot distance-to-sun against time in a linked line chart.',
  test: host => { ticks(host, 5); dragTest(host); const c = host.querySelector('canvas'), r = host.querySelector('input'); r.value = 3; r.dispatchEvent(new Event('input', { bubbles: true })); host.__loop.tick(2); },
  fn(host, K) {
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
  },
},
{
  id: 'lorenz', family: 'threed', name: 'Lorenz attractor (a 3D curve being drawn live)',
  when: 'Show chaos: a deterministic system whose path never repeats and never settles.',
  steps: ['Three coupled equations: dx = sigma (y - x), dy = x (rho - z) - y, dz = x y - beta z, with sigma = 10, beta = 8/3 and rho from the slider (28 gives the butterfly).',
          'Integrate with 4th-order Runge-Kutta: evaluate the slope four times per step and average (more accurate than plain Euler). 6 steps of dt = 0.01 per frame.',
          'Keep the last 2500 points. Every frame rotate and project them all and draw them in chunks of 40 points, each chunk with its own colour (old = blue, new = orange) and a line width that grows with perspective.',
          'The view rotates slowly by itself; drag to take over. Changing rho resets the trail so you see how the shape changes (below about 24.7 it settles to a point instead of being chaotic).'],
  combine: 'Run a second copy from a start point that differs by 0.001 and draw both: they separate, which is sensitive dependence on initial conditions (see the double pendulum).',
  test: host => { ticks(host, 20); dragTest(host); const r = host.querySelector('input'); r.value = 15; r.dispatchEvent(new Event('input', { bubbles: true })); ticks(host, 5); },
  fn(host, K) {
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
  },
},
{
  id: 'starfield', family: 'threed', name: 'Starfield fly-through (steer with the pointer)',
  when: 'A cheap sense of depth and speed: points rushing past the camera.',
  steps: ['Each star has a fixed (x, y) and a depth z that shrinks every frame (z -= speed * dt). When z reaches almost 0 the star is respawned far away at z = 1.',
          'Perspective projection by hand: screen = centre + (x / z) * focal length; stars close to the camera fly outwards fast.',
          'Draw each star as a short line from its previous screen position to the new one (a streak) and make it bigger and brighter as z falls.',
          'Steering: the pointer position moves the vanishing point (the centre everything flies away from).'],
  combine: 'Colour the stars by a data category and you have a 3D scatter you fly through.',
  test: host => { ticks(host, 10); const c = host.querySelector('canvas'), e = new Event('pointermove', { bubbles: true }); e.clientX = 20; e.clientY = 20; c.dispatchEvent(e); ticks(host, 2); },
  fn(host, K) {
    const V = K.v3, W = 320, H = 220, r = K.rng(5), st = { cx: W / 2, cy: H / 2, tx: W / 2, ty: H / 2 }, { cv, ctx } = V.canvas(host, W, H);
    const S = Array.from({ length: 220 }, () => ({ x: (r() - 0.5) * 2, y: (r() - 0.5) * 2, z: 0.05 + r() * 0.95, px: 0, py: 0 }));
    cv.style.cursor = 'crosshair'; cv.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); st.tx = (e.clientX - b.left) / (b.width || 1) * W; st.ty = (e.clientY - b.top) / (b.height || 1) * H; });
    host.__loop = V.loop(dt => {
      st.cx += (st.tx - st.cx) * 0.08; st.cy += (st.ty - st.cy) * 0.08; ctx.fillStyle = 'rgba(10,12,28,1)'; ctx.fillRect(0, 0, W, H);
      S.forEach(s => { const sx = st.cx + s.x / s.z * 70, sy = st.cy + s.y / s.z * 70; s.z -= dt * 0.35; if (s.z < 0.03 || sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) { s.x = (r() - 0.5) * 2; s.y = (r() - 0.5) * 2; s.z = 1; s.px = 0; return; }
        const nx = st.cx + s.x / s.z * 70, ny = st.cy + s.y / s.z * 70; if (s.px) { ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(nx, ny); ctx.strokeStyle = V.hsl(210 + s.x * 40, 70, 60 + (1 - s.z) * 35); ctx.lineWidth = 0.6 + (1 - s.z) * 2.2; ctx.lineCap = 'round'; ctx.stroke(); } s.px = nx; s.py = ny; });
    });
  },
},
{
  id: 'wave3d', family: 'threed', name: 'Animated 3D wave surface',
  when: 'A surface that changes over time: ripples, heat, a height field of data.',
  steps: ['A height field: a 26 x 26 grid of (x, z) points whose height is y = 0.28 sin(3 r - 2 t) / (1 + 1.5 r), with r the distance from the centre and t the clock. The ripple moves outwards as t grows.',
          'Every frame recompute all y values for the current t, rotate, project and sort the 625 quads by depth (painter\'s algorithm), then fill each with a colour from its mean height.',
          'The view turns slowly by itself and can be dragged.'],
  combine: 'Replace the formula by a grid of real measurements per time step to animate a real field, e.g. temperature.',
  test: host => { ticks(host, 6); dragTest(host); },
  fn(host, K) {
    const V = K.v3, W = 320, H = 240, n = 26, st = { ax: 0.75, ay: 0.5, t: 0 }, { cv, ctx } = V.canvas(host, W, H); V.drag(cv, st);
    const h = (x, z, t) => { const r = Math.hypot(x, z); return 0.28 * Math.sin(3 * r - 2 * t) / (1 + 1.5 * r); };
    host.__loop = V.loop(dt => {
      st.t += dt; st.ay += dt * 0.15; ctx.clearRect(0, 0, W, H); const G = [];
      for (let i = 0; i < n; i++) { G[i] = []; for (let j = 0; j < n; j++) { const x = -1.4 + 2.8 * i / (n - 1), z = -1.4 + 2.8 * j / (n - 1), y = h(x, z, st.t), R = V.rot([x, y * 2.2, z], st.ax, st.ay); G[i][j] = { p: V.proj(R, W, H, 66, 6), z: R[2], y }; } }
      const Q = []; for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) { const q = [G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]]; Q.push({ q, z: (q[0].z + q[2].z) / 2, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 }); }
      Q.sort((a, b) => a.z - b.z).forEach(o => { ctx.beginPath(); o.q.forEach((c, k) => ctx[k ? 'lineTo' : 'moveTo'](c.p[0], c.p[1])); ctx.closePath(); ctx.fillStyle = V.hsl(205 - o.y * 330, 70, 48 + o.y * 60); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.5; ctx.stroke(); });
    });
  },
},
{
  id: 'doublependulum', family: 'threed', name: 'Double pendulum (chaos: two almost identical starts)',
  when: 'Show sensitive dependence on initial conditions: tiny differences grow until the motions look unrelated.',
  steps: ['State: two angles and two angular velocities. The equations of motion (equal masses and lengths) give the two angular accelerations from the current state; integrate with RK4 (4 slope evaluations per step), 4 steps of dt = 0.01 per frame.',
          'Two pendulums start with angles that differ by 0.001 rad. They look identical for a few seconds, then separate completely.',
          'Draw rods, bobs and a fading trail of the lower bob of each (last 220 positions).'],
  combine: 'Plot the distance between the two bobs over time to see the exponential separation (linked line chart).',
  test: host => { ticks(host, 30); const b = host.querySelector('button'), c = host.querySelector('canvas'); b.click(); ticks(host, 3); },
  fn(host, K) {
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
  },
},
];
if (typeof module !== 'undefined') module.exports = RECIPES_B9; else window.RECIPES_B9 = RECIPES_B9;
