import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderArtifact, renderExport, toMarkdown, toRows } from '../lib/render.js';
import { normalize } from '../lib/schema.js';

/**
 * Build a normalized artifact fixture.
 * @param {string} kind artifact kind
 * @param {string} content source
 * @param {object} [extra] extra fields
 * @returns {any} artifact
 */
function artifact(kind, content, extra = {}) {
  return normalize({ kind, title: `${kind} fixture`, content, ...extra });
}

test('every rendered kind is a complete document with the frame bridge', () => {
  const sources = {
    widget: '<h2 class="sr-only">A chart</h2><p>5%</p>',
    chart: JSON.stringify({ type: 'bar', labels: ['a'], series: [{ name: 'S', values: [1] }] }),
    recipe: 'qq',
    cards: JSON.stringify({ type: 'steps', steps: [{ title: 'One' }, { title: 'Two' }] }),
    page: '<!doctype html><html><body><h1>Page</h1></body></html>',
    slides: JSON.stringify({ slides: [{ title: 'One' }] }),
    design: JSON.stringify({ boards: [{ name: 'A', html: '<h1>A</h1>' }] }),
    doc: '# Doc\n\nText.',
  };
  for (const [kind, content] of Object.entries(sources)) {
    const { html } = renderArtifact(artifact(kind, content));
    assert.equal(typeof html, 'string', kind);
    assert.match(html, /^<!doctype html>/u, `${kind} doctype`);
    assert.match(html, /dsh-artifact:height/u, `${kind} bridge`);
    assert.match(html, /<\/html>$/u, `${kind} closes`);
  }
});

test('file artifacts render no document', () => {
  assert.equal(renderArtifact(artifact('file', 'a,b', { format: 'csv' })).html, null);
});

test('an svg widget is centred and scaled', () => {
  const { html } = renderArtifact(artifact('widget', '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'));
  assert.match(html, /svg-wrap/u);
});

