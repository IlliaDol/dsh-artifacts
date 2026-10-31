import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditDesign, DESIGN_CSS, DESIGN_RULES } from '../lib/design.js';
import { renderArtifact } from '../lib/render.js';
import { normalize, validate } from '../lib/schema.js';

/** A widget that follows the house style: components, tokens, no hardcoded paint. */
const GOOD = `<h2 class="sr-only">Three sampling designs, one survey each.</h2>
<div class="controls"><button class="primary">Run again</button><span class="caption" style="margin:0">1,000 surveys per design</span></div>
<p class="step"><span class="num">1</span>One survey with each design</p>
<p class="caption">Bright dots are the chosen students; faint dots are not.</p>
<div class="panels">
  <div class="panel"><h4>Simple random</h4><svg viewBox="0 0 120 60"><circle cx="10" cy="10" r="3" fill="var(--accent)"/></svg><p class="caption">anyone can be picked</p></div>
  <div class="panel"><h4>Stratified</h4><svg viewBox="0 0 120 60"><circle cx="20" cy="20" r="3" fill="var(--accent)"/></svg><p class="caption">fixed share from every faculty</p></div>
  <div class="panel"><h4>Cluster</h4><svg viewBox="0 0 120 60"><circle cx="30" cy="30" r="3" fill="var(--accent)"/></svg><p class="caption">two whole districts</p></div>
</div>
<p class="note">Dashed line = the true mean.</p>`;

test('a widget in the house style passes the audit clean', () => {
  const verdict = auditDesign(GOOD, { html: true });
  assert.deepEqual(verdict.errors, []);
  assert.deepEqual(verdict.warnings, []);
});

test('the audit catches a canvas chart painted with CSS variables', () => {
  const verdict = auditDesign('<canvas id="c"></canvas><script>ctx.fillStyle = "var(--text)";</script>', { html: true });
  assert.equal(verdict.errors.some((message) => /canvas cannot resolve CSS variables/u.test(message)), true);
});

test('the audit catches the paint, the decoration and the type violations', () => {
  const cases = [
    ['<div style="background:#ffffff">x</div>', /white background/u],
    ['<div style="background:black">x</div>', /black background/u],
    ['<div style="background:linear-gradient(90deg,#000,#fff)">x</div>', /gradients/u],
    ['<p>nice 🎉</p>', /emoji/u],
    ['<div style="position:fixed;top:0">x</div>', /position:fixed/u],
    ['<div style="width:1400px">x</div>', /wider than 980px/u],
    ['<div>no summary</div>', /sr-only/u],
  ];
  for (const [content, pattern] of cases) {
    const verdict = auditDesign(content, { html: true });
    const all = [...verdict.errors, ...verdict.warnings].join('\n');
    assert.match(all, pattern, content);
  }
});

test('only the canvas-variable and fixed-position rules block an artifact', () => {
  const blocking = DESIGN_RULES.filter((rule) => rule.severity === 'error').map((rule) => rule.id);
  assert.deepEqual(blocking.sort(), ['canvas-css-variable', 'fixed-position']);
});

test('every rule has a stable id and a message that names the fix', () => {
  const ids = DESIGN_RULES.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length, 'rule ids are unique');
  for (const rule of DESIGN_RULES) {
    assert.ok(rule.message.length > 30, `${rule.id} explains itself`);
  }
});

test('the shell ships the explainer vocabulary in every artifact', () => {
  const html = renderArtifact(normalize({
    kind: 'widget',
    title: 'Vocabulary',
    content: '<h2 class="sr-only">s</h2><p class="step">Step</p><p class="caption">Caption</p><div class="panels"><div class="panel">p</div></div>',
  })).html;
  for (const selector of ['.step', '.caption', '.panels', '.panel', '.controls', '.note', '.kicker', '.figure']) {
    assert.ok(DESIGN_CSS.includes(selector), `${selector} is part of the vocabulary`);
    assert.ok(html.includes(selector), `${selector} reaches the document`);
  }
});

test('the widget validator is the audit, so the model cannot skip it', () => {
  const verdict = validate({
    kind: 'widget',
    title: 'Canvas',
    content: '<h2 class="sr-only">s</h2><canvas id="c"></canvas><script>ctx.strokeStyle = "var(--accent)";</script>',
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.errors.join('\n'), /canvas cannot resolve CSS variables/u);
});
