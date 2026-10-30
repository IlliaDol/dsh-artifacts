# Interactive explainers

7 recipes. Each one has: when to use it, the steps I follow, the full code, and what it combines with.
The code block is `fn.toString()` of the function that draws the picture in `gallery_all.html` and that passed my tests, so it is not a separate illustration.
All recipes use helpers from `viz-kit.js` (scales, axes, statistics, seeded sample data); the animated and 3D canvas scenes also use `viz3d.js` (rotate, project, canvas, drag, animation loop). Run one:

```js
const host = document.createElement('div'); document.body.appendChild(host);
RECIPES.find(r => r.id === 'ID').fn(host, Kit);   // map recipes also need Kit.geo = { d3, topojson, world }
```

---

## Bubble sort stepper

**Use it when:** Teach an algorithm step by step.

**How I do it**

1. State: the array, the position j being compared, and the number of passes done i. Step(): compare a[j] and a[j+1], swap if needed, advance j; at the end of a pass increase i.
2. Draw: bars; orange = being compared, green = already in final place, blue = rest.

**Code** (id `bubblesort`, has an automated interaction test)

```js
function draw(host, K) {
  const r = K.rng(6), N = 12; let a = Array.from({ length: N }, (_, i) => i + 1).sort(() => r() - 0.5), i = 0, j = 0, cmp = 0;
  const bar = document.createElement('div'); bar.style.cssText = 'margin-bottom:4px;font-size:12px'; bar.innerHTML = '<button>Step</button> <span></span>'; host.appendChild(bar); const view = document.createElement('div'); host.appendChild(view);
  const draw = (p, q) => { view.innerHTML = ''; const st = K.stage(view, 320, 170, { l: 4, r: 4, t: 4, b: 4 }), x = K.band(a.map((_, k) => k), 0, st.W, 0.15), y = K.linear(0, N, st.H, 0); a.forEach((v, k) => K.el('rect', { x: x(k), y: y(v), width: x.bw, height: st.H - y(v), rx: 3, fill: k === p || k === q ? K.C[1] : k >= N - i ? K.C[2] : K.C[0] }, st.g)); bar.querySelector('span').textContent = ' comparisons: ' + cmp; };
  const step = () => { if (i >= N - 1) return; cmp++; if (a[j] > a[j + 1]) { const t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; } draw(j, j + 1); j++; if (j >= N - 1 - i) { j = 0; i++; } };
  bar.querySelector('button').addEventListener('click', step); draw(-1, -1);
}
```

**Combines with:** Show the comparison count as a line chart growing with n.

---

## Gradient descent explorer

**Use it when:** Teach learning rates: too small is slow, too large overshoots or diverges.

**How I do it**

1. Loss = x^2, gradient = 2x. Update: x = x - learningRate * 2x.
2. Slider sets the learning rate; Run repeats the update and records the trail. With rate 0.5 it lands on 0 in one step; above 1.0 it diverges.

**Code** (id `gradientdescent`, has an automated interaction test)

```js
function draw(host, K) {
  const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = '<button>Run 8 steps</button> rate <input type="range" min="0.05" max="1.05" step="0.05" value="0.3"> <b>0.30</b>'; host.appendChild(ctl); const view = document.createElement('div'); host.appendChild(view);
  let trail = [-4]; const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 190, { l: 10, r: 10, t: 6, b: 18 }), x = K.linear(-5, 5, 0, st.W), y = K.linear(0, 25, st.H, 0); K.el('path', { d: K.path(K.range(-5, 5, 80).map(v => [x(v), y(v * v)])), fill: 'none', stroke: 'var(--muted,#898781)', 'stroke-width': 2 }, st.g); trail.forEach((v, i) => { if (Math.abs(v) <= 5) K.el('circle', { cx: x(v), cy: y(v * v), r: i === trail.length - 1 ? 7 : 3.5, fill: i === trail.length - 1 ? K.C[0] : K.C[1], 'fill-opacity': i === trail.length - 1 ? 1 : 0.6 }, st.g); }); };
  const rate = ctl.querySelector('input'); rate.addEventListener('input', () => { ctl.querySelector('b').textContent = (+rate.value).toFixed(2); trail = [-4]; draw(); });
  ctl.querySelector('button').addEventListener('click', () => { trail = [-4]; for (let i = 0; i < 8; i++) trail.push(trail[trail.length - 1] * (1 - 2 * rate.value)); draw(); }); draw();
}
```

**Combines with:** Plot loss against step number next to the parabola (linked views).

---

## Binary search visualiser

