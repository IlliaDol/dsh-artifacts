const RECIPES_B3 = [
// ============================ PART-TO-WHOLE & HIERARCHY ============================
{
  id: 'pie', family: 'parts', name: 'Pie chart',
  when: 'Few parts (2 to 5) of ONE whole, where the question is "which is the biggest share?".',
  steps: ['Convert values to angles: angle = value / total * 2 pi; keep a running start angle.',
          'Each slice is K.arc(cx, cy, 0, r, a0, a1). Start at 12 o\'clock and go clockwise, largest first.',
          'Label outside with the value; a legend is not needed with 4 slices.'],
  combine: 'Use a donut with the total in the middle, or a bar chart when shares are close.',
  fn(host, K) {
    const d = [['Python', 48], ['SQL', 27], ['R', 15], ['Other', 10]], tot = K.sum(d.map(r => r[1]));
    const st = K.stage(host, 320, 220, { l: 10, r: 10, t: 10, b: 10 }), cx = st.W / 2, cy = st.H / 2, R = 78; let a = 0;
    d.forEach(([k, v], j) => {
      const b = a + v / tot * 2 * Math.PI, m = (a + b) / 2, p = K.polar(cx, cy, R + 14, m);
      K.el('path', { d: K.arc(cx, cy, 0, R, a, b), fill: K.C[j], stroke: 'var(--bg,#fff)', 'stroke-width': 2 }, st.g);
      K.text(st.g, p[0], p[1] + 4, k + ' ' + v + '%', { 'text-anchor': p[0] > cx ? 'start' : 'end', fill: 'var(--text,#333)' });
      a = b;
    });
  },
},
{
  id: 'donut', family: 'parts', name: 'Donut chart',
  when: 'Same as a pie, with a total or key number in the hole.',
  steps: ['Same angles as a pie, but the inner radius is about 60% of the outer one.',
          'The centre carries the total; this is also where a KPI value can sit.'],
  combine: 'Concentric donuts (rings) compare two periods.',
  fn(host, K) {
    const d = [['Done', 62], ['Doing', 23], ['Todo', 15]], tot = K.sum(d.map(r => r[1]));
    const st = K.stage(host, 320, 220, { l: 10, r: 10 }), cx = st.W / 2, cy = st.H / 2; let a = 0;
    d.forEach(([k, v], j) => { const b = a + v / tot * 2 * Math.PI; K.el('path', { d: K.arc(cx, cy, 52, 84, a, b - 0.02), fill: K.C[[2, 0, 3][j]] }, st.g); a = b; });
    K.text(st.g, cx, cy + 6, '62%', { 'text-anchor': 'middle', 'font-size': 26, fill: 'var(--text,#222)', 'font-weight': 500 });
    K.text(st.g, cx, cy + 22, 'complete', { 'text-anchor': 'middle' });
    K.legend(st.g, d.map(([k], j) => [k, K.C[[2, 0, 3][j]]]), cx - 70, st.H - 8, 50);
  },
},
{
  id: 'semipie', family: 'parts', name: 'Semi-circle (half) donut',
  when: 'Parliament-style shares or a gauge-like "x of y".',
  steps: ['Use only the angles from -90 to +90 degrees (-pi/2 to pi/2).',
          'Everything else is a normal donut: scale values to the half circle instead of the full one.'],
  combine: 'Gauges (tables and dashboards family) are the same shape with one value and a needle.',
  fn(host, K) {
    const d = [['A', 38], ['B', 27], ['C', 20], ['D', 15]], tot = K.sum(d.map(r => r[1]));
    const st = K.stage(host, 320, 170, { l: 10, r: 10, t: 14 }), cx = st.W / 2, cy = st.H - 20; let a = -Math.PI / 2;
    d.forEach(([k, v], j) => { const b = a + v / tot * Math.PI; K.el('path', { d: K.arc(cx, cy, 60, 100, a, b - 0.01), fill: K.C[j] }, st.g); const p = K.polar(cx, cy, 112, (a + b) / 2); K.text(st.g, p[0], p[1] + 4, k, { 'text-anchor': 'middle' }); a = b; });
    K.text(st.g, cx, cy, tot + ' seats', { 'text-anchor': 'middle', 'font-size': 14, fill: 'var(--text,#222)' });
  },
},
{
  id: 'treemap', family: 'parts', name: 'Treemap',
  when: 'Many parts of a whole in a hierarchy; size shows the share.',
  steps: ['Sum values up the tree (K.sumTree) so every group knows its total.',
          'Squarify the groups into the full rectangle (K.squarify keeps tiles close to squares), then squarify each group\'s children inside its tile.',
          'Colour by top-level group; print labels only on tiles large enough to hold them.'],
  combine: 'Click-to-zoom into a group (state = current root, then redraw) is the usual interactive extension.',
  fn(host, K) {
    const t = { name: 'All', children: [{ name: 'Food', children: [{ name: 'Fruit', value: 30 }, { name: 'Veg', value: 20 }, { name: 'Grain', value: 15 }] }, { name: 'Tech', children: [{ name: 'Phones', value: 40 }, { name: 'PCs', value: 25 }] }, { name: 'Home', children: [{ name: 'Tools', value: 18 }, { name: 'Decor', value: 12 }] }] };
    K.sumTree(t);
    const st = K.stage(host, 320, 220, { l: 4, r: 4, t: 4, b: 4 });
    K.squarify(t.children.slice().sort((a, b) => b.value - a.value), 0, 0, st.W, st.H).forEach((g, gi) => {
      const col = K.C[t.children.indexOf(g.item)];
      K.squarify(g.item.children.slice().sort((a, b) => b.value - a.value), g.x + 1.5, g.y + 1.5, g.w - 3, g.h - 3).forEach(c => {
        K.el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, fill: col, 'fill-opacity': 0.55 + 0.4 * c.item.value / g.item.value, stroke: 'var(--bg,#fff)', 'stroke-width': 1.5 }, st.g);
        if (c.w > 34 && c.h > 18) K.text(st.g, c.x + 5, c.y + 14, c.item.name, { fill: '#fff' });
      });
    });
  },
},
{
  id: 'sunburst', family: 'parts', name: 'Sunburst chart',
  when: 'A hierarchy where the path from the centre outwards matters.',
  steps: ['K.partition gives every node a fraction range [x0, x1] and a depth.',
          'Angle = fraction * 2 pi; ring = depth. Each node is K.arc(cx, cy, ringInner, ringOuter, a0, a1).',
          'Children inherit the colour of their top-level parent.'],
  combine: 'Same data as a treemap; choose a sunburst for paths, a treemap for comparing sizes.',
  fn(host, K) {
    const t = { name: 'All', children: [{ name: 'Food', children: [{ name: 'Fruit', value: 30 }, { name: 'Veg', value: 20 }, { name: 'Grain', value: 15 }] }, { name: 'Tech', children: [{ name: 'Phones', value: 40 }, { name: 'PCs', value: 25 }] }, { name: 'Home', children: [{ name: 'Tools', value: 18 }, { name: 'Decor', value: 12 }] }] };
    K.sumTree(t);
    const st = K.stage(host, 320, 230, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2, rw = 44;
    K.partition(t).filter(p => p.depth > 0).forEach(p => {
      const top = p.depth === 1 ? p.n : t.children.find(c => c.children && c.children.includes(p.n));
      K.el('path', { d: K.arc(cx, cy, p.depth * rw - 30, p.depth * rw + 12, p.x0 * 2 * Math.PI, p.x1 * 2 * Math.PI - 0.005), fill: K.C[t.children.indexOf(top)], 'fill-opacity': p.depth === 1 ? 1 : 0.6, stroke: 'var(--bg,#fff)' }, st.g);
    });
  },
},
{
  id: 'icicle', family: 'parts', name: 'Icicle chart',
  when: 'A hierarchy as stacked rows; easier to label than a sunburst.',
  steps: ['Same K.partition layout as the sunburst, drawn as rectangles: x from x0 to x1, y from depth.',
          'Rows are levels; width is share. Labels fit horizontally.'],
  combine: 'The flame graph (flow family) is an icicle turned upside down.',
  fn(host, K) {
    const t = { name: 'All', children: [{ name: 'Food', children: [{ name: 'Fruit', value: 30 }, { name: 'Veg', value: 20 }, { name: 'Grain', value: 15 }] }, { name: 'Tech', children: [{ name: 'Phones', value: 40 }, { name: 'PCs', value: 25 }] }, { name: 'Home', children: [{ name: 'Tools', value: 18 }, { name: 'Decor', value: 12 }] }] };
    K.sumTree(t);
    const st = K.stage(host, 320, 170, { l: 6, r: 6, t: 6, b: 6 }), h = st.H / 3;
    K.partition(t).forEach(p => {
      const top = p.depth === 0 ? null : p.depth === 1 ? p.n : t.children.find(c => c.children && c.children.includes(p.n));
      K.el('rect', { x: p.x0 * st.W, y: p.depth * h, width: (p.x1 - p.x0) * st.W - 1.5, height: h - 2, rx: 3, fill: top ? K.C[t.children.indexOf(top)] : '#898781', 'fill-opacity': p.depth === 2 ? 0.6 : 1 }, st.g);
      if ((p.x1 - p.x0) * st.W > 38) K.text(st.g, p.x0 * st.W + 5, p.depth * h + h / 2 + 3, p.n.name, { fill: '#fff' });
    });
  },
},
{
  id: 'circlepack', family: 'parts', name: 'Circle packing',
  when: 'Sizes of many items where area matters and exact position does not.',
  steps: ['Radius = sqrt(value) so AREA is proportional to value.',
          'K.pack places circles largest first along an outward spiral at the first spot that touches no placed circle.',
          'Centre the cloud and scale it to fit the stage.'],
  combine: 'Nest packs inside bigger circles for hierarchy; colour by category.',
  fn(host, K) {
    const d = [['Python', 68], ['SQL', 57], ['R', 41], ['Java', 29], ['Julia', 12], ['Go', 20], ['C++', 25], ['Rust', 15]];
    const c = K.pack(d.map(r => r[1])), x0 = Math.min(...c.map(p => p.x - p.r)), x1 = Math.max(...c.map(p => p.x + p.r)), y0 = Math.min(...c.map(p => p.y - p.r)), y1 = Math.max(...c.map(p => p.y + p.r));
    const st = K.stage(host, 320, 220, { l: 4, r: 4, t: 4, b: 4 }), k = Math.min(st.W / (x1 - x0), st.H / (y1 - y0));
    c.forEach((p, i) => {
      const cx = (p.x - (x0 + x1) / 2) * k + st.W / 2, cy = (p.y - (y0 + y1) / 2) * k + st.H / 2;
      K.el('circle', { cx, cy, r: p.r * k, fill: K.C[i % 8], 'fill-opacity': 0.75 }, st.g);
      if (p.r * k > 14) K.text(st.g, cx, cy + 4, d[i][0], { 'text-anchor': 'middle', fill: '#fff' });
    });
  },
},
{
  id: 'tree', family: 'parts', name: 'Tree diagram (dendrogram layout)',
  when: 'Parent-child structure: taxonomy, file tree, clustering result.',
  steps: ['K.tree gives every node a depth (_d) and a vertical slot (_x): leaves get consecutive slots, parents sit at the middle of their children.',
          'Map depth to x and slot to y; draw elbow links (horizontal, vertical, horizontal) before the node dots.'],
  combine: 'Add leaf values as bars on the right to make a dendrogram with data.',
  fn(host, K) {
    const t = { name: 'Data', children: [{ name: 'Tabular', children: [{ name: 'CSV' }, { name: 'SQL' }] }, { name: 'Text', children: [{ name: 'Logs' }, { name: 'Docs' }, { name: 'Chat' }] }, { name: 'Media', children: [{ name: 'Image' }] }] };
    const L = K.tree(t), st = K.stage(host, 320, 230, { l: 10, r: 56 }), x = K.linear(0, 2, 0, st.W), y = K.linear(0, L.leaves - 1, 10, st.H - 10);
    L.nodes.forEach(n => (n.children || []).forEach(c => K.el('path', { d: `M${x(n._d)} ${y(n._x)}H${(x(n._d) + x(c._d)) / 2}V${y(c._x)}H${x(c._d)}`, fill: 'none', stroke: 'var(--axis,#b4b2a9)' }, st.g)));
    L.nodes.forEach(n => { K.el('circle', { cx: x(n._d), cy: y(n._x), r: 4.5, fill: n.children ? K.C[0] : K.C[2] }, st.g); K.text(st.g, x(n._d) + (n.children ? -2 : 8), y(n._x) + (n.children ? -8 : 4), n.name, { fill: 'var(--text,#333)', 'text-anchor': n.children && n._d ? 'middle' : 'start' }); });
  },
},
{
  id: 'orgchart', family: 'parts', name: 'Org chart',
  when: 'Reporting lines: who belongs to whom.',
  steps: ['Same K.tree layout, rotated: depth to y, slot to x.',
          'Nodes are rounded boxes with a title; connectors drop from the parent, run sideways, then drop to each child.'],
  combine: 'Colour boxes by department or add a headcount badge.',
  fn(host, K) {
    const t = { name: 'CEO', children: [{ name: 'Eng', children: [{ name: 'Data' }, { name: 'Web' }] }, { name: 'Ops', children: [{ name: 'Sales' }, { name: 'Care' }] }] };
    const L = K.tree(t), st = K.stage(host, 320, 200, { l: 10, r: 10 }), x = K.linear(0, L.leaves - 1, 28, st.W - 28), y = d => d * 62 + 8, bw = 54, bh = 26;
    L.nodes.forEach(n => (n.children || []).forEach(c => K.el('path', { d: `M${x(n._x)} ${y(n._d) + bh}V${y(n._d) + bh + 14}H${x(c._x)}V${y(c._d)}`, fill: 'none', stroke: 'var(--axis,#b4b2a9)' }, st.g)));
    L.nodes.forEach(n => { K.el('rect', { x: x(n._x) - bw / 2, y: y(n._d), width: bw, height: bh, rx: 6, fill: K.C[n._d % 8], 'fill-opacity': 0.9 }, st.g); K.text(st.g, x(n._x), y(n._d) + bh / 2 + 4, n.name, { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 500 }); });
  },
},
{
  id: 'rose', family: 'parts', name: 'Nightingale rose (polar area)',
  when: 'Cyclical data (months, hours) where the circle reflects the cycle.',
  steps: ['Equal angle per category (2 pi / 12), radius = sqrt(value) so AREA, not length, encodes the value.',
          'Draw each wedge with K.arc(cx, cy, 0, r, a0, a1); add faint rings for scale.'],
  combine: 'Stack two series per wedge for a second dimension.',
  fn(host, K) {
    const v = K.series(2, 12, 50, 0, 30, 6).map(Math.abs), m = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const st = K.stage(host, 320, 230, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2, R = 92, mx = Math.max(...v), step = 2 * Math.PI / 12;
    [0.5, 1].forEach(f => K.el('circle', { cx, cy, r: R * f, fill: 'none', stroke: 'var(--grid,#e1e0d9)' }, st.g));
    v.forEach((q, i) => { K.el('path', { d: K.arc(cx, cy, 0, R * Math.sqrt(q / mx), i * step, (i + 1) * step - 0.03), fill: K.C[i % 2 ? 1 : 0], 'fill-opacity': 0.8 }, st.g); const p = K.polar(cx, cy, R + 12, (i + 0.5) * step); K.text(st.g, p[0], p[1] + 4, m[i], { 'text-anchor': 'middle' }); });
  },
},
{
  id: 'mindmap', family: 'parts', name: 'Mind map (radial tree)',
  when: 'Brainstorm structure around one central idea.',
  steps: ['Root in the centre; level-1 nodes spread around it at equal angles on a circle.',
          'Each level-2 node sits on a larger circle within its parent\'s angular sector.'],
  combine: 'Mermaid can generate the same from text (see the diagrams family).',
  fn(host, K) {
    const t = [['Plan', ['Goals', 'Scope']], ['Build', ['Code', 'Test', 'Docs']], ['Ship', ['Deploy']], ['Learn', ['Retro', 'Metrics']]];
    const st = K.stage(host, 320, 230, { l: 6, r: 6, t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2;
    t.forEach(([k, kids], i) => {
      const a = i / t.length * 2 * Math.PI + 0.4, p = K.polar(cx, cy, 52, a), sector = 2 * Math.PI / t.length * 0.7;
      K.el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: K.C[i], 'stroke-width': 2 }, st.g);
      kids.forEach((c, j) => { const b = a + (kids.length === 1 ? 0 : (j / (kids.length - 1) - 0.5) * sector), q = K.polar(cx, cy, 104, b); K.el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: K.C[i], 'stroke-opacity': 0.6 }, st.g); K.text(st.g, q[0] + (q[0] > cx ? 4 : -4), q[1] + 4, c, { 'text-anchor': q[0] > cx ? 'start' : 'end', fill: 'var(--text,#333)' }); });
      K.el('circle', { cx: p[0], cy: p[1], r: 15, fill: K.C[i] }, st.g); K.text(st.g, p[0], p[1] + 4, k, { 'text-anchor': 'middle', fill: '#fff', 'font-size': 10 });
    });
    K.el('circle', { cx, cy, r: 20, fill: 'var(--text,#222)' }, st.g); K.text(st.g, cx, cy + 4, 'Project', { 'text-anchor': 'middle', fill: '#fff', 'font-size': 10 });
  },
},

