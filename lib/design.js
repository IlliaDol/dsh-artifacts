/**
 * The house style every artifact inherits, and the audit that keeps a
 * free-form artifact inside it.
 *
 * The renderer owns the look: tokens, typography, spacing and the component
 * vocabulary below. A model composing a widget uses these classes instead of
 * inventing CSS, which is what keeps two artifacts from two different models
 * looking like the same product. The audit turns the rules a reviewer would
 * apply by eye into errors and warnings the model sees in the tool result, so
 * the same failure cannot ship twice.
 *
 * @module dsh-artifacts/design
 */

/**
 * The component vocabulary, appended to the token sheet of every artifact.
 *
 * Only composition lives here: a step title, its caption, a row of panels, a
 * controls bar. A model that needs one of these should use the class, not
 * restate the styles — that is the difference between a house style and a pile
 * of one-off documents.
 */
export const DESIGN_CSS = `
/* --- explainer vocabulary --- */
.step{font-size:18px;font-weight:600;line-height:1.3;margin:0 0 4px;letter-spacing:-.01em}
.step .num{color:var(--muted);font-weight:500;margin-right:8px}
.caption{font-size:13px;line-height:1.5;color:var(--text-2);margin:0 0 14px}
.kicker{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
.figure{margin:0 0 16px}
.figure:last-child{margin-bottom:0}
.figure svg{display:block;width:100%;height:auto}
.panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px;align-items:start}
.panel{min-width:0}
.panel h4{font-family:var(--font-sans);font-size:13px;font-weight:600;margin:0 0 2px}
.panel .caption{margin:6px 0 0}
.note{font-size:12px;line-height:1.5;color:var(--muted);margin:10px 0 0}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 12px}
.controls label{display:inline-flex;gap:8px;align-items:center;font-size:13px;color:var(--text-2)}
.value{font-variant-numeric:tabular-nums;font-weight:500}
.rule{border:0;border-top:1px solid var(--border);margin:20px 0}
`;

/**
 * @typedef {object} DesignIssue
 * @property {string} id stable rule id
 * @property {'error'|'warning'} severity error blocks the artifact, warning is advice
 * @property {string} message what is wrong and what to do instead
 */

/**
 * A design rule: a test over the source and the sentence the model should read.
 * @typedef {object} DesignRule
 * @property {string} id stable rule id
 * @property {'error'|'warning'} severity
 * @property {(content: string, options: {html: boolean}) => boolean} test
 * @property {string} message
 */

/** Emoji are banned by the house style: they break the type system and the tone. */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

/** A background painted pure white or pure black, which cannot follow the theme. */
const LIGHT_BACKGROUND = /(?:background|background-color)\s*:\s*(?:#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))(?![\w-])/iu;
const DARK_BACKGROUND = /(?:background|background-color)\s*:\s*(?:#000(?:000)?|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\))(?![\w-])/iu;

/** Gradients and glow are flat-surface violations. */
const GRADIENT = /(?:linear|radial|conic)-gradient\s*\(/iu;

/** A canvas assignment that tries to read a CSS variable. */
const CANVAS_VAR = /(?:fillStyle|strokeStyle)\s*=\s*['"`][^'"`]*var\(--/iu;

/** A fixed pixel width wide enough to overflow the 980px artifact card. */
const WIDE_FIXED = /(?:^|[;{"'\s])width\s*:\s*(\d{3,4})px/iu;

/**
 * Every rule, in the order a reviewer would notice them.
 * @type {DesignRule[]}
 */
export const DESIGN_RULES = [
  {
    id: 'canvas-css-variable',
    severity: 'error',
    test: (content) => /<canvas[\s>]/iu.test(content) && CANVAS_VAR.test(content),
    message: 'canvas cannot resolve CSS variables: fillStyle/strokeStyle needs a concrete colour, resolved with VK.theme(host). Better: do not draw a chart by hand — use kind "chart" (your numbers) or kind "recipe" (a prepared drawing).',
  },
  {
    id: 'canvas-chart',
    severity: 'warning',
    test: (content) => /<canvas[\s>]/iu.test(content),
    message: 'a hand-written canvas chart gets no hover, no theme tokens and no accessible data table; kind "chart" or "recipe" draws it for you.',
  },
  {
    id: 'hardcoded-light-background',
    severity: 'warning',
    test: (content) => LIGHT_BACKGROUND.test(content),
    message: 'hardcoded white background; use var(--surface) or var(--bg) so the artifact follows the app theme.',
  },
  {
    id: 'hardcoded-dark-background',
    severity: 'warning',
    test: (content) => DARK_BACKGROUND.test(content),
    message: 'hardcoded black background; use var(--surface) or var(--bg) so the artifact follows the app theme.',
  },
  {
    id: 'gradient',
    severity: 'warning',
    test: (content) => GRADIENT.test(content),
    message: 'gradients are not in the house style; use a flat surface and one accent.',
  },
  {
    id: 'emoji',
    severity: 'warning',
    test: (content) => EMOJI.test(content),
    message: 'emoji are not in the house style; use words and the palette.',
  },
  {
    id: 'fixed-position',
    severity: 'error',
    test: (content) => /position\s*:\s*fixed/iu.test(content),
    message: 'position:fixed breaks the frame, which sizes itself to its content; use normal flow.',
  },
  {
    id: 'wide-fixed-width',
    severity: 'warning',
    test: (content) => {
      const match = WIDE_FIXED.exec(content);
      return match !== null && Number(match[1]) > 980;
    },
    message: 'a fixed width wider than 980px overflows the artifact card; use width:100% or max-width.',
  },
  {
    id: 'missing-summary',
    severity: 'warning',
    test: (content, options) => options.html && !/class\s*=\s*["'][^"']*\bsr-only\b/iu.test(content),
    message: 'HTML widgets should start with <h2 class="sr-only"> one-sentence summary for screen readers.',
  },
];

/**
 * Apply the house style to one source.
 * @param {string} content artifact source
 * @param {{html?: boolean}} [options] `html` is true for a non-SVG widget fragment
 * @returns {{errors: string[], warnings: string[]}} issues, split by severity
 */
export function auditDesign(content, options = {}) {
  const html = options.html === true;
  const errors = [];
  const warnings = [];
  for (const rule of DESIGN_RULES) {
    if (!rule.test(content, { html })) continue;
    (rule.severity === 'error' ? errors : warnings).push(rule.message);
  }
  return { errors, warnings };
}
