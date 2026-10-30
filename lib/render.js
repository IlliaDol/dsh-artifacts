/**
 * Renderers: one artifact envelope in, one self-contained HTML document out.
 *
 * Each kind keeps the contract of the channel it came from — declarative
 * widgets and charts from dsh-genui, whole-markup cards from dsh-visualize,
 * document surfaces for the Claude-parity classes — but they share the token
 * sheet, the frame bridge and the export pipeline.
 */

import { shell, SERIES, formatNumber, BRIDGE_SCRIPT } from './theme.js';
import { KIT_STYLE, kitScripts } from './kit.js';
import { escapeHtml, renderMarkdown, toPlainText } from './markdown.js';
import { buildDocx, buildPptx, buildXlsx } from './ooxml.js';

/**
 * Render one artifact.
 * @param {{kind: string, title: string, surface: string, content: string, format?: string}} artifact normalized artifact
 * @returns {{html: string|null, data: any}} rendered document (null for `file`) plus parsed source
 */
export function renderArtifact(artifact) {
  switch (artifact.kind) {
    case 'widget':
      return { html: renderWidget(artifact), data: artifact.content };
    case 'chart': {
      const spec = parse(artifact.content);
      return { html: renderChart(artifact, spec), data: spec };
    }
    case 'cards': {
      const spec = parse(artifact.content);
      return { html: renderCards(artifact, spec), data: spec };
    }
    case 'page':
      return { html: renderPage(artifact), data: artifact.content };
    case 'slides': {
      const spec = parse(artifact.content);
      return { html: renderSlides(artifact, spec), data: spec };
    }
    case 'design': {
      const spec = parse(artifact.content);
      return { html: renderDesign(artifact, spec), data: spec };
    }
    case 'doc':
      return { html: renderDoc(artifact), data: artifact.content };
    case 'file':
      return { html: null, data: parseMaybe(artifact.content) };
    default:
      throw new Error(`unknown artifact kind: ${artifact.kind}`);
  }
}

/**
 * Parse JSON, letting the caller see the real failure.
 * @param {string} text source
 * @returns {any} parsed value
 */
