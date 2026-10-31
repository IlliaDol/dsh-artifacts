/**
 * charts — one renderer, eleven chart types, every one interactive.
 *
 * A recipe does not draw pixels: it describes data and options, and this file
 * draws it with hover readouts, click-to-pin, legend toggles, sliders and
 * brush-to-zoom. That is what keeps visualisations from being rebuilt from
 * scratch each time.
 *
 * Usage:
 *   VC.render(host, { type: 'line', series: [{ name: 'A', points: [...] }] })
 * Returns { destroy } so a host can unmount cleanly.
 */
(function (root, factory) {
  const api = factory(root.VK || (typeof require === 'function' ? require('./viz-kit.js') : null))
  if (typeof module === 'object' && module.exports) module.exports = api
  root.VC = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function (K) {
  'use strict'
  if (!K) throw new Error('charts.js needs viz-kit.js loaded first')

  const TYPES = ['bar', 'hbar', 'stacked', 'line', 'area', 'scatter', 'hist', 'box', 'heat', 'donut', 'stat', 'waterfall', 'dumbbell', 'slope', 'pareto', 'funnel', 'bullet', 'density', 'ecdf', 'violin']

  /** Normalise `[[label, value]]` and `[{label, value}]` into one row shape. */
  function rows(input) {
    if (!Array.isArray(input)) return []
    return input.map((row) => {
      if (Array.isArray(row)) return { label: String(row[0]), value: Number(row[1]), color: row[2] }
      return { label: String(row.label ?? row.name ?? ''), value: Number(row.value ?? row.y ?? 0), color: row.color }
    }).filter((row) => Number.isFinite(row.value))
  }

  /** Normalise a series list, dropping empty entries. */
  function seriesOf(spec) {
    const list = Array.isArray(spec.series) ? spec.series : []
    return list.map((s, i) => ({
      name: String(s.name ?? `Series ${i + 1}`),
      color: s.color ?? K.PALETTE[i % K.PALETTE.length],
      points: (s.points ?? s.data ?? []).map((p, j) => Array.isArray(p)
        ? { x: Number(p[0]), y: Number(p[1]), label: String(p[0]) }
        : { x: Number(p.x ?? j), y: Number(p.y ?? p.value ?? 0), label: p.label, r: p.r }).filter((p) => Number.isFinite(p.y)),
    })).filter((s) => s.points.length > 0)
  }

  /** Prepare the host: positioned, empty, and a tooltip ready. */
  function mount(host, spec) {
    host.innerHTML = ''
    const style = getComputedStyle(host)
    if (style.position === 'static') host.style.position = 'relative'
    host.style.userSelect = 'text'
    const head = K.el('div', { style: { marginBottom: '10px' } }, host)
    const title = spec.title ? K.el('div', {
      text: spec.title,
      style: { fontSize: '13px', fontWeight: '500', color: 'var(--vz-text, #1b1b19)', marginBottom: '2px' },
    }, head) : null
    const subtitle = spec.subtitle ? K.el('div', {
      text: spec.subtitle, style: { fontSize: '12px', color: 'var(--vz-dim, #5f5e5a)' },
    }, head) : null
    const body = K.el('div', { style: { position: 'relative' } }, host)
    const note = K.el('div', {
      class: 'vk-note',
      style: { fontSize: '11px', color: 'var(--vz-faint, #8a8782)', marginTop: '8px', minHeight: '14px' },
    }, host)
    // The tooltip is created after the chart draws: stage() owns the body's
    // contents, so anything appended before it is wiped.
    return { head, body, note, tooltip: null, title, subtitle }
  }

  /* ------------------------------------------------------------------ charts */

  function drawBar(host, spec, ui, state) {
    const palette = K.theme(host)
    const data = rows(spec.data)
    if (data.length === 0) return drawEmpty(ui)
    const horizontal = spec.type === 'hbar'
    const height = spec.height ?? (horizontal ? Math.max(120, data.length * 30 + 50) : 300)
    const st = K.stage(ui.body, {
      width: 680,
      height,
      margin: spec.margin ?? (horizontal ? { t: 8, r: 26, b: 26, l: Math.min(190, Math.max(90, longest(data) * 7)) } : { t: 12, r: 16, b: 46, l: 46 }),
      label: spec.title ?? 'bar chart',
    })
    const max = spec.max ?? Math.max(...data.map((d) => d.value), 0)
    const min = Math.min(0, Math.min(...data.map((d) => d.value)))
    const value = K.linear([min, max], horizontal ? [st.x0, st.x0 + st.pw] : [st.y0 + st.ph, st.y0])
    const keys = data.map((d) => d.label)
    const band = horizontal
      ? K.band(keys, [st.y0, st.y0 + st.ph], 0.34)
      : K.band(keys, [st.x0, st.x0 + st.pw], 0.34)
    K.gridY(st, horizontal ? K.linear([min, max], [st.x0, st.x0 + st.pw]) : value, {
      count: 5,
      color: palette.line,
      // vertical gridlines for a horizontal chart read as a second axis; skip them
      ...(horizontal ? { color: 'transparent' } : {}),
    })
    if (!horizontal) K.axisX(st, band, { every: data.length > 14 ? Math.ceil(data.length / 14) : 1 })

    const marks = []
    // A bar chart is one measure across categories, so every bar is the same
    // colour: a categorical palette on a single series says "seven things"
    // when the data says one thing measured seven times.
    const single = spec.color ?? K.PALETTE[0]
    data.forEach((d, i) => {
      const color = d.color ?? (spec.colorBy === 'category' ? K.PALETTE[i % K.PALETTE.length] : single)
      const active = state.selected === null || state.selected === d.label
      const common = {
        fill: color,
        'fill-opacity': active ? (spec.type === 'bar' ? 0.92 : 1) : 0.28,
        style: { transition: 'fill-opacity .12s ease' },
        'data-label': d.label,
      }
      const mark = horizontal
        ? K.el('rect', { ...common, x: value(Math.min(0, d.value)), y: band(d.label), width: Math.max(1, Math.abs(value(d.value) - value(0))), height: band.bw, rx: 2 }, st.g)
        : K.el('rect', { ...common, x: band(d.label), y: Math.min(value(0), value(d.value)), width: band.bw, height: Math.max(1, Math.abs(value(0) - value(d.value))), rx: 2 }, st.g)
      marks.push({ mark, d })
      if (horizontal) {
        K.el('text', {
          x: st.x0 - 8, y: band(d.label) + band.bw / 2 + 4, 'text-anchor': 'end',
          'font-size': 11.5, fill: palette.dim, text: truncate(d.label, 26),
        }, st.g)
        K.el('text', {
          x: value(d.value) + 6, y: band(d.label) + band.bw / 2 + 4, 'font-size': 11,
          fill: palette.faint, text: (spec.format ?? K.fmt)(d.value),
        }, st.g)
      } else if (data.length <= 12) {
        K.el('text', {
          x: band(d.label) + band.bw / 2, y: value(d.value) - 6, 'text-anchor': 'middle',
          'font-size': 11, fill: palette.faint, text: (spec.format ?? K.fmt)(d.value),
        }, st.g)
      }
    })

    const hit = (event) => {
      const rect = st.svg.getBoundingClientRect()
      const scale = 680 / (rect.width || 680)
      const px = (event.clientX - rect.left) * scale
      const py = (event.clientY - rect.top) * scale
      let best = null
      let bestDist = Infinity
      for (const entry of marks) {
        const box = entry.mark.getBBox ? entry.mark.getBBox() : null
        if (!box) continue
        // A tall bar's centre is far from a pointer in its lower half, so
        // containment decides first and distance only breaks ties.
        const inside = px >= box.x - 2 && px <= box.x + box.width + 2 && py >= box.y - 2 && py <= box.y + box.height + 2
        const cx = box.x + box.width / 2
        const cy = box.y + box.height / 2
        const dist = inside ? 0 : Math.hypot(px - cx, py - cy)
        if (dist < bestDist) { bestDist = dist; best = entry }
      }
      if (best === null || bestDist > 26) { ui.tooltip.hide(); return }
      ui.tooltip.show(best.mark.getBBox().x + best.mark.getBBox().width / 2, best.mark.getBBox().y, tipHtml(best.d.label, best.d.value, spec))
    }
    st.svg.addEventListener('pointermove', hit)
    st.svg.addEventListener('pointerleave', () => ui.tooltip.hide())
    for (const { mark, d } of marks) {
      mark.addEventListener('click', (event) => {
        event.stopPropagation()
        state.selected = state.selected === d.label ? null : d.label
        ui.note.textContent = state.selected === null ? (spec.hint ?? '') : `${d.label}: ${(spec.format ?? K.fmt)(d.value)}`
        rerender(host, spec, ui, state)
      })
    }
    ui.note.textContent = spec.hint ?? ''
    return () => { st.svg.removeEventListener('pointermove', hit) }
  }

  function drawStacked(host, spec, ui, state) {
    const palette = K.theme(host)
    const labels = (spec.labels ?? []).map(String)
    const series = seriesOf(spec).map((s) => ({ ...s, values: labels.map((_, i) => Number(s.points[i]?.y ?? 0)) }))
    if (labels.length === 0 || series.length === 0) return drawEmpty(ui)
    const visible = series.filter((s) => state.hidden[s.name] !== true)
    const totals = labels.map((_, i) => K.sum(visible.map((s) => s.values[i] ?? 0)))
    const height = spec.height ?? 300
    const st = K.stage(ui.body, { width: 680, height, margin: { t: 12, r: 16, b: 40, l: 46 }, label: spec.title ?? 'stacked bars' })
    const y = K.linear([0, Math.max(...totals) * 1.04 || 1], [st.y0 + st.ph, st.y0])
    const x = K.band(labels, [st.x0, st.x0 + st.pw], 0.3)
    K.gridY(st, y, { color: palette.line })
    K.axisX(st, x, { every: labels.length > 12 ? Math.ceil(labels.length / 12) : 1 })

    labels.forEach((label, i) => {
      let base = 0
      for (const s of visible) {
        const v = s.values[i] ?? 0
        const y0 = y(base)
        const y1 = y(base + v)
        const rect = K.el('rect', {
          x: x(label), y: y1, width: x.bw, height: Math.max(1, y0 - y1),
          fill: s.color, 'fill-opacity': state.selected === null || state.selected === s.name ? 0.94 : 0.3,
        }, st.g)
        rect.addEventListener('pointerenter', () => {
          ui.tooltip.show(x(label) + x.bw / 2, y1, tipHtml(`${label} · ${s.name}`, v, spec))
        })
        rect.addEventListener('pointerleave', () => ui.tooltip.hide())
        base += v
      }
    })
    K.legend(ui.head, series.map((s) => ({ name: s.name, color: s.color, on: state.hidden[s.name] !== true })), (name, on) => {
      if (on) delete state.hidden[name]
      else state.hidden[name] = true
      rerender(host, spec, ui, state)
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  function drawLine(host, spec, ui, state) {
    const palette = K.theme(host)
    const all = seriesOf(spec)
    const series = all.filter((s) => state.hidden[s.name] !== true)
    if (series.length === 0) return drawEmpty(ui)
    const height = spec.height ?? 300
    const st = K.stage(ui.body, { width: 680, height, margin: { t: 14, r: spec.endLabels === false ? 16 : 96, b: 38, l: 46 }, label: spec.title ?? 'line chart' })
    const xs = series.flatMap((s) => s.points.map((p) => p.x))
    const ys = series.flatMap((s) => s.points.map((p) => p.y))
    const xd = state.zoom ?? [Math.min(...xs), Math.max(...xs)]
    const x = K.linear(xd, [st.x0, st.x0 + st.pw])
    const y = K.linear([Math.min(0, ...ys) * (spec.zero === false ? 0 : 1), Math.max(...ys) * 1.06 || 1], [st.y0 + st.ph, st.y0])
    K.gridY(st, y, { color: palette.line })
    // A labels array survives JSON; a formatting function does not, and a
    // spec that travels through a tool call is always JSON.
    const xLabel = Array.isArray(spec.xLabels)
      ? (v) => spec.xLabels[Math.round(v)] ?? ''
      : (spec.xFormat ?? K.fmt)
    // With one label per point, tick exactly once per label: a linear tick
    // sweep rounds two neighbours onto the same name.
    const tickAt = Array.isArray(spec.xLabels) && spec.xLabels.length > 1 && spec.xLabels.length <= 10
      ? spec.xLabels.map((_, index) => index)
      : undefined
    K.axisXLinear(st, x, { count: 6, format: xLabel, at: tickAt })

    for (const s of series) {
      const inView = s.points.filter((p) => p.x >= xd[0] && p.x <= xd[1])
      if (inView.length === 0) continue
      const d = inView.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
      K.el('path', {
        d,
        fill: 'none',
        stroke: s.color,
        'stroke-width': spec.type === 'area' ? 2 : 2,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
      }, st.g)
      if (spec.type === 'area') {
        const area = `${d} L${x(inView[inView.length - 1].x).toFixed(1)},${y(Math.max(0, y.domain[0])).toFixed(1)} L${x(inView[0].x).toFixed(1)},${y(Math.max(0, y.domain[0])).toFixed(1)} Z`
        K.el('path', { d: area, fill: s.color, 'fill-opacity': 0.16, stroke: 'none' }, st.g)
      }
      if (spec.endLabels !== false && series.length <= 4) {
        const last = inView[inView.length - 1]
        K.el('text', {
          x: x(last.x) + 6, y: y(last.y) + 4, 'font-size': 11, fill: s.color,
          text: `${truncate(s.name, 14)} ${(spec.format ?? K.fmt)(last.y)}`,
        }, st.g)
      }
    }

    const cross = K.el('line', { y1: st.y0, y2: st.y0 + st.ph, stroke: palette.faint, 'stroke-dasharray': '3 3', opacity: '0' }, st.g)
    const dots = series.map((s) => K.el('circle', { r: 3.4, fill: s.color, stroke: palette.surface, 'stroke-width': 1.5, opacity: '0' }, st.g))

    const move = (event) => {
      const rect = st.svg.getBoundingClientRect()
      const scale = 680 / (rect.width || 680)
      const px = (event.clientX - rect.left) * scale
      if (px < st.x0 || px > st.x0 + st.pw) { ui.tooltip.hide(); return }
      const xv = x.invert(px)
      cross.setAttribute('x1', px)
      cross.setAttribute('x2', px)
      cross.setAttribute('opacity', '0.5')
      const lines = []
      series.forEach((s, i) => {
        let best = null
        for (const p of s.points) if (best === null || Math.abs(p.x - xv) < Math.abs(best.x - xv)) best = p
        if (best === null) return
        dots[i].setAttribute('cx', x(best.x))
        dots[i].setAttribute('cy', y(best.y))
        dots[i].setAttribute('opacity', '1')
        lines.push(`<span style="color:${s.color}">●</span> ${escapeHtml(s.name)} <b>${(spec.format ?? K.fmt)(best.y)}</b>`)
      })
      ui.tooltip.show(px, st.y0 + 10, `<div style="margin-bottom:3px;opacity:.7">${escapeHtml(xLabel(xv))}</div>${lines.join('<br>')}`)
    }
    const leave = () => {
      ui.tooltip.hide()
      cross.setAttribute('opacity', '0')
      for (const dot of dots) dot.setAttribute('opacity', '0')
    }
    st.svg.addEventListener('pointermove', move)
    st.svg.addEventListener('pointerleave', leave)

    // Brush: drag horizontally to zoom, double-click to reset.
    let brushStart = null
    const band = K.el('rect', { y: st.y0, height: st.ph, fill: palette.accent, 'fill-opacity': '0.12', opacity: '0' }, st.g)
    const dispose = K.drag(st.svg, {
      cursor: 'crosshair',
      onStart: (p) => { brushStart = p.x; band.setAttribute('x', p.x); band.setAttribute('width', 0); band.setAttribute('opacity', '1') },
      onMove: (p) => {
        if (brushStart === null) return
        const x0 = Math.min(brushStart, p.x)
        band.setAttribute('x', Math.max(st.x0, x0))
        band.setAttribute('width', Math.max(0, Math.min(st.x0 + st.pw, Math.max(brushStart, p.x)) - Math.max(st.x0, x0)))
      },
      onEnd: (p) => {
        band.setAttribute('opacity', '0')
        if (brushStart === null) return
        const a = Math.max(st.x0, Math.min(brushStart, p.x))
        const b = Math.min(st.x0 + st.pw, Math.max(brushStart, p.x))
        brushStart = null
        if (b - a < 12) return
        state.zoom = [x.invert(a), x.invert(b)]
        rerender(host, spec, ui, state)
      },
    })
    st.svg.addEventListener('dblclick', () => {
      state.zoom = null
      rerender(host, spec, ui, state)
    })
    if (state.zoom) {
      const reset = K.el('button', {
        type: 'button',
        text: 'Reset zoom',
        style: { position: 'absolute', top: '0', right: '0', fontSize: '11px', border: '1px solid var(--vz-line,#e4e2da)', background: 'transparent', color: 'var(--vz-dim,#5f5e5a)', borderRadius: '5px', padding: '2px 7px', cursor: 'pointer' },
      }, ui.head)
      reset.addEventListener('click', () => { state.zoom = null; rerender(host, spec, ui, state) })
    }
    if (all.length > 1) {
      K.legend(ui.head, all.map((s) => ({ name: s.name, color: s.color, on: state.hidden[s.name] !== true })), (name, on) => {
        if (on) delete state.hidden[name]
        else state.hidden[name] = true
        rerender(host, spec, ui, state)
      })
    }
    ui.note.textContent = spec.hint ?? ''
    return () => {
      dispose()
      st.svg.removeEventListener('pointermove', move)
      st.svg.removeEventListener('pointerleave', leave)
    }
  }

  function drawScatter(host, spec, ui, state) {
    const palette = K.theme(host)
    const points = (spec.points ?? []).map((p) => Array.isArray(p)
      ? { x: Number(p[0]), y: Number(p[1]), r: Number(p[2] ?? 4), label: String(p[0]) }
      : { x: Number(p.x), y: Number(p.y), r: Number(p.r ?? 4), label: String(p.label ?? '') })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    if (points.length === 0) return drawEmpty(ui)
    const st = K.stage(ui.body, { width: 680, height: spec.height ?? 340, margin: { t: 14, r: 18, b: 40, l: 50 }, label: spec.title ?? 'scatter plot' })
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const x = K.linear([Math.min(...xs), Math.max(...xs) || 1], [st.x0, st.x0 + st.pw])
    const y = K.linear([Math.min(...ys), Math.max(...ys) || 1], [st.y0 + st.ph, st.y0])
    K.gridY(st, y, { color: palette.line })
    K.axisXLinear(st, x, { count: 6 })
    const color = spec.color ?? palette.accent
    const dots = points.map((p) => {
      const node = K.el('circle', {
        cx: x(p.x), cy: y(p.y), r: Math.max(2.5, Math.min(14, Math.sqrt(Math.max(1, p.r)) * 1.6)),
        fill: spec.colorBy ? K.ramp((p.y - Math.min(...ys)) / ((Math.max(...ys) - Math.min(...ys)) || 1)) : color,
        'fill-opacity': '0.6', stroke: spec.colorBy ? 'none' : color, 'stroke-width': '1',
        style: { cursor: 'pointer', transition: 'fill-opacity .1s ease' },
      }, st.g)
      node.addEventListener('pointerenter', () => {
        node.setAttribute('fill-opacity', '1')
        ui.tooltip.show(x(p.x), y(p.y), `<b>${escapeHtml(p.label || `${K.fmt(p.x)}, ${K.fmt(p.y)}`)}</b><br>${K.fmt(p.x)} · ${K.fmt(p.y)}`)
      })
      node.addEventListener('pointerleave', () => { node.setAttribute('fill-opacity', '0.6'); ui.tooltip.hide() })
      node.addEventListener('click', () => {
        state.selected = state.selected === p.label ? null : p.label
        ui.note.textContent = state.selected === null ? '' : `${p.label} — ${K.fmt(p.x)}, ${K.fmt(p.y)}`
      })
      return node
    })
    // Drag a rectangle to zoom into a region.
    let start = null
    const box = K.el('rect', { fill: palette.accent, 'fill-opacity': '0.1', stroke: palette.accent, 'stroke-dasharray': '3 3', opacity: '0' }, st.g)
    const dispose = K.drag(st.svg, {
      cursor: 'crosshair',
      onStart: (p) => { start = p; box.setAttribute('x', p.x); box.setAttribute('y', p.y); box.setAttribute('width', 0); box.setAttribute('height', 0); box.setAttribute('opacity', '1') },
      onMove: (p) => {
        if (start === null) return
        box.setAttribute('x', Math.min(start.x, p.x))
        box.setAttribute('y', Math.min(start.y, p.y))
        box.setAttribute('width', Math.abs(p.x - start.x))
        box.setAttribute('height', Math.abs(p.y - start.y))
      },
      onEnd: () => {
        // The zoom itself is intentionally omitted: a scatter's value is the
        // shape of the whole cloud, and a half-typed brush jump loses it.
        box.setAttribute('opacity', '0')
        start = null
      },
    })
    ui.note.textContent = spec.hint ?? ''
    return () => { dispose(); void dots }
  }

  function drawHist(host, spec, ui, state) {
    const palette = K.theme(host)
    const values = (spec.values ?? []).map(Number).filter(Number.isFinite)
    if (values.length === 0) return drawEmpty(ui)
    const height = spec.height ?? 280
    const st = K.stage(ui.body, { width: 680, height, margin: { t: 14, r: 16, b: 38, l: 46 }, label: spec.title ?? 'histogram' })
    const bins = K.clamp(Number(state.bins ?? spec.bins ?? 24), 4, 80)
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const step = (hi - lo) / bins || 1
    const counts = new Array(bins).fill(0)
    for (const v of values) counts[K.clamp(Math.floor((v - lo) / step), 0, bins - 1)] += 1
    const maxCount = Math.max(...counts) || 1
    const x = K.linear([lo, hi], [st.x0, st.x0 + st.pw])
    const y = K.linear([0, maxCount * 1.05], [st.y0 + st.ph, st.y0])
    K.gridY(st, y, { color: palette.line })
    K.axisXLinear(st, x, { count: 6 })
    counts.forEach((count, i) => {
      const bx = x(lo + i * step)
      const bw = Math.max(1, x(lo + (i + 1) * step) - bx - 1)
      const bar = K.el('rect', {
        x: bx, y: y(count), width: bw, height: Math.max(0, y(0) - y(count)),
        fill: palette.accent, 'fill-opacity': '0.75', rx: 1.5,
        style: { transition: 'fill-opacity .1s ease' },
      }, st.g)
      const from = lo + i * step
      const to = from + step
      bar.addEventListener('pointerenter', () => {
        bar.setAttribute('fill-opacity', '1')
        ui.tooltip.show(bx + bw / 2, y(count), `${(spec.format ?? K.fmt)(from)}–${(spec.format ?? K.fmt)(to)}<br><b>${count}</b> of ${values.length}`)
      })
      bar.addEventListener('pointerleave', () => { bar.setAttribute('fill-opacity', '0.75'); ui.tooltip.hide() })
    })
    if (spec.binsControl !== false) {
      const row = K.slider(ui.body, {
        label: 'Bins', min: 4, max: 60, step: 1, value: bins,
        onInput: (v) => { state.bins = v; rerender(host, spec, ui, state) },
      })
      // The slider belongs above the plot, not below it.
      ui.body.insertBefore(row, ui.body.firstChild)
    }
    ui.note.textContent = spec.hint ?? `n = ${values.length}`
    return () => {}
  }

  function drawBox(host, spec, ui) {
    const palette = K.theme(host)
    const groups = (spec.groups ?? []).map((g) => ({ label: String(g.label ?? g.name), values: (g.values ?? []).map(Number).filter(Number.isFinite) })).filter((g) => g.values.length > 0)
    if (groups.length === 0) return drawEmpty(ui)
    const st = K.stage(ui.body, { width: 680, height: spec.height ?? 300, margin: { t: 14, r: 16, b: 40, l: 46 }, label: spec.title ?? 'box plot' })
    const all = groups.flatMap((g) => g.values)
    const y = K.linear([Math.min(...all), Math.max(...all)], [st.y0 + st.ph, st.y0])
    const x = K.band(groups.map((g) => g.label), [st.x0, st.x0 + st.pw], 0.38)
    K.gridY(st, y, { color: palette.line })
    K.axisX(st, x)
    const q = (sorted, p) => {
      const pos = (sorted.length - 1) * p
      const base = Math.floor(pos)
      const rest = pos - base
      return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
    }
    groups.forEach((g, i) => {
      const sorted = [...g.values].sort((a, b) => a - b)
      const q1 = q(sorted, 0.25)
      const med = q(sorted, 0.5)
      const q3 = q(sorted, 0.75)
      const iqr = q3 - q1
      const lo = Math.max(sorted[0], q1 - iqr * 1.5)
      const hi = Math.min(sorted[sorted.length - 1], q3 + iqr * 1.5)
      const cx = x(g.label) + x.bw / 2
      const color = K.PALETTE[i % K.PALETTE.length]
      K.el('line', { x1: cx, x2: cx, y1: y(lo), y2: y(hi), stroke: color, 'stroke-width': 1.4 }, st.g)
      K.el('line', { x1: cx - 8, x2: cx + 8, y1: y(lo), y2: y(lo), stroke: color, 'stroke-width': 1.4 }, st.g)
      K.el('line', { x1: cx - 8, x2: cx + 8, y1: y(hi), y2: y(hi), stroke: color, 'stroke-width': 1.4 }, st.g)
      const rect = K.el('rect', {
        x: cx - x.bw / 2, y: y(q3), width: x.bw, height: Math.max(1, y(q1) - y(q3)),
        fill: color, 'fill-opacity': '0.28', stroke: color, 'stroke-width': 1.2, rx: 2,
      }, st.g)
      K.el('line', { x1: cx - x.bw / 2, x2: cx + x.bw / 2, y1: y(med), y2: y(med), stroke: color, 'stroke-width': 2.2 }, st.g)
      rect.addEventListener('pointerenter', () => {
        ui.tooltip.show(cx, y(q3), `${escapeHtml(g.label)}<br>median <b>${(spec.format ?? K.fmt)(med)}</b><br>IQR ${(spec.format ?? K.fmt)(q1)}–${(spec.format ?? K.fmt)(q3)}<br>n = ${g.values.length}`)
      })
      rect.addEventListener('pointerleave', () => ui.tooltip.hide())
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  function drawHeat(host, spec, ui) {
    const palette = K.theme(host)
    const rowsLabels = (spec.rows ?? []).map(String)
    const cols = (spec.cols ?? []).map(String)
    const values = spec.values ?? []
    if (rowsLabels.length === 0 || cols.length === 0) return drawEmpty(ui)
    const flat = values.flat().map(Number).filter(Number.isFinite)
    const lo = Math.min(...flat)
    const hi = Math.max(...flat)
    const cell = Math.min(44, Math.floor((680 - 120) / cols.length))
    const st = K.stage(ui.body, {
      width: 680,
      height: rowsLabels.length * cell + 56,
      margin: { t: 46, r: 20, b: 10, l: Math.min(150, Math.max(80, longest(rowsLabels) * 6.4)) },
      label: spec.title ?? 'heatmap',
    })
    cols.forEach((col, j) => {
      K.el('text', {
        x: st.x0 + j * cell + cell / 2, y: 40, 'text-anchor': 'start', 'font-size': 10.5, fill: palette.faint,
        text: col, transform: `rotate(-45 ${st.x0 + j * cell + cell / 2} 40)`,
      }, st.g)
    })
    rowsLabels.forEach((row, i) => {
      K.el('text', { x: st.x0 - 8, y: st.y0 + i * cell + cell / 2 + 3, 'text-anchor': 'end', 'font-size': 10.5, fill: palette.dim, text: truncate(row, 22) }, st.g)
      cols.forEach((col, j) => {
        const raw = values[i]?.[j]
        const value = raw === null || raw === undefined ? Number.NaN : Number(raw)
        const rect = K.el('rect', {
          x: st.x0 + j * cell, y: st.y0 + i * cell, width: cell - 1.5, height: cell - 1.5,
          fill: Number.isFinite(value) ? K.ramp((value - lo) / ((hi - lo) || 1)) : 'transparent',
          rx: 1.5,
        }, st.g)
        if (!Number.isFinite(value)) return
        rect.addEventListener('pointerenter', () => {
          ui.tooltip.show(st.x0 + j * cell + cell / 2, st.y0 + i * cell, `${escapeHtml(row)} · ${escapeHtml(col)}<br><b>${(spec.format ?? K.fmt)(value)}</b>`)
        })
        rect.addEventListener('pointerleave', () => ui.tooltip.hide())
      })
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  function drawDonut(host, spec, ui, state) {
    const palette = K.theme(host)
    const data = rows(spec.data)
    if (data.length === 0) return drawEmpty(ui)
    const st = K.stage(ui.body, { width: 680, height: spec.height ?? 260, margin: { t: 6, r: 6, b: 6, l: 6 }, label: spec.title ?? 'donut chart' })
    const cx = 190
    const cy = (spec.height ?? 260) / 2
    const radius = Math.min(100, cy - 12)
    const inner = spec.type === 'donut' ? radius * 0.58 : 0
    const total = K.sum(data.map((d) => Math.abs(d.value))) || 1
    let angle = -Math.PI / 2
    data.forEach((d, i) => {
      const sweep = (Math.abs(d.value) / total) * Math.PI * 2
      const color = d.color ?? K.PALETTE[i % K.PALETTE.length]
      const path = arcPath(cx, cy, radius, inner, angle, angle + sweep)
      const node = K.el('path', {
        d: path, fill: color,
        'fill-opacity': state.selected === null || state.selected === d.label ? '0.95' : '0.3',
        stroke: 'var(--vz-surface, #fff)', 'stroke-width': '1.5',
        style: { cursor: 'pointer', transition: 'fill-opacity .1s ease' },
      }, st.g)
      node.addEventListener('pointerenter', () => {
        ui.tooltip.show(cx, cy - radius, `${escapeHtml(d.label)}<br><b>${(spec.format ?? K.fmt)(d.value)}</b> · ${((Math.abs(d.value) / total) * 100).toFixed(1)}%`)
      })
      node.addEventListener('pointerleave', () => { ui.tooltip.hide() })
      node.addEventListener('click', () => {
        state.selected = state.selected === d.label ? null : d.label
        rerender(host, spec, ui, state)
      })
      // Direct labels beat a legend when the slices are few.
      if (data.length <= 6) {
        const mid = angle + sweep / 2
        const lx = cx + Math.cos(mid) * (radius + 14)
        const ly = cy + Math.sin(mid) * (radius + 14)
        K.el('text', {
          x: lx, y: ly + 3, 'text-anchor': Math.cos(mid) < 0 ? 'end' : 'start', 'font-size': 11,
          fill: palette.dim, text: `${truncate(d.label, 14)} ${((Math.abs(d.value) / total) * 100).toFixed(0)}%`,
        }, st.g)
      }
      angle += sweep
    })
    if (spec.center) {
      K.el('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', 'font-size': 20, fill: palette.text, text: spec.center }, st.g)
      if (spec.centerLabel) K.el('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', 'font-size': 11, fill: palette.faint, text: spec.centerLabel }, st.g)
    }
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  function drawStat(host, spec, ui) {
    const box = K.el('div', { style: { display: 'flex', gap: '18px', flexWrap: 'wrap' } }, ui.body)
    for (const item of spec.items ?? []) {
      const cell = K.el('div', { style: { minWidth: '120px', padding: '10px 12px', border: '1px solid var(--vz-line,#e4e2da)', borderRadius: '8px' } }, box)
      K.el('div', { text: String(item.label ?? ''), style: { fontSize: '11px', color: 'var(--vz-faint,#8a8782)', marginBottom: '4px' } }, cell)
      K.el('div', { text: String(item.value ?? ''), style: { fontSize: '22px', color: 'var(--vz-text,#1b1b19)', fontVariantNumeric: 'tabular-nums' } }, cell)
      if (item.delta) K.el('div', { text: String(item.delta), style: { fontSize: '11px', color: String(item.delta).startsWith('-') ? '#c0453d' : '#1b7a4b', marginTop: '3px' } }, cell)
    }
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  /* -------------------------------------------------- cookbook forms (0.3.0) */

  /**
   * Waterfall: how a starting value becomes an end value through gains and
   * losses. The first and last bars are totals unless `spec.totals` names the
   * total rows; every other bar floats from the running total to the next.
   */
  function drawWaterfall(host, spec, ui) {
    const palette = K.theme(host)
    const labels = (spec.labels ?? []).map(String)
    const values = (spec.series?.[0]?.values ?? []).map(Number)
    const count = Math.min(labels.length, values.length)
    if (count === 0) return drawEmpty(ui)
    const totalRows = new Set(Array.isArray(spec.totals) ? spec.totals.map(Number) : [0, count - 1])
    let running = 0
    const bars = []
    for (let i = 0; i < count; i += 1) {
      const value = Number.isFinite(values[i]) ? values[i] : 0
      if (totalRows.has(i)) {
        const to = i === 0 ? value : running
        running = to
        bars.push({ label: labels[i], from: 0, to, delta: value, total: true })
      } else {
        const from = running
        running += value
        bars.push({ label: labels[i], from, to: running, delta: value, total: false })
      }
    }
    const top = Math.max(0, ...bars.map((bar) => Math.max(bar.from, bar.to)))
    const bottom = Math.min(0, ...bars.map((bar) => Math.min(bar.from, bar.to)))
    const st = K.stage(ui.body, {
      width: 680,
      height: spec.height ?? 300,
      margin: { t: 18, r: 16, b: labels.length > 8 ? 54 : 40, l: 50 },
      label: spec.title ?? 'waterfall chart',
    })
    const y = K.linear([bottom, top * 1.06 || 1], [st.y0 + st.ph, st.y0])
    const x = K.band(labels, [st.x0, st.x0 + st.pw], 0.34)
    K.gridY(st, y, { count: 5, color: palette.line })
    K.axisX(st, x, { every: labels.length > 10 ? Math.ceil(labels.length / 10) : 1, rotate: labels.length > 8 })
    bars.forEach((bar, index) => {
      const color = bar.total ? palette.faint : bar.delta >= 0 ? K.PALETTE[2] : K.PALETTE[7]
      const topPx = y(Math.max(bar.from, bar.to))
      const bottomPx = y(Math.min(bar.from, bar.to))
      const rect = K.el('rect', {
        x: x(bar.label), y: topPx, width: x.bw, height: Math.max(1, bottomPx - topPx), fill: color, rx: 2,
      }, st.g)
      if (index < bars.length - 1) {
        K.el('line', {
          x1: x(bar.label) + x.bw, x2: x(bars[index + 1].label), y1: y(bar.to), y2: y(bar.to),
          stroke: palette.line, 'stroke-dasharray': '3 3',
        }, st.g)
      }
      K.el('text', {
        x: x(bar.label) + x.bw / 2, y: topPx - 5, 'text-anchor': 'middle', 'font-size': 10.5,
        fill: palette.faint, text: (spec.format ?? K.fmt)(bar.total ? bar.to : bar.delta),
      }, st.g)
      rect.addEventListener('pointerenter', () => {
        const change = bar.total ? 'total' : bar.delta >= 0 ? 'gain' : 'loss'
        ui.tooltip.show(x(bar.label) + x.bw / 2, topPx, `${escapeHtml(bar.label)}<br>${change} <b>${(spec.format ?? K.fmt)(bar.total ? bar.to : bar.delta)}</b><br>running ${(spec.format ?? K.fmt)(bar.to)}`)
      })
      rect.addEventListener('pointerleave', () => ui.tooltip.hide())
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  /**
   * Dumbbell: before vs after per row on one shared axis. The connecting line
   * is the finding; the two circles are the values.
   */
  function drawDumbbell(host, spec, ui) {
    const palette = K.theme(host)
    const labels = (spec.labels ?? []).map(String)
    const before = (spec.series?.[0]?.values ?? []).map(Number)
    const after = (spec.series?.[1]?.values ?? []).map(Number)
    if (labels.length === 0 || before.length === 0 || after.length === 0) return drawEmpty(ui)
    let rows = labels.map((label, index) => ({ label, before: before[index], after: after[index] }))
      .filter((row) => Number.isFinite(row.before) && Number.isFinite(row.after))
    if (spec.sort === 'gap') rows.sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
    if (rows.length === 0) return drawEmpty(ui)
    const all = rows.flatMap((row) => [row.before, row.after])
    const [lo, hi] = K.extent(all)
    const pad = (hi - lo) * 0.08 || 1
    const st = K.stage(ui.body, {
      width: 680,
      height: spec.height ?? Math.max(190, rows.length * 34 + 58),
      margin: { t: 14, r: 26, b: 34, l: Math.min(190, Math.max(92, longest(rows.map((row) => row.label)) * 6.6)) },
      label: spec.title ?? 'dumbbell chart',
    })
    const x = K.linear([lo - pad, hi + pad], [st.x0, st.x0 + st.pw])
    const y = K.band(rows.map((row) => row.label), [st.y0, st.y0 + st.ph], 0.3)
    x.ticks(5).forEach((value) => {
      K.el('line', { x1: x(value), x2: x(value), y1: st.y0, y2: st.y0 + st.ph, stroke: palette.line, 'stroke-width': 0.6 }, st.g)
    })
    K.axisXLinear(st, x, { count: 5 })
    rows.forEach((row) => {
      const cy = y(row.label) + y.bw / 2
      const beforeColor = K.PALETTE[1]
      const afterColor = K.PALETTE[0]
      K.el('line', { x1: x(row.before), x2: x(row.after), y1: cy, y2: cy, stroke: palette.line, 'stroke-width': 3 }, st.g)
      K.el('text', { x: st.x0 - 8, y: cy + 4, 'text-anchor': 'end', 'font-size': 11, fill: palette.dim, text: truncate(row.label, 26) }, st.g)
      const a = K.el('circle', { cx: x(row.before), cy, r: 5.5, fill: beforeColor, style: { cursor: 'pointer' } }, st.g)
      const b = K.el('circle', { cx: x(row.after), cy, r: 5.5, fill: afterColor, style: { cursor: 'pointer' } }, st.g)
      const show = (which) => {
        const value = which === 'before' ? row.before : row.after
        const delta = row.after - row.before
        ui.tooltip.show(x(value), cy - 8, `${escapeHtml(row.label)}<br>${which} <b>${(spec.format ?? K.fmt)(value)}</b><br>change ${delta >= 0 ? '+' : ''}${(spec.format ?? K.fmt)(delta)}`)
      }
      a.addEventListener('pointerenter', () => show('before'))
      b.addEventListener('pointerenter', () => show('after'))
      a.addEventListener('pointerleave', () => ui.tooltip.hide())
      b.addEventListener('pointerleave', () => ui.tooltip.hide())
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  /**
   * Slope: exactly two moments, one line per item. Direction is the colour.
   */
  function drawSlope(host, spec, ui) {
    const palette = K.theme(host)
    const labels = (spec.labels ?? []).map(String)
    const before = (spec.series?.[0]?.values ?? []).map(Number)
    const after = (spec.series?.[1]?.values ?? []).map(Number)
    if (labels.length === 0) return drawEmpty(ui)
    const rows = labels.map((label, index) => ({ label, before: before[index], after: after[index] }))
      .filter((row) => Number.isFinite(row.before) && Number.isFinite(row.after))
    if (rows.length === 0) return drawEmpty(ui)
    const all = rows.flatMap((row) => [row.before, row.after])
    const [lo, hi] = K.extent(all)
    const pad = (hi - lo) * 0.12 || 1
    const st = K.stage(ui.body, {
      width: 680, height: spec.height ?? 300,
      margin: { t: 18, r: 84, b: 42, l: 84 },
      label: spec.title ?? 'slope chart',
    })
    const y = K.linear([lo - pad, hi + pad], [st.y0 + st.ph, st.y0])
    const left = st.x0 + 14
    const right = st.x0 + st.pw - 14
    // A slope chart labels both ends of every line; numeric y ticks would
    // collide with those row labels, so draw the grid without them.
    y.ticks(5).forEach((value) => {
      K.el('line', { x1: left, x2: right, y1: y(value), y2: y(value), stroke: palette.line, 'stroke-width': 0.6 }, st.g)
    })
    rows.forEach((row) => {
      const up = row.after >= row.before
      const color = up ? K.PALETTE[2] : K.PALETTE[1]
      const line = K.el('line', { x1: left, y1: y(row.before), x2: right, y2: y(row.after), stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round' }, st.g)
      const a = K.el('circle', { cx: left, cy: y(row.before), r: 4, fill: color }, st.g)
      const b = K.el('circle', { cx: right, cy: y(row.after), r: 4, fill: color }, st.g)
      K.el('text', { x: left - 10, y: y(row.before) + 4, 'text-anchor': 'end', 'font-size': 11, fill: palette.dim, text: `${truncate(row.label, 16)} ${(spec.format ?? K.fmt)(row.before)}` }, st.g)
      K.el('text', { x: right + 10, y: y(row.after) + 4, 'font-size': 11, fill: palette.dim, text: (spec.format ?? K.fmt)(row.after) }, st.g)
      const show = () => ui.tooltip.show(right, y(row.after), `${escapeHtml(row.label)}<br>${(spec.format ?? K.fmt)(row.before)} → <b>${(spec.format ?? K.fmt)(row.after)}</b>`)
      for (const node of [line, a, b]) {
        node.addEventListener('pointerenter', show)
        node.addEventListener('pointerleave', () => ui.tooltip.hide())
      }
    })
    K.el('text', { x: left, y: st.y0 + st.ph + 24, 'text-anchor': 'middle', 'font-size': 11, fill: palette.faint, text: spec.beforeLabel ?? 'before' }, st.g)
    K.el('text', { x: right, y: st.y0 + st.ph + 24, 'text-anchor': 'middle', 'font-size': 11, fill: palette.faint, text: spec.afterLabel ?? 'after' }, st.g)
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  /**
   * Pareto: bars sorted long to short, with the cumulative share on the same
   * 0–100% axis. The 80% rule is a reference line, not a second axis.
   */
  function drawPareto(host, spec, ui) {
    const palette = K.theme(host)
    const labels = (spec.labels ?? []).map(String)
    const values = (spec.series?.[0]?.values ?? []).map(Number)
    const data = labels.map((label, index) => ({ label, value: values[index] }))
      .filter((row) => Number.isFinite(row.value) && row.value >= 0)
      .sort((a, b) => b.value - a.value)
    if (data.length === 0) return drawEmpty(ui)
    const total = K.sum(data.map((row) => row.value)) || 1
    let cumulative = 0
    const cumulativeAt = data.map((row) => { cumulative += row.value / total; return cumulative })
    const st = K.stage(ui.body, {
      width: 680, height: spec.height ?? 300,
      margin: { t: 16, r: 20, b: data.length > 7 ? 58 : 42, l: 52 },
      label: spec.title ?? 'pareto chart',
    })
    const x = K.band(data.map((row) => row.label), [st.x0, st.x0 + st.pw], 0.32)
    const y = K.linear([0, 1], [st.y0 + st.ph, st.y0])
    K.gridY(st, y, { count: 5, color: palette.line, format: (value) => `${Math.round(value * 100)}%` })
    K.axisX(st, x, { every: data.length > 10 ? Math.ceil(data.length / 10) : 1, rotate: data.length > 7 })
    K.el('line', { x1: st.x0, x2: st.x0 + st.pw, y1: y(0.8), y2: y(0.8), stroke: palette.faint, 'stroke-dasharray': '4 4' }, st.g)
    K.el('text', { x: st.x0 + st.pw - 2, y: y(0.8) - 5, 'text-anchor': 'end', 'font-size': 10.5, fill: palette.faint, text: '80%' }, st.g)
    data.forEach((row, index) => {
      const bar = K.el('rect', {
        x: x(row.label), y: y(row.value / total), width: x.bw, height: Math.max(1, st.y0 + st.ph - y(row.value / total)),
        fill: K.PALETTE[0], 'fill-opacity': 0.9, rx: 2,
      }, st.g)
      bar.addEventListener('pointerenter', () => {
        ui.tooltip.show(x(row.label) + x.bw / 2, y(row.value / total), `${escapeHtml(row.label)}<br><b>${(spec.format ?? K.fmt)(row.value)}</b> · ${((row.value / total) * 100).toFixed(1)}%<br>cumulative ${(cumulativeAt[index] * 100).toFixed(1)}%`)
      })
      bar.addEventListener('pointerleave', () => ui.tooltip.hide())
    })
    const points = data.map((row, index) => [x(row.label) + x.bw / 2, y(cumulativeAt[index])])
    K.el('path', { d: linePath(points), fill: 'none', stroke: K.PALETTE[1], 'stroke-width': 2 }, st.g)
    points.forEach((point, index) => {
      const dot = K.el('circle', { cx: point[0], cy: point[1], r: 3.5, fill: K.PALETTE[1] }, st.g)
      dot.addEventListener('pointerenter', () => {
        ui.tooltip.show(point[0], point[1], `${escapeHtml(data[index].label)}<br>cumulative <b>${(cumulativeAt[index] * 100).toFixed(1)}%</b>`)
      })
      dot.addEventListener('pointerleave', () => ui.tooltip.hide())
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  /**
   * Funnel: stage widths are the value relative to the largest stage. Labels
   * live in a column on the right so a narrow final stage stays readable.
   */
  function drawFunnel(host, spec, ui) {
    const palette = K.theme(host)
    const labels = (spec.labels ?? []).map(String)
    const values = (spec.series?.[0]?.values ?? []).map(Number)
    const data = labels.map((label, index) => ({ label, value: values[index] }))
      .filter((row) => Number.isFinite(row.value) && row.value >= 0)
    if (data.length === 0) return drawEmpty(ui)
    const max = Math.max(...data.map((row) => row.value), 1)
    const st = K.stage(ui.body, {
      width: 680, height: spec.height ?? Math.max(210, data.length * 54 + 26),
      margin: { t: 12, r: 12, b: 12, l: 12 },
      label: spec.title ?? 'funnel chart',
    })
    const center = st.x0 + st.pw * 0.33
    const maxHalf = st.pw * 0.29
    const step = st.ph / data.length
    data.forEach((row, index) => {
      const half = Math.max(0.008, row.value / max) * maxHalf
      const next = index < data.length - 1 ? Math.max(0.008, data[index + 1].value / max) * maxHalf : half * 0.86
      const top = st.y0 + index * step
      const bottom = top + step - 3
      const points = [
        [center - half, top], [center + half, top],
        [center + next, bottom], [center - next, bottom],
      ]
      const polygon = K.el('polygon', {
        points: points.map((point) => point.join(',')).join(' '),
        fill: K.PALETTE[index % K.PALETTE.length], 'fill-opacity': Math.max(0.45, 1 - index * 0.09),
      }, st.g)
      const labelX = st.x0 + st.pw * 0.7
      K.el('text', { x: labelX, y: top + step / 2 - 2, 'font-size': 12, fill: palette.text, text: `${row.label} ${(spec.format ?? K.fmt)(row.value)}` }, st.g)
      if (index > 0) {
        const rate = data[index - 1].value === 0 ? 0 : Math.round((row.value / data[index - 1].value) * 100)
        K.el('text', { x: labelX, y: top + step / 2 + 14, 'font-size': 10.5, fill: palette.faint, text: `${rate}% of previous` }, st.g)
      }
      polygon.addEventListener('pointerenter', () => {
        ui.tooltip.show(center, top, `${escapeHtml(row.label)}<br><b>${(spec.format ?? K.fmt)(row.value)}</b>`)
      })
      polygon.addEventListener('pointerleave', () => ui.tooltip.hide())
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  /**
   * Bullet: one value against a target and qualitative ranges. The value bar is
   * thinner than the bands so all three layers remain visible.
   */
  function drawBullet(host, spec, ui) {
    const palette = K.theme(host)
    const labels = (spec.labels ?? []).map(String)
    const values = (spec.series?.[0]?.values ?? []).map(Number)
    const targets = Array.isArray(spec.targets) ? spec.targets.map(Number) : []
    const rows = labels.map((label, index) => ({ label, value: values[index], target: targets[index] }))
      .filter((row) => Number.isFinite(row.value))
    if (rows.length === 0) return drawEmpty(ui)
    const top = Math.max(...rows.map((row) => Math.max(row.value, Number.isFinite(row.target) ? row.target : 0)), 1) * 1.05
    const st = K.stage(ui.body, {
      width: 680, height: spec.height ?? Math.max(170, rows.length * 48 + 54),
      margin: { t: 14, r: 22, b: 30, l: Math.min(190, Math.max(88, longest(rows.map((row) => row.label)) * 6.6)) },
      label: spec.title ?? 'bullet chart',
    })
    const x = K.linear([0, top], [st.x0, st.x0 + st.pw])
    const y = K.band(rows.map((row) => row.label), [st.y0, st.y0 + st.ph], 0.34)
    x.ticks(5).forEach((value) => {
      K.el('line', { x1: x(value), x2: x(value), y1: st.y0, y2: st.y0 + st.ph, stroke: palette.line, 'stroke-width': 0.6 }, st.g)
    })
    K.axisXLinear(st, x, { count: 5 })
    const ranges = (Array.isArray(spec.ranges) && spec.ranges.length === 3 ? spec.ranges.map(Number) : [top * 0.6, top * 0.85, top])
      .map((value) => K.clamp(Number.isFinite(value) ? value : top, 0, top))
    rows.forEach((row) => {
      const cy = y(row.label) + y.bw / 2
      K.el('rect', { x: st.x0, y: y(row.label), width: x(ranges[2]) - st.x0, height: y.bw, fill: palette.line, 'fill-opacity': 0.55, rx: 2 }, st.g)
      K.el('rect', { x: st.x0, y: y(row.label), width: x(ranges[1]) - st.x0, height: y.bw, fill: palette.line, 'fill-opacity': 0.9, rx: 2 }, st.g)
      K.el('rect', { x: st.x0, y: y(row.label), width: x(ranges[0]) - st.x0, height: y.bw, fill: palette.faint, 'fill-opacity': 0.35, rx: 2 }, st.g)
      const bar = K.el('rect', { x: st.x0, y: cy - y.bw / 6, width: Math.max(1, x(row.value) - st.x0), height: y.bw / 3, fill: K.PALETTE[0], rx: 1.5 }, st.g)
      if (Number.isFinite(row.target)) {
        K.el('line', { x1: x(row.target), x2: x(row.target), y1: y(row.label) + 2, y2: y(row.label) + y.bw - 2, stroke: palette.text, 'stroke-width': 2.5 }, st.g)
      }
      K.el('text', { x: st.x0 - 8, y: cy + 4, 'text-anchor': 'end', 'font-size': 11, fill: palette.dim, text: truncate(row.label, 26) }, st.g)
      bar.addEventListener('pointerenter', () => {
        ui.tooltip.show(x(row.value), cy, `${escapeHtml(row.label)}<br>value <b>${(spec.format ?? K.fmt)(row.value)}</b>${Number.isFinite(row.target) ? `<br>target ${(spec.format ?? K.fmt)(row.target)}` : ''}`)
      })
      bar.addEventListener('pointerleave', () => ui.tooltip.hide())
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  /**
   * Density: a kernel estimate per group on one shared value axis. A histogram
   * shows the bins; this shows the shape without committing to a bin width.
   */
  function drawDensity(host, spec, ui, state) {
    const palette = K.theme(host)
    const all = densitySeries(spec)
    const series = all.filter((entry) => state.hidden[entry.name] !== true && entry.values.length > 1)
    if (series.length === 0) return drawEmpty(ui)
    const values = series.flatMap((entry) => entry.values)
    const [lo0, hi0] = K.extent(values)
    const pad = (hi0 - lo0) * 0.06 || 1
    const lo = lo0 - pad
    const hi = hi0 + pad
    const xs = seriesRange(lo, hi, 140)
    const curves = series.map((entry) => {
      const bw = bandwidthOf(entry.values)
      return { entry, ys: xs.map((value) => kdeOf(entry.values, bw, value)) }
    })
    const max = Math.max(...curves.flatMap((curve) => curve.ys)) * 1.08 || 1
    const st = K.stage(ui.body, {
      width: 680, height: spec.height ?? 300,
      margin: { t: 16, r: 18, b: 40, l: 54 },
      label: spec.title ?? 'density plot',
    })
    const x = K.linear([lo, hi], [st.x0, st.x0 + st.pw])
    const y = K.linear([0, max], [st.y0 + st.ph, st.y0])
    K.gridY(st, y, { count: 4, color: palette.line, format: (value) => value.toFixed(2) })
    K.axisXLinear(st, x, { count: 6 })
    curves.forEach((curve) => {
      const points = xs.map((value, index) => [x(value), y(curve.ys[index])])
      const area = `${linePath(points)} L${x(hi).toFixed(1)},${(st.y0 + st.ph).toFixed(1)} L${x(lo).toFixed(1)},${(st.y0 + st.ph).toFixed(1)} Z`
      K.el('path', { d: area, fill: curve.entry.color, 'fill-opacity': 0.16, stroke: 'none' }, st.g)
      K.el('path', { d: linePath(points), fill: 'none', stroke: curve.entry.color, 'stroke-width': 2 }, st.g)
    })
    if (all.length > 1) {
      K.legend(ui.head, all.map((entry) => ({ name: entry.name, color: entry.color, on: state.hidden[entry.name] !== true })), (name, on) => {
        if (on) delete state.hidden[name]
        else state.hidden[name] = true
        rerender(host, spec, ui, state)
      })
    }
    const move = (event) => {
      const rect = st.svg.getBoundingClientRect()
      const scale = 680 / (rect.width || 680)
      const px = (event.clientX - rect.left) * scale
      if (px < st.x0 || px > st.x0 + st.pw) { ui.tooltip.hide(); return }
      const value = x.invert(px)
      const lines = curves.map((curve) => `<span style="color:${curve.entry.color}">●</span> ${escapeHtml(curve.entry.name)} <b>${kdeOf(curve.entry.values, bandwidthOf(curve.entry.values), value).toFixed(3)}</b>`)
      ui.tooltip.show(px, st.y0 + 12, `${(spec.format ?? K.fmt)(value)}<br>${lines.join('<br>')}`)
    }
    st.svg.addEventListener('pointermove', move)
    st.svg.addEventListener('pointerleave', () => ui.tooltip.hide())
    ui.note.textContent = spec.hint ?? ''
    return () => { st.svg.removeEventListener('pointermove', move) }
  }

  /**
   * ECDF: the share of observations at or below each value. No bins, so two
   * groups compare without choosing a bin width.
   */
  function drawEcdf(host, spec, ui, state) {
    const palette = K.theme(host)
    const all = densitySeries(spec).map((entry) => ({ ...entry, values: unitSorted(entry.values) }))
    const series = all.filter((entry) => state.hidden[entry.name] !== true && entry.values.length > 0)
    if (series.length === 0) return drawEmpty(ui)
    const values = series.flatMap((entry) => entry.values)
    const [lo0, hi0] = K.extent(values)
    const pad = (hi0 - lo0) * 0.04 || 1
    const lo = lo0 - pad
    const hi = hi0 + pad
    const st = K.stage(ui.body, {
      width: 680, height: spec.height ?? 300,
      margin: { t: 16, r: 18, b: 40, l: 54 },
      label: spec.title ?? 'ecdf plot',
    })
    const x = K.linear([lo, hi], [st.x0, st.x0 + st.pw])
    const y = K.linear([0, 1], [st.y0 + st.ph, st.y0])
    K.gridY(st, y, { count: 5, color: palette.line, format: (value) => `${Math.round(value * 100)}%` })
    K.axisXLinear(st, x, { count: 6 })
    series.forEach((entry) => {
      const sorted = entry.values
      const n = sorted.length
      let d = `M${x(sorted[0]).toFixed(1)},${y(0).toFixed(1)}`
      sorted.forEach((value, index) => {
        d += `L${x(value).toFixed(1)},${y(index / n).toFixed(1)}L${x(value).toFixed(1)},${y((index + 1) / n).toFixed(1)}`
      })
      d += `L${x(sorted[n - 1]).toFixed(1)},${y(1).toFixed(1)}`
      K.el('path', { d, fill: 'none', stroke: entry.color, 'stroke-width': 2 }, st.g)
    })
    if (all.length > 1) {
      K.legend(ui.head, all.map((entry) => ({ name: entry.name, color: entry.color, on: state.hidden[entry.name] !== true })), (name, on) => {
        if (on) delete state.hidden[name]
        else state.hidden[name] = true
        rerender(host, spec, ui, state)
      })
    }
    const move = (event) => {
      const rect = st.svg.getBoundingClientRect()
      const scale = 680 / (rect.width || 680)
      const px = (event.clientX - rect.left) * scale
      if (px < st.x0 || px > st.x0 + st.pw) { ui.tooltip.hide(); return }
      const value = x.invert(px)
      const lines = series.map((entry) => {
        const share = entry.values.filter((item) => item <= value).length / entry.values.length
        return `<span style="color:${entry.color}">●</span> ${escapeHtml(entry.name)} <b>${(share * 100).toFixed(1)}%</b>`
      })
      ui.tooltip.show(px, st.y0 + 12, `${(spec.format ?? K.fmt)(value)}<br>${lines.join('<br>')}`)
    }
    st.svg.addEventListener('pointermove', move)
    st.svg.addEventListener('pointerleave', () => ui.tooltip.hide())
    ui.note.textContent = spec.hint ?? ''
    return () => { st.svg.removeEventListener('pointermove', move) }
  }

  /**
   * Violin: the full shape of each group, mirrored around its band, with a
   * narrow box and median inside. Bimodality shows here; a box hides it.
   */
  function drawViolin(host, spec, ui) {
    const palette = K.theme(host)
    const groups = densitySeries(spec).filter((entry) => entry.values.length > 0)
    if (groups.length === 0) return drawEmpty(ui)
    const all = groups.flatMap((group) => group.values)
    const [lo0, hi0] = K.extent(all)
    const pad = (hi0 - lo0) * 0.06 || 1
    const lo = lo0 - pad
    const hi = hi0 + pad
    const st = K.stage(ui.body, {
      width: 680, height: spec.height ?? 300,
      margin: { t: 16, r: 18, b: 44, l: 50 },
      label: spec.title ?? 'violin plot',
    })
    const x = K.band(groups.map((group) => group.name), [st.x0, st.x0 + st.pw], 0.32)
    const y = K.linear([lo, hi], [st.y0 + st.ph, st.y0])
    K.gridY(st, y, { count: 5, color: palette.line })
    K.axisX(st, x)
    groups.forEach((group) => {
      const sorted = unitSorted(group.values)
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      const ys = seriesRange(min, max, 70)
      const bw = bandwidthOf(sorted)
      const density = ys.map((value) => kdeOf(sorted, bw, value))
      const peak = Math.max(...density) || 1
      const half = x.bw / 2
      const center = x(group.name) + half
      const right = ys.map((value, index) => [center + (density[index] / peak) * half, y(value)])
      const left = ys.map((value, index) => [center - (density[index] / peak) * half, y(value)]).reverse()
      const shape = K.el('path', { d: `${linePath(right.concat(left))} Z`, fill: group.color, 'fill-opacity': 0.24, stroke: group.color, 'stroke-width': 1.5 }, st.g)
      const q1 = quantileOf(sorted, 0.25)
      const median = quantileOf(sorted, 0.5)
      const q3 = quantileOf(sorted, 0.75)
      K.el('rect', { x: center - 4, y: y(q3), width: 8, height: Math.max(1, y(q1) - y(q3)), fill: group.color, 'fill-opacity': 0.55 }, st.g)
      K.el('line', { x1: center - 7, x2: center + 7, y1: y(median), y2: y(median), stroke: palette.surface, 'stroke-width': 2 }, st.g)
      shape.addEventListener('pointerenter', () => {
        ui.tooltip.show(center, y(q3), `${escapeHtml(group.name)}<br>median <b>${(spec.format ?? K.fmt)(median)}</b><br>IQR ${(spec.format ?? K.fmt)(q1)}–${(spec.format ?? K.fmt)(q3)}<br>n = ${sorted.length}`)
      })
      shape.addEventListener('pointerleave', () => ui.tooltip.hide())
    })
    ui.note.textContent = spec.hint ?? ''
    return () => {}
  }

  /* ------------------------------------------------------------------ helpers */

  function drawEmpty(ui) {
    K.el('div', { text: 'No data for this visual.', style: { fontSize: '12px', color: 'var(--vz-faint,#8a8782)', padding: '24px 0' } }, ui.body)
    return () => {}
  }

  function rerender(host, spec, _ui, state) {
    render(host, spec, state)
  }

  function tipHtml(label, value, spec) {
    return `${escapeHtml(label)}<br><b>${(spec.format ?? K.fmt)(value)}</b>`
  }

  function longest(list) {
    return list.reduce((max, value) => Math.max(max, String(value).length), 0)
  }

  function truncate(text, max) {
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`
  }

  /** Distribution specs carry raw observations in `series[].values`. */
  function densitySeries(spec) {
    const list = Array.isArray(spec.series)
      ? spec.series
      : Array.isArray(spec.values) ? [{ name: spec.name ?? spec.title ?? 'Values', values: spec.values }] : []
    return list.map((entry, index) => ({
      name: String(entry?.name ?? `Series ${index + 1}`),
      color: entry?.color ?? K.PALETTE[index % K.PALETTE.length],
      values: (entry?.values ?? entry?.data ?? []).map(Number).filter(Number.isFinite),
    })).filter((entry) => entry.values.length > 0)
  }

  /** Sorted copy without mutating the spec. */
  function unitSorted(values) {
    return [...values].sort((a, b) => a - b)
  }

  /** Linear-interpolated quantile, matching the box-plot definition. */
  function quantileOf(sorted, probability) {
    const position = (sorted.length - 1) * probability
    const base = Math.floor(position)
    const rest = position - base
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base]
  }

  function meanOf(values) {
    return K.sum(values) / (values.length || 1)
  }

  function sdOf(values) {
    const mean = meanOf(values)
    return Math.sqrt(K.sum(values.map((value) => (value - mean) ** 2)) / Math.max(1, values.length - 1))
  }

  /** Silverman's rule; a flat group still needs a positive width. */
  function bandwidthOf(values) {
    const width = 1.06 * sdOf(values) * Math.pow(values.length || 1, -0.2)
    return Number.isFinite(width) && width > 0 ? width : 1
  }

  function kdeOf(values, bandwidth, at) {
    const n = values.length || 1
    const total = K.sum(values.map((value) => Math.exp(-0.5 * ((at - value) / bandwidth) ** 2)))
    return total / (n * bandwidth * Math.sqrt(2 * Math.PI))
  }

  /** Evenly spaced samples, including both ends. */
  function seriesRange(lo, hi, count) {
    if (count <= 1 || hi === lo) return Array.from({ length: Math.max(2, count) }, () => lo)
    return Array.from({ length: count }, (_, index) => lo + ((hi - lo) * index) / (count - 1))
  }

  /** An SVG path through [x, y] points, with stable decimals. */
  function linePath(points) {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${Number(point[0]).toFixed(1)},${Number(point[1]).toFixed(1)}`).join(' ')
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  }

  function arcPath(cx, cy, r, inner, a0, a1) {
    const large = a1 - a0 > Math.PI ? 1 : 0
    const x0 = cx + Math.cos(a0) * r
    const y0 = cy + Math.sin(a0) * r
    const x1 = cx + Math.cos(a1) * r
    const y1 = cy + Math.sin(a1) * r
    if (inner === 0) return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`
    const x2 = cx + Math.cos(a1) * inner
    const y2 = cy + Math.sin(a1) * inner
    const x3 = cx + Math.cos(a0) * inner
    const y3 = cy + Math.sin(a0) * inner
    return `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${inner},${inner} 0 ${large} 0 ${x3},${y3} Z`
  }

  /* ------------------------------------------------------------------- public */

  const DRAW = {
    bar: drawBar, hbar: drawBar, stacked: drawStacked, line: drawLine, area: drawLine,
    scatter: drawScatter, hist: drawHist, box: drawBox, heat: drawHeat, donut: drawDonut, stat: drawStat,
    waterfall: drawWaterfall, dumbbell: drawDumbbell, slope: drawSlope, pareto: drawPareto,
    funnel: drawFunnel, bullet: drawBullet, density: drawDensity, ecdf: drawEcdf, violin: drawViolin,
  }

  /**
   * Render a spec into a host element.
   * @param {Element} host
   * @param {object} spec chart description
   * @param {object} [carry] state kept across re-renders (zoom, hidden series, bins)
   * @returns {{destroy:() => void}}
   */
  function render(host, spec, carry) {
    if (!host) throw new Error('render needs a host element')
    const state = carry ?? { selected: null, hidden: {}, zoom: null, bins: spec.bins }
    state.selected ??= null
    state.hidden ??= {}
    const ui = mount(host, spec)
    const draw = DRAW[spec.type] ?? drawBar
    const cleanup = draw(host, spec, ui, state) ?? (() => {})
    ui.tooltip = K.tip(ui.body)
    if (spec.caption) K.el('div', { text: spec.caption, style: { fontSize: '12px', color: 'var(--vz-dim,#5f5e5a)', marginTop: '8px', lineHeight: '1.5' } }, host)
    return {
      destroy() {
        try { cleanup() } catch { /* the host may already be gone */ }
        host.innerHTML = ''
      },
      state,
    }
  }

  return { render, types: TYPES, helpers: { rows, seriesOf } }
})
