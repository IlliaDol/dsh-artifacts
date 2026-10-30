import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, validate, normalize, defaultSurface } from '../lib/schema.js';

test('every documented kind validates with a minimal source', () => {
  const sources = {
    widget: '<h2 class="sr-only">A number line</h2><p>5%</p>',
    chart: JSON.stringify({ type: 'bar', labels: ['a', 'b'], series: [{ name: 'S', values: [1, 2] }] }),
    cards: JSON.stringify({ type: 'steps', steps: [{ title: 'One' }, { title: 'Two' }] }),
    page: '<!doctype html><html><body><h1>Hi</h1></body></html>',
    slides: JSON.stringify({ title: 'Deck', slides: [{ title: 'One' }, { title: 'Two' }] }),
    design: JSON.stringify({ title: 'Canvas', boards: [{ name: 'Phone', w: 390, h: 844, html: '<h1>Hi</h1>' }] }),
    doc: '# Title\n\nA paragraph.',
    file: 'a,b\n1,2',
  };
  for (const kind of KINDS) {
    const verdict = validate({ kind, title: `A ${kind}`, content: sources[kind], format: kind === 'file' ? 'csv' : undefined });
    assert.equal(verdict.ok, true, `${kind}: ${verdict.errors.join('; ')}`);
    assert.equal(verdict.artifact.kind, kind);
  }
});

test('unknown kinds and empty content are rejected', () => {
  assert.equal(validate({ kind: 'hologram', title: 'x', content: 'y' }).ok, false);
  assert.equal(validate({ kind: 'widget', title: 'x', content: '' }).ok, false);
  assert.equal(validate({ kind: 'widget', title: '', content: '<p>x</p>' }).ok, false);
});

test('a widget may not smuggle a whole document', () => {
  const verdict = validate({ kind: 'widget', title: 'x', content: '<!doctype html><html><body>x</body></html>' });
  assert.equal(verdict.ok, false);
  assert.match(verdict.errors.join(' '), /fragment/u);
});

test('a widget with position:fixed is rejected', () => {
  const verdict = validate({ kind: 'widget', title: 'x', content: '<h2 class="sr-only">s</h2><div style="position: fixed">x</div>' });
  assert.equal(verdict.ok, false);
});

