/**
 * Write one HTML file per artifact kind into examples/, plus an index.
 *
 * This is the visual check: open examples/index.html in a browser (or point a
 * headless browser at each file) after changing a renderer.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderArtifact } from '../lib/render.js';
import { normalize } from '../lib/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'examples');

const numberLine = `<h2 class="sr-only">A number line from 2% to 8%: expected 5.17%, observed 4.75%, with ±1 and ±2 wobble bands.</h2>
<svg viewBox="0 0 680 220" role="img" aria-labelledby="nl-title nl-desc">
  <title id="nl-title">Typical random wobble</title>
  <desc id="nl-desc">The expected share is 5.17%, the observed share 4.75%. The dark band is ±1 wobble (4.06 to 6.28%); the light band is ±2 (2.95 to 7.39%).</desc>
  <text x="340" y="18" text-anchor="middle" font-family="var(--font-sans)" font-size="13" fill="var(--text-2)">typical random wobble</text>
  <rect x="60" y="34" width="560" height="64" rx="10" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1"/>
  <rect x="150.7" y="34" width="278.7" height="64" fill="var(--border)"/>
  <rect x="215.3" y="34" width="207.2" height="64" fill="var(--accent)" opacity="0.55"/>
  <rect x="60" y="34" width="560" height="64" rx="10" fill="none" stroke="var(--border-strong)" stroke-width="1"/>
  <line x1="355.9" y1="30" x2="355.9" y2="102" stroke="var(--text)" stroke-width="2"/>
  <circle cx="316.7" cy="66" r="7" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
  <line x1="60" y1="112" x2="620" y2="112" stroke="var(--border-strong)" stroke-width="1"/>
  <g font-family="var(--font-sans)" font-size="12" fill="var(--muted)">
    <text x="60" y="130" text-anchor="middle">2%</text>
    <text x="153.3" y="130" text-anchor="middle">3%</text>
    <text x="246.7" y="130" text-anchor="middle">4%</text>
    <text x="340" y="130" text-anchor="middle">5%</text>
    <text x="433.3" y="130" text-anchor="middle">6%</text>
    <text x="526.7" y="130" text-anchor="middle">7%</text>
    <text x="620" y="130" text-anchor="middle">8%</text>
  </g>
  <g font-family="var(--font-sans)" font-size="12" fill="var(--text-2)">
    <circle cx="66" cy="150" r="3.5" fill="var(--text)"/>
    <text x="78" y="154">Black line = the share the normal curve predicts (5.17%)</text>
    <circle cx="66" cy="172" r="3.5" fill="var(--accent)"/>
    <text x="78" y="176">Orange dot = the share actually counted in the data (4.75%)</text>
    <circle cx="66" cy="194" r="3.5" fill="var(--border-strong)"/>
    <text x="78" y="198">Dark band = ±1 wobble (4.06 to 6.28%)</text>
    <circle cx="66" cy="214" r="3.5" fill="var(--border)"/>
    <text x="78" y="218">Light band = ±2 wobbles (2.95 to 7.39%)</text>
  </g>
</svg>`;

const dashboard = {
  type: 'bar',
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Signups', values: [120, 148, 139, 175, 190, 212] },
    { name: 'Activations', values: [70, 92, 88, 120, 131, 158] },
  ],
};

const quiz = {
  type: 'quiz',
  title: 'Wobble check',
  questions: [
    { question: 'Which band is ±1 wobble?', options: ['2.95–7.39%', '4.06–6.28%'], answer: 1, explanation: '±1 is the dark inner band.' },
    { question: 'The dot sits at 4.75%. Is that inside ±1?', options: ['Yes', 'No'], answer: 0, explanation: '4.75 is between 4.06 and 6.28.' },
  ],
};

const deck = {
  title: 'Q3 review',
  subtitle: 'Numbers, plainly',
  slides: [
    { layout: 'cover', title: 'Q3 review', subtitle: 'Numbers, plainly' },
    { layout: 'metrics', title: 'By the numbers', metrics: [{ label: 'Revenue', value: '€1.2M' }, { label: 'Churn', value: '1.8%' }, { label: 'Hires', value: '6' }] },
    { layout: 'bullets', title: 'Three facts', bullets: ['Revenue up 12% quarter over quarter', 'Churn flat at 1.8%', 'Six hires, all in support'] },
    { layout: 'quote', quote: 'The plan survived contact with the quarter.', attribution: 'Ops lead' },
    { layout: 'two-col', title: 'Now / next', leftTitle: 'Now', left: ['Ship v2 onboarding', 'Close two enterprise pilots'], rightTitle: 'Next', right: ['Measure activation', 'Hire one designer'] },
  ],
};

const design = {
  title: 'Checkout',
  boards: [
    { name: 'Phone · cart', w: 390, h: 844, html: `<div style="padding:32px 24px;font-family:ui-sans-serif;color:#141413;background:#faf9f5;height:100%"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a8782;margin:0 0 8px">Checkout</p><h1 style="font-family:Georgia,serif;font-size:30px;margin:0 0 24px">Your cart</h1><div style="background:#fff;border:1px solid #e4e0d7;border-radius:12px;padding:16px;margin-bottom:12px"><strong>Ceramic mug</strong><div style="color:#52514e;font-size:14px">€18.00</div></div><div style="background:#fff;border:1px solid #e4e0d7;border-radius:12px;padding:16px"><strong>Notebook</strong><div style="color:#52514e;font-size:14px">€12.00</div></div><button style="width:100%;margin-top:24px;padding:14px;border:0;border-radius:10px;background:#141413;color:#faf9f5;font-size:15px">Pay €30.00</button></div>` },
    { name: 'Desktop · empty', w: 1280, h: 800, html: `<div style="font-family:ui-sans-serif;color:#141413;background:#faf9f5;height:100%;display:flex"><aside style="width:220px;border-right:1px solid #e4e0d7;padding:24px"><strong>Shop</strong><p style="color:#8a8782;font-size:14px">Cart</p><p style="color:#8a8782;font-size:14px">Orders</p></aside><main style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px"><h2 style="font-family:Georgia,serif;font-size:28px;margin:0">Your cart is empty</h2><p style="color:#52514e;margin:0">Pick something from the shop.</p><button style="margin-top:16px;padding:10px 16px;border:1px solid #cfc9bd;border-radius:8px;background:#fff">Browse</button></main></div>` },
  ],
};

const doc = `# Launch memo

**To:** product, support, marketing  
**From:** Ilia  
**Date:** 27 October 2026

## Decision

Ship the artifact surface as one plugin, not three. The channels were never the
hard part; the store, the exports and a single vocabulary are.

## Why

- One tool is easier to teach than three fences.
- One store makes a deck and a chart the same kind of object: something with an
  id, an owner and an export.
- The dependency-free writer means a Word file can never fail because a
  converter was missing.

## What changes for support

| Today | After |
| --- | --- |
| "copy this into a doc" | Export from the card |
| Charts as screenshots | A live chart and its CSV |
| Decks rebuilt by hand | A deck, then PowerPoint |

> Treat every artifact as a file on disk, not as a secret store.

## Next

1. Attach images to pages through the store, not data URIs.
2. A gallery panel inside the chat.
3. Optionally: a PDF writer, if print pagination proves too loose.
`;

const cases = [
  ['widget-number-line', { kind: 'widget', title: 'Typical random wobble', surface: 'inline', content: numberLine }],
  ['chart-dashboard', { kind: 'chart', title: 'Signups and activations', surface: 'inline', content: JSON.stringify(dashboard) }],
  ['cards-quiz', { kind: 'cards', title: 'Wobble check', surface: 'inline', content: JSON.stringify(quiz) }],
  ['slides-q3', { kind: 'slides', title: 'Q3 review', surface: 'canvas', content: JSON.stringify(deck) }],
  ['design-checkout', { kind: 'design', title: 'Checkout screens', surface: 'canvas', content: JSON.stringify(design) }],
  ['doc-memo', { kind: 'doc', title: 'Launch memo', surface: 'page', content: doc }],
  ['page-calculator', {
    kind: 'page',
    title: 'Wobble calculator',
    surface: 'page',
    content: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wobble calculator</title>
<style>:root{--bg:#faf9f5;--text:#141413;--accent:#d97757;--border:#e4e0d7}@media (prefers-color-scheme:dark){:root{--bg:#141413;--text:#f0efec;--border:#33332f}}body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,-apple-system,sans-serif}
main{max-width:640px;margin:0 auto;padding:56px 24px}h1{font-family:Georgia,serif;font-size:34px;margin:0 0 8px}p{color:#52514e}
label{display:block;font-size:13px;margin:22px 0 6px;color:#52514e}input[type=range]{width:100%}output{font-variant-numeric:tabular-nums;font-weight:600}
.result{margin-top:28px;padding:18px;border:1px solid var(--border);border-radius:12px;background:#fff}@media (prefers-color-scheme:dark){.result{background:#1c1c1a}}
.value{font-size:40px;font-family:Georgia,serif;margin:4px 0 0}</style></head><body><main>
<h1>How big is a wobble?</h1><p>Pick an expected share and a sample size. The bands are the range a fair count lands in most of the time.</p>
<label for="share">Expected share <output id="share-out">5.17%</output></label><input id="share" type="range" min="1" max="20" step="0.01" value="5.17">
<label for="n">Sample size <output id="n-out">1000</output></label><input id="n" type="range" min="100" max="5000" step="100" value="1000">
<div class="result"><p style="margin:0;font-size:13px">±1 wobble</p><p class="value" id="band">4.06% – 6.28%</p></div>
<script>
var share=document.getElementById('share'),n=document.getElementById('n');
function update(){var p=Number(share.value)/100,nn=Number(n.value);var sd=Math.sqrt(p*(1-p)/nn)*100;
document.getElementById('share-out').textContent=(p*100).toFixed(2)+'%';
document.getElementById('n-out').textContent=nn;
document.getElementById('band').textContent=(p*100-sd).toFixed(2)+'% – '+(p*100+sd).toFixed(2)+'%';}
share.addEventListener('input',update);n.addEventListener('input',update);update();
</script></main></body></html>`,
  }],
];

await mkdir(out, { recursive: true });
const rows = [];
for (const [name, input] of cases) {
  const artifact = normalize(input);
  const { html } = renderArtifact(artifact);
  const file = `${name}.html`;
  await writeFile(join(out, file), html, 'utf8');
  rows.push({ name, file, kind: artifact.kind, title: artifact.title });
  console.log(`wrote examples/${file}`);
}

const index = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>dsh-artifacts examples</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:760px;margin:0 auto;padding:48px 24px;background:#faf9f5;color:#141413}
h1{font-family:Georgia,serif;font-size:34px}li{margin:10px 0}a{color:#8a3b22}code{background:#f0ede6;padding:2px 6px;border-radius:4px}</style></head><body>
<h1>Artifact examples</h1><p>One file per kind, rendered by <code>lib/render.js</code>.</p><ul>
${rows.map((row) => `<li><a href="${row.file}">${row.title}</a> <small>— ${row.kind}</small></li>`).join('\n')}
</ul></body></html>`;
await writeFile(join(out, 'index.html'), index, 'utf8');
console.log('wrote examples/index.html');
