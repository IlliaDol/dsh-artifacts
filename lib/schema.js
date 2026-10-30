/**
 * The artifact contract: one envelope for every kind, shared by the tool
 * (validation at execute time), the store, the renderers and the tests.
 *
 * Pure module — no I/O, no DOM, no host imports — so both halves and the test
 * suite can load it unchanged.
 */

/** Every artifact kind this plugin renders or writes. */
export const KINDS = ['widget', 'chart', 'recipe', 'cards', 'page', 'slides', 'design', 'doc', 'file'];

/** Where an artifact is presented. `canvas` opens the side canvas surface. */
export const SURFACES = ['inline', 'wide', 'page', 'canvas'];

/** Downloadable formats a `file` artifact can produce. */
export const FILE_FORMATS = ['csv', 'json', 'md', 'html', 'txt', 'docx', 'pptx', 'xlsx'];

/**
 * Every chart form the bundled renderer draws. Kept here as the single source
 * of truth for validation, the prompt and the tests.
 */
export const CHART_FORMS = [
  'line', 'area', 'bar', 'hbar', 'stacked', 'scatter', 'donut',
  'hist', 'box', 'density', 'ecdf', 'violin',
  'heat', 'stat',
  'waterfall', 'dumbbell', 'slope', 'pareto', 'funnel', 'bullet',
];

/** Formats a *rendered* artifact can be exported to. `pdf` is produced by the viewer's print dialog. */
export const EXPORT_FORMATS = ['html', 'md', 'json', 'csv', 'docx', 'pptx', 'xlsx', 'pdf'];

/** Largest accepted source string, in characters (the store caps bytes too). */
export const MAX_CONTENT_CHARS = 2_000_000;

/** Slides per deck. */
export const MAX_SLIDES = 40;

/** Artboards per design canvas. */
export const MAX_BOARDS = 24;

/** Cards per card artifact. */
export const MAX_CARDS = 40;

/** Charts series / points ceilings, mirroring the host's native-chart limits. */
export const MAX_SERIES = 12;
export const MAX_POINTS = 2000;

/**
 * @typedef {object} ArtifactInput
 * @property {string} kind one of {@link KINDS}
 * @property {string} title human title, also the export filename stem
 * @property {string} [surface] one of {@link SURFACES}
 * @property {string} [content] the source: markup, markdown, JSON, or a table
 * @property {string} [format] for `file`: one of {@link FILE_FORMATS}
 * @property {string} [summary] one line shown by launchers and the gallery
 */

/**
 * Narrow one wire value to a known kind.
 * @param {unknown} value raw value
 * @returns {value is string} whether it names a kind
 */
export function isKind(value) {
  return typeof value === 'string' && KINDS.includes(value);
}

/**
 * Narrow one wire value to a known surface.
 * @param {unknown} value raw value
 * @returns {value is string} whether it names a surface
 */
export function isSurface(value) {
  return typeof value === 'string' && SURFACES.includes(value);
}

/**
 * Normalize free-form input into the canonical envelope. Unknown fields are
 * dropped rather than carried into the store.
 * @param {ArtifactInput} input raw input
 * @returns {{kind: string, title: string, surface: string, content: string, format: string|undefined, summary: string|undefined}} normalized envelope
 */
export function normalize(input) {
  const kind = isKind(input?.kind) ? input.kind : 'widget';
  const surface = isSurface(input?.surface) ? input.surface : defaultSurface(kind);
  const content = typeof input?.content === 'string' ? input.content : '';
  const title = typeof input?.title === 'string' && input.title.trim().length > 0
    ? input.title.trim().slice(0, 120)
    : 'Untitled artifact';
  const format = typeof input?.format === 'string' && FILE_FORMATS.includes(input.format) ? input.format : undefined;
  const summary = typeof input?.summary === 'string' && input.summary.trim().length > 0
    ? input.summary.trim().slice(0, 200)
    : undefined;
  return { kind, title, surface, content, format, summary };
}

/**
 * The surface a kind gets when the caller does not name one.
 * @param {string} kind artifact kind
 * @returns {string} surface
 */