**Use it when:** Show why halving the search range is so fast.

**How I do it**

1. State: low and high indexes of the remaining range. Each step looks at the middle element and discards the half that cannot contain the target.
2. Draw all items as cells; dim the discarded ones; outline the current middle. 16 items need at most 4 steps.

**Code** (id `binsearch`, has an automated interaction test)

```js
function draw(host, K) {
  const N = 16, target = 11; let lo = 0, hi = N - 1, steps = 0, found = false;
  const bar = document.createElement('div'); bar.style.cssText = 'margin-bottom:4px;font-size:12px'; bar.innerHTML = '<button>Step</button> looking for <b>' + target + '</b> <span></span>'; host.appendChild(bar); const view = document.createElement('div'); host.appendChild(view);
  const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 90, { l: 4, r: 4, t: 8, b: 4 }), c = st.W / N, mid = (lo + hi) >> 1; for (let i = 0; i < N; i++) { const inside = i >= lo && i <= hi; K.el('rect', { x: i * c, y: 14, width: c - 2, height: 34, rx: 4, fill: found && i === mid ? K.C[2] : inside ? K.C[0] : 'var(--grid,#e1e0d9)', 'fill-opacity': inside ? 0.85 : 0.5, stroke: i === mid && !found ? K.C[1] : 'none', 'stroke-width': 2.5 }, st.g); K.text(st.g, i * c + c / 2 - 1, 36, i, { 'text-anchor': 'middle', fill: inside ? '#fff' : 'var(--muted,#888)' }); } bar.querySelector('span').textContent = ' steps: ' + steps + (found ? ' (found)' : ''); };
  bar.querySelector('button').addEventListener('click', () => { if (found || lo > hi) return; const mid = (lo + hi) >> 1; steps++; if (mid === target) found = true; else if (mid < target) lo = mid + 1; else hi = mid - 1; draw(); }); draw();
}
```

**Combines with:** Plot steps against list size to show the logarithmic growth.

---

## Compound interest calculator

**Use it when:** A formula with parameters people want to play with.

**How I do it**

1. Inputs: start amount, yearly rate, years (sliders). Formula: balance = start * (1 + rate)^year.
2. Redraw a line (balance by year) with an area underneath and print the final value. Sliders are the only state.

**Code** (id `compound`, has an automated interaction test)

```js
function draw(host, K) {
  const ctl = document.createElement('div'); ctl.style.cssText = 'font-size:12px;margin-bottom:4px'; ctl.innerHTML = 'rate % <input type="range" min="0" max="12" step="1" value="5"> <b></b>'; host.appendChild(ctl); const view = document.createElement('div'); host.appendChild(view);
  const draw = r => { view.innerHTML = ''; const yrs = K.range(0, 30, 31), v = yrs.map(t => 1000 * Math.pow(1 + r / 100, t)), st = K.stage(view, 320, 200, { l: 44 }), x = K.linear(0, 30, 0, st.W), y = K.linear(0, 1000 * Math.pow(1.12, 30), st.H, 0); K.axisY(st, y, 4, q => q === 0 ? '0' : Math.round(q / 1000) + 'k'); K.axisX(st, x, 5); const pts = v.map((q, i) => [x(i), y(q)]); K.el('path', { d: K.path(pts) + `L${x(30)} ${y(0)}L${x(0)} ${y(0)}Z`, fill: K.C[0], 'fill-opacity': 0.2 }, st.g); K.el('path', { d: K.path(pts), fill: 'none', stroke: K.C[0], 'stroke-width': 2 }, st.g); ctl.querySelector('b').textContent = ' ' + r + '% -> €' + Math.round(v[30]).toLocaleString('en-US') + ' after 30 years (from €1,000)'; };
  ctl.querySelector('input').addEventListener('input', e => draw(+e.target.value)); draw(5);
}
```

**Combines with:** Add a second scenario line for comparison.

---

## Quiz with instant feedback

**Use it when:** Check understanding while reading.

**How I do it**

1. Data: questions with options, the index of the right option and an explanation.
2. Render the options as buttons; on click mark the choice right/wrong, reveal the explanation and keep a running score. Next question redraws.

**Code** (id `quiz`, has an automated interaction test)