function parse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`artifact content is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse JSON when it happens to be JSON, otherwise return the raw string.
 * @param {string} text source
 * @returns {any} value
 */
function parseMaybe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * JSON that is safe to inline in a `<script>`.
 * @param {unknown} value value to embed
 * @returns {string} JavaScript literal
 */
function scriptJson(value) {
  return JSON.stringify(value).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029');
}

/* ------------------------------------------------------------------ widget */

/**
 * An inline widget: HTML fragment or a single SVG drawing.
 * @param {{title: string, content: string}} artifact artifact
 * @returns {string} document
 */
function renderWidget(artifact) {
  const isSvg = /^\s*<svg[\s>]/iu.test(artifact.content);
  const body = isSvg
    ? `<div class="svg-wrap">${artifact.content}</div>`
    : `<div class="wrap" style="padding:4px 0 8px">${artifact.content}</div>`;
  return shell({
    title: artifact.title,
    body,
    inline: true,
    // The kit is loaded for every widget, so a hand-written fragment can call
    // VK (scales, drag, loop), V3 (3D) or VC (charts) without a CDN.
    css: KIT_STYLE + (isSvg
      ? '\n.svg-wrap{display:flex;justify-content:center;padding:6px 0}.svg-wrap svg{max-width:100%;height:auto}'
      : ''),
    scripts: kitScripts(),
  });
}

/* ------------------------------------------------------------------- chart */

/**
 * Translate the artifact chart schema into a kit spec.
 *
 * The wire shape predates the kit: `labels` plus `series[].values`. Keeping it
 * means every stored artifact and every model call still works, while the
 * picture is now drawn — and made interactive — by `kit/charts.js`.
 *
 * @param {any} spec artifact chart spec
 * @returns {any} kit spec
 */
function chartSpec(spec) {
  const labels = Array.isArray(spec.labels) ? spec.labels.map(String) : [];
  const series = Array.isArray(spec.series) ? spec.series : [];
  const type = typeof spec.type === 'string' ? spec.type : 'bar';
  const color = (index) => SERIES[index % SERIES.length].light;

  if (type === 'scatter') {
    const points = series.flatMap((entry, index) => (entry.points ?? []).map((point) => ({
      x: Number(point.x),
      y: Number(point.y),
      label: point.label ?? entry.name ?? `Series ${index + 1}`,
    })));
    return { type: 'scatter', points, color: color(0) };
  }
  if (type === 'donut') {
    return {
      type: 'donut',
      data: labels.map((label, index) => ({ label, value: Number(series[0]?.values?.[index] ?? 0), color: color(index) })),
    };
  }
  if (type === 'hist') {
    // Raw observations: the kit bins them and exposes the bin slider itself.
    return { type: 'hist', values: (series[0]?.values ?? []).map(Number) };
  }
  if (type === 'box') {
    return {
      type: 'box',
      groups: series.map((entry, index) => ({ label: entry.name ?? `Series ${index + 1}`, values: (entry.values ?? []).map(Number) })),
    };
  }
  if (type === 'bar' && series.length === 1) {
    return {
      type: labels.length > 10 ? 'hbar' : 'bar',
      data: labels.map((label, index) => ({ label, value: Number(series[0]?.values?.[index] ?? 0), color: color(index) })),
    };
  }
  if (type === 'hbar' && series.length === 1) {
    return {
      type: 'hbar',
      data: labels.map((label, index) => ({ label, value: Number(series[0]?.values?.[index] ?? 0), color: color(index) })),
    };
  }
  if (type === 'stacked' || (type === 'bar' && series.length > 1)) {
    return {
      type: 'stacked',
      labels,
      series: series.map((entry, index) => ({
        name: entry.name ?? `Series ${index + 1}`,
        color: color(index),
        points: (entry.values ?? []).map((value, position) => ({ x: position, y: Number(value) })),
      })),
    };
  }
  if (type === 'line' || type === 'area') {
    return {
      type,
      series: series.map((entry, index) => ({
        name: entry.name ?? `Series ${index + 1}`,
        color: color(index),
        points: (entry.values ?? []).map((value, position) => ({ x: position, y: Number(value) })),
      })),
      // Arrays survive JSON into the frame; functions do not.
      xLabels: labels,
    };
  }
  // Any other single-series form falls back to columns rather than nothing.
  return {
    type: 'bar',
    data: labels.map((label, index) => ({ label, value: Number(series[0]?.values?.[index] ?? 0), color: color(index) })),
  };
}

/**
 * A chart from a declarative spec, drawn by the bundled interactive kit.
 *
 * No CDN: the document is self-contained, so it renders offline, in an export,
 * and inside a sandboxed frame with the network blocked. Hover, click, legend
 * toggles and drag-to-zoom come from the renderer, not from this call site.
 *
 * @param {{title: string, surface: string}} artifact artifact
 * @param {any} spec chart spec
 * @returns {string} document
 */
function renderChart(artifact, spec) {
  const series = Array.isArray(spec.series) ? spec.series : [];
  const labels = Array.isArray(spec.labels) ? spec.labels : [];
  const kitSpec = chartSpec(spec);

  const table = Array.isArray(labels) && labels.length > 0
    ? `<details class="data"><summary>Data</summary><table><thead><tr><th></th>${series.map((entry) => `<th>${escapeHtml(entry.name ?? '')}</th>`).join('')}</tr></thead><tbody>${labels.map((label, row) => `<tr><th>${escapeHtml(String(label))}</th>${series.map((entry) => `<td>${formatNumber(entry.values?.[row])}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`
    : '';

  const summary = `${artifact.title}: ${series.map((entry) => `${entry.name ?? 'series'} (${(entry.values ?? entry.points ?? []).length} points)`).join(', ')}.`;

  const body = `<div class="wrap" style="padding:6px 0 4px">
<h2 class="sr-only">${escapeHtml(summary)}</h2>
<div id="chart" role="group" aria-label="${escapeHtml(summary)}"></div>
${table}
</div>`;

  const scripts = `${kitScripts()}
<script>
(function(){
  var host = document.getElementById('chart');
  try {
    VC.render(host, ${scriptJson(kitSpec)});
  } catch (error) {
    host.innerHTML = '<p style="color:var(--danger,#d03b3b);font-size:12px">This chart could not render: ' + (error && error.message ? error.message : String(error)) + '</p>';
  }
})();
</script>`;

  return shell({
    title: artifact.title,
    body,
    css: KIT_STYLE,
    scripts,
    inline: artifact.surface === 'inline' || artifact.surface === 'wide',
  });
}

/* ------------------------------------------------------------------- cards */

/**
 * A native card from one of the named layouts.
 * @param {{title: string, surface: string}} artifact artifact
 * @param {any} spec card spec
 * @returns {string} document
 */
function renderCards(artifact, spec) {
  const layout = typeof spec.type === 'string' ? spec.type : 'steps';
  const renderer = CARD_RENDERERS[layout] ?? CARD_RENDERERS.steps;
  const body = `<div class="wrap" style="padding:6px 0 4px">${renderer(spec)}</div>`;
  const css = CARD_CSS + (layout === 'quiz' ? QUIZ_CSS : '');
  const scripts = layout === 'quiz' ? QUIZ_SCRIPT : layout === 'message' ? COPY_SCRIPT : '';
  return shell({
    title: artifact.title,
    body,
    css,
    scripts,
    inline: artifact.surface === 'inline' || artifact.surface === 'wide',
  });
}

/** Shared card styling. */
const CARD_CSS = `
.card-head{display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin:0 0 10px}
.card-head h3{margin:0; font-size:19px}
.meta{display:flex; flex-wrap:wrap; gap:8px 16px; font-size:12px; color:var(--text-2); margin:0 0 14px}
.rows{display:flex; flex-direction:column; gap:8px}
.row{display:flex; gap:12px; align-items:baseline; justify-content:space-between; padding-bottom:8px; border-bottom:1px solid var(--border)}
.row:last-child{border-bottom:0; padding-bottom:0}
.row .primary{flex:1; min-width:0}
.row .secondary{color:var(--text-2); font-size:14px; white-space:nowrap}
ol.steps-list,ul.plain{margin:0; padding-left:20px}
ol.steps-list li,ul.plain li{margin:0 0 6px}
.option{border:1px solid var(--border); border-radius:var(--radius-card); padding:12px 14px; background:var(--surface); display:flex; gap:10px; align-items:flex-start; cursor:pointer}
.option:hover{background:var(--surface-2)}
.option.correct{border-color:var(--ok); background:color-mix(in srgb, var(--ok) 10%, var(--surface))}
.option.wrong{border-color:var(--danger); background:color-mix(in srgb, var(--danger) 9%, var(--surface))}
.option input{margin:3px 0 0; accent-color:var(--accent)}
.explain{font-size:13px; color:var(--text-2); margin:8px 0 0}
.score{font-size:13px; color:var(--text-2)}
.compare{display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px}
.compare .card h4{margin:0 0 2px; font-size:16px}
.compare .price{font-size:22px; font-weight:600; margin:4px 0 10px; font-variant-numeric:tabular-nums}
.compare dl{margin:0; font-size:13px}
.compare dt{color:var(--muted); margin-top:8px; font-size:11px; text-transform:uppercase; letter-spacing:.04em}
.compare dd{margin:1px 0 0}
.quote{font-family:var(--font-serif); font-size:20px; line-height:1.45; margin:0 0 10px}
.days{display:flex; flex-direction:column; gap:12px}
.day{border-left:2px solid var(--border-strong); padding-left:14px}
.day h4{margin:0 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-2); font-family:var(--font-sans)}
.stop{display:flex; gap:10px; font-size:14px; margin:0 0 6px}
.stop time{color:var(--muted); font-variant-numeric:tabular-nums; min-width:52px}
.message{white-space:pre-wrap; font-size:15px; line-height:1.65}
.forecast{display:grid; grid-template-columns:repeat(auto-fit,minmax(80px,1fr)); gap:8px; margin-top:12px}
.forecast div{text-align:center; background:var(--surface-2); border-radius:var(--radius); padding:8px 4px}
.forecast .day-name{font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.05em}
.forecast .temps{font-size:13px; font-variant-numeric:tabular-nums}
.temp{font-size:44px; font-weight:600; line-height:1; font-family:var(--font-serif)}
`;

/** Quiz interaction styling. */
const QUIZ_CSS = `
.quiz-actions{display:flex; align-items:center; gap:10px; margin-top:12px}
`;

/** Quiz scoring, local-first: nothing round-trips to the model. */
const QUIZ_SCRIPT = `<script>
(function(){
  var root = document.getElementById('quiz');
  if (!root) return;
  var questions = JSON.parse(root.dataset.questions);
  var score = 0, answered = 0;
  root.addEventListener('change', function(event){
    var input = event.target.closest('input[type=radio]');
    if (!input) return;
    var card = input.closest('[data-question]');
    var index = Number(card.dataset.question);
    var question = questions[index];
    if (card.dataset.done === '1') return;
    card.dataset.done = '1';
    answered += 1;
    var correct = Number(input.value) === Number(question.answer);
    if (correct) score += 1;
    card.querySelectorAll('.option').forEach(function(option){
      var value = Number(option.querySelector('input').value);
      option.classList.toggle('correct', value === Number(question.answer));
      option.classList.toggle('wrong', value === Number(input.value) && !correct);
      option.querySelector('input').disabled = true;
    });
    var explain = card.querySelector('.explain');
    if (explain) explain.hidden = false;
    var out = document.getElementById('quiz-score');
    if (out) out.textContent = score + ' / ' + answered + ' correct';
  });
  var reset = document.getElementById('quiz-reset');
  if (reset) reset.addEventListener('click', function(){
    score = 0; answered = 0;
    root.querySelectorAll('[data-question]').forEach(function(card){
      delete card.dataset.done;
      card.querySelectorAll('.option').forEach(function(option){ option.classList.remove('correct','wrong'); });
      card.querySelectorAll('input').forEach(function(input){ input.checked = false; input.disabled = false; });
      var explain = card.querySelector('.explain'); if (explain) explain.hidden = true;
    });
    var out = document.getElementById('quiz-score'); if (out) out.textContent = '';
  });
})();
</script>`;

/** Copy-to-clipboard for message cards. */
const COPY_SCRIPT = `<script>
(function(){
  var button = document.getElementById('copy-message');
  if (!button) return;
  button.addEventListener('click', function(){
    var text = document.getElementById('message-body');
    if (!text) return;
    navigator.clipboard.writeText(text.textContent || '').then(function(){
      button.textContent = 'Copied';
      setTimeout(function(){ button.textContent = 'Copy'; }, 1600);
    }, function(){ button.textContent = 'Select the text to copy'; });
  });
})();
</script>`;

/** One renderer per card layout. */
const CARD_RENDERERS = {
  recipe(spec) {
    const ingredients = (spec.ingredients ?? []).map((item) => (
      `<div class="row"><span class="primary">${escapeHtml(item.item ?? item.name ?? String(item))}</span><span class="secondary">${escapeHtml(item.amount ?? '')}</span></div>`
    )).join('');
    const steps = (spec.steps ?? []).map((step) => `<li>${escapeHtml(typeof step === 'string' ? step : step.text ?? '')}</li>`).join('');
    return `<div class="card-head"><h3>${escapeHtml(spec.name ?? 'Recipe')}</h3>${spec.time ? `<span class="chip">${escapeHtml(spec.time)}</span>` : ''}</div>
${spec.servings ? `<p class="muted" style="margin:-4px 0 12px;font-size:13px">Serves ${escapeHtml(String(spec.servings))}</p>` : ''}
<div class="rows">${ingredients}</div>
${steps ? `<h4 style="margin:16px 0 8px">Method</h4><ol class="steps-list">${steps}</ol>` : ''}
${spec.notes ? `<p class="muted" style="font-size:13px;margin-top:12px">${escapeHtml(spec.notes)}</p>` : ''}`;
  },

  itinerary(spec) {
    const days = (spec.days ?? []).map((day) => (
      `<div class="day"><h4>${escapeHtml(day.label ?? '')}</h4>${(day.stops ?? []).map((stop) => (
        `<div class="stop"><time>${escapeHtml(stop.time ?? '')}</time><span><strong>${escapeHtml(stop.title ?? '')}</strong>${stop.note ? `<br><span class="muted">${escapeHtml(stop.note)}</span>` : ''}</span></div>`
      )).join('')}</div>`
    )).join('');
    return `<div class="card-head"><h3>${escapeHtml(spec.title ?? 'Itinerary')}</h3>${spec.dates ? `<span class="chip">${escapeHtml(spec.dates)}</span>` : ''}</div><div class="days">${days}</div>`;
  },

  quiz(spec) {
    const questions = Array.isArray(spec.questions) ? spec.questions : [];
    const cards = questions.map((question, index) => (
      `<div class="card" data-question="${index}" style="margin-bottom:12px">
<h4 style="margin:0 0 10px;font-family:var(--font-sans);font-size:15px">${index + 1}. ${escapeHtml(question.question ?? '')}</h4>
<div class="rows">${(question.options ?? []).map((option, optionIndex) => (
        `<label class="option"><input type="radio" name="q${index}" value="${optionIndex}"><span>${escapeHtml(option)}</span></label>`
      )).join('')}</div>
${question.explanation ? `<p class="explain" hidden>${escapeHtml(question.explanation)}</p>` : ''}
${question.hint ? `<details class="data"><summary>Hint</summary>${escapeHtml(question.hint)}</details>` : ''}
</div>`
    )).join('');
    return `<div id="quiz" data-questions="${escapeHtml(JSON.stringify(questions))}">
<div class="card-head"><h3>${escapeHtml(spec.title ?? 'Quiz')}</h3><span class="score" id="quiz-score"></span></div>
${cards}
<div class="quiz-actions"><button id="quiz-reset">Reset</button><span class="muted" style="font-size:12px">Scored in the card — nothing is sent to the model</span></div>
</div>`;
  },

  steps(spec) {
    const steps = (spec.steps ?? []).map((step, index) => (
      `<li style="margin-bottom:10px"><strong>${index + 1}. ${escapeHtml(step.title ?? '')}</strong>${step.detail ? `<br><span class="muted">${escapeHtml(step.detail)}</span>` : ''}</li>`
    )).join('');
    return `<div class="card-head"><h3>${escapeHtml(spec.title ?? 'Steps')}</h3></div><ol class="steps-list">${steps}</ol>`;
  },

  compare(spec) {
    const attributes = Array.isArray(spec.attributes) ? spec.attributes : [];
    const options = (spec.options ?? []).map((option, index) => (
      `<div class="card"${index === spec.recommended ? ' style="border:2px solid var(--accent)"' : ''}>
<h4>${escapeHtml(option.name ?? '')}</h4>
${option.tagline ? `<p class="muted" style="font-size:13px;margin:0 0 6px">${escapeHtml(option.tagline)}</p>` : ''}
${option.price ? `<div class="price">${escapeHtml(option.price)}</div>` : ''}
<dl>${attributes.map((attribute) => (
        `<dt>${escapeHtml(attribute)}</dt><dd>${escapeHtml(String(option.attributes?.[attribute] ?? '—'))}</dd>`
      )).join('')}</dl>
</div>`
    )).join('');
    return `<div class="card-head"><h3>${escapeHtml(spec.title ?? 'Comparison')}</h3></div><div class="compare">${options}</div>`;
  },

  metric(spec) {
    const metrics = (spec.metrics ?? []).map((metric) => (
      `<div class="metric"><p class="label">${escapeHtml(metric.label ?? '')}</p><p class="value">${escapeHtml(String(metric.value ?? ''))}</p>${metric.delta ? `<p class="muted" style="font-size:12px;margin:4px 0 0">${escapeHtml(metric.delta)}</p>` : ''}</div>`
    )).join('');
    return `<div class="card-head"><h3>${escapeHtml(spec.title ?? 'Metrics')}</h3></div><div class="grid">${metrics}</div>${spec.note ? `<p class="muted" style="font-size:12px;margin-top:10px">${escapeHtml(spec.note)}</p>` : ''}`;
  },

  profile(spec) {
    const initials = String(spec.name ?? '?').split(/\s+/u).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase();
    const rows = (spec.meta ?? []).map((entry) => (
      `<div class="row"><span class="secondary">${escapeHtml(entry.label ?? '')}</span><span>${escapeHtml(entry.value ?? '')}</span></div>`
    )).join('');
    return `<div class="card">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
<div style="width:44px;height:44px;border-radius:50%;background:var(--accent-wash);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px">${escapeHtml(initials)}</div>
<div><p style="font-weight:600;margin:0">${escapeHtml(spec.name ?? '')}</p><p class="muted" style="font-size:13px;margin:0">${escapeHtml(spec.role ?? '')}</p></div>
</div>
<div class="rows">${rows}</div></div>`;
  },

  weather(spec) {
    const forecast = (spec.forecast ?? []).map((day) => (
      `<div><div class="day-name">${escapeHtml(day.day ?? '')}</div><div class="temps">${escapeHtml(String(day.high ?? ''))}° / ${escapeHtml(String(day.low ?? ''))}°</div></div>`
    )).join('');
    return `<div class="card"><div class="card-head"><div><h3 style="margin:0">${escapeHtml(spec.location ?? '')}</h3><p class="muted" style="font-size:13px;margin:2px 0 0">${escapeHtml(spec.condition ?? '')}</p></div><span class="temp">${escapeHtml(String(spec.temp ?? ''))}°</span></div>${forecast ? `<div class="forecast">${forecast}</div>` : ''}</div>`;
  },

  translation(spec) {
    return `<div class="card">
<div class="card-head"><h3>${escapeHtml(spec.title ?? 'Translation')}</h3>${spec.from || spec.to ? `<span class="chip">${escapeHtml(spec.from ?? '')} → ${escapeHtml(spec.to ?? '')}</span>` : ''}</div>
<p class="muted" style="font-size:13px;margin:0 0 4px">Source</p>
<p style="margin:0 0 14px">${escapeHtml(spec.source ?? '')}</p>
<p class="muted" style="font-size:13px;margin:0 0 4px">Translation</p>
<p style="margin:0 0 10px;font-size:17px">${escapeHtml(spec.target ?? '')}</p>
${(spec.notes ?? []).length > 0 ? `<ul class="plain">${spec.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : ''}
</div>`;
  },

  message(spec) {
    return `<div class="card">
<div class="card-head"><h3>${escapeHtml(spec.title ?? 'Draft')}</h3><button id="copy-message">Copy</button></div>
${(spec.to || spec.subject) ? `<div class="meta">${spec.to ? `<span>To ${escapeHtml(spec.to)}</span>` : ''}${spec.subject ? `<span>Subject ${escapeHtml(spec.subject)}</span>` : ''}${spec.tone ? `<span>${escapeHtml(spec.tone)}</span>` : ''}</div>` : ''}
<div class="message" id="message-body">${escapeHtml(spec.body ?? '')}</div>
</div>`;
  },
};