export function defaultSurface(kind) {
  if (kind === 'page') return 'page';
  if (kind === 'slides' || kind === 'design') return 'canvas';
  if (kind === 'file') return 'page';
  return 'inline';
}

/**
 * Validate an artifact before it is written or rendered.
 * @param {ArtifactInput} raw input as the model sent it
 * @returns {{ok: boolean, errors: string[], warnings: string[], artifact: ReturnType<typeof normalize>}} verdict
 */
export function validate(raw) {
  const artifact = normalize(raw);
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (!isKind(raw?.kind)) errors.push(`kind must be one of: ${KINDS.join(', ')}`);
  if (typeof raw?.title !== 'string' || raw.title.trim().length === 0) errors.push('title is required');
  if (raw?.surface !== undefined && !isSurface(raw.surface)) errors.push(`surface must be one of: ${SURFACES.join(', ')}`);
  if (typeof artifact.content !== 'string' || artifact.content.trim().length === 0) {
    errors.push('content is required');
  } else if (artifact.content.length > MAX_CONTENT_CHARS) {
    errors.push(`content is ${artifact.content.length} characters; the ceiling is ${MAX_CONTENT_CHARS}`);
  }
  if (artifact.kind === 'file' && artifact.format === undefined) {
    errors.push(`file artifacts need a format: ${FILE_FORMATS.join(', ')}`);
  }

  if (errors.length === 0) {
    switch (artifact.kind) {
      case 'widget': {
        if (/<!doctype|<html[\s>]/iu.test(artifact.content)) {
          errors.push('widget content is a fragment: no <!doctype>, <html>, <head> or <body>. Use kind "page" for a full document.');
        }
        const html = !/^\s*<svg[\s>]/iu.test(artifact.content);
        if (html && !/class\s*=\s*["'][^"']*\bsr-only\b/iu.test(artifact.content)) {
          warnings.push('HTML widgets should start with <h2 class="sr-only"> one-sentence summary for screen readers.');
        }
        if (/position\s*:\s*fixed/iu.test(artifact.content)) errors.push('widget content must not use position:fixed; the frame sizes itself to its content.');
        break;
      }
      case 'chart':
        examineChart(artifact.content, errors, warnings);
        break;
      case 'recipe':
        examineRecipe(artifact.content, errors);
        break;
      case 'cards':
        examineCards(artifact.content, errors, warnings);
        break;
      case 'page':
        if (/position\s*:\s*fixed/iu.test(artifact.content)) warnings.push('position:fixed inside a published page is allowed, but it hides content in print.');
        break;
      case 'slides':
        examineSlides(artifact.content, errors, warnings);
        break;
      case 'design':
        examineBoards(artifact.content, errors, warnings);
        break;
      case 'doc':
        if (!/^#{1,6}\s|\n#{1,6}\s/mu.test(artifact.content) && artifact.content.length > 400) {
          warnings.push('doc content has no headings; a long document reads better with them.');
        }
        break;
      case 'file':
        break;
      default:
        break;
    }
    examineCommon(artifact.content, errors, warnings);
  }

  return { ok: errors.length === 0, errors, warnings, artifact };
}

/**
 * Rules shared by every kind: no unlicenced remote resources, no secrets,
 * and no pretending a fragment is a document.
 * @param {string} content artifact source
 * @param {string[]} errors collected errors
 * @param {string[]} warnings collected warnings
 */
function examineCommon(content, errors, warnings) {
  const resourcePatterns = [
    /(?:src|poster)\s*=\s*["']https?:\/\/([a-z0-9.-]+)/giu,
    /url\(\s*["']?https?:\/\/([a-z0-9.-]+)/giu,
    /<link[^>]+href\s*=\s*["']https?:\/\/([a-z0-9.-]+)/giu,
  ];
  for (const pattern of resourcePatterns) {
    for (const match of content.matchAll(pattern)) {
      const host = match[1].toLowerCase();
      if (!ALLOWED_HOSTS.has(host)) {
        warnings.push(`remote asset ${host} is outside the allowlist; the frame's CSP blocks it. Allowed: ${[...ALLOWED_HOSTS].join(', ')}`);
      }
    }
  }
  if (/api[_-]?key\s*[:=]\s*["'][^"']{12,}/iu.test(content) || /sk-[a-z0-9]{20,}/iu.test(content)) {
    errors.push('content looks like it contains a credential; artifacts must never carry secrets.');
  }
}

/** Hosts the rendered frame may load from, matching the CSP the viewer sends. */
export const ALLOWED_HOSTS = new Set([
  'cdnjs.cloudflare.com',
  'esm.sh',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

/**
 * Parse a JSON source or push one readable error.
 * @param {string} content artifact source
 * @param {string} kind kind name for the message
 * @param {string[]} errors collected errors
 * @returns {any | undefined} parsed value
 */
function parseJson(content, kind, errors) {
  try {
    return JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${kind} content must be valid JSON: ${message}`);
    return undefined;
  }
}

/**
 * Recipe rules: an id from the vendored cookbook, or a JSON object with one.
 * The id shape is checked here; whether the id exists is decided by the
 * renderer, which can name the available recipes in its error.
 * @param {string} content artifact source
 * @param {string[]} errors collected errors
 */
function examineRecipe(content, errors) {
  const text = content.trim();
  let id;
  if (text.startsWith('{')) {
    const spec = parseJson(content, 'recipe', errors);
    if (spec === undefined) return;
    id = spec?.id;
    if (typeof id !== 'string') {
      errors.push('recipe content object needs an "id" string, for example {"id":"qq"}');
      return;
    }
  } else {
    id = text;
  }
  if (!/^[a-z][a-z0-9-]*$/u.test(id)) {
    errors.push('recipe id must be lowercase letters, digits and hyphens, for example "qq" or "combo-layers"');
  }
}

/**
 * Chart rules: form, series shape, and the axis ceilings.
 * @param {string} content artifact source
 * @param {string[]} errors collected errors
 * @param {string[]} warnings collected warnings
 */
function examineChart(content, errors, warnings) {
  const spec = parseJson(content, 'chart', errors);
  if (spec === undefined) return;
  if (!CHART_FORMS.includes(spec.type)) {
    errors.push(`chart.type must be one of: ${CHART_FORMS.join(', ')}`);
    return;
  }

  // Two forms are not series-shaped at all: a matrix and a row of statistics.
  if (spec.type === 'heat') {
    examineHeat(spec, errors, warnings);
    return;
  }
  if (spec.type === 'stat') {
    examineStat(spec, errors, warnings);
    return;
  }

  if (!Array.isArray(spec.series) || spec.series.length === 0) {
    errors.push('chart.series must be a non-empty array of {name, values} or {name, points}');
    return;
  }
  if (spec.series.length > MAX_SERIES) errors.push(`chart has ${spec.series.length} series; the ceiling is ${MAX_SERIES}`);

  // Raw observations, not one category per point: hist, box, density, ecdf, violin.
  const distribution = ['hist', 'box', 'density', 'ecdf', 'violin'].includes(spec.type);
  for (const [index, series] of spec.series.entries()) {
    const values = spec.type === 'scatter' ? series?.points : series?.values;
    if (!Array.isArray(values) || values.length === 0) {
      errors.push(`chart.series[${index}] needs ${spec.type === 'scatter' ? 'points [{x,y}]' : 'values [n]'}`);
      continue;
    }
    if (values.length > MAX_POINTS) errors.push(`chart.series[${index}] has ${values.length} points; the ceiling is ${MAX_POINTS}`);
    if (['density', 'ecdf', 'violin'].includes(spec.type) && values.length < 2) {
      errors.push(`chart.series[${index}] needs at least two observations for ${spec.type}`);
    }
  }

  const expected = spec.series[0]?.values?.length ?? 0;
  if (!distribution && spec.type !== 'scatter') {
    if (!Array.isArray(spec.labels) || spec.labels.length !== expected) {
      errors.push(`chart.labels must hold one label per value (${expected})`);
    }
  }

  if (spec.type === 'dumbbell' || spec.type === 'slope') {
    if (spec.series.length !== 2) {
      errors.push(`${spec.type} needs exactly two series: the before values and the after values`);
    } else if ((spec.series[1]?.values ?? []).length !== expected) {
      errors.push(`${spec.type} series must be the same length`);
    }
  }

  if (['waterfall', 'pareto', 'funnel', 'bullet'].includes(spec.type) && spec.series.length > 1) {
    warnings.push(`${spec.type} draws the first series only; put the second measure in its own artifact.`);
  }

  if (['pareto', 'funnel'].includes(spec.type)) {
    const negative = (spec.series[0]?.values ?? []).some((value) => Number(value) < 0);
    if (negative) errors.push(`${spec.type} needs non-negative values; a share of a negative total is not meaningful.`);
  }

  if (spec.type === 'bullet' && spec.targets !== undefined) {
    if (!Array.isArray(spec.targets) || spec.targets.length !== expected || spec.targets.some((value) => !Number.isFinite(Number(value)))) {
      errors.push(`chart.targets must hold one number per label (${expected})`);
    }
  }

  if (spec.type === 'waterfall' && spec.totals !== undefined) {
    if (!Array.isArray(spec.totals) || spec.totals.some((index) => !Number.isInteger(index) || index < 0 || index >= expected)) {
      errors.push('chart.totals must be an array of row indices that are totals');
    }
  }

  if (spec.series.length > 8) warnings.push('more than 8 series is past the categorical palette; fold the rest into "Other".');
}

/**
 * Heatmap rules: a labelled matrix, one value per cell.
 * @param {any} spec chart spec
 * @param {string[]} errors collected errors
 * @param {string[]} warnings collected warnings
 */
function examineHeat(spec, errors, warnings) {
  const rows = spec.rows;
  const cols = spec.cols;
  const values = spec.values;
  if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(cols) || cols.length === 0) {
    errors.push('heat needs rows [names] and cols [names]');
    return;
  }
  if (!Array.isArray(values) || values.length !== rows.length) {
    errors.push(`heat.values must be a matrix with ${rows.length} rows, one per row label`);
    return;
  }
  if (rows.length * cols.length > 4000) errors.push('heat is limited to 4000 cells; aggregate before drawing it.');
  for (const [index, row] of values.entries()) {
    if (!Array.isArray(row) || row.length !== cols.length) {
      errors.push(`heat.values[${index}] must hold ${cols.length} cells, one per column label`);
      continue;
    }
    if (row.some((cell) => cell !== null && !Number.isFinite(Number(cell)))) {
      errors.push(`heat.values[${index}] must contain numbers or null`);
    }
  }
  if (rows.length > 30 || cols.length > 30) warnings.push('more than 30 rows or columns is a table, not a heatmap; aggregate first.');
}

/**
 * Stat row rules: three or four numbers, each with a label.
 * @param {any} spec chart spec
 * @param {string[]} errors collected errors
 * @param {string[]} warnings collected warnings
 */
function examineStat(spec, errors, warnings) {
  if (!Array.isArray(spec.items) || spec.items.length === 0) {
    errors.push('stat needs items: [{label, value, delta?}]');
    return;
  }
  if (spec.items.length > 8) warnings.push('more than 8 stat tiles is a dashboard; keep the three or four that matter.');
  for (const [index, item] of spec.items.entries()) {
    if (typeof item?.label !== 'string' || item.label.trim() === '') errors.push(`stat.items[${index}] needs a label`);
    if (item?.value === undefined || item.value === null || String(item.value).trim() === '') errors.push(`stat.items[${index}] needs a value`);
  }
}

/**
 * Card rules: one of the named card layouts, with its required fields.
 * @param {string} content artifact source
 * @param {string[]} errors collected errors
 * @param {string[]} warnings collected warnings
 */
function examineCards(content, errors, warnings) {
  const spec = parseJson(content, 'cards', errors);
  if (spec === undefined) return;
  const layouts = ['recipe', 'itinerary', 'quiz', 'steps', 'compare', 'metric', 'profile', 'weather', 'translation', 'message'];
  if (!layouts.includes(spec.type)) {
    errors.push(`cards.type must be one of: ${layouts.join(', ')}`);
    return;
  }
  if (spec.type === 'quiz' && !Array.isArray(spec.questions)) errors.push('cards.questions must be an array for a quiz');
  if (spec.type === 'compare' && (!Array.isArray(spec.options) || spec.options.length < 2 || spec.options.length > 3)) {
    errors.push('cards.options must hold 2-3 options for a comparison');
  }
  if (spec.type === 'recipe' && !Array.isArray(spec.ingredients)) errors.push('cards.ingredients must be an array for a recipe');
  if (spec.type === 'steps' && (!Array.isArray(spec.steps) || spec.steps.length < 2 || spec.steps.length > 8)) {
    errors.push('cards.steps must hold 2-8 steps');
  }
  const count = Array.isArray(spec.cards) ? spec.cards.length : 1;
  if (count > MAX_CARDS) warnings.push(`card artifacts render one card; ${count} items will be stacked.`);
}

/**
 * Slide rules: an order, a title, and the 16:9 ceiling.
 * @param {string} content artifact source
 * @param {string[]} errors collected errors
 * @param {string[]} warnings collected warnings
 */
function examineSlides(content, errors, warnings) {
  const spec = parseJson(content, 'slides', errors);
  if (spec === undefined) return;
  if (!Array.isArray(spec.slides) || spec.slides.length === 0) {
    errors.push('slides.slides must be a non-empty array of {title, ...}');
    return;
  }
  if (spec.slides.length > MAX_SLIDES) errors.push(`deck has ${spec.slides.length} slides; the ceiling is ${MAX_SLIDES}`);
  for (const [index, slide] of spec.slides.entries()) {
    if (typeof slide?.title !== 'string' || slide.title.trim().length === 0) {
      errors.push(`slides.slides[${index}] needs a title`);
    }
    if (slide?.bullets !== undefined && !Array.isArray(slide.bullets)) {
      errors.push(`slides.slides[${index}].bullets must be an array of strings`);
    }
    if (Array.isArray(slide?.bullets) && slide.bullets.length > 6) {
      warnings.push(`slides.slides[${index}] has ${slide.bullets.length} bullets; one idea per slide reads better.`);
    }
  }
}

/**
 * Design rules: artboards have a frame, a name and markup.
 * @param {string} content artifact source
 * @param {string[]} errors collected errors
 * @param {string[]} warnings collected warnings
 */
function examineBoards(content, errors, warnings) {
  const spec = parseJson(content, 'design', errors);
  if (spec === undefined) return;
  if (!Array.isArray(spec.boards) || spec.boards.length === 0) {
    errors.push('design.boards must be a non-empty array of {name, html}');
    return;
  }
  if (spec.boards.length > MAX_BOARDS) errors.push(`canvas has ${spec.boards.length} artboards; the ceiling is ${MAX_BOARDS}`);
  for (const [index, board] of spec.boards.entries()) {
    if (typeof board?.html !== 'string' || board.html.trim().length === 0) {
      errors.push(`design.boards[${index}] needs html`);
    }
    if (board?.w !== undefined && (typeof board.w !== 'number' || board.w < 40 || board.w > 8000)) {
      errors.push(`design.boards[${index}].w must be between 40 and 8000`);
    }
  }
  if (spec.boards.length > 6) warnings.push('more than 6 artboards is a canvas, not a slide: keep each board one screen.');
}

/**
 * A compact human summary of the artifact for the gallery and the model.
 * @param {{kind: string, title: string, content: string}} artifact artifact envelope
 * @returns {string} one line
 */
export function describe(artifact) {
  const bytes = artifact.content.length;
  return `${artifact.kind} "${artifact.title}" · ${bytes.toLocaleString('en-US')} chars`;
}