// ================================ FLOW & NETWORKS ================================
{
  id: 'sankey', family: 'flow', name: 'Sankey diagram',
  when: 'Quantities moving between stages; the width of a band is the amount.',
  steps: ['Assign each node to a layer (column). A node\'s height = max(total in, total out) * scale.',
          'Within a node, links stack top to bottom; each link is a cubic Bezier from the source edge to the target edge drawn with stroke-width = value * scale.',
          'K.sankey does the layout; the recipe only draws links first (under) and nodes second.'],
  combine: 'Colour links by source; highlight one path by fading the others.',
  fn(host, K) {
    const nodes = [{ id: 'Visit', layer: 0 }, { id: 'Search', layer: 1 }, { id: 'Direct', layer: 1 }, { id: 'Buy', layer: 2 }, { id: 'Leave', layer: 2 }];
    const links = [{ s: 'Visit', t: 'Search', v: 60 }, { s: 'Visit', t: 'Direct', v: 40 }, { s: 'Search', t: 'Buy', v: 15 }, { s: 'Search', t: 'Leave', v: 45 }, { s: 'Direct', t: 'Buy', v: 22 }, { s: 'Direct', t: 'Leave', v: 18 }];
    const st = K.stage(host, 320, 210, { l: 8, r: 46, t: 6, b: 6 }), S = K.sankey(nodes, links, st.W, st.H, 10, 10);
    S.paths.forEach(p => K.el('path', { d: p.d, fill: 'none', stroke: K.C[nodes.findIndex(n => n.id === p.link.s) % 8], 'stroke-opacity': 0.4, 'stroke-width': p.w }, st.g));
    nodes.forEach((n, i) => { const b = S.nodes[n.id]; K.el('rect', { x: b.x, y: b.y, width: 10, height: b.h, fill: K.C[i % 8] }, st.g); K.text(st.g, b.x + (b.x === 0 ? 14 : -4), b.y + b.h / 2 + 4, n.id, { 'text-anchor': b.x === 0 ? 'start' : (b.x > st.W - 20 ? 'start' : 'end'), fill: 'var(--text,#333)', dx: b.x > st.W - 20 ? 14 : 0 }); });
  },
},
{
  id: 'alluvial', family: 'flow', name: 'Alluvial diagram',
  when: 'How members of categories move between categories over several time points.',
  steps: ['Same layout as a Sankey, but every column holds the same categories at a different time.',
          'Each link is "people who were in A then and in B now"; stacking order stays consistent across columns.'],
  combine: 'Add a time axis label under each column.',
  fn(host, K) {
    const cats = ['Low', 'Mid', 'High'], nodes = [], links = [];
    [0, 1, 2].forEach(t => cats.forEach(c => nodes.push({ id: c + t, layer: t })));
    const M = [[[30, 8, 2], [6, 25, 9], [1, 5, 14]], [[24, 10, 2], [8, 20, 10], [1, 7, 18]]];
    M.forEach((m, t) => cats.forEach((a, i) => cats.forEach((b, j) => links.push({ s: a + t, t: b + (t + 1), v: m[i][j] }))));
    const st = K.stage(host, 320, 210, { l: 14, r: 14, t: 6, b: 22 }), S = K.sankey(nodes, links, st.W, st.H, 10, 10);
    S.paths.forEach(p => K.el('path', { d: p.d, fill: 'none', stroke: K.C[cats.indexOf(p.link.s.slice(0, -1))], 'stroke-opacity': 0.35, 'stroke-width': p.w }, st.g));
    nodes.forEach(n => { const b = S.nodes[n.id]; K.el('rect', { x: b.x, y: b.y, width: 10, height: b.h, fill: K.C[cats.indexOf(n.id.slice(0, -1))] }, st.g); });
    ['2022', '2023', '2024'].forEach((l, i) => K.text(st.g, i * (st.W - 10) / 2 + 5, st.H + 16, l, { 'text-anchor': 'middle' }));
  },
},
{
  id: 'chord', family: 'flow', name: 'Chord diagram',
  when: 'Many-to-many relationships between a few groups (flows, co-occurrence).',
  steps: ['Each group gets an arc on the circle proportional to its total; leave a small gap between arcs.',
          'Inside a group\'s arc, reserve a sub-arc for every partner, sized by the pair\'s value.',
          'A ribbon joins the two sub-arcs of a pair: arc, quadratic curve through the centre, arc, quadratic back.'],
  combine: 'Order groups to minimise crossing; fade all ribbons except the hovered group.',
  fn(host, K) {
    const names = ['A', 'B', 'C', 'D'], M = [[0, 8, 4, 2], [8, 0, 5, 3], [4, 5, 0, 6], [2, 3, 6, 0]], n = 4, gap = 0.08;
    const st = K.stage(host, 320, 230, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2, R = 88, tot = M.map(r => K.sum(r)), k = (2 * Math.PI - gap * n) / K.sum(tot), pt = (a, r = R) => K.polar(cx, cy, r, a);
    let a = 0; const seg = [];
    M.forEach((row, i) => { const a0 = a; let c = a; seg[i] = row.map(v => { const s = { s: c, e: c + v * k }; c = s.e; return s; }); K.el('path', { d: K.arc(cx, cy, R, R + 10, a0, a0 + tot[i] * k), fill: K.C[i] }, st.g); const q = pt(a0 + tot[i] * k / 2, R + 22); K.text(st.g, q[0], q[1] + 4, names[i], { 'text-anchor': 'middle' }); a = a0 + tot[i] * k + gap; });
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = seg[i][j], B = seg[j][i];
      K.el('path', { d: `M${pt(A.s)}A${R} ${R} 0 0 1 ${pt(A.e)}Q${cx},${cy} ${pt(B.s)}A${R} ${R} 0 0 1 ${pt(B.e)}Q${cx},${cy} ${pt(A.s)}Z`, fill: K.C[i], 'fill-opacity': 0.45, stroke: K.C[i], 'stroke-opacity': 0.6 }, st.g);
    }
  },
},
{
  id: 'arc', family: 'flow', name: 'Arc diagram',
  when: 'Links between ordered items (chapters, timeline, genome positions).',
  steps: ['Nodes sit on one line in a meaningful order.',
          'Each link is a half-circle above the line: radius = distance / 2, drawn with an SVG arc (A) command with sweep 1.'],
  combine: 'Arc heights show distance, so sort the nodes to reveal clusters.',
  fn(host, K) {
    const n = 10, st = K.stage(host, 320, 160, { l: 12, r: 12, t: 6, b: 24 }), x = K.linear(0, n - 1, 0, st.W), E = [[0, 3], [0, 7], [1, 2], [2, 8], [3, 4], [4, 9], [5, 6], [6, 9], [1, 5]];
    E.forEach(([a, b], i) => K.el('path', { d: `M${x(a)} ${st.H}A${(x(b) - x(a)) / 2} ${(x(b) - x(a)) / 2} 0 0 1 ${x(b)} ${st.H}`, fill: 'none', stroke: K.C[i % 8], 'stroke-width': 1.6, 'stroke-opacity': 0.75 }, st.g));
    for (let i = 0; i < n; i++) { K.el('circle', { cx: x(i), cy: st.H, r: 4, fill: 'var(--text,#333)' }, st.g); K.text(st.g, x(i), st.H + 16, 'n' + (i + 1), { 'text-anchor': 'middle' }); }
  },
},
{
  id: 'network', family: 'flow', name: 'Force-directed network',
  when: 'Who is connected to whom; clusters and hubs.',
  steps: ['Give every node a random start position. For 250 steps: all pairs push apart (force k^2/d), linked pairs pull together (force d^2/k), and each node moves by that force capped by a cooling temperature (Fruchterman-Reingold).',
          'Draw edges first, then nodes sized by degree; colour by cluster.'],
  combine: 'Drag-to-pin and hover-highlight neighbours make it interactive; the same graph as a matrix is below.',
  fn(host, K) {
    const cl = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2], r = K.rng(5), E = [];
    for (let i = 0; i < 14; i++) for (let j = i + 1; j < 14; j++) if ((cl[i] === cl[j] && r() < 0.85) || r() < 0.06) E.push([i, j]);
    const st = K.stage(host, 320, 230, { l: 6, r: 6, t: 6, b: 6 }), p = K.force(14, E, st.W, st.H, 250, 3), deg = p.map((_, i) => E.filter(e => e.includes(i)).length);
    E.forEach(([a, b]) => K.el('line', { x1: p[a].x, y1: p[a].y, x2: p[b].x, y2: p[b].y, stroke: 'var(--axis,#b4b2a9)', 'stroke-opacity': 0.7 }, st.g));
    p.forEach((q, i) => K.el('circle', { cx: q.x, cy: q.y, r: 4 + deg[i], fill: K.C[cl[i]], stroke: 'var(--bg,#fff)', 'stroke-width': 1.5 }, st.g));
  },
},
{
  id: 'adjacency', family: 'flow', name: 'Adjacency matrix',
  when: 'Dense networks where a node-link picture turns into a hairball.',
  steps: ['Rows and columns are the nodes (ordered by cluster so groups form blocks).',
          'A filled cell means "these two are linked". Blocks on the diagonal reveal communities.'],
  combine: 'Same data as the force network; show both side by side with linked highlighting.',
  fn(host, K) {
    const cl = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2], r = K.rng(5), n = 14, A = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if ((cl[i] === cl[j] && r() < 0.85) || r() < 0.06) A[i][j] = A[j][i] = 1;
    const st = K.stage(host, 320, 230, { l: 20, t: 20 }), c = 14.4;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) K.el('rect', { x: j * c, y: i * c, width: c - 1, height: c - 1, rx: 2, fill: A[i][j] ? K.C[cl[i] === cl[j] ? cl[i] : 7] : 'var(--grid,#efede6)' }, st.g);
    cl.forEach((g, i) => { K.el('rect', { x: -10, y: i * c, width: 6, height: c - 1, fill: K.C[g] }, st.g); K.el('rect', { x: i * c, y: -10, width: c - 1, height: 6, fill: K.C[g] }, st.g); });
  },
},
{
  id: 'flame', family: 'flow', name: 'Flame graph',
  when: 'Where time (or memory) goes in nested function calls.',
  steps: ['Build the call tree with the time spent in each node; K.sumTree adds children up.',
          'K.partition lays every call out by its share of the total; the root sits at the bottom and callees stack upward.',
          'Colour is decorative (warm hues). Wide boxes are the hot spots.'],
  combine: 'Click a frame to zoom (make it the new root and redraw).',
  fn(host, K) {
    const t = { name: 'main', children: [{ name: 'load', children: [{ name: 'read', value: 18 }, { name: 'parse', value: 12 }] }, { name: 'train', children: [{ name: 'fit', children: [{ name: 'grad', value: 30 }, { name: 'step', value: 10 }] }, { name: 'eval', value: 8 }] }, { name: 'plot', value: 7 }] };
    K.sumTree(t);
    const st = K.stage(host, 320, 190, { l: 6, r: 6, t: 6, b: 6 }), h = 26, hot = ['#e34948', '#eb6834', '#eda100', '#eb8b34'];
    K.partition(t).forEach((p, i) => {
      K.el('rect', { x: p.x0 * st.W, y: st.H - (p.depth + 1) * h, width: Math.max(0, (p.x1 - p.x0) * st.W - 1.5), height: h - 2, rx: 2, fill: hot[(i * 7) % 4] }, st.g);
      if ((p.x1 - p.x0) * st.W > 30) K.text(st.g, p.x0 * st.W + 4, st.H - (p.depth + 1) * h + h / 2 + 3, p.n.name, { fill: '#fff' });
    });
  },
},
];
if (typeof module !== 'undefined') module.exports = RECIPES_B3; else window.RECIPES_B3 = RECIPES_B3;
