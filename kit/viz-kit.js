/**
 * viz-kit — the small, dependency-free layer every visual in this repo uses.
 *
 * It is deliberately boring: scales, axes, a tooltip, pointer dragging, an
 * animation loop, and theme tokens. Interaction lives here so a recipe never
 * re-implements "hover shows the value" or "drag rotates the scene".
 *
 * Works as a browser global (window.VK), in Node (module.exports) and inside the
 * DSH widget iframe, where the whole file is inlined.
 */
(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  root.VK = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  /* ------------------------------------------------------------------ tokens */

  // Fixed order, never re-ordered per chart: series 3 is always aqua.
  const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']

  const FONT = 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

  /**
   * Read a theme token with a light-mode fallback, so the same recipe renders on
   * a dark app surface and on a white page.
   * @param {Element} [host] element to read computed styles from
   * @returns {{text:string, dim:string, faint:string, line:string, surface:string, accent:string}}
   */
  function theme(host) {
    const read = (name, fallback) => {
      try {
        const el = host instanceof Element ? host : document.documentElement
        const value = getComputedStyle(el).getPropertyValue(name).trim()
        if (value !== '') return value
      } catch {
        /* no DOM, or the token is absent */
      }
      return fallback
    }
    return {
      text: read('--vz-text', read('--dsw-alias-label-primary', '#1b1b19')),
      dim: read('--vz-dim', read('--dsw-alias-label-secondary', '#5f5e5a')),
      faint: read('--vz-faint', read('--dsw-alias-label-tertiary', '#8a8782')),
      line: read('--vz-line', read('--dsw-alias-border-l2', '#e4e2da')),
      surface: read('--vz-surface', read('--dsw-alias-bg-layer-1', '#ffffff')),
      accent: read('--vz-accent', '#2a78d6'),
    }
  }

  /* ------------------------------------------------------------------ numbers */

  /**
   * Round for display and add thousands separators when useful.
   * @param {number} value
   * @param {number} [digits] fixed decimals; omit for automatic
   * @returns {string}
   */
  function fmt(value, digits) {
    if (!Number.isFinite(value)) return '—'
    const abs = Math.abs(value)
    if (digits !== undefined) return value.toFixed(digits)
    if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`
    if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`
    if (abs >= 1e4) return `${(value / 1e3).toFixed(1)}k`
    if (abs >= 100) return String(Math.round(value))
    if (abs >= 1) return String(Math.round(value * 10) / 10)
    if (abs === 0) return '0'
    return String(Math.round(value * 100) / 100)
  }

  /**
   * A small deterministic generator, so every reload draws the same picture.
   * @param {number} seed
   * @returns {() => number} values in [0, 1)
   */
  function rng(seed) {
    let s = seed >>> 0
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296
      return s / 4294967296
    }
  }

  /**
   * Box-Muller normal sample.
   * @param {() => number} random
   * @returns {number}
   */
  function normal(random) {
    const u = Math.max(random(), 1e-9)
    const v = random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
  const lerp = (a, b, t) => a + (b - a) * t
  const sum = (values) => values.reduce((a, b) => a + b, 0)
  const extent = (values) => [Math.min(...values), Math.max(...values)]

  /**
   * Evenly spaced, human-round ticks.
   * @param {number} lo
   * @param {number} hi
   * @param {number} count target count
   * @returns {number[]}
   */
  function ticks(lo, hi, count) {
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo) return [lo]
    const raw = (hi - lo) / Math.max(1, count)
    const mag = Math.pow(10, Math.floor(Math.log10(raw)))
    const norm = raw / mag
    const step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag
    const out = []
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Math.round(v / step) * step)
    return out
  }

  /* ------------------------------------------------------------------- scales */

  /**
   * Continuous scale.
   * @param {[number, number]} domain
   * @param {[number, number]} range
   * @returns {((v:number)=>number) & {invert:(p:number)=>number, domain:[number,number], range:[number,number], ticks:(n?:number)=>number[]}}
   */
  function linear(domain, range) {
    const [d0, d1] = domain
    const [r0, r1] = range
    const span = d1 - d0 || 1
    const fn = (v) => r0 + ((v - d0) / span) * (r1 - r0)
    fn.invert = (p) => d0 + ((p - r0) / (r1 - r0 || 1)) * span
    fn.domain = [d0, d1]
    fn.range = [r0, r1]
    fn.ticks = (n = 5) => ticks(d0, d1, n)
    return fn
  }

  /**
   * Discrete band scale.
   * @param {readonly string[]} keys
   * @param {[number, number]} range
   * @param {number} [padding] 0..0.9
   */
  function band(keys, range, padding = 0.22) {
    const [r0, r1] = range
    const step = (r1 - r0) / Math.max(1, keys.length)
    const bw = step * (1 - padding)
    const index = new Map(keys.map((k, i) => [k, i]))
    const fn = (key) => r0 + (index.get(key) ?? 0) * step + (step - bw) / 2
    fn.bw = bw
    fn.step = step
    fn.keys = keys
    fn.index = (key) => index.get(key) ?? -1
    return fn
  }

  /* ---------------------------------------------------------------------- DOM */

  const SVG_NS = 'http://www.w3.org/2000/svg'

  /**
   * Create an element and set attributes in one call.
   * @param {string} tag
   * @param {Record<string, unknown>} [attrs]
   * @param {Element} [parent]
   * @returns {any}
   */
  function el(tag, attrs, parent) {
    const node = tag === 'svg' || tag === 'g' || tag === 'path' || tag === 'text' || tag === 'line' || tag === 'rect' || tag === 'circle'
      ? document.createElementNS(SVG_NS, tag)
      : document.createElement(tag)
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null) continue
        if (key === 'text') node.textContent = String(value)
        else if (key === 'html') node.innerHTML = String(value)
        else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value)
        else if (key === 'class') node.setAttribute('class', String(value))
        else node.setAttribute(key, String(value))
      }
    }
    if (parent) parent.appendChild(node)
    return node
  }

  /**
   * A responsive SVG stage with margins.
   * @param {Element} host
   * @param {{width?:number, height?:number, margin?:{t:number,r:number,b:number,l:number}, label?:string}} [options]
   */
  function stage(host, options = {}) {
    const width = options.width ?? 680
    const height = options.height ?? 300
    const m = options.margin ?? { t: 18, r: 18, b: 34, l: 46 }
    host.innerHTML = ''
    const svg = el('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: '100%',
      height,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': options.label ?? 'chart',
      style: { display: 'block', overflow: 'visible', fontFamily: FONT },
    }, host)
    const g = el('g', {}, svg)
    return {
      svg,
      g,
      W: width,
      H: height,
      m,
      pw: width - m.l - m.r,
      ph: height - m.t - m.b,
      x0: m.l,
      y0: m.t,
    }
  }

  /**
   * Horizontal grid plus value labels on the left axis.
   * @param {ReturnType<typeof stage>} st
   * @param {(v:number)=>number} y
   * @param {{count?:number, color?:string, format?:(v:number)=>string}} [options]
   */
  function gridY(st, y, options = {}) {
    const t = theme(st.svg)
    const values = y.ticks(options.count ?? 5)
    const g = el('g', {}, st.g)
    for (const value of values) {
      const py = y(value)
      el('line', { x1: st.x0, x2: st.x0 + st.pw, y1: py, y2: py, stroke: options.color ?? t.line, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g)
      el('text', {
        x: st.x0 - 8, y: py + 4, 'text-anchor': 'end', 'font-size': 11, fill: t.faint, text: (options.format ?? fmt)(value),
      }, g)
    }
    return g
  }

  /**
   * Category labels below the plot.
   * @param {ReturnType<typeof stage>} st
   * @param {any} x band scale
   * @param {{every?:number, rotate?:boolean}} [options]
   */
  function axisX(st, x, options = {}) {
    const t = theme(st.svg)
    const every = options.every ?? 1
    const g = el('g', {}, st.g)
    x.keys.forEach((key, i) => {
      if (i % every !== 0) return
      el('text', {
        x: x(key) + x.bw / 2,
        y: st.y0 + st.ph + 18,
        'text-anchor': options.rotate ? 'end' : 'middle',
        'font-size': 11,
        fill: t.faint,
        text: key,
        ...(options.rotate ? { transform: `rotate(-35 ${x(key) + x.bw / 2} ${st.y0 + st.ph + 18})` } : {}),
      }, g)
    })
    return g
  }

  /**
   * Continuous x axis labels and baseline.
   * @param {ReturnType<typeof stage>} st
   * @param {(v:number)=>number} x
   * @param {{count?:number, format?:(v:number)=>string, at?:number[]}} [options] explicit `at` values win, which lets a labelled axis tick once per category
   */
  function axisXLinear(st, x, options = {}) {
    const t = theme(st.svg)
    const g = el('g', {}, st.g)
    const values = Array.isArray(options.at) && options.at.length > 0 ? options.at : x.ticks(options.count ?? 6)
    for (const value of values) {
      const px = x(value)
      el('line', { x1: px, x2: px, y1: st.y0 + st.ph, y2: st.y0 + st.ph + 5, stroke: t.line }, g)
      el('text', {
        x: px, y: st.y0 + st.ph + 18, 'text-anchor': 'middle', 'font-size': 11, fill: t.faint, text: (options.format ?? fmt)(value),
      }, g)
    }
    return g
  }

  /* ---------------------------------------------------------------- interaction */

  /**
   * A tooltip that follows the pointer inside its host.
   * @param {Element} host positioned ancestor
   * @returns {{show:(x:number, y:number, html:string)=>void, hide:()=>void, node:HTMLElement}}
   */
  function tip(host) {
    const node = el('div', {
      class: 'vk-tip',
      style: {
        position: 'absolute', pointerEvents: 'none', zIndex: 20, padding: '6px 9px',
        borderRadius: '6px', fontSize: '12px', lineHeight: '1.45', whiteSpace: 'nowrap',
        background: 'rgba(24,24,22,.94)', color: '#f4f3ef', boxShadow: '0 4px 16px rgba(0,0,0,.22)',
        opacity: '0', transform: 'translate(-50%, -120%)', transition: 'opacity .12s ease',
      },
    })
    host.appendChild(node)
    return {
      node,
      show(x, y, html) {
        node.innerHTML = html
        node.style.left = `${x}px`
        node.style.top = `${y}px`
        node.style.opacity = '1'
      },
      hide() {
        node.style.opacity = '0'
      },
    }
  }

  /**
   * Pointer dragging with capture. Movement is in the element's own pixels.
   * @param {Element} node
   * @param {{onStart?:(p:Point)=>void, onMove?:(p:Point, d:Point, e:PointerEvent)=>void, onEnd?:(p:Point)=>void, cursor?:string}} handlers
   * @returns {() => void} dispose
   */
  function drag(node, handlers) {
    let start = null
    let last = null
    const point = (event) => {
      const rect = node.getBoundingClientRect()
      const scale = (node.viewBox && node.viewBox.baseVal && node.viewBox.baseVal.width) ? node.viewBox.baseVal.width / (rect.width || 1) : 1
      return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale, cx: event.clientX, cy: event.clientY }
    }
    const down = (event) => {
      if (event.button !== undefined && event.button !== 0) return
      start = point(event)
      last = start
      node.setPointerCapture?.(event.pointerId)
      if (handlers.cursor) node.style.cursor = handlers.cursor
      handlers.onStart?.(start)
    }
    const move = (event) => {
      if (start === null) return
      const now = point(event)
      handlers.onMove?.(now, { x: now.x - last.x, y: now.y - last.y }, event)
      last = now
      event.preventDefault()
    }
    const up = (event) => {
      if (start === null) return
      const now = point(event)
      start = null
      node.releasePointerCapture?.(event.pointerId)
      node.style.cursor = ''
      handlers.onEnd?.(now)
    }
    node.addEventListener('pointerdown', down)
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', up)
    return () => {
      node.removeEventListener('pointerdown', down)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
    }
  }

  /**
   * Frame loop with delta seconds, stopped when the node leaves the document.
   * @param {(dt:number, t:number)=>void} fn
   * @returns {() => void} stop
   */
  function loop(fn) {
    let raf = 0
    let last = 0
    let alive = true
    const step = (time) => {
      if (!alive) return
      const dt = last === 0 ? 1 / 60 : Math.min(0.05, (time - last) / 1000)
      last = time
      fn(dt, time / 1000)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }

  /**
   * Re-run fn when the host changes width (debounced by a frame).
   * @param {Element} host
   * @param {() => void} fn
   * @returns {() => void}
   */
  function onResize(host, fn) {
    if (typeof ResizeObserver !== 'function') return () => {}
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fn)
    })
    observer.observe(host)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }

  /**
   * A slider row above the plot. Value is passed back live.
   * @param {Element} host
   * @param {{label:string, min:number, max:number, step?:number, value:number, format?:(v:number)=>string, onInput:(v:number)=>void}} spec
   * @returns {HTMLElement}
   */
  function slider(host, spec) {
    const row = el('div', {
      class: 'vk-control',
      style: { display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12px', margin: '0 0 8px', color: 'var(--vz-dim, #5f5e5a)' },
    }, host)
    el('span', { text: spec.label, style: { whiteSpace: 'nowrap' } }, row)
    const input = el('input', {
      type: 'range', min: spec.min, max: spec.max, step: spec.step ?? 1, value: spec.value,
      'aria-label': spec.label,
      style: { flex: '1', accentColor: 'var(--vz-accent, #2a78d6)', minWidth: '0' },
    }, row)
    const out = el('b', { text: (spec.format ?? fmt)(spec.value), style: { fontVariantNumeric: 'tabular-nums', minWidth: '3ch', textAlign: 'right' } }, row)
    input.addEventListener('input', () => {
      const value = Number(input.value)
      out.textContent = (spec.format ?? fmt)(value)
      spec.onInput(value)
    })
    return row
  }

  /**
   * A clickable legend that toggles series.
   * @param {Element} host
   * @param {{name:string, color:string, on?:boolean}[]} entries
   * @param {(name:string, on:boolean)=>void} onChange
   * @returns {HTMLElement}
   */
  function legend(host, entries, onChange) {
    const row = el('div', { class: 'vk-legend', style: { display: 'flex', flexWrap: 'wrap', gap: '6px 14px', margin: '0 0 8px', fontSize: '12px' } }, host)
    for (const entry of entries) {
      const on = entry.on !== false
      const button = el('button', {
        type: 'button',
        'aria-pressed': String(on),
        style: {
          display: 'inline-flex', alignItems: 'center', gap: '6px', border: '0', padding: '2px 4px',
          background: 'none', cursor: 'pointer', color: 'var(--vz-dim, #5f5e5a)', fontSize: '12px',
          opacity: on ? '1' : '.42', fontFamily: 'inherit',
        },
      }, row)
      el('span', { style: { width: '9px', height: '9px', borderRadius: '2px', background: entry.color, display: 'inline-block' } }, button)
      el('span', { text: entry.name }, button)
      button.addEventListener('click', () => {
        const next = button.getAttribute('aria-pressed') !== 'true'
        button.setAttribute('aria-pressed', String(next))
        button.style.opacity = next ? '1' : '.42'
        onChange(entry.name, next)
      })
    }
    return row
  }

  /** Linear interpolation between palette stops. */
  function mix(a, b, t) {
    const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    const [r1, g1, b1] = parse(a)
    const [r2, g2, b2] = parse(b)
    const to = (v) => Math.round(v).toString(16).padStart(2, '0')
    return `#${to(lerp(r1, r2, t))}${to(lerp(g1, g2, t))}${to(lerp(b1, b2, t))}`
  }

  /**
   * Sequential ramp from pale blue to deep blue, for heatmaps.
   * @param {number} t 0..1
   */
  function ramp(t) {
    const stops = ['#eef4fd', '#cfe0f8', '#9dc2ef', '#5e97e0', '#2a78d6', '#1c4f96']
    const p = clamp(t, 0, 1) * (stops.length - 1)
    const i = Math.min(stops.length - 2, Math.floor(p))
    return mix(stops[i], stops[i + 1], p - i)
  }

  return {
    PALETTE, FONT, theme, fmt, rng, normal, clamp, lerp, sum, extent, ticks,
    linear, band, el, stage, gridY, axisX, axisXLinear,
    tip, drag, loop, onResize, slider, legend, mix, ramp,
  }
})
