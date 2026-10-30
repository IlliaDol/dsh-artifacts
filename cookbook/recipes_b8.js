const clickChanges = (sel) => (host) => { const b = host.querySelector(sel), before = host.innerHTML; b.click(); if (host.innerHTML === before) throw new Error("control did nothing: " + sel); };
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
const RECIPES_B8 = [
// ================================== UI & ART ==================================
{
  id: 'uidash', family: 'ui_art', name: 'UI mockup: study dashboard',
  when: 'Show what a screen could look like before building it.',
  steps: ['Layout with CSS grid: a header row, a row of metric cards (auto-fit columns so it also works on a phone), a list card.',
          'Colours and borders come from CSS variables, so it follows light and dark mode.',
          'Placeholder numbers only; the point is structure.'],
  combine: 'Replace the placeholder numbers with real chart recipes to get a working dashboard (see "Dashboard with shared state").',
  fn(host, K) {
    const root = document.createElement('div'); root.style.cssText = 'background:var(--card,#f4f3ee);border-radius:12px;padding:14px;font-size:13px'; host.appendChild(root);
    const tile = (l, v) => '<div style="background:var(--bg,#fff);border:.5px solid var(--grid,#ddd);border-radius:8px;padding:10px"><div style="opacity:.65;font-size:12px">' + l + '</div><div style="font-size:20px;font-weight:500">' + v + '</div></div>';
    const bar = (l, p, c) => '<div style="padding:8px 0"><div style="display:flex;justify-content:space-between"><span>' + l + '</span><span style="opacity:.65">' + p + '%</span></div><div style="height:6px;border-radius:3px;background:var(--card,#eee);margin-top:5px"><div style="width:' + p + '%;height:100%;border-radius:3px;background:' + c + '"></div></div></div>';
    root.innerHTML = '<div style="font-weight:500;font-size:15px;margin-bottom:10px">Study dashboard</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:10px">' + tile('Streak', '12 days') + tile('Hours this week', '14.5') + tile('Next exam', '9 days') + '</div><div style="background:var(--bg,#fff);border:.5px solid var(--grid,#ddd);border-radius:10px;padding:2px 12px">' + bar('Statistics', 72, K.C[0]) + bar('Linear algebra', 45, K.C[2]) + bar('Programming', 88, K.C[6]) + '</div>';
  },
},
{
  id: 'form', family: 'ui_art', name: 'Form with live validation',
  when: 'Collect input and tell people immediately what is wrong.',
  steps: ['One validator function per field (email shape, password length) returning an error text or an empty string.',
          'On every input event run the validators, show the message under the field and set the submit button\'s disabled flag from "no errors".',
          'Never rely on colour alone: the message text explains the problem.'],
  combine: 'Add a password-strength bar drawn like a progress bar.',
  test: host => { const i = host.querySelector('input'), before = host.innerHTML; i.value = 'not-an-email'; fire(i, 'input'); if (host.innerHTML === before) throw new Error('no validation message'); },
  fn(host, K) {
    const root = document.createElement('div'); root.style.cssText = 'font-size:13px;max-width:320px'; host.appendChild(root);
    root.innerHTML = '<label>Email<br><input type="text" class="em" style="width:100%;padding:7px;box-sizing:border-box"></label><div class="e1" style="color:#c0392b;min-height:18px;font-size:12px"></div><label>Password<br><input type="password" class="pw" style="width:100%;padding:7px;box-sizing:border-box"></label><div class="e2" style="color:#c0392b;min-height:18px;font-size:12px"></div><button class="go" disabled style="margin-top:6px">Create account</button>';
    const em = root.querySelector('.em'), pw = root.querySelector('.pw'), go = root.querySelector('.go');
    const check = () => { const e1 = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value) ? '' : 'Enter a valid email address.', e2 = pw.value.length >= 8 ? '' : 'Use at least 8 characters.'; root.querySelector('.e1').textContent = e1; root.querySelector('.e2').textContent = e2; go.disabled = !!(e1 || e2); };
    em.addEventListener('input', check); pw.addEventListener('input', check);
  },
},
{
  id: 'hero', family: 'ui_art', name: 'Landing page hero + feature cards',
  when: 'The top of a product or project page.',
  steps: ['A centred headline (one sentence), a sub-headline (one sentence), two buttons (primary and secondary).',
          'Three feature cards in an auto-fit grid so they stack on small screens.'],
  combine: 'Publish it as a web page (shareable link) or place real chart recipes inside the cards.',
  fn(host, K) {
    const root = document.createElement('div'); root.style.cssText = 'font-size:13px;text-align:center'; host.appendChild(root);
    root.innerHTML = '<div style="padding:26px 10px;background:linear-gradient(180deg,var(--card,#f4f3ee),transparent);border-radius:12px"><div style="font-size:24px;font-weight:500;margin-bottom:6px">See your data clearly</div><div style="opacity:.7;margin-bottom:14px">Charts, tables and diagrams that explain themselves.</div><button style="background:#2a78d6;color:#fff;border:0;padding:8px 16px;border-radius:8px">Get started</button> <button style="padding:8px 16px;border-radius:8px">See examples</button></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:12px;text-align:left">' + [['Fast', 'Draws in milliseconds'], ['Honest', 'Axes start at zero'], ['Accessible', 'Text alternatives']].map(f => '<div style="background:var(--card,#f4f3ee);border-radius:10px;padding:10px"><b>' + f[0] + '</b><div style="opacity:.7">' + f[1] + '</div></div>').join('') + '</div>';
  },
},
{
  id: 'poster', family: 'ui_art', name: 'Poster composition',
  when: 'A single bold graphic: event poster, title slide, cover.',
  steps: ['Fix a canvas (viewBox 320 x 300) and a palette of 3 to 4 colours.',
          'Build the layout from big simple shapes first (background, circle, bars), then the headline text with the largest size and strongest contrast, then small details (date, place).',
          'Hierarchy: one dominant element, one secondary, the rest quiet.'],
  combine: 'Use the same palette as the charts in the same document so everything looks like one family.',
  fn(host, K) {
    const st = K.stage(host, 320, 300, { l: 0, r: 0, t: 0, b: 0 });
    K.el('rect', { x: 0, y: 0, width: 320, height: 300, fill: '#1b1a3a' }, st.g); K.el('circle', { cx: 230, cy: 90, r: 70, fill: '#eb6834' }, st.g); K.el('circle', { cx: 230, cy: 90, r: 44, fill: '#1b1a3a' }, st.g);
    [0, 1, 2, 3, 4].forEach(i => K.el('rect', { x: 28 + i * 16, y: 200 - [30, 56, 84, 62, 100][i], width: 11, height: [30, 56, 84, 62, 100][i], fill: ['#2a78d6', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'][i] }, st.g));
    K.text(st.g, 26, 244, 'DATA DAY', { 'font-size': 38, fill: '#fff', 'font-weight': 700 }); K.text(st.g, 28, 266, 'Talks, charts and code', { 'font-size': 14, fill: '#cfcde8' }); K.text(st.g, 28, 286, 'Nov 12  ·  TU Dortmund', { 'font-size': 12, fill: '#eda100' });
  },
},
{
  id: 'icons', family: 'ui_art', name: 'Icon set from primitives',
  when: 'Simple consistent icons without an icon font.',
  steps: ['Design on a 24 x 24 grid with one rule set: 2 px stroke, round caps and joins, no fill.',
          'Each icon is a few primitives (circle, rect, line, path); an icon is just a function of (parent, colour).',
          'Place them in a grid with <g transform="translate">.'],
  combine: 'Use the same icons in KPI tiles and navigation.',
  fn(host, K) {
    const star = K.range(0, 9, 10).map((_, i) => K.polar(12, 12.5, i % 2 ? 4.5 : 10, i * Math.PI / 5).join(',')).join(' ');
    const I = [['home', g => { K.el('path', { d: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6' }, g); }], ['search', g => { K.el('circle', { cx: 10, cy: 10, r: 6 }, g); K.el('path', { d: 'M15 15l6 6' }, g); }], ['bell', g => { K.el('path', { d: 'M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0' }, g); }], ['heart', g => { K.el('path', { d: 'M12 20S4 14 4 9a4 4 0 018-1 4 4 0 018 1c0 5-8 11-8 11z' }, g); }], ['star', g => { K.el('polygon', { points: star }, g); }], ['user', g => { K.el('circle', { cx: 12, cy: 8, r: 4 }, g); K.el('path', { d: 'M4 21c0-4 4-6 8-6s8 2 8 6' }, g); }], ['gear', g => { K.el('circle', { cx: 12, cy: 12, r: 3 }, g); K.el('circle', { cx: 12, cy: 12, r: 8, 'stroke-dasharray': '3.2 2.2', 'stroke-width': 4 }, g); }], ['chart', g => { K.el('path', { d: 'M5 20v-8M12 20V5M19 20v-11' }, g); }], ['mail', g => { K.el('rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }, g); K.el('path', { d: 'M3 7l9 6 9-6' }, g); }], ['lock', g => { K.el('rect', { x: 5, y: 11, width: 14, height: 9, rx: 2 }, g); K.el('path', { d: 'M8 11V8a4 4 0 018 0v3' }, g); }], ['camera', g => { K.el('rect', { x: 3, y: 7, width: 18, height: 13, rx: 2 }, g); K.el('circle', { cx: 12, cy: 13, r: 3.5 }, g); K.el('path', { d: 'M8 7l1.5-3h5L16 7' }, g); }], ['play', g => { K.el('circle', { cx: 12, cy: 12, r: 9 }, g); K.el('polygon', { points: '10,8 16,12 10,16' }, g); }]];
    const st = K.stage(host, 320, 190, { l: 14, r: 14, t: 10, b: 6 });
    I.forEach(([n, f], i) => { const g = K.el('g', { transform: `translate(${(i % 4) * 74 + 12},${Math.floor(i / 4) * 58}) scale(1.6)`, fill: 'none', stroke: K.C[i % 8], 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, st.g); f(g); K.text(st.g, (i % 4) * 74 + 31, Math.floor(i / 4) * 58 + 52, n, { 'text-anchor': 'middle', 'font-size': 10 }); });
  },
},
{
  id: 'truchet', family: 'ui_art', name: 'Generative pattern (Truchet tiles)',
  when: 'Backgrounds and patterns from a tiny rule plus randomness.',
  steps: ['Divide the area into square tiles. Each tile gets one of two orientations at random (seeded, so the picture is reproducible).',
          'Orientation 0 draws two quarter-circle arcs around the top-left and bottom-right corners; orientation 1 around the other two. The arcs always meet the neighbours\' arcs at edge midpoints, which creates the flowing lines.'],
  combine: 'Colour the arcs by a data value to make a "data texture".',
  fn(host, K) {
    const r = K.rng(42), st = K.stage(host, 320, 200, { l: 0, r: 0, t: 0, b: 0 }), s = 20, h = s / 2;
    for (let i = 0; i < 16; i++) for (let j = 0; j < 10; j++) { const x = i * s, y = j * s, o = r() < 0.5, d = o ? `M${x + h} ${y}A${h} ${h} 0 0 1 ${x} ${y + h}M${x + h} ${y + s}A${h} ${h} 0 0 1 ${x + s} ${y + h}` : `M${x + h} ${y}A${h} ${h} 0 0 0 ${x + s} ${y + h}M${x + h} ${y + s}A${h} ${h} 0 0 0 ${x} ${y + h}`; K.el('path', { d, fill: 'none', stroke: K.C[(i + j) % 3], 'stroke-width': 3, 'stroke-linecap': 'round' }, st.g); }
  },
},
{
  id: 'flowfield', family: 'ui_art', name: 'Flow field art',
  when: 'Organic, wind-like line art driven by a vector field.',
  steps: ['Define an angle at every point: angle(x, y) = (sin(x * 0.02) + cos(y * 0.025)) * pi.',
          'Start many curves at jittered grid points and take 40 small steps, each in the direction of the local angle.',
          'Draw each trail as a thin semi-transparent path; colour by index.'],
  combine: 'The same loop traces streamlines of a real vector field (physics recipe).',
  fn(host, K) {
    const r = K.rng(5), st = K.stage(host, 320, 200, { l: 0, r: 0, t: 0, b: 0 });
    for (let i = 0; i < 18; i++) for (let j = 0; j < 11; j++) { let x = i * 18 + r() * 10, y = j * 19 + r() * 10; const pts = [[x, y]]; for (let k = 0; k < 40; k++) { const a = (Math.sin(x * 0.02) + Math.cos(y * 0.025)) * Math.PI; x += Math.cos(a) * 3; y += Math.sin(a) * 3; pts.push([x, y]); } K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[(i * 3 + j) % 8], 'stroke-opacity': 0.55, 'stroke-width': 1.3, 'stroke-linecap': 'round' }, st.g); }
  },
},
{
  id: 'mandala', family: 'ui_art', name: 'Mandala (rotational symmetry)',
  when: 'Decorative radial designs.',
  steps: ['Draw ONE petal as a path with two quadratic curves (centre, control point left, tip, control point right, back to centre).',
          'Repeat it n times, each rotated by 360 / n degrees; stack layers with different n, length and colour.'],
  combine: 'Map a data series to petal length to make a radial bar chart with style.',
  fn(host, K) {
    const st = K.stage(host, 320, 230, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2;
    [[16, 104, 0.2, 6], [12, 86, 0.28, 0], [8, 64, 0.4, 1], [6, 40, 0.55, 3]].forEach(([n, len, w, c], l) => { for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, tip = K.polar(cx, cy, len, a), c1 = K.polar(cx, cy, len * 0.55, a - w), c2 = K.polar(cx, cy, len * 0.55, a + w); K.el('path', { d: `M${cx} ${cy}Q${c1} ${tip}Q${c2} ${cx},${cy}Z`, fill: K.C[c], 'fill-opacity': 0.35, stroke: K.C[c] }, st.g); } });
    K.el('circle', { cx, cy, r: 6, fill: K.C[1] }, st.g);
  },
},
{
  id: 'isometric', family: 'ui_art', name: 'Isometric blocks',
  when: '3D-looking bars, buildings or city skylines without a 3D engine.',
  steps: ['Isometric projection of grid cell (i, j): x = (i - j) * w, y = (i + j) * w / 2; height lifts a block by subtracting from y.',
          'A block is three polygons in the same colour: top as is, left side with a 22% black overlay, right side with 42%, which fakes lighting. Opaque faces plus back-to-front order hide what is behind.',
          'Draw back to front (increasing i + j).'],
  combine: 'Block height = data value gives an isometric bar chart over a map grid.',
  fn(host, K) {
    const st = K.stage(host, 320, 230, { l: 0, r: 0, t: 0, b: 0 }), w = 22, ox = st.W / 2, oy = 70;
    const cell = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) cell.push([i, j, 14 + 36 * (0.5 + 0.5 * Math.sin(i * 1.3 + j * 0.9)) + (i === 2 && j === 2 ? 30 : 0)]);
    cell.sort((a, b) => a[0] + a[1] - (b[0] + b[1])).forEach(([i, j, h]) => { const x = ox + (i - j) * w, y = oy + (i + j) * w / 2, top = [[x, y - h], [x + w, y + w / 2 - h], [x, y + w - h], [x - w, y + w / 2 - h]], L = [top[3], top[2], [x, y + w], [x - w, y + w / 2]], R = [top[2], top[1], [x + w, y + w / 2], [x, y + w]], c = K.C[(i + j) % 4];
      [[top, 0], [L, 0.22], [R, 0.42]].forEach(([p, shade]) => { const pts = p.map(q => q.join(',')).join(' '); K.el('polygon', { points: pts, fill: c, stroke: 'var(--bg,#fff)', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, st.g); if (shade) K.el('polygon', { points: pts, fill: '#000', 'fill-opacity': shade }, st.g); }); });
  },
},
{
  id: 'pixelart', family: 'ui_art', name: 'Pixel art from a text map',
  when: 'Sprites, tiny icons, retro graphics.',
  steps: ['Describe the image as an array of strings: one character per pixel, "." for empty.',
          'Loop over rows and characters; each non-empty character becomes a square coloured from a small palette object.'],
  combine: 'Animate by swapping two frames of the map every half second.',
  fn(host, K) {
    const art = ['..x.....x..', '...x...x...', '..xxxxxxx..', '.xx.xxx.xx.', 'xxxxxxxxxxx', 'x.xxxxxxx.x', 'x.x.....x.x', '...xx.xx...'], st = K.stage(host, 320, 170, { l: 40, r: 40, t: 8, b: 8 }), s = Math.min(st.W / 11, st.H / 8);
    art.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') K.el('rect', { x: i * s, y: j * s, width: s - 1, height: s - 1, fill: j < 2 ? K.C[1] : K.C[2] }, st.g); }));
  },
},
{
  id: 'sunset', family: 'ui_art', name: 'Flat illustration: sunset over hills',
  when: 'Decorative scenes and hero images.',
  steps: ['Paint back to front: sky bands, sun (two circles), distant birds, then three overlapping hill paths from light to dark.',
          'Hills are single paths using Q (quadratic) curves closed along the bottom edge.',
          'Limit the palette to about eight colours so it reads as one picture.'],
  combine: 'Use as a background layer behind a chart or title.',
  fn(host, K) {
    const svg = K.el('svg', { viewBox: '0 0 680 340', width: '100%', role: 'img' }); host.appendChild(svg);
    svg.innerHTML = '<rect width="680" height="110" fill="#2F2A5E"/><rect y="110" width="680" height="70" fill="#7A4A8C"/><rect y="180" width="680" height="60" fill="#E8704A"/><rect y="240" width="680" height="100" fill="#F5A94A"/><circle cx="340" cy="225" r="60" fill="#FCDE5A"/><circle cx="340" cy="225" r="42" fill="#FFF0A8"/><g fill="#fff"><circle cx="90" cy="40" r="2"/><circle cx="200" cy="70" r="1.5"/><circle cx="430" cy="48" r="2"/><circle cx="560" cy="30" r="1.5"/></g><path d="M0 260Q110 205 230 252Q330 285 440 235Q560 185 680 245V340H0Z" fill="#B5543F"/><path d="M0 295Q140 240 280 290Q400 325 520 275Q610 240 680 280V340H0Z" fill="#7C3A3A"/><path d="M0 325Q160 285 320 325Q470 355 680 310V340H0Z" fill="#3E2540"/>';
  },
},

// ============================== MORE COMBINATIONS ==============================
{
  id: 'combo-dashboard', family: 'combining', name: 'Dashboard with shared state (KPIs + chart + table)',
  when: 'Several views of the same data that must always agree.',
  steps: ['ONE data array and ONE state object ({ region }). Every view is a function render(rows) of the filtered rows.',
          'A select changes the state and calls update(), which recomputes the filtered rows once and re-renders the KPI tiles, the bar chart and the table from them.',
          'Because all three read the same rows, a number in a tile can never differ from the chart.'],
  combine: 'This is the general recipe for dashboards: add a view = add one render function.',
  test: host => { const s = host.querySelector('select'), before = host.innerHTML; s.value = 'North'; fire(s, 'change'); if (host.innerHTML === before) throw new Error('filter did nothing'); },
  fn(host, K) {
    const regions = ['North', 'South', 'East'], r = K.rng(2), rows = []; for (let m = 1; m <= 6; m++) regions.forEach((g, gi) => rows.push({ g, m, v: Math.round(40 + gi * 15 + m * 6 + r() * 20) }));
    const S = { g: 'All' }, root = document.createElement('div'); root.style.fontSize = '13px'; host.appendChild(root);
    root.innerHTML = '<div style="margin-bottom:8px">Region <select><option>All</option>' + regions.map(x => '<option>' + x + '</option>').join('') + '</select></div><div class="kp" style="display:flex;gap:8px;margin-bottom:8px"></div><div class="ch"></div><div class="tb"></div>';
    const update = () => { const f = rows.filter(q => S.g === 'All' || q.g === S.g), tot = K.sum(f.map(q => q.v)), by = [1, 2, 3, 4, 5, 6].map(m => K.sum(f.filter(q => q.m === m).map(q => q.v)));
      root.querySelector('.kp').innerHTML = [['Total', tot], ['Best month', 'M' + (by.indexOf(Math.max(...by)) + 1)], ['Average', Math.round(tot / by.length)]].map(([l, v]) => '<div style="flex:1;background:var(--card,#f4f3ee);border-radius:8px;padding:8px"><div style="opacity:.65;font-size:12px">' + l + '</div><b style="font-size:18px">' + v + '</b></div>').join('');
      const c = root.querySelector('.ch'); c.innerHTML = ''; const st = K.stage(c, 320, 130, { l: 34, t: 4, b: 20 }), x = K.band([1, 2, 3, 4, 5, 6], 0, st.W, 0.3), y = K.linear(0, Math.max(...by, 1) * 1.1, st.H, 0); K.axisY(st, y, 3, v => Math.round(v)); by.forEach((v, i) => K.el('rect', { x: x(i + 1), y: y(v), width: x.bw, height: st.H - y(v), fill: K.C[0], rx: 3 }, st.g)); K.axisBand(st, x, [1, 2, 3, 4, 5, 6]);
      root.querySelector('.tb').innerHTML = '<table style="width:100%;border-collapse:collapse;margin-top:6px">' + f.slice().sort((a, b) => b.v - a.v).slice(0, 3).map(q => '<tr><td style="padding:3px">' + q.g + ' M' + q.m + '</td><td style="text-align:right">' + q.v + '</td></tr>').join('') + '</table>'; };
    root.querySelector('select').addEventListener('change', e => { S.g = e.target.value; update(); }); update();
  },
},
{
  id: 'combo-annotated', family: 'combining', name: 'Annotated line chart (event band + callout)',
  when: 'Tell the story: what happened when.',
  steps: ['Draw the data layer first (line).',
          'Add an annotation layer in the SAME coordinates: a shaded rect for a period (x from the start month to the end month), a vertical dashed rule for an event, and a callout (leader line + text) at the peak.',
          'Annotations go behind the line (band) or beside it (callout) so they never hide data.'],
  combine: 'Any chart can take this layer: it is just extra marks that use the chart\'s scales.',
  fn(host, K) {
    const n = 24, s = K.series(3, n, 50, 0.9, 10, 3), st = K.stage(host, 320, 220, { r: 14 }), x = K.linear(0, n - 1, 0, st.W), y = K.linear(30, 100, st.H, 0), pk = s.indexOf(Math.max(...s));
    K.axisY(st, y, 4); [0, 6, 12, 18, 23].forEach(i => K.text(st.g, x(i), st.H + 16, 'M' + (i + 1), { 'text-anchor': 'middle' }));
    K.el('rect', { x: x(9), y: 0, width: x(14) - x(9), height: st.H, fill: K.C[3], 'fill-opacity': 0.18 }, st.g); K.text(st.g, x(9) + 3, 12, 'campaign');
    K.el('line', { x1: x(17), x2: x(17), y1: 0, y2: st.H, stroke: K.C[7], 'stroke-dasharray': '4 3' }, st.g); K.text(st.g, x(17) + 3, 24, 'price change', { fill: K.C[7] });
    K.el('path', { d: K.path(s.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g);
    K.el('circle', { cx: x(pk), cy: y(s[pk]), r: 4, fill: K.C[1] }, st.g); K.el('line', { x1: x(pk), y1: y(s[pk]), x2: x(pk) - 26, y2: y(s[pk]) - 22, stroke: K.C[1] }, st.g); K.text(st.g, x(pk) - 28, y(s[pk]) - 26, 'peak ' + s[pk].toFixed(0), { 'text-anchor': 'end', fill: K.C[1], 'font-weight': 500 });
  },
},
{
  id: 'combo-tilebar', family: 'combining', name: 'Linked map + bar chart (click to select)',
  when: 'Geography and ranking together, each explaining the other.',
  steps: ['One state: the set of selected regions. Both views are redrawn from (values, selection).',
          'Clicking a tile or a bar toggles that region in the set; selected regions are orange in BOTH views, others blue.',
          'The two views share the colour logic through one function: colourOf(region).'],
  combine: 'Use a real choropleth instead of tiles, or add a table.',
  test: host => { const t = host.querySelector('rect[data-k]'), before = host.innerHTML; fire(t, 'click'); if (host.innerHTML === before) throw new Error('selection did nothing'); },
  fn(host, K) {
    const T = { SH: [1, 0, 41], HH: [2, 0, 77], MV: [3, 0, 22], NI: [1, 1, 36], ST: [2, 1, 28], BE: [3, 1, 90], BB: [4, 1, 31], HB: [0, 1, 70], NW: [0, 2, 62], HE: [1, 2, 55], TH: [2, 2, 25], SN: [3, 2, 40] }, sel = new Set(), root = document.createElement('div'); host.appendChild(root);
    const col = k => sel.has(k) ? K.C[1] : K.C[0], keys = Object.keys(T);
    const draw = () => { root.innerHTML = ''; const a = K.stage(root, 320, 120, { l: 10, r: 10, t: 4, b: 4 }), c = 30; keys.forEach(k => { const [x, y, v] = T[k], r = K.el('rect', { 'data-k': k, x: x * (c + 3) + 30, y: y * (c + 3), width: c, height: c, rx: 5, fill: col(k), 'fill-opacity': 0.4 + 0.6 * v / 100, cursor: 'pointer' }, a.g); r.addEventListener('click', () => { sel.has(k) ? sel.delete(k) : sel.add(k); draw(); }); K.text(a.g, x * (c + 3) + 30 + c / 2, y * (c + 3) + c / 2 + 4, k, { 'text-anchor': 'middle', fill: '#fff', 'font-size': 10 }); });
      const b = K.stage(root, 320, 120, { l: 10, r: 10, t: 6, b: 22 }), s = keys.slice().sort((p, q) => T[q][2] - T[p][2]), x = K.band(s, 0, b.W, 0.2), y = K.linear(0, 100, b.H, 0); s.forEach(k => { const r = K.el('rect', { x: x(k), y: y(T[k][2]), width: x.bw, height: b.H - y(T[k][2]), fill: col(k), rx: 2, cursor: 'pointer' }, b.g); r.addEventListener('click', () => { sel.has(k) ? sel.delete(k) : sel.add(k); draw(); }); K.text(b.g, x(k) + x.bw / 2, b.H + 12, k, { 'text-anchor': 'middle', 'font-size': 9 }); }); };
    draw();
  },
},
{
  id: 'combo-tablechart', family: 'combining', name: 'Sortable table + bar chart that stay in sync',
  when: 'Readers want both the exact numbers and the picture, ordered the same way.',
  steps: ['One array of rows and one sort state. A single draw() sorts a copy of the rows and builds BOTH the table and the bars from that sorted copy.',
          'Clicking a header changes the state and calls draw(), so the two always have the same order.'],
  combine: 'Add a filter input (see Searchable list) to the same draw().',
  test: host => { const th = host.querySelectorAll('th')[1], before = host.querySelector('td').textContent; th.click(); if (host.querySelector('td').textContent === before) throw new Error('sort did nothing'); },
  fn(host, K) {
    const rows = [['Python', 68], ['SQL', 57], ['R', 41], ['Java', 29], ['Julia', 12]], S = { c: 0, d: 1 }, root = document.createElement('div'); host.appendChild(root);
    const draw = () => { const d = rows.slice().sort((a, b) => (a[S.c] > b[S.c] ? 1 : -1) * S.d); root.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px"><tr>' + ['Language', 'Users'].map(h => '<th style="cursor:pointer;text-align:left;padding:4px">' + h + '</th>').join('') + '</tr>' + d.map(r => '<tr><td style="padding:4px">' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table><div class="c"></div>'; root.querySelectorAll('th').forEach((th, i) => th.addEventListener('click', () => { S.d = S.c === i ? -S.d : 1; S.c = i; draw(); })); const st = K.stage(root.querySelector('.c'), 320, 120, { l: 50, t: 4, b: 4 }), y = K.band(d.map(r => r[0]), 0, st.H, 0.25), x = K.linear(0, 80, 0, st.W); d.forEach(r => { K.el('rect', { x: 0, y: y(r[0]), width: x(r[1]), height: y.bw, fill: K.C[0], rx: 2 }, st.g); K.text(st.g, -6, y(r[0]) + y.bw / 2 + 4, r[0], { 'text-anchor': 'end' }); }); }; draw();
  },
},
{
  id: 'combo-sparkgrid', family: 'combining', name: 'Small multiples of lines with a shared scale',
  when: 'Compare many time series at a glance.',
  steps: ['Compute the y range ONCE over all series (shared scale) so a taller line really means a bigger value.',
          'Lay panels on a grid; each panel is the same line-chart code with its own title and a dot on the last value.'],
  combine: 'Highlight the panel that deviates most, or sort panels by slope.',
  fn(host, K) {
    const names = ['North', 'South', 'East', 'West', 'Centre', 'Coast'], S = names.map((_, i) => K.series(i + 1, 24, 40 + i * 4, 0.3 + i * 0.12, 6, 2.5)), lo = Math.min(...S.map(s => Math.min(...s))), hi = Math.max(...S.map(s => Math.max(...s)));
    const st = K.stage(host, 320, 190, { l: 6, r: 6, t: 6, b: 6 }), pw = 98, ph = 80, x = K.linear(0, 23, 0, pw - 8), y = K.linear(lo, hi, ph - 26, 0);
    S.forEach((s, i) => { const g = K.el('g', { transform: `translate(${(i % 3) * (pw + 6)},${Math.floor(i / 3) * (ph + 10)})` }, st.g); K.text(g, 0, 10, names[i], { fill: 'var(--text,#333)', 'font-weight': 500 }); const p = K.el('g', { transform: 'translate(0,18)' }, g); K.el('line', { x1: 0, x2: pw - 8, y1: ph - 26, y2: ph - 26, stroke: 'var(--axis,#c3c2b7)' }, p); K.el('path', { d: K.path(s.map((v, k) => [x(k), y(v)])), fill: 'none', stroke: K.C[i], 'stroke-width': 1.8 }, p); K.el('circle', { cx: x(23), cy: y(s[23]), r: 3, fill: K.C[i] }, p); });
  },
},
];
if (typeof module !== 'undefined') module.exports = RECIPES_B8; else window.RECIPES_B8 = RECIPES_B8;