test('an HTML widget without an sr-only summary warns, an SVG does not', () => {
  const html = validate({ kind: 'widget', title: 'x', content: '<div>plain</div>' });
  assert.equal(html.ok, true);
  assert.equal(html.warnings.some((warning) => /sr-only/u.test(warning)), true);
  const svg = validate({ kind: 'widget', title: 'x', content: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>' });
  assert.equal(svg.warnings.some((warning) => /sr-only/u.test(warning)), false);
});

test('chart labels must match the first series', () => {
  const verdict = validate({
    kind: 'chart',
    title: 'x',
    content: JSON.stringify({ type: 'bar', labels: ['a'], series: [{ name: 'S', values: [1, 2] }] }),
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.errors.join(' '), /one label per value/u);
});

test('every chart form is accepted with its own shape', () => {
  const base = (type, extra = {}) => ({ type, labels: ['a', 'b'], series: [{ name: 'S', values: [1, 2] }], ...extra });
  const sources = {
    line: base('line'),
    area: base('area'),
    bar: base('bar'),
    hbar: base('hbar'),
    stacked: base('stacked', { series: [{ name: 'S', values: [1, 2] }, { name: 'T', values: [2, 1] }] }),
    donut: base('donut'),
    waterfall: base('waterfall', { totals: [0, 1] }),
    pareto: base('pareto'),
    funnel: base('funnel'),
    bullet: base('bullet', { targets: [2, 3] }),
    dumbbell: base('dumbbell', { series: [{ name: 'Before', values: [1, 2] }, { name: 'After', values: [2, 3] }] }),
    slope: base('slope', { series: [{ name: 'Before', values: [1, 2] }, { name: 'After', values: [2, 3] }] }),
    scatter: { type: 'scatter', series: [{ name: 'S', points: [{ x: 1, y: 2 }, { x: 2, y: 3 }] }] },
    hist: { type: 'hist', series: [{ name: 'S', values: [1, 2, 3] }] },
    box: { type: 'box', series: [{ name: 'S', values: [1, 2, 3] }] },
    density: { type: 'density', series: [{ name: 'S', values: [1, 2, 3] }] },
    ecdf: { type: 'ecdf', series: [{ name: 'S', values: [1, 2, 3] }] },
    violin: { type: 'violin', series: [{ name: 'S', values: [1, 2, 3] }] },
    heat: { type: 'heat', rows: ['a', 'b'], cols: ['x', 'y'], values: [[1, 2], [3, null]] },
    stat: { type: 'stat', items: [{ label: 'Sessions', value: '1.8k' }, { label: 'Churn', value: '2%' }] },
  };
  for (const [type, spec] of Object.entries(sources)) {
    const verdict = validate({ kind: 'chart', title: `A ${type}`, content: JSON.stringify(spec) });
    assert.equal(verdict.ok, true, `${type}: ${verdict.errors.join('; ')}`);
    assert.equal(verdict.artifact.kind, 'chart');
  }
});

test('chart forms reject the shapes they cannot draw', () => {
  const twoSeriesForm = (type, series) => validate({
    kind: 'chart', title: type, content: JSON.stringify({ type, labels: ['a', 'b'], series }),
  });
  assert.equal(twoSeriesForm('dumbbell', [{ name: 'Before', values: [1, 2] }]).ok, false);
  assert.equal(twoSeriesForm('slope', [{ name: 'Before', values: [1, 2] }, { name: 'After', values: [2] }]).ok, false);
  const negative = validate({ kind: 'chart', title: 'p', content: JSON.stringify({ type: 'pareto', labels: ['a'], series: [{ name: 'S', values: [-1] }] }) });
  assert.equal(negative.ok, false);
  const badTargets = validate({ kind: 'chart', title: 'b', content: JSON.stringify({ type: 'bullet', labels: ['a', 'b'], series: [{ name: 'S', values: [1, 2] }], targets: [1] }) });
  assert.equal(badTargets.ok, false);
  const badHeat = validate({ kind: 'chart', title: 'h', content: JSON.stringify({ type: 'heat', rows: ['a'], cols: ['x', 'y'], values: [[1]] }) });
  assert.equal(badHeat.ok, false);
  const shortDensity = validate({ kind: 'chart', title: 'd', content: JSON.stringify({ type: 'density', series: [{ name: 'S', values: [1] }] }) });
  assert.equal(shortDensity.ok, false);
});

test('chart series ceiling is enforced', () => {
  const series = Array.from({ length: 13 }, (_value, index) => ({ name: `S${index}`, values: [1] }));
  const verdict = validate({ kind: 'chart', title: 'x', content: JSON.stringify({ type: 'line', labels: ['a'], series }) });
  assert.equal(verdict.ok, false);
});

test('slides need titles and stay under the deck ceiling', () => {
  const missing = validate({ kind: 'slides', title: 'x', content: JSON.stringify({ slides: [{}] }) });
  assert.equal(missing.ok, false);
  const many = validate({
    kind: 'slides',
    title: 'x',
    content: JSON.stringify({ slides: Array.from({ length: 41 }, () => ({ title: 't' })) }),
  });
  assert.equal(many.ok, false);
});

test('design boards need html', () => {
  const verdict = validate({ kind: 'design', title: 'x', content: JSON.stringify({ boards: [{ name: 'A' }] }) });
  assert.equal(verdict.ok, false);
  assert.match(verdict.errors.join(' '), /needs html/u);
});

test('credentials are refused', () => {
  const verdict = validate({ kind: 'doc', title: 'x', content: 'api_key = "sk-abcdefghijklmnopqrstuvwx"' });
  assert.equal(verdict.ok, false);
});

test('off-allowlist remote assets warn but do not block', () => {
  const verdict = validate({
    kind: 'widget',
    title: 'x',
    content: '<h2 class="sr-only">s</h2><img src="https://evil.example/x.png">',
  });
  assert.equal(verdict.ok, true);
  assert.equal(verdict.warnings.some((warning) => /evil\.example/u.test(warning)), true);
});

test('default surfaces match the documented table', () => {
  assert.equal(defaultSurface('widget'), 'inline');
  assert.equal(defaultSurface('chart'), 'inline');
  assert.equal(defaultSurface('cards'), 'inline');
  assert.equal(defaultSurface('doc'), 'inline');
  assert.equal(defaultSurface('page'), 'page');
  assert.equal(defaultSurface('slides'), 'canvas');
  assert.equal(defaultSurface('design'), 'canvas');
  assert.equal(defaultSurface('file'), 'page');
});

test('normalize trims titles and drops unknown surfaces', () => {
  const artifact = normalize({ kind: 'widget', title: '  Hello  ', surface: 'floating', content: '<p>x</p>' });
  assert.equal(artifact.title, 'Hello');
  assert.equal(artifact.surface, 'inline');
});