```js
function draw(host, K) {
  const Q = [['Which plot checks normality?', ['Pie chart', 'Q-Q plot', 'Gantt chart'], 1, 'A Q-Q plot compares sample quantiles with normal quantiles.'], ['What should a bar chart axis start at?', ['0', 'The minimum value', 'Anything'], 0, 'Bar length encodes value, so truncating the axis lies.']]; let i = 0, score = 0;
  const root = document.createElement('div'); root.style.fontSize = '13px'; host.appendChild(root);
  const draw = () => { if (i >= Q.length) { root.innerHTML = '<b>Score: ' + score + ' / ' + Q.length + '</b>'; return; } const [q, o, ans, why] = Q[i]; root.innerHTML = '<div style="font-weight:500;margin-bottom:6px">' + q + '</div>'; o.forEach((t, k) => { const b = document.createElement('button'); b.className = 'opt'; b.textContent = t; b.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0;padding:8px'; b.addEventListener('click', () => { if (root.dataset.done) return; root.dataset.done = 1; if (k === ans) score++; b.style.background = k === ans ? '#bfe9d6' : '#f5c2c0'; root.insertAdjacentHTML('beforeend', '<div style="margin-top:8px">' + (k === ans ? 'Correct. ' : 'Not quite. ') + why + '</div><button class="next" style="margin-top:6px">Next</button>'); root.querySelector('.next').addEventListener('click', () => { delete root.dataset.done; i++; draw(); }); }); root.appendChild(b); }); }; draw();
}
```

**Combines with:** Log answers to build a per-topic bar chart of strengths.

---

## Flashcards (flip)

**Use it when:** Memorising terms and definitions.

**How I do it**

1. State: current card index and whether it is flipped.
2. Clicking the card toggles the side; Next advances the index.

**Code** (id `flashcards`, has an automated interaction test)

```js
function draw(host, K) {
  const C = [['skewness', 'A measure of asymmetry of a distribution'], ['ROC curve', 'True positive rate vs false positive rate over all thresholds'], ['KDE', 'A smooth estimate of a density built from kernels']]; let i = 0, flip = 0;
  const root = document.createElement('div'); host.appendChild(root);
  const draw = () => { root.innerHTML = '<div class="fcard" style="cursor:pointer;background:var(--card,#f4f3ee);border-radius:12px;padding:30px 16px;text-align:center;font-size:' + (flip ? 14 : 20) + 'px;min-height:60px">' + C[i][flip] + '</div><div style="margin-top:8px;font-size:12px"><button class="n">Next</button> ' + (i + 1) + ' / ' + C.length + '</div>'; root.querySelector('.fcard').addEventListener('click', () => { flip ^= 1; draw(); }); root.querySelector('.n').addEventListener('click', () => { i = (i + 1) % C.length; flip = 0; draw(); }); }; draw();
}
```

**Combines with:** Track which cards were missed and show them again first (spaced repetition).

---

## Countdown timer

**Use it when:** Pomodoro-style focus sessions or exercises.

**How I do it**

1. State: seconds left and a timer handle. Every second subtract one and redraw; at zero stop.
2. Draw a ring whose arc length is the remaining fraction (K.arc) with the time as text in the middle.

**Code** (id `timer`, has an automated interaction test)

```js
function draw(host, K) {
  const T = 25 * 60; let left = T, h = null;
  const bar = document.createElement('div'); bar.style.marginBottom = '4px'; bar.innerHTML = '<button>Start</button> <button>Reset</button>'; host.appendChild(bar); const view = document.createElement('div'); host.appendChild(view);
  const draw = () => { view.innerHTML = ''; const st = K.stage(view, 320, 190, { t: 4, b: 4 }), cx = st.W / 2, cy = st.H / 2; K.el('circle', { cx, cy, r: 62, fill: 'none', stroke: 'var(--grid,#e1e0d9)', 'stroke-width': 10 }, st.g); if (left > 0) K.el('path', { d: K.arc(cx, cy, 57, 67, 0, Math.max(0.001, left / T * 2 * Math.PI - 0.001)), fill: K.C[1] }, st.g); K.text(st.g, cx, cy + 8, String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'), { 'text-anchor': 'middle', 'font-size': 28, fill: 'var(--text,#222)' }); };
  const [s, r] = bar.querySelectorAll('button'); s.addEventListener('click', () => { if (h) { clearInterval(h); h = null; s.textContent = 'Start'; } else { h = setInterval(() => { left = Math.max(0, left - 1); draw(); if (!left) { clearInterval(h); h = null; s.textContent = 'Start'; } }, 1000); s.textContent = 'Pause'; left -= 1; draw(); } });
  r.addEventListener('click', () => { if (h) { clearInterval(h); h = null; s.textContent = 'Start'; } left = T; draw(); }); draw();
}
```

**Combines with:** Record completed sessions and show them as a calendar heatmap.

---