/* -------------------------------------------------------------------- page */

/**
 * A published page: a full document, or a fragment in the page shell.
 * @param {{title: string, content: string}} artifact artifact
 * @returns {string} document
 */
function renderPage(artifact) {
  const content = artifact.content;
  if (/^\s*<!doctype|^\s*<html[\s>]/iu.test(content)) {
    return /<\/body>/iu.test(content)
      ? content.replace(/<\/body>/iu, `${BRIDGE_SCRIPT}</body>`)
      : `${content}${BRIDGE_SCRIPT}`;
  }
  return shell({
    title: artifact.title,
    body: `<div class="wrap" style="max-width:960px">${content}</div>`,
    inline: false,
  });
}

/* ------------------------------------------------------------------ slides */

/**
 * A 16:9 deck with keyboard navigation and print-to-PDF pagination.
 * @param {{title: string}} artifact artifact
 * @param {any} spec deck spec
 * @returns {string} document
 */
function renderSlides(artifact, spec) {
  const slides = Array.isArray(spec.slides) ? spec.slides : [];
  const deckTitle = spec.title ?? artifact.title;
  const rendered = slides.map((slide, index) => renderSlide(slide, index, slides.length)).join('\n');

  const css = `
html,body{background:#0e0e0d;color:#f0efec;overflow:hidden}
:root{--bg:#faf9f5}
.deck{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0e0e0d}
.stage{position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
.slide{position:absolute;width:1280px;height:720px;background:var(--bg);color:#141413;transform-origin:center center;padding:88px 96px;display:flex;flex-direction:column;justify-content:center;box-shadow:0 24px 80px rgba(0,0,0,.5);border-radius:6px;overflow:hidden}
.slide[hidden]{display:none}
.slide h1{font-family:var(--font-serif);font-size:64px;line-height:1.05;margin:0 0 18px;color:#141413;letter-spacing:-.02em}
.slide h2{font-family:var(--font-serif);font-size:46px;line-height:1.12;margin:0 0 28px;color:#141413;letter-spacing:-.015em}
.slide p,.slide li{font-size:22px;line-height:1.55;color:#3d3d3a}
.slide ul{margin:0;padding-left:28px}
.slide li{margin:0 0 14px}
.slide .kicker{font-family:var(--font-sans);font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8a8782;margin:0 0 18px}
.slide .sub{font-size:24px;color:#52514e;margin:0}
.slide .rule{width:72px;height:4px;background:#d97757;border-radius:2px;margin:0 0 28px}
.slide.cover{justify-content:flex-end;padding-bottom:110px}
.slide.cover h1{font-size:82px}
.slide.section{background:#141413;color:#f0efec}
.slide.section h2{color:#faf9f5}
.slide.section .kicker{color:#8a8782}
.slide.quote blockquote{font-family:var(--font-serif);font-size:42px;line-height:1.3;margin:0 0 26px;color:#141413;border:0;padding:0}
.slide.metrics .grid{grid-template-columns:repeat(3,1fr)}
.slide.metrics .metric{background:#f4f2ed;border-color:#e4e0d7}
.slide.metrics .metric .value{color:#141413;font-size:40px}
.slide.two-col .cols{display:grid;grid-template-columns:1fr 1fr;gap:56px}
.slide.two-col h3{font-family:var(--font-sans);font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#8a8782;margin:0 0 14px}
.slide .foot{position:absolute;left:96px;right:96px;bottom:44px;display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-sans);font-size:12px;color:#8a8782;letter-spacing:.04em}
.controls{position:fixed;right:22px;bottom:20px;display:flex;align-items:center;gap:10px;font-family:var(--font-sans);font-size:12px;color:#c3c2b7;z-index:5}
.controls button{background:#1c1c1a;border:1px solid #33332f;color:#f0efec;padding:6px 10px}
.controls button:hover{background:#2c2c29}
.progress{position:fixed;left:0;right:0;bottom:0;height:2px;background:#2c2c29;z-index:5}
.progress i{display:block;height:100%;background:#d97757;width:0;transition:width .25s}
@media print{
  html,body{overflow:visible;background:#fff}
  .deck,.stage{position:static;display:block;width:auto;height:auto;background:#fff}
  .controls,.progress{display:none}
  .slide{position:relative;transform:none!important;box-shadow:none;border-radius:0;break-after:page;page-break-after:always}
  .slide[hidden]{display:flex!important}
  @page{size:1280px 720px;margin:0}
}
`;

  const body = `<div class="deck"><div class="stage" id="stage">${rendered}
<div class="controls">
<button id="prev" aria-label="Previous slide">←</button>
<span id="counter">1 / ${slides.length}</span>
<button id="next" aria-label="Next slide">→</button>
<button id="print" title="Print or save as PDF">PDF</button>
</div>
<div class="progress"><i id="bar"></i></div>
</div></div>`;

  const scripts = `<script>
(function(){
  var stage = document.getElementById('stage');
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var index = 0;
  function fit(){
    var scale = Math.min(stage.clientWidth / 1280, stage.clientHeight / 720) * 0.96;
    slides.forEach(function(slide){ slide.style.transform = 'scale(' + scale + ')'; });
  }
  function show(next){
    index = Math.max(0, Math.min(slides.length - 1, next));
    slides.forEach(function(slide, i){ slide.hidden = i !== index; });
    var counter = document.getElementById('counter');
    if (counter) counter.textContent = (index + 1) + ' / ' + slides.length;
    var bar = document.getElementById('bar');
    if (bar) bar.style.width = ((index + 1) / slides.length * 100) + '%';
    try { history.replaceState(null, '', '#' + (index + 1)); } catch (e) {}
  }
  document.getElementById('prev').addEventListener('click', function(){ show(index - 1); });
  document.getElementById('next').addEventListener('click', function(){ show(index + 1); });
  document.getElementById('print').addEventListener('click', function(){ window.print(); });
  addEventListener('keydown', function(event){
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') { event.preventDefault(); show(index + 1); }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); show(index - 1); }
    if (event.key === 'Home') show(0);
    if (event.key === 'End') show(slides.length - 1);
  });
  addEventListener('resize', fit);
  var start = parseInt(location.hash.replace('#',''), 10);
  show(Number.isFinite(start) ? start - 1 : 0);
  fit();
})();
</script>`;

  return shell({ title: deckTitle, body, css, scripts, inline: false, fonts: true });
}

