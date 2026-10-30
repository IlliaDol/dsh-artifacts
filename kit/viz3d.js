/**
 * viz3d — canvas 2D with hand-written 3D maths.
 *
 * No WebGL, no Three.js: a rotation matrix, a perspective divide, a drag
 * handler and a frame loop. Small enough to inline in one widget, fast enough
 * for a few thousand points on a laptop.
 */
(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  root.V3 = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  /**
   * Rotate a point around X then Y.
   * @param {[number,number,number]} p
   * @param {number} ax radians around X
   * @param {number} ay radians around Y
   * @returns {[number,number,number]}
   */
  function rot([x, y, z], ax, ay) {
    const cy = Math.cos(ay)
    const sy = Math.sin(ay)
    const cx = Math.cos(ax)
    const sx = Math.sin(ax)
    const x1 = x * cy + z * sy
    const z1 = -x * sy + z * cy
    const y2 = y * cx - z1 * sx
    const z2 = y * sx + z1 * cx
    return [x1, y2, z2]
  }

  /**
   * Perspective projection into a W×H canvas.
   * @param {[number,number,number]} p
   * @param {number} w
   * @param {number} h
   * @param {number} [focal]
   * @param {number} [depth]
   * @returns {[number, number, number]} screen x, screen y, scale
   */
  function proj([x, y, z], w, h, focal = 110, depth = 5) {
    const k = focal / (z + depth)
    return [w / 2 + x * k, h / 2 + y * k, k / focal]
  }

  /**
   * A retina-sized canvas inside a host.
   * @param {Element} host
   * @param {number} w logical width
   * @param {number} h logical height
   */
  function canvas(host, w, h) {
    host.innerHTML = ''
    const cv = document.createElement('canvas')
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1)
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    cv.style.width = '100%'
    cv.style.height = `${h}px`
    cv.style.display = 'block'
    cv.style.touchAction = 'none'
    cv.setAttribute('role', 'img')
    const ctx = cv.getContext('2d')
    ctx.scale(dpr, dpr)
    host.appendChild(cv)
    return { cv, ctx, w, h, dpr }
  }

  /**
   * One-finger orbit: horizontal drag turns, vertical drag tilts.
   * @param {Element} node
   * @param {{ax:number, ay:number, spin?:boolean}} state
   * @param {{onChange?:()=>void}} [options]
   */
  function orbit(node, state, options = {}) {
    let dragging = false
    let last = [0, 0]
    let idle = 0
    const down = (event) => {
      dragging = true
      last = [event.clientX, event.clientY]
      node.setPointerCapture?.(event.pointerId)
      if ('spin' in state) state.spin = false
      idle = 0
    }
    const move = (event) => {
      if (!dragging) return
      const dx = event.clientX - last[0]
      const dy = event.clientY - last[1]
      last = [event.clientX, event.clientY]
      state.ay += dx * 0.008
      state.ax = Math.max(-1.35, Math.min(1.35, state.ax + dy * 0.006))
      options.onChange?.()
      event.preventDefault()
    }
    const up = (event) => {
      dragging = false
      node.releasePointerCapture?.(event.pointerId)
    }
    node.addEventListener('pointerdown', down)
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', up)
    node.style.cursor = 'grab'
    return () => {
      node.removeEventListener('pointerdown', down)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
    }
  }

  /** Cheap HSL→rgb, so a scene can colour by depth without a colour library. */
  function hsl(h, s, l) {
    const hh = ((h % 360) + 360) % 360
    const ss = s / 100
    const ll = l / 100
    const a = ss * Math.min(ll, 1 - ll)
    const f = (n) => {
      const k = (n + hh / 30) % 12
      return Math.round(255 * (ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
    }
    return `rgb(${f(0)},${f(8)},${f(4)})`
  }

  return { rot, proj, canvas, orbit, hsl }
})
