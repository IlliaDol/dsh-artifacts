const clickChanges = (sel) => (host) => { const b = host.querySelector(sel), before = host.innerHTML; b.click(); if (host.innerHTML === before) throw new Error("control did nothing: " + sel); };
const slideChanges = (host, v) => { const i = host.querySelector("input[type=range]"), before = host.innerHTML; i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); if (host.innerHTML === before) throw new Error("slider did nothing"); };
const typeInto = (host, sel, v) => { const i = host.querySelector(sel), before = host.innerHTML; i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); if (host.innerHTML === before) throw new Error('input did nothing: ' + sel); };
/* Tiny helpers shared by the diagram recipes: boxes, arrows, trimming an arrow to a box edge. */
const D = {
  defs: (K, parent) => { const d = K.el('defs', {}, parent), m = K.el('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, d); K.el('path', { d: 'M2 1L8 5L2 9', fill: 'none', stroke: 'context-stroke', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, m); },
  trim: (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, t = Math.min(a.w / 2 / (Math.abs(dx) || 1e-9), a.h / 2 / (Math.abs(dy) || 1e-9)), u = Math.min(b.w / 2 / (Math.abs(dx) || 1e-9), b.h / 2 / (Math.abs(dy) || 1e-9)); return [a.x + dx * t, a.y + dy * t, b.x - dx * u, b.y - dy * u]; },
  node: (K, g, n, col) => { if (n.type === 'diamond') K.el('polygon', { points: `${n.x},${n.y - n.h / 2} ${n.x + n.w / 2},${n.y} ${n.x},${n.y + n.h / 2} ${n.x - n.w / 2},${n.y}`, fill: 'var(--card,#f4f3ee)', stroke: col }, g); else K.el('rect', { x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: n.type === 'pill' ? n.h / 2 : 7, fill: 'var(--card,#f4f3ee)', stroke: col }, g); K.text(g, n.x, n.y + 4, n.label, { 'text-anchor': 'middle', fill: 'var(--text,#222)' }); },
};
const RECIPES_B7 = [
// =============================== SOFTWARE DIAGRAMS ===============================
{
  id: 'flowchart', family: 'diagrams', name: 'Flowchart (data-driven)',
  when: 'A process with decisions.',
  steps: ['Describe the chart as DATA: nodes (id, position, size, shape, label) and edges (from, to, optional label).',
          'One generic renderer draws every node (pill, box, diamond) and every edge: the straight line between the two centres is trimmed to the box borders (D.trim) and given an arrowhead from an SVG <marker>.',
          'To change the chart you edit the data, never the drawing code. (Mermaid does the layout for you from text; here layout is explicit.)'],
  combine: 'Add counts on the edges to turn it into a Sankey-like flow; colour nodes by status.',
  fn(host, K) {
    const N = { s: { x: 160, y: 24, w: 80, h: 28, type: 'pill', label: 'Start' }, l: { x: 160, y: 74, w: 110, h: 30, label: 'Load data' }, q: { x: 160, y: 130, w: 130, h: 46, type: 'diamond', label: 'Missing values?' }, i: { x: 270, y: 130, w: 80, h: 30, label: 'Impute' }, t: { x: 160, y: 186, w: 110, h: 30, label: 'Train model' }, e: { x: 160, y: 232, w: 80, h: 28, type: 'pill', label: 'End' } };
    Object.values(N).forEach(n => { n.type = n.type || 'box'; });
    const E = [['s', 'l'], ['l', 'q'], ['q', 'i', 'yes'], ['q', 't', 'no'], ['i', 't'], ['t', 'e']], st = K.stage(host, 320, 260, { l: 0, r: 0, t: 0, b: 0 }); D.defs(K, st.g);
    E.forEach(([a, b, lab]) => { const [x1, y1, x2, y2] = D.trim(N[a], N[b]); K.el('line', { x1, y1, x2, y2, stroke: 'var(--text,#555)', 'stroke-width': 1.4, 'marker-end': 'url(#ah)' }, st.g); if (lab) K.text(st.g, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 4, lab); });
    Object.values(N).forEach((n, i) => D.node(K, st.g, n, K.C[n.type === 'diamond' ? 1 : n.type === 'pill' ? 2 : 0]));
  },
},
{
  id: 'sequence', family: 'diagrams', name: 'Sequence diagram',
  when: 'Who calls whom, in what order (API flows, protocols).',
  steps: ['One column per participant with a dashed lifeline. Time runs downwards.',
          'Messages are a list [from, to, label, isReturn]; message i is drawn at y = top + i * step as a horizontal arrow between the two lifelines with its label above.',
          'Return messages are dashed.'],
  combine: 'Mermaid draws the same from text: sequenceDiagram.',
  fn(host, K) {
    const P = ['User', 'App', 'API', 'DB'], M = [['User', 'App', 'click search'], ['App', 'API', 'GET /items'], ['API', 'DB', 'SELECT ...'], ['DB', 'API', 'rows', 1], ['API', 'App', '200 JSON', 1], ['App', 'User', 'render list', 1]];
    const st = K.stage(host, 320, 240, { l: 6, r: 6, t: 6, b: 4 }), x = K.band(P, 0, st.W, 0.5); D.defs(K, st.g);
    P.forEach(p => { const cx = x(p) + x.bw / 2; K.el('rect', { x: x(p) - 4, y: 0, width: x.bw + 8, height: 24, rx: 5, fill: K.C[0], 'fill-opacity': 0.15, stroke: K.C[0] }, st.g); K.text(st.g, cx, 16, p, { 'text-anchor': 'middle', fill: 'var(--text,#222)' }); K.el('line', { x1: cx, x2: cx, y1: 24, y2: st.H, stroke: 'var(--axis,#c3c2b7)', 'stroke-dasharray': '4 4' }, st.g); });
    M.forEach(([a, b, t, ret], i) => { const y = 54 + i * 30, xa = x(a) + x.bw / 2, xb = x(b) + x.bw / 2; K.el('line', { x1: xa, x2: xb + (xb > xa ? -2 : 2), y1: y, y2: y, stroke: 'var(--text,#555)', 'stroke-dasharray': ret ? '5 3' : '', 'marker-end': 'url(#ah)' }, st.g); K.text(st.g, (xa + xb) / 2, y - 5, t, { 'text-anchor': 'middle' }); });
  },
},
{
  id: 'classdiagram', family: 'diagrams', name: 'Class diagram',
  when: 'Object-oriented design: classes, fields, methods and inheritance.',
  steps: ['Each class is a box in three compartments (name, fields, methods) separated by lines; the height comes from the number of rows.',
          'Inheritance is a line to the parent with a hollow triangle at the parent end.'],
  combine: 'Mermaid: classDiagram.',
  fn(host, K) {
    const st = K.stage(host, 320, 230, { l: 6, r: 6, t: 6, b: 6 }), cls = (x, y, w, name, f, m, col) => { const rh = 15, h = 20 + (f.length + m.length) * rh + 8; K.el('rect', { x, y, width: w, height: h, rx: 4, fill: 'var(--card,#f4f3ee)', stroke: col }, st.g); K.el('rect', { x, y, width: w, height: 20, rx: 4, fill: col, 'fill-opacity': 0.3 }, st.g); K.text(st.g, x + w / 2, y + 14, name, { 'text-anchor': 'middle', 'font-weight': 500, fill: 'var(--text,#222)' }); K.el('line', { x1: x, x2: x + w, y1: y + 20 + f.length * rh + 4, y2: y + 20 + f.length * rh + 4, stroke: col }, st.g); f.forEach((t, i) => K.text(st.g, x + 6, y + 33 + i * rh, t, { fill: 'var(--text,#333)' })); m.forEach((t, i) => K.text(st.g, x + 6, y + 37 + (f.length + i) * rh, t, { fill: 'var(--text,#333)' })); return h; };
    cls(80, 4, 160, 'Model', ['+name: str'], ['+fit(X, y)', '+predict(X)'], K.C[0]);
    cls(10, 140, 130, 'LinearReg', ['+coef: array'], ['+fit(X, y)'], K.C[1]); cls(180, 140, 130, 'TreeModel', ['+depth: int'], ['+fit(X, y)'], K.C[2]);
    [[75, 140], [245, 140]].forEach(([x, y]) => { K.el('line', { x1: x, y1: y, x2: x, y2: 108, stroke: 'var(--text,#555)' }, st.g); K.el('line', { x1: x, y1: 108, x2: 160, y2: 108, stroke: 'var(--text,#555)' }, st.g); });
    K.el('line', { x1: 160, y1: 108, x2: 160, y2: 98, stroke: 'var(--text,#555)' }, st.g); K.el('polygon', { points: '160,86 152,100 168,100', fill: 'var(--bg,#fff)', stroke: 'var(--text,#555)' }, st.g);
  },
},
{
  id: 'statemachine', family: 'diagrams', name: 'State machine',
  when: 'Something that is in exactly one state and moves on events (orders, connections, UI).',
  steps: ['States are rounded boxes (data: id, position); transitions are [from, to, label] edges.',
          'Reuse the flowchart renderer, add a filled start dot and a double-ring end state.'],
  combine: 'Highlight the current state and drive it from buttons (state machine + interactive).',
  fn(host, K) {
    const N = { d: { x: 44, y: 60, w: 72, h: 32, label: 'Draft' }, r: { x: 160, y: 60, w: 72, h: 32, label: 'Review' }, a: { x: 276, y: 60, w: 72, h: 32, label: 'Approved' }, x: { x: 160, y: 150, w: 72, h: 32, label: 'Rejected' } };
    Object.values(N).forEach(n => { n.type = 'pill'; });
    const E = [['d', 'r', 'submit'], ['r', 'a', 'approve'], ['r', 'x', 'reject'], ['x', 'd', 'revise']], st = K.stage(host, 320, 200, { l: 0, r: 0, t: 0, b: 0 }); D.defs(K, st.g);
    K.el('circle', { cx: 12, cy: 24, r: 5, fill: 'var(--text,#333)' }, st.g); K.el('line', { x1: 14, y1: 28, x2: 40, y2: 48, stroke: 'var(--text,#555)', 'marker-end': 'url(#ah)' }, st.g);
    E.forEach(([a, b, lab]) => { const [x1, y1, x2, y2] = D.trim(N[a], N[b]); K.el('line', { x1, y1, x2, y2, stroke: 'var(--text,#555)', 'marker-end': 'url(#ah)' }, st.g); K.text(st.g, (x1 + x2) / 2 + (a === 'x' ? -34 : 0), (y1 + y2) / 2 - (a === 'x' ? 0 : 6), lab, { 'text-anchor': 'middle' }); });
    Object.values(N).forEach((n, i) => D.node(K, st.g, n, K.C[i % 4]));
    K.el('circle', { cx: 270, cy: 60, r: 21, fill: 'none', stroke: K.C[2], 'stroke-width': 0 }, st.g);
  },
},
{
  id: 'swimlane', family: 'diagrams', name: 'Swimlane (cross-functional) diagram',
  when: 'A process that passes between people or teams.',
  steps: ['One horizontal lane per actor (band scale on y); steps are boxes placed in the lane of the actor who performs them, left to right in time order.',
          'Arrows connect consecutive steps; a vertical segment means a hand-off.'],
  combine: 'Add durations to the boxes to see where time is lost.',
  fn(host, K) {
    const lanes = ['Customer', 'Support', 'Engineering'], steps = [['Report bug', 0], ['Triage', 1], ['Fix', 2], ['Review', 2], ['Notify', 1], ['Confirm', 0]];
    const st = K.stage(host, 320, 210, { l: 80, r: 6, t: 4, b: 4 }), y = K.band(lanes, 0, st.H, 0.06), bw = 40, step = (st.W - bw) / (steps.length - 1); D.defs(K, st.g);
    lanes.forEach((l, i) => { K.el('rect', { x: 0, y: y(l), width: st.W, height: y.bw, fill: i % 2 ? 'var(--card,#f4f3ee)' : 'none', stroke: 'var(--grid,#e1e0d9)' }, st.g); K.text(st.g, -6, y(l) + y.bw / 2 + 4, l, { 'text-anchor': 'end', fill: 'var(--text,#333)' }); });
    const P = steps.map(([t, l], i) => ({ x: bw / 2 + i * step, y: y(lanes[l]) + y.bw / 2, w: bw, h: 30, label: t }));
    P.slice(1).forEach((b, i) => { const a = P[i]; K.el('path', { d: `M${a.x + bw / 2} ${a.y}H${(a.x + bw / 2 + b.x - bw / 2) / 2}V${b.y}L${b.x - bw / 2} ${b.y}`, fill: 'none', stroke: 'var(--text,#555)', 'marker-end': 'url(#ah)' }, st.g); });
    P.forEach((p, i) => { K.el('rect', { x: p.x - bw / 2, y: p.y - 15, width: bw, height: 30, rx: 5, fill: K.C[steps[i][1]], 'fill-opacity': 0.85 }, st.g); K.text(st.g, p.x, p.y + 3, p.label.split(' ')[0], { 'text-anchor': 'middle', fill: '#fff', 'font-size': 9 }); });
  },
},
{
  id: 'decisiontree', family: 'diagrams', name: 'Decision tree (classifier)',
  when: 'Explain how a tree model reaches a decision.',
  steps: ['Tree data: internal nodes hold a question, leaves hold a class. K.tree gives positions (depth = row, slot = column).',
          'Edges are labelled yes / no; leaves are coloured by class so the reader can see which regions are pure.'],
  combine: 'Draw the same tree\'s splits as lines on a scatter plot (decision boundary recipe).',
  fn(host, K) {
    const t = { q: 'hours > 5?', children: [{ q: 'prior > 60?', children: [{ leaf: 'fail' }, { leaf: 'pass' }] }, { q: 'sleep > 6?', children: [{ leaf: 'pass' }, { leaf: 'pass' }] }] };
    const L = K.tree(t), st = K.stage(host, 320, 220, { l: 10, r: 10, t: 10, b: 10 }), x = K.linear(0, L.leaves - 1, 40, st.W - 40), y = d => d * 76 + 14; D.defs(K, st.g);
    L.nodes.forEach(n => (n.children || []).forEach((c, i) => { K.el('line', { x1: x(n._x), y1: y(n._d) + 14, x2: x(c._x), y2: y(c._d) - 14, stroke: 'var(--text,#555)', 'marker-end': 'url(#ah)' }, st.g); K.text(st.g, (x(n._x) + x(c._x)) / 2 + (i ? 8 : -8), (y(n._d) + y(c._d)) / 2, i ? 'no' : 'yes', { 'text-anchor': i ? 'start' : 'end' }); }));
    L.nodes.forEach(n => { const leaf = !!n.leaf; K.el('rect', { x: x(n._x) - (leaf ? 30 : 38), y: y(n._d) - 14, width: leaf ? 60 : 76, height: 28, rx: leaf ? 14 : 6, fill: leaf ? (n.leaf === 'pass' ? K.C[2] : K.C[7]) : 'var(--card,#f4f3ee)', 'fill-opacity': leaf ? 0.85 : 1, stroke: leaf ? 'none' : K.C[0] }, st.g); K.text(st.g, x(n._x), y(n._d) + 4, n.q || n.leaf, { 'text-anchor': 'middle', fill: leaf ? '#fff' : 'var(--text,#222)' }); });
  },
},
{
  id: 'topology', family: 'diagrams', name: 'Network topology diagram',
  when: 'How devices and services are wired together.',
  steps: ['Hub-and-spoke layout: the router in the centre, switches on a ring around it, end devices on a larger ring around their switch.',
          'Positions come from K.polar. Use different shapes (circle, square, hexagon) to tell device types apart, with a legend.'],
  combine: 'Colour links by load to overlay data on the topology.',
  fn(host, K) {
    const st = K.stage(host, 320, 240, { l: 4, r: 4, t: 4, b: 18 }), cx = st.W / 2, cy = st.H / 2;
    const sw = [0, 1, 2].map(i => K.polar(cx, cy, 62, i * 2 * Math.PI / 3 + 0.5));
    sw.forEach((p, i) => { K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--axis,#b4b2a9)', 'stroke-width': 2 }, st.g); for (let j = 0; j < 3; j++) { const q = K.polar(p[0], p[1], 38, i * 2 * Math.PI / 3 + 0.5 + (j - 1) * 0.7); K.el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: 'var(--axis,#b4b2a9)' }, st.g); K.el('circle', { cx: q[0], cy: q[1], r: 5, fill: K.C[2] }, st.g); } });
    sw.forEach(p => K.el('rect', { x: p[0] - 9, y: p[1] - 9, width: 18, height: 18, rx: 3, fill: K.C[0] }, st.g));
    K.el('polygon', { points: K.range(0, 5, 6).map(i => K.polar(cx, cy, 15, i * Math.PI / 3).join(',')).join(' '), fill: K.C[1] }, st.g);
    K.legend(st.g, [['router', K.C[1]], ['switch', K.C[0]], ['device', K.C[2]]], 40, st.H + 4, 80);
  },
},
{
  id: 'gitgraph', family: 'diagrams', name: 'Git branch graph',
  when: 'Explain branching and merging.',
  steps: ['Each branch is a horizontal lane (y). Each commit is a circle at (x = commit index, y = its lane).',
          'Branching: a curve from a commit on the parent lane to the first commit of the new lane; merging: a curve back. Lane colour identifies the branch.'],
  combine: 'Annotate commits with tags or CI status.',
  fn(host, K) {
    const st = K.stage(host, 320, 150, { l: 50, r: 10, t: 14, b: 10 }), x = i => 10 + i * 34, y = l => 14 + l * 44, lanes = ['main', 'feature', 'hotfix'];
    const C = [[0, 0], [1, 0], [2, 1], [3, 1], [4, 0], [5, 2], [6, 0], [7, 0]], link = (a, b) => K.el('path', { d: `M${x(C[a][0])} ${y(C[a][1])}C${(x(C[a][0]) + x(C[b][0])) / 2} ${y(C[a][1])} ${(x(C[a][0]) + x(C[b][0])) / 2} ${y(C[b][1])} ${x(C[b][0])} ${y(C[b][1])}`, fill: 'none', stroke: K.C[Math.max(C[a][1], C[b][1])], 'stroke-width': 3 }, st.g);
    [[0, 1], [1, 2], [2, 3], [3, 4], [1, 4], [4, 5], [5, 6], [4, 6], [6, 7]].forEach(([a, b]) => link(a, b));
    C.forEach(([i, l]) => K.el('circle', { cx: x(i), cy: y(l), r: 6, fill: 'var(--bg,#fff)', stroke: K.C[l], 'stroke-width': 3 }, st.g)); lanes.forEach((n, l) => K.text(st.g, -8, y(l) + 4, n, { 'text-anchor': 'end', fill: K.C[l] }));
  },
},
{
  id: 'architecture', family: 'diagrams', name: 'Layered architecture diagram',
  when: 'High-level structure of a system (UI, services, data).',
  steps: ['Three full-width layers stacked top to bottom (band scale); each holds component boxes laid out evenly.',
          'Vertical arrows show allowed calls (top layer calls the layer below).'],
  combine: 'Overlay latency or error rate per component.',
  fn(host, K) {
    const L = [['Frontend', ['Web app', 'Mobile']], ['Services', ['Auth', 'Search', 'Billing']], ['Data', ['Postgres', 'Cache']]];
    const st = K.stage(host, 320, 230, { l: 4, r: 4, t: 4, b: 4 }), y = K.band(L.map(r => r[0]), 0, st.H, 0.22); D.defs(K, st.g);
    L.forEach(([nm, comps], i) => { K.el('rect', { x: 0, y: y(nm), width: st.W, height: y.bw, rx: 8, fill: K.C[i], 'fill-opacity': 0.12, stroke: K.C[i] }, st.g); K.text(st.g, 8, y(nm) + 14, nm, { fill: K.C[i], 'font-weight': 500 }); const w = (st.W - 20 - (comps.length - 1) * 10) / comps.length; comps.forEach((c, j) => { K.el('rect', { x: 10 + j * (w + 10), y: y(nm) + 24, width: w, height: y.bw - 32, rx: 5, fill: 'var(--bg,#fff)', stroke: K.C[i] }, st.g); K.text(st.g, 10 + j * (w + 10) + w / 2, y(nm) + 24 + (y.bw - 32) / 2 + 4, c, { 'text-anchor': 'middle', fill: 'var(--text,#222)' }); }); if (i < 2) K.el('line', { x1: st.W / 2, y1: y(nm) + y.bw, x2: st.W / 2, y2: y(L[i + 1][0]), stroke: 'var(--text,#555)', 'stroke-width': 1.6, 'marker-end': 'url(#ah)' }, st.g); });
  },
},
{
  id: 'kanban', family: 'diagrams', name: 'Kanban board (HTML)',
  when: 'Work items by status.',
  steps: ['Data: columns with a list of cards. HTML grid: one flex column per status.',
          'A button on each card moves it to the next column (state change, redraw).'],
  combine: 'Count per column feeds a cumulative-flow chart.',
  test: host => { const before = host.innerHTML; host.querySelector('button').click(); if (host.innerHTML === before) throw new Error('kanban move did nothing'); },
  fn(host, K) {
    const cols = [['To do', ['Clean data', 'Plot ROC']], ['Doing', ['Train model']], ['Done', ['Load CSV']]], root = document.createElement('div'); host.appendChild(root);
    const draw = () => { root.innerHTML = ''; root.style.cssText = 'display:flex;gap:8px;font-size:12px'; cols.forEach(([name, cards], ci) => { const c = document.createElement('div'); c.style.cssText = 'flex:1;background:var(--card,#f4f3ee);border-radius:8px;padding:8px;min-height:110px'; c.innerHTML = '<b>' + name + ' (' + cards.length + ')</b>'; cards.forEach((t, i) => { const k = document.createElement('div'); k.style.cssText = 'background:var(--bg,#fff);border:.5px solid var(--grid,#ddd);border-radius:6px;padding:6px;margin-top:6px;display:flex;justify-content:space-between;gap:4px'; k.innerHTML = '<span>' + t + '</span>'; if (ci < cols.length - 1) { const b = document.createElement('button'); b.textContent = '→'; b.style.cssText = 'padding:0 6px;font-size:12px'; b.addEventListener('click', () => { cols[ci + 1][1].push(cols[ci][1].splice(i, 1)[0]); draw(); }); k.appendChild(b); } c.appendChild(k); }); root.appendChild(c); }); };
    draw();
  },
},

// =============================== TABLES, TEXT & DASHBOARDS ===============================
{
  id: 'sorttable', family: 'tables', name: 'Sortable table',
  when: 'Rows the reader wants to rank by different columns.',
  steps: ['Keep the data in an array of row objects and a state { column, direction }.',
          'Clicking a header sets the state and sorts a COPY of the array (numbers numerically, text alphabetically); then the whole <tbody> is rebuilt.',
          'Align numbers right, text left; show an arrow on the sorted column.'],
  combine: 'Feed the same sorted array to a chart (table and chart can never disagree).',
  test: host => { const th = host.querySelectorAll('th')[1], before = host.querySelector('tbody tr td').textContent; th.click(); if (host.querySelector('tbody tr td').textContent === before) throw new Error('sort did nothing'); },
  fn(host, K) {
    const rows = [{ name: 'Python', users: 68, growth: 12 }, { name: 'SQL', users: 57, growth: 4 }, { name: 'R', users: 41, growth: -3 }, { name: 'Java', users: 29, growth: -6 }, { name: 'Julia', users: 12, growth: 19 }], cols = ['name', 'users', 'growth'], S = { c: 'name', d: 1 };
    const t = document.createElement('table'); t.style.cssText = 'border-collapse:collapse;width:100%;font-size:13px'; host.appendChild(t);
    const draw = () => { const data = rows.slice().sort((a, b) => (a[S.c] > b[S.c] ? 1 : -1) * S.d); t.innerHTML = '<thead><tr>' + cols.map(c => '<th style="cursor:pointer;text-align:' + (c === 'name' ? 'left' : 'right') + ';border-bottom:1px solid var(--axis,#aaa);padding:6px">' + c + (S.c === c ? (S.d > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr></thead><tbody>' + data.map(r => '<tr>' + cols.map(c => '<td style="padding:6px;border-bottom:.5px solid var(--grid,#ddd);text-align:' + (c === 'name' ? 'left' : 'right') + '">' + r[c] + '</td>').join('') + '</tr>').join('') + '</tbody>'; t.querySelectorAll('th').forEach((th, i) => th.addEventListener('click', () => { S.d = S.c === cols[i] ? -S.d : 1; S.c = cols[i]; draw(); })); };
    draw();
  },
},
{
  id: 'heattable', family: 'tables', name: 'Heat table (conditional formatting)',
  when: 'A table where patterns matter more than exact numbers.',
  steps: ['For every numeric column find min and max; map each cell to t = (value - min) / (max - min).',
          'Use t as the background colour from a sequential ramp (K.seq); choose white text above t = 0.55 so contrast stays readable.',
          'Normalise per COLUMN so different units are comparable.'],
  combine: 'Add a sparkline column.',
  fn(host, K) {
    const head = ['Model', 'Accuracy', 'Recall', 'Time (s)'], rows = [['Linear', 0.82, 0.74, 1.2], ['Tree', 0.86, 0.8, 3.4], ['Forest', 0.91, 0.87, 18], ['Boosting', 0.93, 0.9, 25], ['Neural net', 0.92, 0.89, 90]];
    const t = document.createElement('table'); t.style.cssText = 'border-collapse:collapse;width:100%;font-size:13px'; host.appendChild(t);
    const mm = [1, 2, 3].map(c => [Math.min(...rows.map(r => r[c])), Math.max(...rows.map(r => r[c]))]);
    t.innerHTML = '<tr>' + head.map(h => '<th style="padding:6px;text-align:left">' + h + '</th>').join('') + '</tr>' + rows.map(r => '<tr><td style="padding:6px">' + r[0] + '</td>' + [1, 2, 3].map(c => { const tt = (r[c] - mm[c - 1][0]) / (mm[c - 1][1] - mm[c - 1][0]); return '<td style="padding:6px;background:' + K.seq(c === 3 ? 1 - tt : tt) + ';color:' + ((c === 3 ? 1 - tt : tt) > 0.55 ? '#fff' : '#222') + '">' + r[c] + '</td>'; }).join('') + '</tr>').join('');
  },
},
{
  id: 'sparktable', family: 'tables', name: 'Table with sparklines',
  when: 'Numbers plus their recent trend in one row.',
  steps: ['Build the table rows from data; for each row add an empty cell.',
          'Draw a tiny SVG line (K.path on the row\'s own series, scaled to its min and max) inside that cell.'],
  combine: 'Combine with sort: re-drawing the rows keeps the sparklines aligned.',
  fn(host, K) {
    const t = document.createElement('table'); t.style.cssText = 'border-collapse:collapse;width:100%;font-size:13px'; host.appendChild(t);
    t.innerHTML = '<tr><th style="text-align:left;padding:6px">Metric</th><th style="text-align:right">Now</th><th style="text-align:left;padding-left:12px">Last 20 days</th></tr>';
    [['Visits', 11, 1.2], ['Signups', 12, 0.4], ['Churn', 13, -0.6]].forEach(([n, seed, slope]) => { const s = K.series(seed, 20, 50, slope, 5, 3), tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:6px;border-top:.5px solid var(--grid,#ddd)">' + n + '</td><td style="text-align:right;border-top:.5px solid var(--grid,#ddd)">' + s[19].toFixed(1) + '</td><td style="padding-left:12px;border-top:.5px solid var(--grid,#ddd)"></td>'; t.appendChild(tr); const svg = K.el('svg', { viewBox: '0 0 100 24', width: 100, height: 24 }), x = K.linear(0, 19, 2, 98), y = K.linear(Math.min(...s), Math.max(...s), 21, 3); K.el('path', { d: K.path(s.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: K.C[0], 'stroke-width': 1.6 }, svg); K.el('circle', { cx: x(19), cy: y(s[19]), r: 2.5, fill: K.C[1] }, svg); tr.lastChild.appendChild(svg); });
  },
},
{
  id: 'kpi', family: 'tables', name: 'KPI tiles',
  when: 'The 3 to 5 numbers someone must see first.',
  steps: ['Each tile: a label, one big number, and a change versus the previous period (arrow + percent).',
          'Colour the change by whether it is GOOD, not by whether it is positive (churn up is bad).'],
  combine: 'Place above charts in a dashboard; clicking a tile filters the charts below.',
  fn(host, K) {
    const T = [['Revenue', '€ 48.2k', 6.4, 1], ['Users', '3,120', 2.1, 1], ['Churn', '4.8%', 0.7, -1], ['NPS', '41', -3, 1]], root = document.createElement('div'); root.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px'; host.appendChild(root);
    T.forEach(([l, v, d, good]) => { const up = d > 0, ok = (up ? 1 : -1) * good > 0, c = document.createElement('div'); c.style.cssText = 'background:var(--card,#f4f3ee);border-radius:10px;padding:10px 12px'; c.innerHTML = '<div style="font-size:12px;opacity:.7">' + l + '</div><div style="font-size:22px;font-weight:500">' + v + '</div><div style="font-size:12px;color:' + (ok ? '#1baf7a' : '#e34948') + '">' + (up ? '▲ ' : '▼ ') + Math.abs(d) + '% vs last month</div>'; root.appendChild(c); });
  },
},
{
  id: 'gauge', family: 'tables', name: 'Gauge (dial)',
  when: 'One value against a range with good/bad zones (speed, utilisation, score).',
  steps: ['Half-circle track from -90 to +90 degrees split into coloured zones with K.arc.',
          'Needle angle = -90 + value / max * 180 degrees; draw a line from the centre with K.polar and a hub circle.'],
  combine: 'Use sparingly: a bullet chart carries the same information with less space.',
  fn(host, K) {
    const st = K.stage(host, 320, 170, { l: 10, r: 10, t: 10, b: 10 }), cx = st.W / 2, cy = st.H - 14, v = 72, Z = [[0, 0.4, K.C[7]], [0.4, 0.7, K.C[3]], [0.7, 1, K.C[2]]];
    Z.forEach(([a, b, c]) => K.el('path', { d: K.arc(cx, cy, 70, 104, -Math.PI / 2 + a * Math.PI, -Math.PI / 2 + b * Math.PI - 0.01), fill: c }, st.g));
    const p = K.polar(cx, cy, 92, -Math.PI / 2 + v / 100 * Math.PI); K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--text,#222)', 'stroke-width': 3, 'stroke-linecap': 'round' }, st.g); K.el('circle', { cx, cy, r: 7, fill: 'var(--text,#222)' }, st.g);
    K.text(st.g, cx, cy - 26, v + '%', { 'text-anchor': 'middle', 'font-size': 20, fill: 'var(--text,#222)', 'font-weight': 500 });
  },
},
{
  id: 'wordcloud', family: 'tables', name: 'Word cloud',
  when: 'A quick look at the most frequent terms (not for precise comparison).',
  steps: ['Font size grows with the word\'s count (linear between 11 and 34 px).',
          'Place words biggest first along a spiral from the centre; the first spot whose box (width = characters * size * 0.64, height = size) overlaps no placed word wins.'],
  combine: 'A bar chart of the top 10 words is easier to read; use the cloud only for mood.',
  fn(host, K) {
    const W = [['data', 40], ['model', 34], ['python', 30], ['plot', 24], ['table', 22], ['stats', 20], ['sql', 18], ['chart', 16], ['code', 15], ['test', 12], ['graph', 11], ['map', 9], ['tree', 8], ['flow', 8]];
    const st = K.stage(host, 320, 200, { l: 0, r: 0, t: 0, b: 0 }), placed = [];
    W.forEach(([w, c], i) => { const fs = 11 + (c - 8) / 32 * 23, bw = w.length * fs * 0.64 + 4, bh = fs; for (let k = 0; k < 4000; k++) { const a = k * 0.35, r = k * 0.09, x = st.W / 2 + r * Math.cos(a) * 1.5 - bw / 2, y = st.H / 2 + r * Math.sin(a) + bh / 3; if (x < 2 || y - bh < 2 || x + bw > st.W - 2 || y > st.H - 2) continue; if (placed.every(p => x > p.x + p.w + 1 || x + bw < p.x - 1 || y - bh > p.y + 1 || y < p.y - p.h - 1)) { placed.push({ x, y, w: bw, h: bh }); K.text(st.g, x, y, w, { 'font-size': fs, fill: K.C[i % 8], 'font-weight': 500 }); break; } } });
  },
},
{
  id: 'plans', family: 'tables', name: 'Comparison (pricing) cards',
  when: 'Two to four options compared on the same features.',
  steps: ['Data: options with a price and a feature list. One flex card per option, same feature rows in the same order.',
          'Highlight the recommended card with a coloured border.'],
  combine: 'A toggle (monthly/yearly) changes prices with one state variable.',
  fn(host, K) {
    const P = [['Free', '€0', ['1 project', '100 MB', 'Community help']], ['Pro', '€12', ['10 projects', '10 GB', 'Email help'], 1], ['Team', '€30', ['Unlimited', '1 TB', 'Priority help']]], root = document.createElement('div'); root.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap'; host.appendChild(root);
    P.forEach(([n, p, f, hi]) => { const c = document.createElement('div'); c.style.cssText = 'flex:1;min-width:100px;border-radius:10px;padding:12px;border:' + (hi ? '2px solid #2a78d6' : '.5px solid var(--grid,#ccc)'); c.innerHTML = '<div style="font-weight:500">' + n + '</div><div style="font-size:22px">' + p + '<span style="font-size:12px;opacity:.6">/mo</span></div>' + f.map(x => '<div style="font-size:12px;padding:3px 0">✓ ' + x + '</div>').join(''); root.appendChild(c); });
  },
},
{
  id: 'monthcal', family: 'tables', name: 'Month calendar',
  when: 'Dates, deadlines and events at a glance.',
  steps: ['Find the weekday of the 1st with new Date(Date.UTC(year, month, 1)).getUTCDay() and the number of days in the month.',
          'Fill a 7-column grid: blank cells for the offset, then one cell per day; highlight event days.'],
  combine: 'Colour days by value for the calendar heatmap.',
  fn(host, K) {
    const y = 2026, m = 9, first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), ev = { 8: 'Exam', 15: 'Report', 29: 'Today' }, root = document.createElement('div'); host.appendChild(root);
    root.innerHTML = '<div style="font-weight:500;margin-bottom:6px">October ' + y + '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:12px;text-align:center">' + ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => '<div style="opacity:.6">' + d + '</div>').join('') + Array(first).fill('<div></div>').join('') + Array.from({ length: days }, (_, i) => '<div style="padding:6px 0;border-radius:6px;' + (ev[i + 1] ? 'background:#2a78d6;color:#fff' : 'background:var(--card,#f4f3ee)') + '" title="' + (ev[i + 1] || '') + '">' + (i + 1) + '</div>').join('') + '</div>';
  },
},
{
  id: 'filterlist', family: 'tables', name: 'Searchable list (live filter)',
  when: 'Long lists where the reader knows what they are looking for.',
  steps: ['State: the search string. On every input event filter the array with a case-insensitive includes() and redraw the list.',
          'Show the count of matches; keep the input focused (redraw only the list, not the input).'],
  combine: 'Combine with a map or chart that highlights the filtered items.',
  test: host => typeInto(host, 'input', 'py'),
  fn(host, K) {
    const items = ['Python', 'pandas', 'NumPy', 'SQL', 'scikit-learn', 'Matplotlib', 'PyTorch', 'R', 'Julia'], inp = document.createElement('input'), ul = document.createElement('ul'), n = document.createElement('div'); inp.placeholder = 'search'; inp.style.cssText = 'padding:6px;width:100%;box-sizing:border-box;margin-bottom:6px'; n.style.cssText = 'font-size:12px;opacity:.7'; ul.style.cssText = 'margin:6px 0;padding-left:18px'; host.append(inp, n, ul);
    const draw = q => { const m = items.filter(i => i.toLowerCase().includes(q.toLowerCase())); ul.innerHTML = m.map(i => '<li>' + i + '</li>').join(''); n.textContent = m.length + ' of ' + items.length; };
    inp.addEventListener('input', () => draw(inp.value)); draw('');
  },
},

// =============================== INTERACTIVE EXPLAINERS ===============================
{
  id: 'bubblesort', family: 'interactive', name: 'Bubble sort stepper',
  when: 'Teach an algorithm step by step.',
  steps: ['State: the array, the position j being compared, and the number of passes done i. Step(): compare a[j] and a[j+1], swap if needed, advance j; at the end of a pass increase i.',
          'Draw: bars; orange = being compared, green = already in final place, blue = rest.'],
  combine: 'Show the comparison count as a line chart growing with n.',
  test: clickChanges('button'),
  fn(host, K) {
    const r = K.rng(6), N = 12; let a = Array.from({ length: N }, (_, i) => i + 1).sort(() => r() - 0.5), i = 0, j = 0, cmp = 0;
    const bar = document.createElement('div'); bar.style.cssText = 'margin-bottom:4px;font-size:12px'; bar.innerHTML = '<button>Step</button> <span></span>'; host.appendChild(bar); const view = document.createElement('div'); host.appendChild(view);
    const draw = (p, q) => { view.innerHTML = ''; const st = K.stage(view, 320, 170, { l: 4, r: 4, t: 4, b: 4 }), x = K.band(a.map((_, k) => k), 0, st.W, 0.15), y = K.linear(0, N, st.H, 0); a.forEach((v, k) => K.el('rect', { x: x(k), y: y(v), width: x.bw, height: st.H - y(v), rx: 3, fill: k === p || k === q ? K.C[1] : k >= N - i ? K.C[2] : K.C[0] }, st.g)); bar.querySelector('span').textContent = ' comparisons: ' + cmp; };
    const step = () => { if (i >= N - 1) return; cmp++; if (a[j] > a[j + 1]) { const t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; } draw(j, j + 1); j++; if (j >= N - 1 - i) { j = 0; i++; } };
    bar.querySelector('button').addEventListener('click', step); draw(-1, -1);
  },
},
{
  id: 'gradientdescent', family: 'interactive', name: 'Gradient descent explorer',
  when: 'Teach learning rates: too small is slow, too large overshoots or diverges.',
  steps: ['Loss = x^2, gradient = 2x. Update: x = x - learningRate * 2x.',
          'Slider sets the learning rate; Run repeats the update and records the trail. With rate 0.5 it lands on 0 in one step; above 1.0 it diverges.'],
  combine: 'Plot loss against step number next to the parabola (linked views).',
  test: host => { const b = host.querySelectorAll('button')[0], before = host.innerHTML; b.click(); if (host.innerHTML === before) throw new Error('run did nothing'); },
  fn(host, K) {
    const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = '<button>Run 8 steps</button> rate <input type="range" min="0.05" max="1.05" step="0.05" value="0.3"> <b>0.30</b>'; host.appendChild(ctl); const view = document.createElement('div'); host.appendChild(view);
    let trail = [-4]; const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 190, { l: 10, r: 10, t: 6, b: 18 }), x = K.linear(-5, 5, 0, st.W), y = K.linear(0, 25, st.H, 0); K.el('path', { d: K.path(K.range(-5, 5, 80).map(v => [x(v), y(v * v)])), fill: 'none', stroke: 'var(--muted,#898781)', 'stroke-width': 2 }, st.g); trail.forEach((v, i) => { if (Math.abs(v) <= 5) K.el('circle', { cx: x(v), cy: y(v * v), r: i === trail.length - 1 ? 7 : 3.5, fill: i === trail.length - 1 ? K.C[0] : K.C[1], 'fill-opacity': i === trail.length - 1 ? 1 : 0.6 }, st.g); }); };
    const rate = ctl.querySelector('input'); rate.addEventListener('input', () => { ctl.querySelector('b').textContent = (+rate.value).toFixed(2); trail = [-4]; draw(); });
    ctl.querySelector('button').addEventListener('click', () => { trail = [-4]; for (let i = 0; i < 8; i++) trail.push(trail[trail.length - 1] * (1 - 2 * rate.value)); draw(); }); draw();
  },
},
{
  id: 'binsearch', family: 'interactive', name: 'Binary search visualiser',
  when: 'Show why halving the search range is so fast.',
  steps: ['State: low and high indexes of the remaining range. Each step looks at the middle element and discards the half that cannot contain the target.',
          'Draw all items as cells; dim the discarded ones; outline the current middle. 16 items need at most 4 steps.'],
  combine: 'Plot steps against list size to show the logarithmic growth.',
  test: clickChanges('button'),
  fn(host, K) {
    const N = 16, target = 11; let lo = 0, hi = N - 1, steps = 0, found = false;
    const bar = document.createElement('div'); bar.style.cssText = 'margin-bottom:4px;font-size:12px'; bar.innerHTML = '<button>Step</button> looking for <b>' + target + '</b> <span></span>'; host.appendChild(bar); const view = document.createElement('div'); host.appendChild(view);
    const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 90, { l: 4, r: 4, t: 8, b: 4 }), c = st.W / N, mid = (lo + hi) >> 1; for (let i = 0; i < N; i++) { const inside = i >= lo && i <= hi; K.el('rect', { x: i * c, y: 14, width: c - 2, height: 34, rx: 4, fill: found && i === mid ? K.C[2] : inside ? K.C[0] : 'var(--grid,#e1e0d9)', 'fill-opacity': inside ? 0.85 : 0.5, stroke: i === mid && !found ? K.C[1] : 'none', 'stroke-width': 2.5 }, st.g); K.text(st.g, i * c + c / 2 - 1, 36, i, { 'text-anchor': 'middle', fill: inside ? '#fff' : 'var(--muted,#888)' }); } bar.querySelector('span').textContent = ' steps: ' + steps + (found ? ' (found)' : ''); };
    bar.querySelector('button').addEventListener('click', () => { if (found || lo > hi) return; const mid = (lo + hi) >> 1; steps++; if (mid === target) found = true; else if (mid < target) lo = mid + 1; else hi = mid - 1; draw(); }); draw();
  },
},
{
  id: 'compound', family: 'interactive', name: 'Compound interest calculator',
  when: 'A formula with parameters people want to play with.',
  steps: ['Inputs: start amount, yearly rate, years (sliders). Formula: balance = start * (1 + rate)^year.',
          'Redraw a line (balance by year) with an area underneath and print the final value. Sliders are the only state.'],
  combine: 'Add a second scenario line for comparison.',
  test: host => slideChanges(host, 9),
  fn(host, K) {
    const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = 'rate % <input type="range" min="0" max="12" step="1" value="5"> <b></b>'; host.appendChild(ctl); const view = document.createElement('div'); host.appendChild(view);
    const draw = r => { view.innerHTML = ''; const yrs = K.range(0, 30, 31), v = yrs.map(t => 1000 * Math.pow(1 + r / 100, t)), st = K.stage(view, 320, 200, { l: 44 }), x = K.linear(0, 30, 0, st.W), y = K.linear(0, 1000 * Math.pow(1.12, 30), st.H, 0); K.axisY(st, y, 4, q => q === 0 ? '0' : Math.round(q / 1000) + 'k'); K.axisX(st, x, 5); const pts = v.map((q, i) => [x(i), y(q)]); K.el('path', { d: K.path(pts) + `L${x(30)} ${y(0)}L${x(0)} ${y(0)}Z`, fill: K.C[0], 'fill-opacity': 0.2 }, st.g); K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g); ctl.querySelector('b').textContent = ' ' + r + '% -> €' + Math.round(v[30]).toLocaleString('en-US') + ' after 30 years (from €1,000)'; };
    ctl.querySelector('input').addEventListener('input', e => draw(+e.target.value)); draw(5);
  },
},
{
  id: 'quiz', family: 'interactive', name: 'Quiz with instant feedback',
  when: 'Check understanding while reading.',
  steps: ['Data: questions with options, the index of the right option and an explanation.',
          'Render the options as buttons; on click mark the choice right/wrong, reveal the explanation and keep a running score. Next question redraws.'],
  combine: 'Log answers to build a per-topic bar chart of strengths.',
  test: host => { const b = host.querySelector('button.opt'), before = host.innerHTML; b.click(); if (host.innerHTML === before) throw new Error('quiz click did nothing'); },
  fn(host, K) {
    const Q = [['Which plot checks normality?', ['Pie chart', 'Q-Q plot', 'Gantt chart'], 1, 'A Q-Q plot compares sample quantiles with normal quantiles.'], ['What should a bar chart axis start at?', ['0', 'The minimum value', 'Anything'], 0, 'Bar length encodes value, so truncating the axis lies.']]; let i = 0, score = 0;
    const root = document.createElement('div'); root.style.fontSize = '13px'; host.appendChild(root);
    const draw = () => { if (i >= Q.length) { root.innerHTML = '<b>Score: ' + score + ' / ' + Q.length + '</b>'; return; } const [q, o, ans, why] = Q[i]; root.innerHTML = '<div style="font-weight:500;margin-bottom:6px">' + q + '</div>'; o.forEach((t, k) => { const b = document.createElement('button'); b.className = 'opt'; b.textContent = t; b.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0;padding:8px'; b.addEventListener('click', () => { if (root.dataset.done) return; root.dataset.done = 1; if (k === ans) score++; b.style.background = k === ans ? '#bfe9d6' : '#f5c2c0'; root.insertAdjacentHTML('beforeend', '<div style="margin-top:8px">' + (k === ans ? 'Correct. ' : 'Not quite. ') + why + '</div><button class="next" style="margin-top:6px">Next</button>'); root.querySelector('.next').addEventListener('click', () => { delete root.dataset.done; i++; draw(); }); }); root.appendChild(b); }); }; draw();
  },
},
{
  id: 'flashcards', family: 'interactive', name: 'Flashcards (flip)',
  when: 'Memorising terms and definitions.',
  steps: ['State: current card index and whether it is flipped.',
          'Clicking the card toggles the side; Next advances the index.'],
  combine: 'Track which cards were missed and show them again first (spaced repetition).',
  test: host => { const b = host.querySelector('.fcard'), before = host.innerHTML; b.click(); if (host.innerHTML === before) throw new Error('flip did nothing'); },
  fn(host, K) {
    const C = [['skewness', 'A measure of asymmetry of a distribution'], ['ROC curve', 'True positive rate vs false positive rate over all thresholds'], ['KDE', 'A smooth estimate of a density built from kernels']]; let i = 0, flip = 0;
    const root = document.createElement('div'); host.appendChild(root);
    const draw = () => { root.innerHTML = '<div class="fcard" style="cursor:pointer;background:var(--card,#f4f3ee);border-radius:12px;padding:30px 16px;text-align:center;font-size:' + (flip ? 14 : 20) + 'px;min-height:60px">' + C[i][flip] + '</div><div style="margin-top:8px;font-size:12px"><button class="n">Next</button> ' + (i + 1) + ' / ' + C.length + '</div>'; root.querySelector('.fcard').addEventListener('click', () => { flip ^= 1; draw(); }); root.querySelector('.n').addEventListener('click', () => { i = (i + 1) % C.length; flip = 0; draw(); }); }; draw();
  },
},
{
  id: 'timer', family: 'interactive', name: 'Countdown timer',
  when: 'Pomodoro-style focus sessions or exercises.',
  steps: ['State: seconds left and a timer handle. Every second subtract one and redraw; at zero stop.',
          'Draw a ring whose arc length is the remaining fraction (K.arc) with the time as text in the middle.'],
  combine: 'Record completed sessions and show them as a calendar heatmap.',
  test: clickChanges('button'),
  fn(host, K) {
    const T = 25 * 60; let left = T, h = null;
    const bar = document.createElement('div'); bar.style.marginBottom = '4px'; bar.innerHTML = '<button>Start</button> <button>Reset</button>'; host.appendChild(bar); const view = document.createElement('div'); host.appendChild(view);
    const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 190, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2; K.el('circle', { cx, cy, r: 62, fill: 'none', stroke: 'var(--grid,#e1e0d9)', 'stroke-width': 10 }, st.g); if (left > 0) K.el('path', { d: K.arc(cx, cy, 57, 67, 0, Math.max(0.001, left / T * 2 * Math.PI - 0.001)), fill: K.C[1] }, st.g); K.text(st.g, cx, cy + 8, String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'), { 'text-anchor': 'middle', 'font-size': 28, fill: 'var(--text,#222)' }); };
    const [s, r] = bar.querySelectorAll('button'); s.addEventListener('click', () => { if (h) { clearInterval(h); h = null; s.textContent = 'Start'; } else { h = setInterval(() => { left = Math.max(0, left - 1); draw(); if (!left) { clearInterval(h); h = null; s.textContent = 'Start'; } }, 1000); s.textContent = 'Pause'; left -= 1; draw(); } });
    r.addEventListener('click', () => { if (h) { clearInterval(h); h = null; s.textContent = 'Start'; } left = T; draw(); }); draw();
  },
},
];
if (typeof module !== 'undefined') module.exports = RECIPES_B7; else window.RECIPES_B7 = RECIPES_B7;
