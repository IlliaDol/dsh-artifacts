/* viz-kit.js: the small toolkit every recipe uses.
   Idea: a chart is just (1) scales that map data to pixels, (2) marks (SVG shapes), (3) axes.
   Nothing here draws a whole chart; recipes compose these primitives. */
(function (root) {
  const NS = 'http://www.w3.org/2000/svg';
  const K = {};

  // Fixed categorical palette (never cycled past 8)
  K.C = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

  // ---- SVG building blocks -------------------------------------------------
  K.el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  K.text = (parent, x, y, s, attrs) => {
    const t = K.el('text', Object.assign({ x, y, 'font-size': 11, fill: 'var(--muted,#898781)' }, attrs || {}), parent);
    t.textContent = s;
    return t;
  };
  K.path = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');

  // ---- Scales: data value -> pixel ----------------------------------------
  K.linear = (d0, d1, r0, r1) => {
    const f = v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
    f.domain = [d0, d1];
    return f;
  };
  K.band = (keys, r0, r1, pad = 0.2) => {
    const step = (r1 - r0) / keys.length, bw = step * (1 - pad);
    const f = k => r0 + keys.indexOf(k) * step + (step - bw) / 2;
    f.bw = bw; f.step = step;
    return f;
  };
  K.ticks = (lo, hi, n = 5) => {
    let st = (hi - lo) / n;
    const p = Math.pow(10, Math.floor(Math.log10(st))), m = st / p;
    st = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
    const out = [];
    for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(6));
    return out;
  };
  K.range = (lo, hi, n) => Array.from({ length: n }, (_, i) => lo + (hi - lo) * i / (n - 1));

  // ---- Stage + axes --------------------------------------------------------
  K.stage = (host, w = 320, h = 220, m = {}) => {
    m = Object.assign({ t: 10, r: 12, b: 28, l: 40 }, m);
    const svg = K.el('svg', { viewBox: `0 0 ${w} ${h}`, width: '100%', role: 'img' });
    host.appendChild(svg);
    const g = K.el('g', { transform: `translate(${m.l},${m.t})` }, svg);
    return { svg, g, W: w - m.l - m.r, H: h - m.t - m.b, m };
  };
  K.axisY = (st, y, n = 4, fmt = v => v) => {
    const [a, b] = y.domain;
    K.ticks(Math.min(a, b), Math.max(a, b), n).forEach(v => {
      K.el('line', { x1: 0, x2: st.W, y1: y(v), y2: y(v), stroke: 'var(--grid,#e1e0d9)', 'stroke-width': 0.5 }, st.g);
      K.text(st.g, -6, y(v) + 4, fmt(v), { 'text-anchor': 'end' });
    });
  };
  K.axisX = (st, x, n = 5, fmt = v => v) => {
    const [a, b] = x.domain;
    K.ticks(Math.min(a, b), Math.max(a, b), n).forEach(v => K.text(st.g, x(v), st.H + 16, fmt(v), { 'text-anchor': 'middle' }));
  };
  K.axisBand = (st, x, keys) =>
    keys.forEach(k => K.text(st.g, x(k) + x.bw / 2, st.H + 16, k, { 'text-anchor': 'middle' }));

  // ---- Geometry for circular charts ---------------------------------------
  K.polar = (cx, cy, r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)]; // angle 0 = 12 o'clock, clockwise
  K.arc = (cx, cy, r0, r1, a0, a1) => {
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const p0 = K.polar(cx, cy, r1, a0), p1 = K.polar(cx, cy, r1, a1);
    const p2 = K.polar(cx, cy, r0, a1), p3 = K.polar(cx, cy, r0, a0);
    return `M${p0}A${r1} ${r1} 0 ${big} 1 ${p1}L${p2}A${r0} ${r0} 0 ${big} 0 ${p3}Z`;
  };

  // ---- Statistics ----------------------------------------------------------
  K.sum = a => a.reduce((s, x) => s + x, 0);
  K.mean = a => K.sum(a) / a.length;
  K.sd = a => { const m = K.mean(a); return Math.sqrt(K.sum(a.map(x => (x - m) ** 2)) / (a.length - 1)); };
  K.sorted = a => a.slice().sort((p, q) => p - q);
  K.quantile = (s, q) => { const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  K.hist = (data, lo, hi, k) => {
    const w = (hi - lo) / k;
    const bins = Array.from({ length: k }, (_, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, n: 0 }));
    data.forEach(v => { bins[Math.min(k - 1, Math.max(0, Math.floor((v - lo) / w)))].n++; });
    return bins;
  };
  K.bw = data => 1.06 * K.sd(data) * Math.pow(data.length, -0.2);            // Silverman's rule
  K.kde = (data, bw, xs) => xs.map(x =>
    K.sum(data.map(d => Math.exp(-0.5 * ((x - d) / bw) ** 2))) / (data.length * bw * Math.sqrt(2 * Math.PI)));
  K.invNorm = p => {                                                          // Abramowitz-Stegun 26.2.23
    const f = q => { const t = Math.sqrt(-2 * Math.log(q)); return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t ** 3); };
    return p < 0.5 ? -f(p) : f(1 - p);
  };

  // ---- Reproducible fake data (seeded, so every run looks the same) -------
  K.rng = seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  K.normal = r => { const u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  K.sample = (seed, n, mu, sd) => { const r = K.rng(seed); return Array.from({ length: n }, () => mu + sd * K.normal(r)); };
  K.data = { langs: [['Python', 68], ['SQL', 57], ['R', 41], ['Java', 29], ['Julia', 12]] };

  // ---- Show a recipe's source as readable text -----------------------------
  K.codeOf = fn => {
    const lines = fn.toString().replace(/^fn\s*\(/, 'function draw(').split('\n');
    const base = lines[lines.length - 1].match(/^\s*/)[0].length;
    return lines.map((l, i) => (i ? l.slice(base) : l)).join('\n');
  };

  // ======================= batch 2+ helpers =======================
  // ---- Colour ramps ---------------------------------------------------------
  K.hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  K.mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  K.rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  K.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  K.seq = t => K.rgb(K.mix(K.hex('#e8f1fc'), K.hex('#1f4e9c'), K.clamp(t, 0, 1)));               // light -> dark blue
  K.div = t => t < 0.5 ? K.rgb(K.mix(K.hex('#e34948'), K.hex('#f4f3ee'), t * 2)) : K.rgb(K.mix(K.hex('#f4f3ee'), K.hex('#2a78d6'), (t - 0.5) * 2)); // t in 0..1
  // ---- Curves and legends -----------------------------------------------------
  K.curve = pts => {                                   // Catmull-Rom spline converted to cubic Beziers
    if (pts.length < 3) return K.path(pts);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    return d;
  };
  K.legend = (parent, items, x, y, gap = 70) => items.forEach(([name, col], i) => {
    K.el('rect', { x: x + i * gap, y, width: 10, height: 10, rx: 2, fill: col }, parent);
    K.text(parent, x + i * gap + 14, y + 9, name);
  });
  // ---- Regression -----------------------------------------------------------
  K.lin = (xs, ys) => {
    const n = xs.length, mx = K.mean(xs), my = K.mean(ys);
    let sxx = 0, sxy = 0; xs.forEach((x, i) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (ys[i] - my); });
    const b = sxy / sxx, a = my - b * mx;
    const s = Math.sqrt(K.sum(xs.map((x, i) => (ys[i] - a - b * x) ** 2)) / (n - 2));
    return { n, mx, my, sxx, a, b, s };
  };
  K.corr = (xs, ys) => { const mx = K.mean(xs), my = K.mean(ys); let c = 0, p = 0, q = 0; xs.forEach((x, i) => { c += (x - mx) * (ys[i] - my); p += (x - mx) ** 2; q += (ys[i] - my) ** 2; }); return c / Math.sqrt(p * q); };
  // ---- Hierarchies ------------------------------------------------------------
  K.sumTree = n => { if (n.children) n.value = K.sum(n.children.map(K.sumTree)); return n.value; };
  K.squarify = (items, x, y, w, h) => {                // squarified treemap (Bruls et al.)
    const total = K.sum(items.map(i => i.value)), k = w * h / total, out = [];
    let rest = items.map(i => ({ item: i, a: i.value * k })), rx = x, ry = y, rw = w, rh = h;
    const worst = (row, side) => { const s = K.sum(row.map(r => r.a)); return Math.max(side * side * Math.max(...row.map(r => r.a)) / (s * s), s * s / (side * side * Math.min(...row.map(r => r.a)))); };
    while (rest.length) {
      const side = Math.min(rw, rh), row = [rest[0]]; let i = 1;
      while (i < rest.length && worst(row.concat(rest[i]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
      rest = rest.slice(row.length);
      const s = K.sum(row.map(r => r.a));
      if (rw >= rh) { const cw = s / rh; let cy = ry; row.forEach(r => { const ch = r.a / cw; out.push({ item: r.item, x: rx, y: cy, w: cw, h: ch }); cy += ch; }); rx += cw; rw -= cw; }
      else { const ch = s / rw; let cx = rx; row.forEach(r => { const cw = r.a / ch; out.push({ item: r.item, x: cx, y: ry, w: cw, h: ch }); cx += cw; }); ry += ch; rh -= ch; }
    }
    return out;
  };
  K.partition = root => { const out = []; (function rec(n, d, x0, x1) { out.push({ n, depth: d, x0, x1 }); if (n.children) { let a = x0; n.children.forEach(c => { const w = (x1 - x0) * c.value / n.value; rec(c, d + 1, a, a + w); a += w; }); } })(root, 0, 0, 1); return out; };
  K.tree = root => { let leaf = 0; const nodes = []; (function rec(n, d) { if (!n.children) n._x = leaf++; else { n.children.forEach(c => rec(c, d + 1)); n._x = (n.children[0]._x + n.children[n.children.length - 1]._x) / 2; } n._d = d; nodes.push(n); })(root, 0); return { nodes, leaves: leaf }; };
  K.pack = values => {                                 // greedy circle packing along a spiral
    const rs = values.map(Math.sqrt), order = rs.map((_, i) => i).sort((a, b) => rs[b] - rs[a]), placed = [];
    order.forEach(i => {
      const r = rs[i];
      for (let k = 0; k < 6000; k++) {
        const x = placed.length ? k * 0.12 * Math.cos(k * 0.5) : 0, y = placed.length ? k * 0.12 * Math.sin(k * 0.5) : 0;
        if (placed.every(p => Math.hypot(p.x - x, p.y - y) >= p.r + r + 0.6)) { placed.push({ i, x, y, r }); return; }
      }
    });
    return placed.sort((a, b) => a.i - b.i);
  };
  // ---- Flow and networks ------------------------------------------------------
  K.sankey = (nodes, links, w, h, nw = 10, pad = 8) => {
    const by = {}; nodes.forEach(n => { by[n.id] = Object.assign({ inV: 0, outV: 0, s: 0, t: 0 }, n); });
    links.forEach(l => { by[l.s].outV += l.v; by[l.t].inV += l.v; });
    const maxL = Math.max(...nodes.map(n => n.layer)), layers = [];
    nodes.forEach(n => { (layers[n.layer] = layers[n.layer] || []).push(by[n.id]); by[n.id].v = Math.max(by[n.id].inV, by[n.id].outV); });
    const ky = Math.min(...layers.map(L => (h - pad * (L.length - 1)) / K.sum(L.map(n => n.v))));
    layers.forEach((L, li) => { let y = 0; L.forEach(n => { n.x = li * (w - nw) / maxL; n.y = y; n.h = n.v * ky; y += n.h + pad; }); });
    const paths = links.map(l => {
      const a = by[l.s], b = by[l.t], th = l.v * ky, y0 = a.y + a.s + th / 2, y1 = b.y + b.t + th / 2; a.s += th; b.t += th;
      const x0 = a.x + nw, x1 = b.x, mx = (x0 + x1) / 2;
      return { d: `M${x0} ${y0}C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`, w: th, link: l };
    });
    return { nodes: by, paths };
  };
  K.force = (n, edges, w, h, iters = 250, seed = 1) => {   // Fruchterman-Reingold
    const r = K.rng(seed), p = Array.from({ length: n }, () => ({ x: w * (0.25 + 0.5 * r()), y: h * (0.25 + 0.5 * r()) }));
    const k = Math.sqrt(w * h / n) * 0.7; let t = w / 8;
    for (let it = 0; it < iters; it++) {
      p.forEach(a => { a.dx = 0; a.dy = 0; });
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, d = Math.hypot(dx, dy) || 0.01, f = k * k / d;
        p[i].dx += dx / d * f; p[i].dy += dy / d * f; p[j].dx -= dx / d * f; p[j].dy -= dy / d * f;
      }
      edges.forEach(([i, j]) => { const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, d = Math.hypot(dx, dy) || 0.01, f = d * d / k; p[i].dx -= dx / d * f; p[i].dy -= dy / d * f; p[j].dx += dx / d * f; p[j].dy += dy / d * f; });
      p.forEach(a => { const m = Math.hypot(a.dx, a.dy) || 1; a.x = K.clamp(a.x + a.dx / m * Math.min(m, t), 8, w - 8); a.y = K.clamp(a.y + a.dy / m * Math.min(m, t), 8, h - 8); });
      t *= 0.97;
    }
    return p;
  };
  // ---- 3D and signals ---------------------------------------------------------
  K.rot = ([x, y, z], ax, ay) => { const x1 = x * Math.cos(ay) + z * Math.sin(ay), z1 = -x * Math.sin(ay) + z * Math.cos(ay); return [x1, y * Math.cos(ax) - z1 * Math.sin(ax), y * Math.sin(ax) + z1 * Math.cos(ax)]; };
  K.proj = ([x, y, z], cx, cy, s = 70, d = 5) => { const f = d / (d - z); return [cx + x * s * f, cy - y * s * f, z]; };
  K.dft = x => Array.from({ length: x.length / 2 }, (_, k) => { let re = 0, im = 0; x.forEach((v, n) => { const a = -2 * Math.PI * k * n / x.length; re += v * Math.cos(a); im += v * Math.sin(a); }); return Math.hypot(re, im) * 2 / x.length; });
  // ---- Sample tables used by several recipes ------------------------------------
  K.series = (seed, n, base, slope, amp, noise) => { const r = K.rng(seed); return Array.from({ length: n }, (_, i) => base + slope * i + amp * Math.sin(i / 12 * 2 * Math.PI) + noise * K.normal(r)); };

  if (typeof module !== 'undefined') module.exports = K; else root.Kit = K;
})(this);
