# UI mockups and art

11 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## UI mockup: study dashboard

**Use it when:** Show what a screen could look like before building it.

**How I do it**

1. Layout with CSS grid: a header row, a row of metric cards (auto-fit columns so it also works on a phone), a list card.
2. Colours and borders come from CSS variables, so it follows light and dark mode.
3. Placeholder numbers only; the point is structure.

**Code** (id `uidash`)

```js
function draw(host, K) {
  const root = document.createElement('div'); root.style.cssText = 'background:var(--card,#f4f3ee);border-radius:12px;padding:14px;font-size:13px'; host.appendChild(root);
  const tile = (l, v) => '<div style="background:var(--bg,#fff);border:.5px solid var(--grid,#ddd);border-radius:8px;padding:10px"><div style="opacity:.65;font-size:12px">' + l + '</div><div style="font-size:20px;font-weight:500">' + v + '</div></div>';
  const bar = (l, p, c) => '<div style="padding:8px 0"><div style="display:flex;justify-content:space-between"><span>' + l + '</span><span style="opacity:.65">' + p + '%</span></div><div style="height:6px;border-radius:3px;background:var(--card,#eee);margin-top:5px"><div style="width:' + p + '%;height:100%;border-radius:3px;background:' + c + '"></div></div></div>';
  root.innerHTML = '<div style="font-weight:500;font-size:15px;margin-bottom:10px">Study dashboard</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:10px">' + tile('Streak', '12 days') + tile('Hours this week', '14.5') + tile('Next exam', '9 days') + '</div><div style="background:var(--bg,#fff);border:.5px solid var(--grid,#ddd);border-radius:10px;padding:2px 12px">' + bar('Statistics', 72, K.C[0]) + bar('Linear algebra', 45, K.C[2]) + bar('Programming', 88, K.C[6]) + '</div>';
}
```

**Combines with:** Replace the placeholder numbers with real chart recipes to get a working dashboard (see "Dashboard with shared state").

---

## Form with live validation

**Use it when:** Collect input and tell people immediately what is wrong.

**How I do it**

1. One validator function per field (email shape, password length) returning an error text or an empty string.
2. On every input event run the validators, show the message under the field and set the submit button's disabled flag from "no errors".
3. Never rely on colour alone: the message text explains the problem.

**Code** (id `form`, has an automated interaction test)

```js
function draw(host, K) {
  const root = document.createElement('div'); root.style.cssText = 'font-size:13px;max-width:320px'; host.appendChild(root);
  root.innerHTML = '<label>Email<br><input type="text" class="em" style="width:100%;padding:7px;box-sizing:border-box"></label><div class="e1" style="color:#c0392b;min-height:18px;font-size:12px"></div><label>Password<br><input type="password" class="pw" style="width:100%;padding:7px;box-sizing:border-box"></label><div class="e2" style="color:#c0392b;min-height:18px;font-size:12px"></div><button class="go" disabled style="margin-top:6px">Create account</button>';
  const em = root.querySelector('.em'), pw = root.querySelector('.pw'), go = root.querySelector('.go');
  const check = () => { const e1 = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value) ? '' : 'Enter a valid email address.', e2 = pw.value.length >= 8 ? '' : 'Use at least 8 characters.'; root.querySelector('.e1').textContent = e1; root.querySelector('.e2').textContent = e2; go.disabled = !!(e1 || e2); };
  em.addEventListener('input', check); pw.addEventListener('input', check);
}
```

**Combines with:** Add a password-strength bar drawn like a progress bar.

---

## Landing page hero + feature cards

**Use it when:** The top of a product or project page.

**How I do it**

1. A centred headline (one sentence), a sub-headline (one sentence), two buttons (primary and secondary).
2. Three feature cards in an auto-fit grid so they stack on small screens.

**Code** (id `hero`)

```js
function draw(host, K) {
  const root = document.createElement('div'); root.style.cssText = 'font-size:13px;text-align:center'; host.appendChild(root);
  root.innerHTML = '<div style="padding:26px 10px;background:linear-gradient(180deg,var(--card,#f4f3ee),transparent);border-radius:12px"><div style="font-size:24px;font-weight:500;margin-bottom:6px">See your data clearly</div><div style="opacity:.7;margin-bottom:14px">Charts, tables and diagrams that explain themselves.</div><button style="background:#2a78d6;color:#fff;border:0;padding:8px 16px;border-radius:8px">Get started</button> <button style="padding:8px 16px;border-radius:8px">See examples</button></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:12px;text-align:left">' + [['Fast', 'Draws in milliseconds'], ['Honest', 'Axes start at zero'], ['Accessible', 'Text alternatives']].map(f => '<div style="background:var(--card,#f4f3ee);border-radius:10px;padding:10px"><b>' + f[0] + '</b><div style="opacity:.7">' + f[1] + '</div></div>').join('') + '</div>';
}
```

