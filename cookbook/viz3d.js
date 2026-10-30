/* viz3d.js: tiny helpers for animated and 3D canvas scenes (no WebGL, no libraries).
   A 3D scene = points [x,y,z] -> rotate -> perspective-project -> draw 2D shapes far-to-near.

   Vendored with the cookbook. Exposed as C3, not V3: dsh-artifacts already owns
   a V3 global for widgets, and recipes only reach this through Kit.v3. */
(function (root) {
  const K = root.Kit || (typeof require !== 'undefined' ? require('./viz-kit.js') : {});
  const V = {};
  V.rot = (p, ax, ay) => { const c = Math.cos(ay), s = Math.sin(ay), x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c, c2 = Math.cos(ax), s2 = Math.sin(ax); return [x, p[1] * c2 - z * s2, p[1] * s2 + z * c2]; };       // turn about y, then about x
  V.proj = (p, W, H, s, d = 4) => { const f = d / (d - p[2]); return [W / 2 + p[0] * s * f, H / 2 - p[1] * s * f, f]; };                                       // perspective: nearer (larger z) = bigger
  V.hsl = (h, s, l) => { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return `rgb(${f(0)},${f(8)},${f(4)})`; };
  V.canvas = (host, W, H) => { const cv = document.createElement('canvas'), dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1; cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'width:100%;height:auto;display:block;touch-action:none;cursor:grab;border-radius:8px'; host.appendChild(cv); const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); cv.__ctx = ctx; cv.__W = W; cv.__H = H; return { cv, ctx, W, H }; };
  V.drag = (cv, st) => { let d = null; cv.addEventListener('pointerdown', e => { d = [e.clientX, e.clientY]; cv.style.cursor = 'grabbing'; try { cv.setPointerCapture(e.pointerId); } catch (_) {} }); cv.addEventListener('pointermove', e => { if (!d) return; st.ay += (e.clientX - d[0]) * 0.01; st.ax = Math.max(-1.5, Math.min(1.5, st.ax + (e.clientY - d[1]) * 0.01)); d = [e.clientX, e.clientY]; }); const up = () => { d = null; cv.style.cursor = 'grab'; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); };
  V.loop = draw => {                                   // calls draw(dt) about 60 times a second until stop()
    if (V.manual) { const L = { tick: (n = 1) => { while (n-- > 0) draw(0.016); }, stop() {} }; draw(0.016); return L; }   // test mode: frames are advanced by hand
    let on = true, last = 0; const tick = t => { if (!on) return; draw(Math.min(0.05, (t - last) / 1000 || 0.016)); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); return { stop() { on = false; } };
  };
  K.v3 = V; if (typeof module !== 'undefined') module.exports = V; else root.C3 = V;
})(this);
