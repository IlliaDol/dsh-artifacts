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