/**
 * One slide body.
 * @param {any} slide slide spec
 * @param {number} index zero-based position
 * @param {number} total deck length
 * @returns {string} slide markup
 */
function renderSlide(slide, index, total) {
  const layout = slide.layout ?? (index === 0 ? 'cover' : 'bullets');
  const foot = `<div class="foot"><span>${escapeHtml(slide.kicker ?? '')}</span><span>${index + 1} / ${total}</span></div>`;
  const title = `<h2>${escapeHtml(slide.title ?? '')}</h2>`;

  if (layout === 'cover') {
    return `<section class="slide cover">${slide.kicker ? `<p class="kicker">${escapeHtml(slide.kicker)}</p>` : ''}
<h1>${escapeHtml(slide.title ?? '')}</h1>
${slide.subtitle ? `<p class="sub">${escapeHtml(slide.subtitle)}</p>` : ''}${foot}</section>`;
  }
  if (layout === 'section') {
    return `<section class="slide section">${slide.kicker ? `<p class="kicker">${escapeHtml(slide.kicker)}</p>` : ''}
<h2>${escapeHtml(slide.title ?? '')}</h2>${slide.subtitle ? `<p class="sub" style="color:#c3c2b7">${escapeHtml(slide.subtitle)}</p>` : ''}${foot}</section>`;
  }
  if (layout === 'quote') {
    return `<section class="slide quote"><div class="rule"></div>
<blockquote>${escapeHtml(slide.quote ?? slide.title ?? '')}</blockquote>
<p class="sub">${escapeHtml(slide.attribution ?? '')}</p>${foot}</section>`;
  }
  if (layout === 'metrics') {
    const metrics = (slide.metrics ?? []).map((metric) => (
      `<div class="metric"><p class="label">${escapeHtml(metric.label ?? '')}</p><p class="value">${escapeHtml(String(metric.value ?? ''))}</p></div>`
    )).join('');
    return `<section class="slide metrics"><div class="rule"></div>${title}<div class="grid">${metrics}</div>${foot}</section>`;
  }
  if (layout === 'two-col') {
    const column = (heading, items) => `<div><h3>${escapeHtml(heading)}</h3><ul>${(items ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`;
    return `<section class="slide two-col"><div class="rule"></div>${title}<div class="cols">${column(slide.leftTitle ?? 'Now', slide.left)}${column(slide.rightTitle ?? 'Next', slide.right)}</div>${foot}</section>`;
  }
  if (layout === 'image' && typeof slide.image === 'string' && /^data:image\//u.test(slide.image)) {
    return `<section class="slide"><div class="rule"></div>${title}<div style="flex:1;display:flex;align-items:center;justify-content:center"><img src="${slide.image}" alt="${escapeHtml(slide.alt ?? '')}" style="max-width:100%;max-height:380px;border-radius:8px;object-fit:contain"></div>${foot}</section>`;
  }
  const bullets = (slide.bullets ?? []).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('');
  return `<section class="slide"><div class="rule"></div>${title}${bullets ? `<ul>${bullets}</ul>` : ''}${slide.body ? `<p>${escapeHtml(slide.body)}</p>` : ''}${foot}</section>`;
}

