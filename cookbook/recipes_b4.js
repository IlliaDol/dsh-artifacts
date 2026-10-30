/* Map recipes need D3 + topojson + the world topology. In the gallery they are loaded first and passed as K.geo.
   Data in the maps is DEMO data (deterministic hash of the country id), not real statistics. */
const RECIPES_B4 = [
{
  id: 'choropleth', family: 'maps', name: 'Choropleth map',
  when: 'A value per region, shown as colour (rates and ratios, not raw counts).',
  steps: ['Load a topology (world-atlas countries-110m) and convert it to GeoJSON features with topojson.feature.',
          'A projection (d3.geoNaturalEarth1, fitted to the stage) turns lon/lat into pixels; d3.geoPath turns each feature into an SVG path string.',
          'Look up a value per feature (here a demo value derived from the country id) and fill with a sequential ramp; add a legend bar. Antarctica is dropped so the map is not squeezed.'],
  combine: 'Link it to a bar chart of the top regions, or add proportional symbols on the same projection.',
  fn(host, K) {
    const { d3, topojson, world } = K.geo, feats = topojson.feature(world, world.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
    const st = K.stage(host, 320, 190, { l: 4, r: 4, t: 4, b: 22 }), proj = d3.geoNaturalEarth1().fitSize([st.W, st.H], { type: 'FeatureCollection', features: feats }), path = d3.geoPath(proj);
    const val = f => ((+f.id || 0) * 9301 + 49297) % 233280 / 233280;
    feats.forEach(f => K.el('path', { d: path(f), fill: K.seq(val(f)), stroke: 'var(--bg,#fff)', 'stroke-width': 0.3 }, st.g));
    for (let i = 0; i < 60; i++) K.el('rect', { x: st.W / 2 - 60 + i * 2, y: st.H + 6, width: 2, height: 8, fill: K.seq(i / 59) }, st.g);
    K.text(st.g, st.W / 2 - 64, st.H + 13, 'low', { 'text-anchor': 'end' }); K.text(st.g, st.W / 2 + 64, st.H + 13, 'high (demo data)');
  },
},
{
  id: 'symbolmap', family: 'maps', name: 'Proportional symbol map',
  when: 'Counts or totals per place (circle area encodes the number).',
  steps: ['Draw the base map in a neutral grey so the data layer stands out.',
          'path.centroid(feature) gives a pixel position per country; drop non-finite ones.',
          'Radius = sqrt(value) * k. Sort so large circles are drawn first and small ones remain visible.'],
  combine: 'Add a legend with 2 reference circles, or colour circles by category.',
  fn(host, K) {
    const { d3, topojson, world } = K.geo, feats = topojson.feature(world, world.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
    const st = K.stage(host, 320, 190, { l: 4, r: 4, t: 4, b: 4 }), proj = d3.geoNaturalEarth1().fitSize([st.W, st.H], { type: 'FeatureCollection', features: feats }), path = d3.geoPath(proj);
    const val = f => ((+f.id || 0) * 9301 + 49297) % 233280 / 233280;
    feats.forEach(f => K.el('path', { d: path(f), fill: 'var(--grid,#e8e6dd)', stroke: 'var(--bg,#fff)', 'stroke-width': 0.3 }, st.g));
    feats.map(f => ({ c: path.centroid(f), v: val(f) })).filter(p => isFinite(p.c[0]) && isFinite(p.c[1]) && p.v > 0.55).sort((a, b) => b.v - a.v)
      .forEach(p => K.el('circle', { cx: p.c[0], cy: p.c[1], r: Math.sqrt(p.v) * 7, fill: K.C[1], 'fill-opacity': 0.55, stroke: K.C[1] }, st.g));
  },
},
{
  id: 'dorling', family: 'maps', name: 'Dorling cartogram',
  when: 'Geography matters less than the size of the value; every region becomes a circle.',
  steps: ['Start each circle at its region centroid with area proportional to the value.',
          'Run a few dozen relaxation passes: for every overlapping pair push the two centres apart along the line between them.',
          'Positions stay roughly geographic, but nothing overlaps.'],
  combine: 'Colour by a second variable, e.g. growth rate.',
  fn(host, K) {
    const { d3, topojson, world } = K.geo, feats = topojson.feature(world, world.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
    const st = K.stage(host, 320, 200, { l: 4, r: 4, t: 4, b: 4 }), proj = d3.geoNaturalEarth1().fitSize([st.W, st.H], { type: 'FeatureCollection', features: feats }), path = d3.geoPath(proj);
    const val = f => ((+f.id || 0) * 9301 + 49297) % 233280 / 233280;
    const c = feats.map(f => ({ x: path.centroid(f)[0], y: path.centroid(f)[1], v: val(f), n: f.properties.name })).filter(p => isFinite(p.x) && isFinite(p.y) && p.v > 0.6).map(p => Object.assign(p, { r: Math.sqrt(p.v) * 7.5 }));
    for (let it = 0; it < 60; it++) for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      const dx = c[j].x - c[i].x, dy = c[j].y - c[i].y, d = Math.hypot(dx, dy) || 0.01, o = c[i].r + c[j].r + 0.5 - d;
      if (o > 0) { const ux = dx / d, uy = dy / d; c[i].x -= ux * o / 2; c[i].y -= uy * o / 2; c[j].x += ux * o / 2; c[j].y += uy * o / 2; }
    }
    c.forEach((p, i) => K.el('circle', { cx: K.clamp(p.x, p.r, st.W - p.r), cy: K.clamp(p.y, p.r, st.H - p.r), r: p.r, fill: K.C[i % 5], 'fill-opacity': 0.7, stroke: 'var(--bg,#fff)' }, st.g));
  },
},
{
  id: 'tilegrid', family: 'maps', name: 'Tile grid map (schematic)',
  when: 'Equal visual weight for every region (small states stay visible).',
  steps: ['Hand-assign each region a (column, row) cell that roughly keeps neighbours adjacent.',
          'Draw a square per region with its abbreviation; fill with a ramp. No projection or topology needed.',
          'This layout is schematic, not exact geography. The values are demo values.'],
  combine: 'Use it as the overview and a choropleth for detail.',
  fn(host, K) {
    const T = { SH: [1, 0], HH: [2, 0], MV: [3, 0], NI: [1, 1], ST: [2, 1], BE: [3, 1], BB: [4, 1], HB: [0, 1], NW: [0, 2], HE: [1, 2], TH: [2, 2], SN: [3, 2], RP: [0, 3], BW: [1, 3], BY: [2, 3], SL: [0, 4] };
    const st = K.stage(host, 320, 230, { l: 60, r: 20, t: 8, b: 8 }), c = 38; let i = 0;
    Object.entries(T).forEach(([k, [x, y]]) => {
      const v = ((i++) * 37 % 100) / 100;
      K.el('rect', { x: x * (c + 3), y: y * (c + 3), width: c, height: c, rx: 6, fill: K.seq(v) }, st.g);
      K.text(st.g, x * (c + 3) + c / 2, y * (c + 3) + c / 2 + 4, k, { 'text-anchor': 'middle', fill: v > 0.5 ? '#fff' : '#222', 'font-weight': 500 });
    });
  },
},
{
  id: 'globe', family: 'maps', name: 'Globe (orthographic projection)',
  when: 'Global data where distances and shapes near the poles should not be distorted.',
  steps: ['d3.geoOrthographic shows one hemisphere; rotate([lambda, phi]) decides what faces you.',
          'Draw the sphere outline, a graticule (d3.geoGraticule10) and the countries with the same path generator.',
          'A slider changes lambda and the whole picture is redrawn from scratch (state -> view).'],
  combine: 'Add a play button that increments lambda for a spinning globe, or arcs from the flow-map recipe.',
  test: host => { const i = host.querySelector('input'), before = host.innerHTML; i.value = 90; i.dispatchEvent(new Event('input', { bubbles: true })); if (host.innerHTML === before) throw new Error('globe did not rotate'); },
  fn(host, K) {
    const { d3, topojson, world } = K.geo, feats = topojson.feature(world, world.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
    const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px';
    ctl.innerHTML = 'rotate <input type="range" min="-180" max="180" value="-10">'; host.appendChild(ctl);
    const view = document.createElement('div'); host.appendChild(view);
    function draw(lam) {
      view.innerHTML = '';
      const st = K.stage(host, 320, 230, { l: 10, r: 10, t: 6, b: 6 }); view.appendChild(st.svg);
      const proj = d3.geoOrthographic().rotate([-lam, -30]).fitSize([st.W, st.H], { type: 'Sphere' }), path = d3.geoPath(proj);
      K.el('path', { d: path({ type: 'Sphere' }), fill: 'var(--card,#eaf1f8)', stroke: 'var(--axis,#b4b2a9)' }, st.g);
      K.el('path', { d: path(d3.geoGraticule10()), fill: 'none', stroke: 'var(--grid,#d8d6cc)', 'stroke-width': 0.4 }, st.g);
      feats.forEach(f => K.el('path', { d: path(f) || '', fill: f.id === '276' ? K.C[1] : '#9bb7d9', stroke: 'var(--bg,#fff)', 'stroke-width': 0.3 }, st.g));
      const p = proj([7.47, 51.51]); if (p && d3.geoDistance([7.47, 51.51], [lam, 30]) < Math.PI / 2) K.el('circle', { cx: p[0], cy: p[1], r: 3, fill: '#c00' }, st.g);
    }
    ctl.querySelector('input').addEventListener('input', e => draw(+e.target.value));
    draw(-10);
  },
},
{
  id: 'flowmap', family: 'maps', name: 'Flow (arc) map',
  when: 'Movement between places: routes, trade, migration.',
  steps: ['Draw the base map faded.',
          'For each route build a GeoJSON LineString [from, to]; d3.geoPath draws it as a great-circle arc automatically.',
          'Stroke width can encode volume; dots mark the cities.'],
  combine: 'Animate dashes along the arcs or filter by origin with a dropdown (linked views).',
  fn(host, K) {
    const { d3, topojson, world } = K.geo, feats = topojson.feature(world, world.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
    const st = K.stage(host, 320, 190, { l: 4, r: 4, t: 4, b: 4 }), proj = d3.geoNaturalEarth1().fitSize([st.W, st.H], { type: 'FeatureCollection', features: feats }), path = d3.geoPath(proj);
    const city = { Dortmund: [7.47, 51.51], 'New York': [-74, 40.71], Tokyo: [139.69, 35.68], 'Sao Paulo': [-46.63, -23.55], Sydney: [151.21, -33.87], Nairobi: [36.82, -1.29] };
    feats.forEach(f => K.el('path', { d: path(f), fill: 'var(--grid,#ebe9e1)', stroke: 'var(--bg,#fff)', 'stroke-width': 0.3 }, st.g));
    Object.keys(city).filter(k => k !== 'Dortmund').forEach((k, i) => K.el('path', { d: path({ type: 'LineString', coordinates: [city.Dortmund, city[k]] }), fill: 'none', stroke: K.C[1], 'stroke-width': 1.4 + i * 0.3, 'stroke-opacity': 0.75 }, st.g));
    Object.values(city).forEach(c => { const p = proj(c); K.el('circle', { cx: p[0], cy: p[1], r: 3, fill: K.C[0] }, st.g); });
  },
},
{
  id: 'dotdensity', family: 'maps', name: 'Dot density map',
  when: 'Show where things are in an area without implying exact positions (one dot = N units).',
  steps: ['Zoom the projection to one region (fitSize on that feature).',
          'Rejection sampling: draw random lon/lat inside the bounding box and keep the point only if d3.geoContains says it lies in the polygon, until you have the number of dots wanted.',
          'Real data would sample inside sub-regions in proportion to their counts. Here the dots are random demo points.'],
  combine: 'Colour dots by category for a multi-group version.',
  fn(host, K) {
    const { d3, topojson, world } = K.geo, feat = topojson.feature(world, world.objects.countries).features.find(f => f.properties.name === 'Germany');
    const st = K.stage(host, 320, 230, { l: 4, r: 4, t: 4, b: 4 }), proj = d3.geoMercator().fitSize([st.W, st.H], feat), path = d3.geoPath(proj), b = d3.geoBounds(feat), r = K.rng(77);
    K.el('path', { d: path(feat), fill: 'var(--grid,#efede6)', stroke: 'var(--axis,#b4b2a9)' }, st.g);
    let n = 0, guard = 0;
    while (n < 260 && guard++ < 20000) { const lon = b[0][0] + r() * (b[1][0] - b[0][0]), lat = b[0][1] + r() * (b[1][1] - b[0][1]); if (d3.geoContains(feat, [lon, lat])) { const p = proj([lon, lat]); K.el('circle', { cx: p[0], cy: p[1], r: 1.7, fill: K.C[0], 'fill-opacity': 0.7 }, st.g); n++; } }
  },
},
{
  id: 'contourmap', family: 'maps', name: 'Contour / isoline map',
  when: 'A continuous surface (elevation, temperature, density) as filled bands.',
  steps: ['Sample the field on a grid (here a sum of Gaussian hills) into a flat array of width * height values.',
          'd3.contours() runs marching squares at each threshold and returns polygons; scale them to pixels with d3.geoIdentity().',
          'Fill bands from light to dark; thin lines at the thresholds act as isolines.'],
  combine: 'Overlay point markers or a coastline for a real map; the same data as a heatmap is the raster version.',
  fn(host, K) {
    const { d3 } = K.geo, w = 60, h = 40, hills = [[18, 14, 8, 1], [42, 26, 10, 0.8], [30, 32, 6, 0.6]];
    const v = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) v.push(K.sum(hills.map(([cx, cy, s, a]) => a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s)))));
    const st = K.stage(host, 320, 220, { l: 6, r: 6, t: 6, b: 6 }), path = d3.geoPath(d3.geoIdentity().scale(st.W / w)), th = [0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.9];
    d3.contours().size([w, h]).thresholds(th)(v).forEach((c, i) => K.el('path', { d: path(c), fill: K.seq((i + 1) / th.length), stroke: 'var(--bg,#fff)', 'stroke-width': 0.4 }, st.g));
  },
},
];
if (typeof module !== 'undefined') module.exports = RECIPES_B4; else window.RECIPES_B4 = RECIPES_B4;
