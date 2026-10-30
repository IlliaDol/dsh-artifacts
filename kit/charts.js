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

  const TYPES = ['bar', 'hbar', 'stacked', 'line', 'area', 'scatter', 'hist', 'box', 'heat', 'donut', 'stat']

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
      ? K.band(keys, [st.y0, st.y0 + st.ph], 0.24)
      : K.band(keys, [st.x0, st.x0 + st.pw], 0.24)
    K.gridY(st, horizontal ? K.linear([min, max], [st.x0, st.x0 + st.pw]) : value, {
      count: 5,
      color: palette.line,
      // vertical gridlines for a horizontal chart read as a second axis; skip them
      ...(horizontal ? { color: 'transparent' } : {}),
    })
    if (!horizontal) K.axisX(st, band, { every: data.length > 14 ? Math.ceil(data.length / 14) : 1 })

    const marks = []
    data.forEach((d, i) => {
      const color = d.color ?? K.PALETTE[i % K.PALETTE.length]
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
    ui.note.textContent = spec.hint ?? 'Hover a bar for its value · click to isolate it'
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
    ui.note.textContent = spec.hint ?? 'Hover a segment · toggle a series in the legend'
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
    ui.note.textContent = spec.hint ?? 'Hover for values · drag across the plot to zoom · double-click to reset'
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
    ui.note.textContent = spec.hint ?? 'Hover a point for its values · click to pin'
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
    ui.note.textContent = spec.hint ?? `n = ${values.length} · widen or narrow the bins`
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
    ui.note.textContent = spec.hint ?? 'Hover a box for median, IQR and n'
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
        const value = Number(values[i]?.[j])
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
    ui.note.textContent = spec.hint ?? 'Hover a cell for its value'
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
    ui.note.textContent = spec.hint ?? 'Hover a slice · click to isolate'
    return () => {}
  }

  function drawStat(host, spec, ui) {
    const box = K.el('div', { style: { display: 'flex', gap: '18px', flexWrap: 'wrap' } }, ui.body)
    for (const item of spec.items ?? []) {
      const cell = K.el('div', { style: { minWidth: '120px', padding: '10px 12px', border: '1px solid var(--vz-line,#e4e2da)', borderRadius: '8px' } }, box)
      K.el('div', { text: String(item.label ?? ''), style: { fontSize: '11px', color: 'var(--vz-faint,#8a8782)', marginBottom: '4px' } }, cell)
      K.el('div', { text: String(item.value ?? ''), style: { fontSize: '22px', color: 'var(--vz-text,#1b1b19)', fontVariantNumeric: 'tabular-nums' } }, cell)
      if (item.delta) K.el('div', { text: String(item.delta), style: { fontSize: '11px', color: item.delta.startsWith('-') ? '#c0453d' : '#1b7a4b', marginTop: '3px' } }, cell)
    }
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