**Combines with:** Publish it as a web page (shareable link) or place real chart recipes inside the cards.

---

## Poster composition

**Use it when:** A single bold graphic: event poster, title slide, cover.

**How I do it**

1. Fix a canvas (viewBox 320 x 300) and a palette of 3 to 4 colours.
2. Build the layout from big simple shapes first (background, circle, bars), then the headline text with the largest size and strongest contrast, then small details (date, place).
3. Hierarchy: one dominant element, one secondary, the rest quiet.

**Code** (id `poster`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 300, { l: 0, r: 0, t: 0, b: 0 });
  K.el('rect', { x: 0, y: 0, width: 320, height: 300, fill: '#1b1a3a' }, st.g); K.el('circle', { cx: 230, cy: 90, r: 70, fill: '#eb6834' }, st.g); K.el('circle', { cx: 230, cy: 90, r: 44, fill: '#1b1a3a' }, st.g);
  [0, 1, 2, 3, 4].forEach(i => K.el('rect', { x: 28 + i * 16, y: 200 - [30, 56, 84, 62, 100][i], width: 11, height: [30, 56, 84, 62, 100][i], fill: ['#2a78d6', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'][i] }, st.g));
  K.text(st.g, 26, 244, 'DATA DAY', { 'font-size': 38, fill: '#fff', 'font-weight': 700 }); K.text(st.g, 28, 266, 'Talks, charts and code', { 'font-size': 14, fill: '#cfcde8' }); K.text(st.g, 28, 286, 'Nov 12  ·  TU Dortmund', { 'font-size': 12, fill: '#eda100' });
}
```

**Combines with:** Use the same palette as the charts in the same document so everything looks like one family.

---

## Icon set from primitives

**Use it when:** Simple consistent icons without an icon font.

**How I do it**

1. Design on a 24 x 24 grid with one rule set: 2 px stroke, round caps and joins, no fill.
2. Each icon is a few primitives (circle, rect, line, path); an icon is just a function of (parent, colour).
3. Place them in a grid with <g transform="translate">.

**Code** (id `icons`)

```js
function draw(host, K) {
  const star = K.range(0, 9, 10).map((_, i) => K.polar(12, 12.5, i % 2 ? 4.5 : 10, i * Math.PI / 5).join(',')).join(' ');
  const I = [['home', g => { K.el('path', { d: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6' }, g); }], ['search', g => { K.el('circle', { cx: 10, cy: 10, r: 6 }, g); K.el('path', { d: 'M15 15l6 6' }, g); }], ['bell', g => { K.el('path', { d: 'M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0' }, g); }], ['heart', g => { K.el('path', { d: 'M12 20S4 14 4 9a4 4 0 018-1 4 4 0 018 1c0 5-8 11-8 11z' }, g); }], ['star', g => { K.el('polygon', { points: star }, g); }], ['user', g => { K.el('circle', { cx: 12, cy: 8, r: 4 }, g); K.el('path', { d: 'M4 21c0-4 4-6 8-6s8 2 8 6' }, g); }], ['gear', g => { K.el('circle', { cx: 12, cy: 12, r: 3 }, g); K.el('circle', { cx: 12, cy: 12, r: 8, 'stroke-dasharray': '3.2 2.2', 'stroke-width': 4 }, g); }], ['chart', g => { K.el('path', { d: 'M5 20v-8M12 20V5M19 20v-11' }, g); }], ['mail', g => { K.el('rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }, g); K.el('path', { d: 'M3 7l9 6 9-6' }, g); }], ['lock', g => { K.el('rect', { x: 5, y: 11, width: 14, height: 9, rx: 2 }, g); K.el('path', { d: 'M8 11V8a4 4 0 018 0v3' }, g); }], ['camera', g => { K.el('rect', { x: 3, y: 7, width: 18, height: 13, rx: 2 }, g); K.el('circle', { cx: 12, cy: 13, r: 3.5 }, g); K.el('path', { d: 'M8 7l1.5-3h5L16 7' }, g); }], ['play', g => { K.el('circle', { cx: 12, cy: 12, r: 9 }, g); K.el('polygon', { points: '10,8 16,12 10,16' }, g); }]];
  const st = K.stage(host, 320, 190, { l: 14, r: 14, t: 10, b: 6 });
  I.forEach(([n, f], i) => { const g = K.el('g', { transform: `translate(${(i % 4) * 74 + 12},${Math.floor(i / 4) * 58}) scale(1.6)`, fill: 'none', stroke: K.C[i % 8], 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, st.g); f(g); K.text(st.g, (i % 4) * 74 + 31, Math.floor(i / 4) * 58 + 52, n, { 'text-anchor': 'middle', 'font-size': 10 }); });
}
```

**Combines with:** Use the same icons in KPI tiles and navigation.

---

## Generative pattern (Truchet tiles)

**Use it when:** Backgrounds and patterns from a tiny rule plus randomness.

**How I do it**

1. Divide the area into square tiles. Each tile gets one of two orientations at random (seeded, so the picture is reproducible).
2. Orientation 0 draws two quarter-circle arcs around the top-left and bottom-right corners; orientation 1 around the other two. The arcs always meet the neighbours' arcs at edge midpoints, which creates the flowing lines.

**Code** (id `truchet`)

```js
function draw(host, K) {
  const r = K.rng(42), st = K.stage(host, 320, 200, { l: 0, r: 0, t: 0, b: 0 }), s = 20, h = s / 2;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 10; j++) { const x = i * s, y = j * s, o = r() < 0.5, d = o ? `M${x + h} ${y}A${h} ${h} 0 0 1 ${x} ${y + h}M${x + h} ${y + s}A${h} ${h} 0 0 1 ${x + s} ${y + h}` : `M${x + h} ${y}A${h} ${h} 0 0 0 ${x + s} ${y + h}M${x + h} ${y + s}A${h} ${h} 0 0 0 ${x} ${y + h}`; K.el('path', { d, fill: 'none', stroke: K.C[(i + j) % 3], 'stroke-width': 3, 'stroke-linecap': 'round' }, st.g); }
}
```

**Combines with:** Colour the arcs by a data value to make a "data texture".

---

## Flow field art

**Use it when:** Organic, wind-like line art driven by a vector field.

**How I do it**

1. Define an angle at every point: angle(x, y) = (sin(x * 0.02) + cos(y * 0.025)) * pi.
2. Start many curves at jittered grid points and take 40 small steps, each in the direction of the local angle.
3. Draw each trail as a thin semi-transparent path; colour by index.

**Code** (id `flowfield`)

```js
function draw(host, K) {
  const r = K.rng(5), st = K.stage(host, 320, 200, { l: 0, r: 0, t: 0, b: 0 });
  for (let i = 0; i < 18; i++) for (let j = 0; j < 11; j++) { let x = i * 18 + r() * 10, y = j * 19 + r() * 10; const pts = [[x, y]]; for (let k = 0; k < 40; k++) { const a = (Math.sin(x * 0.02) + Math.cos(y * 0.025)) * Math.PI; x += Math.cos(a) * 3; y += Math.sin(a) * 3; pts.push([x, y]); } K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[(i * 3 + j) % 8], 'stroke-opacity': 0.55, 'stroke-width': 1.3, 'stroke-linecap': 'round' }, st.g); }
}
```

**Combines with:** The same loop traces streamlines of a real vector field (physics recipe).

---

## Mandala (rotational symmetry)

**Use it when:** Decorative radial designs.

**How I do it**

1. Draw ONE petal as a path with two quadratic curves (centre, control point left, tip, control point right, back to centre).
2. Repeat it n times, each rotated by 360 / n degrees; stack layers with different n, length and colour.

**Code** (id `mandala`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 230, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2;
  [[16, 104, 0.2, 6], [12, 86, 0.28, 0], [8, 64, 0.4, 1], [6, 40, 0.55, 3]].forEach(([n, len, w, c], l) => { for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, tip = K.polar(cx, cy, len, a), c1 = K.polar(cx, cy, len * 0.55, a - w), c2 = K.polar(cx, cy, len * 0.55, a + w); K.el('path', { d: `M${cx} ${cy}Q${c1} ${tip}Q${c2} ${cx},${cy}Z`, fill: K.C[c], 'fill-opacity': 0.35, stroke: K.C[c] }, st.g); } });
  K.el('circle', { cx, cy, r: 6, fill: K.C[1] }, st.g);
}
```

**Combines with:** Map a data series to petal length to make a radial bar chart with style.

---

## Isometric blocks

**Use it when:** 3D-looking bars, buildings or city skylines without a 3D engine.

**How I do it**

1. Isometric projection of grid cell (i, j): x = (i - j) * w, y = (i + j) * w / 2; height lifts a block by subtracting from y.
2. A block is three polygons in the same colour: top as is, left side with a 22% black overlay, right side with 42%, which fakes lighting. Opaque faces plus back-to-front order hide what is behind.
3. Draw back to front (increasing i + j).

**Code** (id `isometric`)

```js
function draw(host, K) {
  const st = K.stage(host, 320, 230, { l: 0, r: 0, t: 0, b: 0 }), w = 22, ox = st.W / 2, oy = 70;
  const cell = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) cell.push([i, j, 14 + 36 * (0.5 + 0.5 * Math.sin(i * 1.3 + j * 0.9)) + (i === 2 && j === 2 ? 30 : 0)]);
  cell.sort((a, b) => a[0] + a[1] - (b[0] + b[1])).forEach(([i, j, h]) => { const x = ox + (i - j) * w, y = oy + (i + j) * w / 2, top = [[x, y - h], [x + w, y + w / 2 - h], [x, y + w - h], [x - w, y + w / 2 - h]], L = [top[3], top[2], [x, y + w], [x - w, y + w / 2]], R = [top[2], top[1], [x + w, y + w / 2], [x, y + w]], c = K.C[(i + j) % 4];
    [[top, 0], [L, 0.22], [R, 0.42]].forEach(([p, shade]) => { const pts = p.map(q => q.join(',')).join(' '); K.el('polygon', { points: pts, fill: c, stroke: 'var(--bg,#fff)', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, st.g); if (shade) K.el('polygon', { points: pts, fill: '#000', 'fill-opacity': shade }, st.g); }); });
}
```

**Combines with:** Block height = data value gives an isometric bar chart over a map grid.

---

## Pixel art from a text map

**Use it when:** Sprites, tiny icons, retro graphics.

**How I do it**

1. Describe the image as an array of strings: one character per pixel, "." for empty.
2. Loop over rows and characters; each non-empty character becomes a square coloured from a small palette object.

**Code** (id `pixelart`)

```js
function draw(host, K) {
  const art = ['..x.....x..', '...x...x...', '..xxxxxxx..', '.xx.xxx.xx.', 'xxxxxxxxxxx', 'x.xxxxxxx.x', 'x.x.....x.x', '...xx.xx...'], st = K.stage(host, 320, 170, { l: 40, r: 40, t: 8, b: 8 }), s = Math.min(st.W / 11, st.H / 8);
  art.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') K.el('rect', { x: i * s, y: j * s, width: s - 1, height: s - 1, fill: j < 2 ? K.C[1] : K.C[2] }, st.g); }));
}
```

**Combines with:** Animate by swapping two frames of the map every half second.

---

## Flat illustration: sunset over hills

**Use it when:** Decorative scenes and hero images.

**How I do it**

1. Paint back to front: sky bands, sun (two circles), distant birds, then three overlapping hill paths from light to dark.
2. Hills are single paths using Q (quadratic) curves closed along the bottom edge.
3. Limit the palette to about eight colours so it reads as one picture.

**Code** (id `sunset`)

```js
function draw(host, K) {
  const svg = K.el('svg', { viewBox: '0 0 680 340', width: '100%', role: 'img' }); host.appendChild(svg);
  svg.innerHTML = '<rect width="680" height="110" fill="#2F2A5E"/><rect y="110" width="680" height="70" fill="#7A4A8C"/><rect y="180" width="680" height="60" fill="#E8704A"/><rect y="240" width="680" height="100" fill="#F5A94A"/><circle cx="340" cy="225" r="60" fill="#FCDE5A"/><circle cx="340" cy="225" r="42" fill="#FFF0A8"/><g fill="#fff"><circle cx="90" cy="40" r="2"/><circle cx="200" cy="70" r="1.5"/><circle cx="430" cy="48" r="2"/><circle cx="560" cy="30" r="1.5"/></g><path d="M0 260Q110 205 230 252Q330 285 440 235Q560 185 680 245V340H0Z" fill="#B5543F"/><path d="M0 295Q140 240 280 290Q400 325 520 275Q610 240 680 280V340H0Z" fill="#7C3A3A"/><path d="M0 325Q160 285 320 325Q470 355 680 310V340H0Z" fill="#3E2540"/>';
}
```

**Combines with:** Use as a background layer behind a chart or title.

---
