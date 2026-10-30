/**
 * The recipe set: data plus options, never drawing code.
 *
 * A chart recipe is a spec that `kit/charts.js` renders and makes interactive.
 * A scene recipe is a function for motion that the chart renderer cannot express
 * (3D, integration, animation). Both expose `code`, the exact text the gallery
 * and the plugin show, so a reader can copy what actually ran.
 *
 * All numbers are generated demo data. Nothing here is a real measurement.
 */
(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  root.RECIPES = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  const VK = typeof window !== 'undefined' ? window.VK : null
  const rng = (seed) => {
    let s = seed >>> 0
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296
      return s / 4294967296
    }
  }

  /* ---------------------------------------------------------------- demo data */

  const random = rng(7)
  const cities = ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Leipzig', 'Dresden', 'Bremen', 'Hanover']
  const population = cities.map((city, i) => ({ label: city, value: 950 - i * 82 + Math.round(random() * 60) }))

  const weeks = Array.from({ length: 26 }, (_, i) => i + 1)
  const adoption = weeks.map((week) => {
    const base = 40 * Math.exp(week / 8) + 12 * Math.sin(week / 1.7)
    return { x: week, y: Math.round(base) }
  })
  const churn = weeks.map((week) => ({ x: week, y: Math.round(18 * Math.exp(week / 16) + 4 * Math.cos(week / 2)) }))

  const durations = (() => {
    const out = []
    for (let i = 0; i < 480; i += 1) out.push(Math.round(Math.exp(3.4 + Math.log(1 + Math.abs(rndNormal())) * 0.62)))
    return out.sort((a, b) => a - b)
  })()

  const scoreGroups = ['Control', 'Tutor', 'Tutor + hints', 'Tutor + hints + quiz'].map((label, i) => ({
    label,
    values: Array.from({ length: 90 }, () => 52 + i * 7 + Math.round(rndNormal() * 11)),
  }))

  const cloud = (() => {
    const out = []
    for (let i = 0; i < 140; i += 1) {
      const study = Math.max(0, 10 + rndNormal() * 4)
      out.push({ x: Math.round(study * 10) / 10, y: Math.round((30 + study * 4.4 + rndNormal() * 9) * 10) / 10, r: 3 + Math.abs(rndNormal()) * 2 })
    }
    return out
  })()

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const channels = ['Search', 'Direct', 'Social', 'Email'].map((name, i) => ({
    name,
    points: months.map((_, m) => ({ x: m, y: Math.round(120 + i * 40 + Math.sin((m + i) / 1.4) * 30 + random() * 18) })),
  }))

  const matrixRows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const matrixCols = ['06', '08', '10', '12', '14', '16', '18', '20']
  const matrix = matrixRows.map((_, r) => matrixCols.map((_, c) => Math.round(30 + 45 * Math.sin((r + c) / 2.2) + random() * 14)))

  const mix = [
    { label: 'Read', value: 41 },
    { label: 'Write', value: 27 },
    { label: 'Run', value: 18 },
    { label: 'Review', value: 9 },
    { label: 'Other', value: 5 },
  ]

  function rndNormal() {
    const u = Math.max(random(), 1e-9)
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
  }

  /* ------------------------------------------------------------------ scenes */

  /**
   * Lorenz attractor: drag to orbit, ρ slider changes the whole shape.
   * The integration is RK4 at a fixed step, so the path is reproducible.
   */
  function lorenz(host, K, V3) {
    const st = { ax: 0.35, ay: 0.5, rho: 28, spin: true, trail: [] }
    const scene = V3.canvas(host, 680, 340)
    const controls = K.slider(host, {
      label: 'ρ', min: 12, max: 42, step: 1, value: 28,
      onInput: (value) => {
        st.rho = value
        st.trail = []
        st.p = [1, 1, 1]
      },
    })
    host.insertBefore(controls, host.firstChild)
    const sigma = 10
    const beta = 8 / 3
    st.p = [1, 1, 1]
    const f = ([x, y, z]) => [sigma * (y - x), x * (st.rho - z) - y, x * y - beta * z]
    const add = (a, b, k) => a.map((v, i) => v + b[i] * k)
    const rk4 = (q, h) => {
      const a = f(q)
      const b = f(add(q, a, h / 2))
      const c = f(add(q, b, h / 2))
      const d = f(add(q, c, h))
      return q.map((v, i) => v + (h / 6) * (a[i] + 2 * b[i] + 2 * c[i] + d[i]))
    }
    const dispose = V3.orbit(scene.cv, st)
    const stop = K.loop((dt) => {
      if (st.spin) st.ay += dt * 0.25
      for (let i = 0; i < 6; i += 1) {
        st.p = rk4(st.p, 0.01)
        st.trail.push(st.p)
      }
      if (st.trail.length > 2500) st.trail.splice(0, st.trail.length - 2500)
      const { ctx, w, h } = scene
      ctx.clearRect(0, 0, w, h)
      const pts = st.trail.map((q) => V3.proj(V3.rot([q[0] / 22, q[1] / 28, (q[2] - 25) / 28], st.ax, st.ay), w, h, 112, 6))
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let c = 0; c < pts.length - 1; c += 40) {
        ctx.beginPath()
        ctx.moveTo(pts[c][0], pts[c][1])
        const end = Math.min(c + 41, pts.length)
        for (let i = c + 1; i < end; i += 1) ctx.lineTo(pts[i][0], pts[i][1])
        ctx.strokeStyle = V3.hsl(215 - (190 * c) / Math.max(pts.length, 1), 75, 52)
        ctx.lineWidth = Math.max(0.4, 1.1 * pts[c][2])
        ctx.stroke()
      }
      if (pts.length > 0) {
        const last = pts[pts.length - 1]
        ctx.beginPath()
        ctx.arc(last[0], last[1], 3.2, 0, Math.PI * 2)
        ctx.fillStyle = V3.hsl(25, 90, 55)
        ctx.fill()
      }
    })
    return () => {
      stop()
      dispose()
      host.innerHTML = ''
    }
  }

  /**
   * A travelling wave surface. Drag to orbit, amplitude slider bends it.
   */
  function wave(host, K, V3) {
    const st = { ax: 0.55, ay: 0.3, amp: 1, spin: true, t: 0 }
    const scene = V3.canvas(host, 680, 340)
    const controls = K.slider(host, {
      label: 'Amplitude', min: 0, max: 2, step: 0.05, value: 1,
      format: (value) => value.toFixed(2),
      onInput: (value) => { st.amp = value },
    })
    host.insertBefore(controls, host.firstChild)
    const dispose = V3.orbit(scene.cv, st)
    const N = 26
    const stop = K.loop((dt) => {
      if (st.spin) st.ay += dt * 0.22
      st.t += dt
      const { ctx, w, h } = scene
      ctx.clearRect(0, 0, w, h)
      const at = (i, j) => {
        const x = (i / (N - 1) - 0.5) * 2.2
        const z = (j / (N - 1) - 0.5) * 2.2
        const y = 0.42 * st.amp * Math.sin(6 * Math.hypot(x, z) - st.t * 2.4) * Math.exp(-0.5 * (x * x + z * z))
        return V3.proj(V3.rot([x, -y, z], st.ax, st.ay), w, h, 150, 4.4)
      }
      const dots = []
      for (let i = 0; i < N; i += 1) {
        for (let j = 0; j < N; j += 1) dots.push({ p: at(i, j), i, j })
      }
      dots.sort((a, b) => a.p[2] - b.p[2])
      for (const { p, i, j } of dots) {
        const shade = (i + j) / (2 * (N - 1))
        ctx.beginPath()
        ctx.arc(p[0], p[1], Math.max(0.6, 3.2 * p[2] * 1.4), 0, Math.PI * 2)
        ctx.fillStyle = V3.hsl(205 + shade * 60, 62, 45 + shade * 18)
        ctx.fill()
      }
    })
    return () => {
      stop()
      dispose()
      host.innerHTML = ''
    }
  }

  /**
   * Double pendulum with two starts 0.001 rad apart: interaction is optional and
   * the divergence is the point.
   */
  function pendulum(host, K, V3) {
    const scene = V3.canvas(host, 680, 360)
    let g = 9.8
    const controls = K.slider(host, {
      label: 'Gravity', min: 4, max: 20, step: 0.5, value: 9.8,
      format: (value) => value.toFixed(1),
      onInput: (value) => { g = value },
    })
    host.insertBefore(controls, host.firstChild)
    const make = (a) => ({ a1: a, a2: a, w1: 0, w2: 0, path: [] })
    const arms = [make(Math.PI / 2), make(Math.PI / 2 + 0.001)]
    const step = (s, h) => {
      const l = 1
      const acc1 = (-g * (2 * Math.sin(s.a1)) - g * Math.sin(s.a1 - 2 * s.a2) - 2 * Math.sin(s.a1 - s.a2) * (s.w2 * s.w2 * l + s.w1 * s.w1 * l * Math.cos(s.a1 - s.a2))) / (l * (3 - Math.cos(2 * s.a1 - 2 * s.a2)))
      const acc2 = (2 * Math.sin(s.a1 - s.a2) * (s.w1 * s.w1 * l * 2 + 2 * g * Math.cos(s.a1) + s.w2 * s.w2 * l * Math.cos(s.a1 - s.a2))) / (l * (3 - Math.cos(2 * s.a1 - 2 * s.a2)))
      s.w1 += acc1 * h
      s.w2 += acc2 * h
      s.a1 += s.w1 * h
      s.a2 += s.w2 * h
    }
    const tip = (s, w, h) => {
      const l = Math.min(w, h) * 0.19
      const x1 = w / 2 + Math.sin(s.a1) * l
      const y1 = h * 0.32 + Math.cos(s.a1) * l
      return [x1, y1, x1 + Math.sin(s.a2) * l, y1 + Math.cos(s.a2) * l]
    }
    let clock = 0
    const stop = K.loop((dt) => {
      for (let i = 0; i < 4; i += 1) for (const arm of arms) step(arm, 0.0025)
      clock += dt
      const { ctx, w, h } = scene
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(128,128,128,.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(w / 2 - 26, h * 0.32)
      ctx.lineTo(w / 2 + 26, h * 0.32)
      ctx.stroke()
      arms.forEach((arm, index) => {
        const [x1, y1, x2, y2] = tip(arm, w, h)
        arm.path.push([x2, y2])
        if (arm.path.length > 320) arm.path.shift()
        ctx.beginPath()
        ctx.moveTo(w / 2, h * 0.32)
        ctx.lineTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = index === 0 ? 'rgba(42,120,214,.9)' : 'rgba(235,104,52,.9)'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.beginPath()
        for (let i = 0; i < arm.path.length; i += 1) {
          const [px, py] = arm.path[i]
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.strokeStyle = index === 0 ? 'rgba(42,120,214,.25)' : 'rgba(235,104,52,.25)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x2, y2, 4, 0, Math.PI * 2)
        ctx.fillStyle = index === 0 ? '#2a78d6' : '#eb6834'
        ctx.fill()
      })
      ctx.fillStyle = 'rgba(128,128,128,.9)'
      ctx.font = '11px ui-sans-serif, sans-serif'
      ctx.fillText(`t = ${clock.toFixed(1)} s`, 12, 18)
    })
    return () => {
      stop()
      host.innerHTML = ''
    }
  }

  /* ----------------------------------------------------------------- recipes */

  const recipes = [
    {
      id: 'bar-ranked', family: 'comparison', name: 'Ranked bars',
      when: 'Compare many categories when their order is part of the finding. Sort descending; never sort alphabetically unless the order is the point.',
      spec: { type: 'hbar', title: 'Demo: city population index', subtitle: 'Generated values, not real census data', data: [...population].sort((a, b) => b.value - a.value), hint: 'Click a bar to isolate it' },
    },
    {
      id: 'bar-columns', family: 'comparison', name: 'Columns with labels',
      when: 'Compare up to about a dozen categories and there is room for a value above each bar.',
      spec: { type: 'bar', title: 'Demo: weekly sessions', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({ label: d, value: 120 + Math.round(Math.sin(i) * 40) + i * 9 })), hint: 'Hover a column' },
    },
    {
      id: 'line-trend', family: 'time', name: 'Two-series trend',
      when: 'Show change over time for two series on one shared scale. Drag to zoom into a period.',
      spec: { type: 'line', title: 'Demo: adoption vs churn', subtitle: 'Generated weekly counts', series: [{ name: 'Adoption', points: adoption }, { name: 'Churn', points: churn }], hint: 'Drag across the plot to zoom · double-click resets' },
    },
    {
      id: 'area-single', family: 'time', name: 'Filled trend',
      when: 'One series over time where the magnitude matters more than the exact last value.',
      spec: { type: 'area', title: 'Demo: cumulative runs', series: [{ name: 'Runs', points: weeks.map((w) => ({ x: w, y: Math.round(20 * Math.exp(w / 12)) })) }] },
    },
    {
      id: 'stacked-share', family: 'part-to-whole', name: 'Stacked totals',
      when: 'Parts of a whole across categories. Toggle a series to see the rest without it.',
      spec: { type: 'stacked', title: 'Demo: sessions by channel', labels: months, series: channels, hint: 'Toggle a series in the legend' },
    },
    {
      id: 'donut-share', family: 'part-to-whole', name: 'Donut with direct labels',
      when: 'Five or fewer parts of one whole. Labels sit outside the ring; no legend needed.',
      spec: { type: 'donut', title: 'Demo: time per activity', data: mix, center: '100%', centerLabel: 'of a day', height: 250 },
    },
    {
      id: 'hist-bins', family: 'distribution', name: 'Histogram with bin control',
      when: 'Shape of one variable. The bin slider is not decoration: it is how a reader sees that the shape depends on the bin width.',
      spec: { type: 'hist', title: 'Demo: session length', subtitle: '480 generated durations', values: durations, bins: 22, format: (v) => `${Math.round(v)} min` },
    },
    {
      id: 'box-groups', family: 'distribution', name: 'Box plots by group',
      when: 'Compare distributions across groups without hiding outliers or sample size.',
      spec: { type: 'box', title: 'Demo: quiz score by condition', subtitle: '90 generated scores per group', groups: scoreGroups, height: 300 },
    },
    {
      id: 'scatter-cloud', family: 'relationship', name: 'Scatter with hover',
      when: 'Two continuous variables, one point per observation. Radius encodes a third value only when it is worth it.',
      spec: { type: 'scatter', title: 'Demo: study hours vs score', subtitle: '140 generated observations', points: cloud, colorBy: true },
    },
    {
      id: 'heat-week', family: 'relationship', name: 'Heatmap matrix',
      when: 'Two categorical axes and one value per cell; the eye finds the band faster than any table.',
      spec: { type: 'heat', title: 'Demo: activity by weekday and hour', rows: matrixRows, cols: matrixCols, values: matrix },
    },
    {
      id: 'kpi-row', family: 'structure', name: 'KPI row',
      when: 'Three or four numbers a reader should be able to quote without reading a chart.',
      spec: { type: 'stat', title: 'Demo: this week', items: [
        { label: 'Sessions', value: '1.84k', delta: '+12%' },
        { label: 'Median length', value: '9m 40s', delta: '+3%' },
        { label: 'Failures', value: '2.1%', delta: '-0.4%' },
        { label: 'Cache hit', value: '78%', delta: '+6%' },
      ] },
    },
    {
      id: 'waterfall-bridge', family: 'comparison', name: 'Waterfall bridge',
      when: 'How a starting value becomes an end value through gains and losses; the running total is the spine.',
      spec: { type: 'waterfall', title: 'Demo: from 100 to 147', labels: ['Start', 'New', 'Expansion', 'Churn', 'End'], series: [{ name: 'Change', values: [100, 40, 25, -18, 147] }], totals: [0, 4], height: 280, hint: 'Hover a bar for the change and the running total' },
    },
    {
      id: 'dumbbell-skills', family: 'comparison', name: 'Dumbbell before / after',
      when: 'Two moments per item; the gap is the finding. Sort by gap so the biggest change leads.',
      spec: { type: 'dumbbell', title: 'Demo: score before and after', labels: ['Maths', 'Stats', 'Coding', 'ML'], series: [{ name: 'Before', values: [52, 60, 45, 38] }, { name: 'After', values: [71, 78, 83, 66] }], sort: 'gap', height: 260, hint: 'Hover either end for the values and the gap' },
    },
    {
      id: 'slope-cohorts', family: 'comparison', name: 'Slope chart',
      when: 'Exactly two moments, one line per item; the direction of change is the message.',
      spec: { type: 'slope', title: 'Demo: before vs after', labels: ['A', 'B', 'C', 'D'], series: [{ name: 'Before', values: [30, 50, 22, 65] }, { name: 'After', values: [55, 42, 60, 48] }], height: 290, hint: 'Hover a line for both values' },
    },
    {
      id: 'pareto-causes', family: 'comparison', name: 'Pareto chart',
      when: 'The few causes that explain most of the total. Bars are shares; the line is cumulative.',
      spec: { type: 'pareto', title: 'Demo: where the defects come from', labels: ['Bugs', 'Perf', 'UX', 'Docs', 'Other'], series: [{ name: 'Defects', values: [48, 27, 14, 8, 3] }], height: 290, hint: 'Hover a bar for its share, a point for the cumulative share' },
    },
    {
      id: 'funnel-signups', family: 'comparison', name: 'Funnel',
      when: 'Stages where each step loses some of the previous one; conversion is the reading.',
      spec: { type: 'funnel', title: 'Demo: from visit to paid', labels: ['Visits', 'Signups', 'Trials', 'Paid'], series: [{ name: 'People', values: [1000, 420, 180, 60] }], height: 250, hint: 'Hover a stage for its value' },
    },
    {
      id: 'bullet-kpis', family: 'comparison', name: 'Bullet chart',
      when: 'One value against a target, with qualitative bands. Compact enough for a KPI panel.',
      spec: { type: 'bullet', title: 'Demo: value against target', labels: ['Revenue', 'Profit', 'Retention'], series: [{ name: 'Actual', values: [72, 45, 88] }], targets: [80, 60, 75], height: 220, hint: 'Hover a bar for the value and target' },
    },
    {
      id: 'density-groups', family: 'distribution', name: 'Density overlay',
      when: 'Compare two distributions without choosing a bin width; the overlap is the finding.',
      spec: { type: 'density', title: 'Demo: quiz score by condition', series: [{ name: 'Control', values: scoreGroups[0].values }, { name: 'Tutor', values: scoreGroups[1].values }], height: 290, hint: 'Hover for the estimated density at a value' },
    },
    {
      id: 'ecdf-groups', family: 'distribution', name: 'ECDF comparison',
      when: 'Read percentiles directly; the vertical gap between curves is the difference at that value.',
      spec: { type: 'ecdf', title: 'Demo: share scoring at or below', series: [{ name: 'Control', values: scoreGroups[0].values }, { name: 'Tutor', values: scoreGroups[1].values }], height: 290, hint: 'Hover for the share at or below a value' },
    },
    {
      id: 'violin-groups', family: 'distribution', name: 'Violin plot',
      when: 'Shape plus summary: bimodality and outliers show here where a box would hide them.',
      spec: { type: 'violin', title: 'Demo: score shape by condition', series: [{ name: 'Control', values: scoreGroups[0].values }, { name: 'Tutor + quiz', values: scoreGroups[3].values }], height: 300, hint: 'Hover a violin for median, IQR and n' },
    },
    {
      id: 'scene-lorenz', family: 'motion', name: 'Lorenz attractor',
      when: 'A dynamical system where the shape is the answer. Drag to orbit; ρ reshapes the attractor.',
      scene: lorenz, orbit: true,
    },
    {
      id: 'scene-wave', family: 'motion', name: 'Wave surface',
      when: 'A field over two dimensions. Rotation plus a parameter beats any static projection.',
      scene: wave, orbit: true,
    },
    {
      id: 'scene-pendulum', family: 'motion', name: 'Double pendulum divergence',
      when: 'Sensitive dependence made visible: two starts 0.001 rad apart separate within seconds.',
      scene: pendulum,
    },
  ]

  /**
   * The exact source text a reader can copy. Specs become a `VC.render` call;
   * scenes become their function body.
   * @param {object} recipe
   * @returns {string}
   */
  function codeOf(recipe) {
    if (recipe.spec) {
      return `VC.render(host, ${JSON.stringify(recipe.spec, (key, value) => typeof value === 'function' ? undefined : value, 2)})`
    }
    return recipe.scene.toString()
  }

  return { recipes, codeOf, families: ['comparison', 'time', 'part-to-whole', 'distribution', 'relationship', 'structure', 'motion'] }
})