test('a chart is drawn by the bundled interactive kit, with no CDN', () => {
  const { html } = renderArtifact(artifact('chart', JSON.stringify({
    type: 'line',
    labels: ['Q1', 'Q2'],
    series: [{ name: 'Revenue', values: [12, 19] }],
  })));
  // Self-contained: the kit is inlined, so the document works offline and inside
  // a sandbox with the network blocked.
  assert.equal(html.includes('cdnjs.cloudflare.com'), false);
  assert.match(html, /root\.VC = api/u);
  assert.match(html, /VC\.render\(host/u);
  assert.match(html, /role="group"/u);
  assert.match(html, /aria-label="chart fixture/u);
  assert.match(html, /<details class="data">/u);
  assert.match(html, /Revenue/u);
});

test('a recipe draws with the vendored kit and its exact pack', () => {
  const { html, data } = renderArtifact(artifact('recipe', 'qq'));
  assert.equal(data.id, 'qq');
  assert.match(html, /root\.Kit = K/u);
  assert.match(html, /__dshRecipePack/u);
  assert.match(html, /Q-Q plot/u);
  assert.match(html, /class="sr-only"/u);
  assert.match(renderExport(artifact('recipe', 'qq'), 'md').bytes.toString(), /## Code/u);
});

test('an unknown recipe fails with the nearest ids', () => {
  assert.throws(() => renderArtifact(artifact('recipe', 'qqq')), /unknown recipe/u);
});

test('every chart form the schema accepts reaches the kit', () => {
  const forms = [
    { type: 'bar', labels: ['a', 'b'], series: [{ name: 'S', values: [1, 2] }] },
    { type: 'hbar', labels: ['a', 'b'], series: [{ name: 'S', values: [1, 2] }] },
    { type: 'stacked', labels: ['a', 'b'], series: [{ name: 'S', values: [1, 2] }, { name: 'T', values: [2, 1] }] },
    { type: 'hist', labels: [], series: [{ name: 'S', values: [1, 2, 2, 3, 5, 8] }] },
    { type: 'box', labels: [], series: [{ name: 'S', values: [1, 2, 2, 3, 5, 8] }] },
    { type: 'donut', labels: ['a', 'b'], series: [{ name: 'S', values: [1, 2] }] },
    { type: 'scatter', series: [{ name: 'S', points: [{ x: 1, y: 2 }] }] },
    { type: 'waterfall', labels: ['a', 'b', 'c'], series: [{ name: 'S', values: [10, 5, 15] }], totals: [0, 2] },
    { type: 'dumbbell', labels: ['a', 'b'], series: [{ name: 'Before', values: [1, 2] }, { name: 'After', values: [2, 4] }] },
    { type: 'slope', labels: ['a', 'b'], series: [{ name: 'Before', values: [1, 2] }, { name: 'After', values: [2, 1] }] },
    { type: 'pareto', labels: ['a', 'b'], series: [{ name: 'S', values: [8, 2] }] },
    { type: 'funnel', labels: ['a', 'b'], series: [{ name: 'S', values: [10, 4] }] },
    { type: 'bullet', labels: ['a', 'b'], series: [{ name: 'S', values: [6, 8] }], targets: [7, 7] },
    { type: 'density', series: [{ name: 'S', values: [1, 2, 3, 4] }] },
    { type: 'ecdf', series: [{ name: 'S', values: [1, 2, 3, 4] }] },
    { type: 'violin', series: [{ name: 'S', values: [1, 2, 3, 4] }] },
    { type: 'heat', rows: ['r'], cols: ['a', 'b'], values: [[1, 2]] },
    { type: 'stat', items: [{ label: 'Sessions', value: '1.8k' }, { label: 'Churn', value: '2%' }] },
  ];
  for (const spec of forms) {
    const { data, html } = renderArtifact(artifact('chart', JSON.stringify(spec)));
    assert.equal(data.type, spec.type);
    assert.match(html, /VC\.render\(host/u, spec.type);
    assert.match(html, new RegExp(`"type":"${spec.type}"`, 'u'), spec.type);
    assert.match(html, /<details class="data">/u, `${spec.type} data table`);
  }
});

test('chart data cannot break out of the inline script', () => {
  const { html } = renderArtifact(artifact('chart', JSON.stringify({
    type: 'bar',
    labels: ['</script><script>alert(1)</script>'],
    series: [{ name: '</script>', values: [1] }],
  })));
  assert.equal((html.match(/<\/script>/gu) ?? []).length >= 2, true);
  assert.equal(html.includes('alert(1)</script>'), false);
  assert.match(html, /\\u003c\/script/u);
});

test('a quiz scores locally and never calls the model', () => {
  const { html } = renderArtifact(artifact('cards', JSON.stringify({
    type: 'quiz',
    questions: [{ question: '2+2?', options: ['3', '4'], answer: 1, explanation: 'Four.' }],
  })));
  assert.match(html, /data-questions=/u);
  assert.match(html, /id="quiz-score"/u);
  assert.match(html, /nothing is sent to the model/u);
});

test('a deck pages with the keyboard and prints one slide per page', () => {
  const { html } = renderArtifact(artifact('slides', JSON.stringify({
    title: 'Deck',
    slides: [{ title: 'Cover', layout: 'cover' }, { title: 'Two', bullets: ['a', 'b'] }],
  })));
  assert.equal((html.match(/<section class="slide/gu) ?? []).length, 2);
  assert.match(html, /ArrowRight/u);
  assert.match(html, /page-break-after:\s*always/u);
  assert.match(html, /1 \/ 2/u);
});

test('a design canvas sandboxes each artboard', () => {
  const { html } = renderArtifact(artifact('design', JSON.stringify({
    boards: [{ name: 'Phone', w: 390, h: 844, html: '<h1>Hi</h1>' }],
  })));
  assert.match(html, /<iframe title="Phone"/u);
  assert.match(html, /sandbox="allow-scripts"/u);
  assert.match(html, /390×844/u);
});

test('a doc renders markdown, escapes HTML and counts words', () => {
  const { html } = renderArtifact(artifact('doc', '# Title\n\n<script>x</script>'));
  assert.match(html, /<h1>Title<\/h1>/u);
  assert.equal(html.includes('<script>x</script>'), false);
  assert.match(html, /words/u);
});

test('markdown projection covers decks and charts', () => {
  const deck = artifact('slides', JSON.stringify({ title: 'D', slides: [{ title: 'S', bullets: ['b'] }] }));
  assert.match(toMarkdown(deck, JSON.parse(deck.content)), /## S/u);
  const chart = artifact('chart', JSON.stringify({ labels: ['a'], series: [{ name: 'S', values: [1] }] }));
  assert.match(toMarkdown(chart, JSON.parse(chart.content)), /\| a \| 1 \|/u);
});

test('rows projection is table-shaped', () => {
  const chart = artifact('chart', JSON.stringify({ labels: ['a'], series: [{ name: 'S', values: [1] }] }));
  assert.deepEqual(toRows(chart, JSON.parse(chart.content)), [['label', 'S'], ['a', 1]]);
});

test('exports produce bytes with the right extension', () => {
  const doc = artifact('doc', '# Title\n\nText');
  for (const format of ['html', 'md', 'docx']) {
    const out = renderExport(doc, format);
    assert.equal(Buffer.isBuffer(out.bytes), true);
    assert.equal(out.extension, format === 'html' ? 'html' : format);
    assert.ok(out.bytes.length > (format === 'md' ? 5 : 100));
  }
  const deck = artifact('slides', JSON.stringify({ slides: [{ title: 'A' }] }));
  assert.equal(renderExport(deck, 'pptx').extension, 'pptx');
  const chart = artifact('chart', JSON.stringify({ labels: ['a'], series: [{ name: 'S', values: [1] }] }));
  assert.equal(renderExport(chart, 'xlsx').extension, 'xlsx');
  assert.equal(renderExport(chart, 'csv').bytes.toString().split('\n')[0], 'label,S');
  assert.equal(renderExport(chart, 'json').extension, 'json');
});

test('a pdf export is a printable html document', () => {
  const out = renderExport(artifact('doc', '# T'), 'pdf');
  assert.equal(out.extension, 'html');
  assert.match(out.bytes.toString(), /window\.print\(\)/u);
});