/* ------------------------------------------------------------------ design */

/**
 * A design canvas: artboards laid out on a pannable, zoomable surface, each
 * frame rendered in its own sandbox so a mockup's CSS cannot leak.
 * @param {{title: string}} artifact artifact
 * @param {any} spec canvas spec
 * @returns {string} document
 */
function renderDesign(artifact, spec) {
  const boards = Array.isArray(spec.boards) ? spec.boards : [];
  const gap = 120;
  const rowGap = 140;
  const maxRowWidth = 2200;
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const placed = boards.map((board) => {
    const w = Number(board.w) || 880;
    const h = Number(board.h) || 560;
    if (x > 0 && x + w > maxRowWidth) {
      x = 0;
      y += rowHeight + rowGap;
      rowHeight = 0;
    }
    const point = { ...board, w, h, x, y };
    x += w + gap;
    rowHeight = Math.max(rowHeight, h);
    return point;
  });
  const width = Math.max(1, ...placed.map((board) => board.x + board.w)) + 80;
  const height = Math.max(1, ...placed.map((board) => board.y + board.h + 60)) + 80;

  const frames = placed.map((board) => {
    const inner = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${BASE_FRAME_CSS}</style></head><body>${board.html}</body></html>`;
    return `<figure class="board" style="left:${40 + board.x}px;top:${40 + board.y}px">
<figcaption>${escapeHtml(board.name ?? 'Artboard')} <span>${board.w}×${board.h}</span></figcaption>
<iframe title="${escapeHtml(board.name ?? 'Artboard')}" width="${board.w}" height="${board.h}" sandbox="allow-scripts" srcdoc="${escapeHtml(inner)}"></iframe>
</figure>`;
  }).join('');

  const css = `
html,body{background:var(--surface-2);height:100%;margin:0;overflow:hidden}
.canvas-toolbar{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:6px 10px;box-shadow:var(--shadow);font-size:12px;color:var(--text-2)}
.canvas-toolbar button{padding:3px 9px;font-size:12px;border-radius:999px}
.canvas-viewport{position:absolute;inset:64px 0 0 0;overflow:auto;cursor:grab}
.canvas-viewport.dragging{cursor:grabbing}
.canvas{position:relative;width:${width}px;height:${height}px;transform-origin:0 0;padding:40px}
.board{position:absolute;margin:0}
.board figcaption{font-family:var(--font-sans);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;display:flex;gap:8px;align-items:baseline}
.board figcaption span{text-transform:none;letter-spacing:0;color:var(--border-strong)}
.board iframe{border:0;background:#fff;border-radius:10px;box-shadow:0 10px 40px rgba(20,20,19,.12);display:block}
@media print{.canvas-toolbar{display:none}.canvas-viewport{position:static;overflow:visible}.canvas{transform:none!important}}
`;

  const body = `<div class="canvas-toolbar"><button id="zoom-out" aria-label="Zoom out">−</button><span id="zoom-label">100%</span><button id="zoom-in" aria-label="Zoom in">+</button><button id="fit">Fit</button></div>
<div class="canvas-viewport" id="viewport"><div class="canvas" id="canvas">${frames}</div></div>`;

  const scripts = `<script>
(function(){
  var canvas = document.getElementById('canvas');
  var viewport = document.getElementById('viewport');
  var label = document.getElementById('zoom-label');
  var scale = 1;
  function apply(next){
    scale = Math.max(0.1, Math.min(1.5, next));
    canvas.style.transform = 'scale(' + scale + ')';
    label.textContent = Math.round(scale * 100) + '%';
  }
  function fit(){
    apply(Math.min(1, (viewport.clientWidth - 120) / (canvas.offsetWidth * 1.02)));
  }
  document.getElementById('zoom-in').addEventListener('click', function(){ apply(scale + 0.1); });
  document.getElementById('zoom-out').addEventListener('click', function(){ apply(scale - 0.1); });
  document.getElementById('fit').addEventListener('click', fit);
  var dragging = false, startX = 0, startY = 0, scrollX = 0, scrollY = 0;
  viewport.addEventListener('pointerdown', function(event){
    if (event.target.closest('button') || event.target.closest('iframe')) return;
    dragging = true; viewport.classList.add('dragging');
    startX = event.clientX; startY = event.clientY; scrollX = viewport.scrollLeft; scrollY = viewport.scrollTop;
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', function(event){
    if (!dragging) return;
    viewport.scrollLeft = scrollX - (event.clientX - startX);
    viewport.scrollTop = scrollY - (event.clientY - startY);
  });
  viewport.addEventListener('pointerup', function(){ dragging = false; viewport.classList.remove('dragging'); });
  addEventListener('wheel', function(event){
    if (!event.ctrlKey) return;
    event.preventDefault();
    apply(scale + (event.deltaY < 0 ? 0.08 : -0.08));
  }, { passive: false });
  fit();
})();
</script>`;

  return shell({ title: spec.title ?? artifact.title, body, css, scripts, inline: false });
}

/** Frame CSS for an artboard: tokens plus a reset, no host chrome. */
const BASE_FRAME_CSS = `
body{margin:0;font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#141413;background:#faf9f5;-webkit-font-smoothing:antialiased}
img{max-width:100%}
*,*::before,*::after{box-sizing:border-box}
a{color:#8a3b22}
`;

/* --------------------------------------------------------------------- doc */

/**
 * A document: Markdown rendered as a reading surface.
 * @param {{title: string, content: string}} artifact artifact
 * @returns {string} document
 */
function renderDoc(artifact) {
  const css = `
.doc{max-width:720px;margin:0 auto;padding:40px 24px 72px}
.doc h1{font-size:38px;margin:0 0 20px;letter-spacing:-.02em}
.doc h2{font-size:26px;margin:34px 0 12px}
.doc h3{font-size:20px;margin:26px 0 8px}
.doc p,.doc li{font-size:17px;line-height:1.72}
.doc ul,.doc ol{padding-left:22px;margin:0 0 1.1em}
.doc li{margin:0 0 6px}
.doc table{font-size:14px}
.doc pre{font-size:13px}
.doc .doc-foot{margin-top:48px;padding-top:14px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
@media print{
  body{background:#fff}
  .doc{max-width:none;padding:0}
  a{color:inherit;text-decoration:none}
  @page{size:A4;margin:22mm 20mm}
}
`;
  const body = `<article class="doc"><div class="content">${renderMarkdown(artifact.content)}</div><div class="doc-foot">${escapeHtml(artifact.title)} · ${artifact.content.trim().split(/\s+/u).length.toLocaleString('en-US')} words</div></article>`;
  return shell({ title: artifact.title, body, css, inline: false });
}

/* ----------------------------------------------------------------- exports */

/**
 * Render an artifact to a downloadable format.
 * @param {{kind: string, title: string, surface: string, content: string, format?: string}} artifact artifact
 * @param {string} format one of html, md, json, csv, docx, pptx, xlsx, pdf
 * @returns {{bytes: Buffer, contentType: string, extension: string}} the export
 */
export function renderExport(artifact, format) {
  const { html, data } = renderArtifact(artifact);

  if (format === 'html' || format === 'pdf') {
    const source = html ?? shell({ title: artifact.title, body: `<pre>${escapeHtml(artifact.content)}</pre>` });
    const finalHtml = format === 'pdf'
      ? source.replace(/<\/body>/iu, '<script>addEventListener("load",function(){setTimeout(function(){window.print()},350)})</script></body>')
      : source;
    return {
      bytes: Buffer.from(finalHtml, 'utf8'),
      contentType: 'text/html; charset=utf-8',
      extension: 'html',
    };
  }

  if (format === 'md') {
    return { bytes: Buffer.from(toMarkdown(artifact, data), 'utf8'), contentType: 'text/markdown; charset=utf-8', extension: 'md' };
  }

  if (format === 'json') {
    return {
      bytes: Buffer.from(JSON.stringify({ kind: artifact.kind, title: artifact.title, surface: artifact.surface, content: data }, null, 2), 'utf8'),
      contentType: 'application/json; charset=utf-8',
      extension: 'json',
    };
  }

  if (format === 'csv') {
    return { bytes: Buffer.from(toCsv(artifact, data), 'utf8'), contentType: 'text/csv; charset=utf-8', extension: 'csv' };
  }

  if (format === 'docx') {
    return {
      bytes: buildDocx({ title: artifact.title, markdown: toMarkdown(artifact, data) }),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
    };
  }

  if (format === 'pptx') {
    const deck = artifact.kind === 'slides'
      ? data
      : { title: artifact.title, slides: [{ title: artifact.title, bullets: toMarkdown(artifact, data).split('\n').filter(Boolean).slice(0, 12) }] };
    return {
      bytes: buildPptx(deck),
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
    };
  }

  if (format === 'xlsx') {
    return {
      bytes: buildXlsx({ title: artifact.title, rows: toRows(artifact, data) }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  throw new Error(`unsupported export format: ${format}`);
}

/**
 * Markdown projection of any artifact, used by md/docx/pptx exports.
 * @param {{kind: string, title: string, content: string}} artifact artifact
 * @param {any} data parsed source
 * @returns {string} Markdown
 */
export function toMarkdown(artifact, data = parseMaybe(artifact.content)) {
  if (artifact.kind === 'doc') return artifact.content;
  if (artifact.kind === 'slides') {
    const lines = [`# ${data.title ?? artifact.title}`, ''];
    for (const slide of data.slides ?? []) {
      lines.push(`## ${slide.title ?? ''}`, '');
      if (slide.subtitle) lines.push(`${slide.subtitle}`, '');
      for (const bullet of slide.bullets ?? []) lines.push(`- ${bullet}`);
      if (slide.quote) lines.push(`> ${slide.quote}`);
      if (slide.body) lines.push(slide.body);
      if (slide.metrics) for (const metric of slide.metrics) lines.push(`- **${metric.label}**: ${metric.value}`);
      lines.push('');
    }
    return lines.join('\n');
  }
  if (artifact.kind === 'chart') {
    const labels = data.labels ?? [];
    const header = ['', ...(data.series ?? []).map((series) => series.name ?? '')];
    const rows = labels.map((label, index) => [label, ...(data.series ?? []).map((series) => series.values?.[index] ?? '')]);
    return [`# ${artifact.title}`, '', table(header, rows)].join('\n');
  }
  if (artifact.kind === 'cards') {
    return [`# ${artifact.title}`, '', '```json', JSON.stringify(data, null, 2), '```'].join('\n');
  }
  if (artifact.kind === 'design') {
    return [`# ${data.title ?? artifact.title}`, '', ...(data.boards ?? []).map((board) => `## ${board.name ?? 'Artboard'}\n\n${board.html}`)].join('\n');
  }
  return [`# ${artifact.title}`, '', toPlainText(artifact.content) || artifact.content].join('\n');
}

/**
 * A Markdown table from a header row and body rows.
 * @param {Array<string|number>} header header cells
 * @param {Array<Array<string|number>>} rows body rows
 * @returns {string} table Markdown
 */
function table(header, rows) {
  const line = (cells) => `| ${cells.map((cell) => String(cell ?? '').replace(/\|/gu, '\\|')).join(' | ')} |`;
  return [line(header), line(header.map(() => '---')), ...rows.map(line)].join('\n');
}

/**
 * CSV projection, for chart and table data.
 * @param {{kind: string, title: string}} artifact artifact
 * @param {any} data parsed source
 * @returns {string} CSV
 */
export function toCsv(artifact, data) {
  const escapeCell = (value) => {
    const text = String(value ?? '');
    return /[",\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
  };
  const rows = toRows(artifact, data);
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n');
}

/**
 * Rows for a table-shaped projection of any artifact.
 * @param {{kind: string, title: string, content: string}} artifact artifact
 * @param {any} data parsed source
 * @returns {Array<Array<string|number>>} rows, header first
 */
export function toRows(artifact, data) {
  if (artifact.kind === 'chart') {
    const labels = data.labels ?? [];
    return [
      ['label', ...(data.series ?? []).map((series) => series.name ?? 'value')],
      ...labels.map((label, index) => [label, ...(data.series ?? []).map((series) => series.values?.[index] ?? '')]),
    ];
  }
  if (artifact.kind === 'cards' && data.type === 'metric') {
    return [['label', 'value'], ...(data.metrics ?? []).map((metric) => [metric.label ?? '', metric.value ?? ''])];
  }
  if (artifact.kind === 'slides') {
    return [['slide', 'title', 'bullets'], ...(data.slides ?? []).map((slide, index) => [index + 1, slide.title ?? '', (slide.bullets ?? []).join(' · ')])];
  }
  return [['text'], ...toMarkdown(artifact, data).split('\n').filter(Boolean).map((line) => [line])];
}
