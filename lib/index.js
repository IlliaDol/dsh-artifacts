/**
 * dsh-artifacts, node half.
 *
 * One plugin row that gives the model a single artifact surface:
 *   - a `dsh-artifact` fence for placing an existing artifact in a reply;
 *   - an `artifact` tool that creates, updates, lists and exports one;
 *   - a store under `$DSH_HOME/artifacts`;
 *   - viewer, source, export and gallery routes.
 *
 * The browser half (lib/client.js) renders the card inline and relays card
 * actions back into the conversation.
 *
 * @module dsh-artifacts
 */

import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ArtifactStore } from './store.js';
import { validate, KINDS, SURFACES, FILE_FORMATS, EXPORT_FORMATS, MAX_SLIDES, MAX_BOARDS, CHART_FORMS } from './schema.js';
import { renderArtifact, renderExport } from './render.js';
import { createRoutes, BASE } from './routes.js';
import { cookbook, getRecipe, searchRecipes } from './cookbook.js';

/** Cordis plugin name; also the module-loader id of the client bundle. */
export const name = 'dsh-artifacts';

/**
 * Required services. Everything else is optional and probed: a headless
 * profile has no web server, and the tool still teaches the model there.
 */
export const inject = ['systemPrompt'];

/**
 * Plugin configuration, read unvalidated (the host may pass any shape).
 * @typedef {object} Config
 * @property {string} [directory] artifact store directory; defaults to $DSH_HOME/artifacts
 * @property {boolean} [tool] set false to keep only the fence channel
 * @property {number} [maxArtifacts] gallery/listing ceiling
 */

/** The prompt section that makes the surface discoverable. */
export const PROMPT = `## Artifacts

You can build visual artifacts that render natively in the conversation: inline widgets, charts, cards, published pages, slide decks, a design canvas, documents, and downloadable files. Keep the explanation itself in your reply text.

**Decide to draw yourself.** Reach for an artifact when a picture carries information prose cannot: a distribution, a comparison across many values, a trend, a relationship, a part-to-whole, a process, a 3D object, or a behaviour that changes with a parameter. The user does not have to say "artifact", "visualise" or "chart". When they do say one of those, produce one without being asked twice.

**Never answer a visual request in text.** "Draw me …", "plot …", "show me …", "explain better" with a picture in mind is an artifact call, not ASCII art, a text diagram or a table of characters. If a call fails, report the failure and retry once with a simpler source; never silently downgrade to a drawing made of prose.

**Explainers.** When the request is "explain this better", "show me why", or a mechanism with steps, build an interactive explainer: a \`widget\` with a one-line step title, a short caption per panel, the figure itself, and one control that recomputes it ("Run again", a slider, a toggle). Captions and step titles are allowed inside an explainer; paragraphs of argument are not — the reply carries those. Small multiples of one idea (three panels, one per design or condition) beat one crowded panel.

**One tool: \`artifact\`.** \`action:"create"\` stores and renders; it returns \`id\`, \`viewUrl\` (the rendered document), \`galleryUrl\` and \`cookbookUrl\`. The card renders inline automatically. Never paste artifact markup into your reply instead of calling the tool.

**The cookbook.** ${cookbook().count} tested recipes across ${Object.keys(cookbook().families).length} families: comparison, distribution, time, relationships, part-to-whole, flow, maps, statistics/ML, math/science, diagrams, tables, interactive explainers, UI/art, 3D/animation and combining. \`action:"cookbook"\` with \`recipe:"qq"\` returns the metadata and exact code; with \`family:"stats"\` it lists that family; with no argument it lists every family. When a recipe fits, create \`kind:"recipe"\` with its id rather than rebuilding it. For a bespoke variation, copy the recipe's code into a \`widget\`; the widget frame exposes the cookbook kit as \`Kit\` and its 3D helpers as \`C3\`.

Kinds and their \`content\`:
- \`widget\` — inline HTML fragment or one \`<svg>\`. No doctype/html/head/body, no \`position:fixed\`. Dynamic: sliders, buttons, small simulations. The bundled kit is already loaded in the frame as globals — \`VK\` (scales, axes, tooltip, pointer drag, frame loop), \`V3\` (rotation, projection, orbit) and \`VC\` (the chart renderer). Use them rather than hand-rolling scales or loading a library; the frame has no network. Start HTML widgets with \`<h2 class="sr-only">\` one-sentence summary. Use the shared tokens — \`--text\`, \`--text-2\`, \`--muted\`, \`--surface\`, \`--surface-2\`, \`--border\`, \`--accent\`, \`--font-serif\`, \`--radius\` — never hardcoded colors. Controls: \`dshArtifact.send("name", {...})\` asks you to react; \`dshArtifact.prompt("...")\` posts a message; use send only when the model must decide — score, sort and toggle locally.
- \`chart\` — JSON \`{"type":"${CHART_FORMS.join('|')}","labels":[],"series":[{"name":"","values":[]}]}\` (scatter uses \`points:[{x,y}]\`; \`hist\` and \`box\` read raw observations from \`values\` and need no labels). Every chart is interactive already: hover readouts, click to isolate, a legend that toggles series, a bin slider on histograms, drag-to-zoom on lines. Do not describe the controls; describe the finding. New shapes: \`dumbbell\` and \`slope\` take exactly two series (before, after); \`heat\` takes rows/cols/values; \`stat\` takes items; \`bullet\` takes targets; \`waterfall\`, \`pareto\` and \`funnel\` read the first series; \`density\`, \`ecdf\` and \`violin\` read raw observations from \`values\`. One y-axis. ≤8 series, ≤2000 points.
- \`recipe\` — one of the ${cookbook().count} cookbook recipes, by id: \`content\` is \`"qq"\` or \`{"id":"qq"}\`. The recipe draws itself with the exact vendored function; there is no code to retype. Use \`action:"cookbook"\` to search or read one. The live gallery is at ${BASE}/cookbook.
- \`cards\` — JSON with a \`type\`: \`recipe | itinerary | quiz | steps | compare | metric | profile | weather | translation | message\`. Quizzes score locally.
- \`page\` — a whole published page: a full \`<!doctype html>\` document or a fragment. This is the "shareable app" surface.
- \`slides\` — JSON \`{"title":"","slides":[{"layout":"cover|section|bullets|quote|metrics|two-col|image","title":"","bullets":[],"notes":""}]}\`, 16:9, ≤${MAX_SLIDES} slides. Arrow keys page; \`PDF\` prints one slide per page.
- \`design\` — JSON \`{"title":"","boards":[{"name":"","w":390,"h":844,"html":"<…>"}]}\`, ≤${MAX_BOARDS} artboards on a pannable canvas. Phone 390×844, page 1280–1440 wide.
- \`doc\` — Markdown. Renders as a reading document; exports to Word, Markdown and PDF.
- \`file\` — a downloadable file; give \`format\` one of ${FILE_FORMATS.join(', ')}. This is the only kind that does not render inline.

**Surfaces:** \`inline\` (default for widget/chart/cards), \`wide\`, \`page\` (opens in its own tab), \`canvas\` (default for slides/design).

**Placing an existing artifact inline:** emit a fenced block
\`\`\`dsh-artifact
{"id":"art_1a2b3c4d5e"}
\`\`\`
No other fence language renders.

**Revising:** call \`artifact\` with \`action:"update"\`, the \`id\`, and the new \`content\`. Re-send the whole source; do not describe a patch.

**Exports:** \`action:"export"\` with \`format\` one of ${EXPORT_FORMATS.join(', ')} writes the file and returns its path. PDF is also available from the viewer's print dialog.

**Placing it where you mean it.** The card renders inline at the tool call. When the exact position in the text matters, also emit the \`dsh-artifact\` fence there — one artifact, one placement — and write the sentence either side of it.

**Rules**
- Never invent data, statistics, quotes or names. Missing facts become placeholders like \`[YOUR PRICE]\`. Generated demo data teaches a form; label it as demo, never as a measurement.
- One artifact per idea; 3–8 artifacts in one answer is already a lot.
- Charts, cards and decks carry the visual; your reply carries the argument. No paragraphs of explanation inside a chart. An explainer may carry a one-line step title and short panel captions.
- Sentence case; two weights (400/500); headings 22/18/16px, body 16px; no emoji; flat surfaces (no gradients or glow).
- Pick the form from the question, not from habit. Bars start at zero. One y-axis, never two. Four to six ticks per axis; round every number that reaches the screen. Direct labels beat a legend when there are few series. Draw back to front: bands, grid, marks, annotations, labels.
- The fixed eight-colour order is the palette. Never cycle past eight; fold the rest into “Other” or use small multiples. Use CSS tokens so light and dark both work.
- Remote assets only from ${[...new Set(['cdnjs.cloudflare.com', 'esm.sh', 'cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'])].join(', ')}.
- Never put credentials, API keys or private file contents in an artifact.
- Prefer local interaction. Only ask the model when the next step genuinely needs reasoning; state-changing UI goes through \`dshArtifact.send\`.
- Kinds: ${KINDS.join(', ')}. Surfaces: ${SURFACES.join(', ')}.`;

/**
 * The model tool definition.
 * @param {ArtifactStore} store artifact store
 * @returns {any} tool definition
 */
function createArtifactTool(store) {
  return {
    name: 'artifact',
    description: [
      'Create, revise, list, export or look up a visual artifact that renders natively in the conversation.',
      'Kinds: widget (inline HTML/SVG), chart (JSON), recipe (a vendored cookbook id), cards (JSON), page (published HTML), slides (JSON deck), design (JSON artboards), doc (Markdown), file (downloadable).',
      'action:"cookbook" searches the 165-recipe cookbook and returns exact code; create kind:"recipe" with an id to draw one without retyping it.',
      'Returns the artifact id, the rendered view URL, the gallery URL and the cookbook URL. The card appears inline; keep the explanation in your reply, not in the artifact.',
    ].join(' '),
    parameters: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'list', 'export', 'open', 'delete', 'cookbook'],
        description: 'create renders a new artifact. update replaces one by id. list shows recent artifacts. export writes a file. open returns the URL. delete removes it. cookbook searches the vendored recipe library.',
      },
      kind: {
        type: 'string',
        enum: KINDS,
        description: 'Artifact kind. Required on create; defaults to the stored kind on update.',
      },
      title: {
        type: 'string',
        description: 'Human title, also the export filename stem. Required on create.',
      },
      content: {
        type: 'string',
        description: 'The source: markup for widget/page, Markdown for doc, JSON for chart/cards/slides/design, raw text for file. Required on create.',
      },
      surface: {
        type: 'string',
        enum: SURFACES,
        description: 'inline (default for widget/chart/cards), wide, page (own tab), canvas (default for slides/design).',
      },
      format: {
        type: 'string',
        enum: [...FILE_FORMATS, ...EXPORT_FORMATS.filter((value) => !FILE_FORMATS.includes(value))],
        description: 'For file: the file format to write. For export: the format to export to.',
      },
      id: {
        type: 'string',
        description: 'Artifact id (art_ + 10 hex). Required on update, export, open and delete.',
      },
      summary: {
        type: 'string',
        description: 'One line shown by launchers and the gallery.',
      },
      recipe: {
        type: 'string',
        description: 'cookbook only: a recipe id ("qq") or a search phrase ("normality", "sankey"). With an exact id the result includes the exact code.',
      },
      family: {
        type: 'string',
        description: 'cookbook only: narrow to a family such as comparison, distribution, time, relationship, parts, flow, maps, stats, science, diagrams, tables, interactive, ui_art, threed or combining.',
      },
      limit: {
        type: 'integer',
        description: 'cookbook only: maximum results to return (1-40, default 12).',
      },
    },
    output: {
      // `output.schema` is strict JSON Schema (the dsh tool registry validates it
      // with assertSupportedJsonSchema), unlike `parameters`, which uses the
      // value-schema DSL. `required` is therefore an array of property names at
      // the object level — a `required: true` on a property makes the whole
      // registration throw and the model never sees the tool.
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['action', 'message'],
        properties: {
          action: { type: 'string' },
          id: { type: 'string' },
          kind: { type: 'string' },
          title: { type: 'string' },
          surface: { type: 'string' },
          viewUrl: { type: 'string' },
          galleryUrl: { type: 'string' },
          cookbookUrl: { type: 'string' },
          exportPath: { type: 'string' },
          count: { type: 'integer' },
          families: { type: 'object' },
          recipe: { type: 'object' },
          recipes: { type: 'array', items: { type: 'object' } },
          bytes: { type: 'integer' },
          artifacts: { type: 'array', items: { type: 'object' } },
          warnings: { type: 'array', items: { type: 'string' } },
          message: { type: 'string' },
        },
      },
      render: (_args, value) => {
        const blocks = [{ type: 'text', text: value.message }];
        if (typeof value.viewUrl === 'string') blocks.push({ type: 'text', text: `View: ${value.viewUrl}` });
        if (typeof value.exportPath === 'string') blocks.push({ type: 'text', text: `File: ${value.exportPath}` });
        if (value.recipe && typeof value.recipe.code === 'string') {
          blocks.push({ type: 'text', text: `Code for ${value.recipe.id}:\n\`\`\`js\n${value.recipe.code}\n\`\`\`` });
        }
        if (Array.isArray(value.warnings) && value.warnings.length > 0) {
          blocks.push({ type: 'text', text: `Notes:\n- ${value.warnings.join('\n- ')}` });
        }
        return blocks;
      },
      presentationMeta: (_args, value) => (value.id === undefined ? {} : defined({
        kind: 'artifact',
        id: value.id,
        artifactKind: value.kind,
        title: value.title,
        surface: value.surface,
        viewUrl: value.viewUrl,
        galleryUrl: value.galleryUrl,
        cookbookUrl: value.cookbookUrl,
        summary: value.message,
      })),
    },
    isConcurrencySafe: (args) => args.action === 'create' || args.action === 'list' || args.action === 'open' || args.action === 'cookbook',
    // dsh snapshots every tool value with snapshotJsonValue, which fails on
    // `undefined`: an optional key left set to undefined turns a successful
    // create into "value is not lossless JSON" and the model gets an error
    // instead of a card. Drop those members on the way out.
    async execute(args) {
      return defined(await this.executeArtifact(args));
    },
    async executeArtifact(args) {
      const action = typeof args?.action === 'string' ? enumValue(args.action) : 'create';
      const galleryUrl = `${BASE}/gallery`;
      const cookbookUrl = `${BASE}/cookbook`;

      if (action === 'cookbook') {
        const info = cookbook();
        const query = typeof args?.recipe === 'string' ? args.recipe.trim() : '';
        const family = typeof args?.family === 'string' ? args.family.trim() : '';
        const limit = Number.isInteger(args?.limit) ? args.limit : 12;
        const exact = query === '' ? undefined : getRecipe(query.toLowerCase());
        if (exact !== undefined) {
          return {
            action,
            cookbookUrl,
            count: info.count,
            recipe: publicRecipe(exact, true),
            message: `Recipe ${exact.id} — ${exact.name} (${exact.family}). Create it with kind:"recipe", content:"${exact.id}"; use the code below only for a bespoke variation.`,
          };
        }
        const found = searchRecipes({ query, family, limit });
        const list = found.recipes.map(publicRecipe);
        return {
          action,
          cookbookUrl,
          count: found.total,
          families: info.families,
          recipes: list,
          message: list.length === 0
            ? `No recipe matches${query === '' ? '' : ` "${query}"`}${family === '' ? '' : ` in ${family}`}. Families: ${Object.keys(info.families).join(', ')}.`
            : `${found.total} recipe${found.total === 1 ? '' : 's'} match${found.total === 1 ? 'es' : ''}; showing ${list.length}:\n${list.map((entry) => `- ${entry.id} · ${entry.family} · ${entry.name}`).join('\n')}\nCreate one with kind:"recipe" and its id, or ask for an exact id to get its code.`,
        };
      }

      if (action === 'list') {
        const artifacts = await store.list(30);
        return {
          action,
          artifacts: artifacts.map((record) => ({
            id: record.id,
            kind: record.kind,
            title: record.title,
            updatedAt: record.updatedAt,
          })),
          galleryUrl,
          cookbookUrl,
          message: artifacts.length === 0
            ? 'No artifacts yet.'
            : `${artifacts.length} artifact${artifacts.length === 1 ? '' : 's'}:\n${artifacts.map((record) => `- ${record.id} · ${record.kind} · ${record.title}`).join('\n')}`,
        };
      }

      if (action === 'open') {
        const record = await requireRecord(store, args?.id);
        return {
          action,
          id: record.id,
          kind: record.kind,
          title: record.title,
          surface: record.surface,
          viewUrl: `${BASE}/view?id=${record.id}`,
          galleryUrl,
          cookbookUrl,
          message: `Opened ${record.id} (${record.kind}) — ${record.title}.`,
        };
      }

      if (action === 'delete') {
        const record = await requireRecord(store, args?.id);
        await store.remove(record.id);
        return { action, id: record.id, kind: record.kind, title: record.title, galleryUrl, cookbookUrl, message: `Deleted ${record.id}.` };
      }

      if (action === 'export') {
        const record = await requireRecord(store, args?.id);
        const format = typeof args?.format === 'string' ? enumValue(args.format) : 'html';
        const artifact = await store.load(record);
        const { bytes, extension } = renderExport(artifact, format);
        const path = await store.exportFile(record.id, extension, bytes);
        return {
          action,
          id: record.id,
          kind: record.kind,
          title: record.title,
          exportPath: path,
          bytes: bytes.length,
          galleryUrl,
          cookbookUrl,
          message: `Exported ${record.id} as ${extension} (${bytes.length.toLocaleString('en-US')} bytes).`,
        };
      }

      if (action === 'update') {
        const id = typeof args?.id === 'string' ? args.id : '';
        const record = await requireRecord(store, id);
        const previous = await store.load(record);
        const merged = {
          kind: typeof args?.kind === 'string' ? enumValue(args.kind) : previous.kind,
          title: typeof args?.title === 'string' ? args.title : previous.title,
          surface: typeof args?.surface === 'string' ? enumValue(args.surface) : previous.surface,
          content: typeof args?.content === 'string' ? args.content : previous.content,
          format: typeof args?.format === 'string' ? enumValue(args.format) : previous.format,
          summary: typeof args?.summary === 'string' ? args.summary : previous.summary,
        };
        const verdict = validate(merged);
        if (!verdict.ok) throw new Error(`artifact rejected:\n- ${verdict.errors.join('\n- ')}`);
        const { html } = renderArtifact(verdict.artifact);
        if (html === null && verdict.artifact.kind !== 'file') {
          throw new Error(`kind ${verdict.artifact.kind} produced no document`);
        }
        const updated = await store.update(id, verdict.artifact, html ?? '');
        return {
          action,
          id: updated.id,
          kind: updated.kind,
          title: updated.title,
          surface: updated.surface,
          viewUrl: html === null ? undefined : `${BASE}/view?id=${updated.id}`,
          galleryUrl,
          cookbookUrl,
          warnings: verdict.warnings,
          message: `Updated ${updated.id} — ${updated.title} (${updated.kind}).`,
        };
      }

      // create
      const verdict = validate({
        kind: enumValue(args?.kind),
        title: args?.title,
        surface: enumValue(args?.surface),
        content: args?.content,
        format: enumValue(args?.format),
        summary: args?.summary,
      });
      if (!verdict.ok) throw new Error(`artifact rejected:\n- ${verdict.errors.join('\n- ')}`);
      const { html } = renderArtifact(verdict.artifact);
      if (html === null && verdict.artifact.kind !== 'file') {
        throw new Error(`kind ${verdict.artifact.kind} produced no document`);
      }
      const record = await store.create(verdict.artifact, html ?? '');
      let exportPath;
      if (verdict.artifact.kind === 'file') {
        const format = verdict.artifact.format ?? 'txt';
        const bytes = Buffer.from(artifactFileBody(verdict.artifact), 'utf8');
        exportPath = await store.exportFile(record.id, format, bytes);
      }
      return {
        action: 'create',
        id: record.id,
        kind: record.kind,
        title: record.title,
        surface: record.surface,
        viewUrl: html === null ? undefined : `${BASE}/view?id=${record.id}`,
        galleryUrl,
        cookbookUrl,
        exportPath,
        warnings: verdict.warnings,
        message: `${record.kind} artifact created: ${record.title} (${record.id}).`
          + (record.surface === 'canvas' ? ' Open it from the card; arrow keys page a deck.' : '')
          + (record.kind === 'file' ? ` Saved to ${exportPath}.` : ''),
      };
    },
  };
}

/**
 * Drop `undefined` members so a result is lossless JSON.
 *
 * dsh snapshots every tool value with `snapshotJsonValue`, which fails on
 * `undefined`; a result object that merely *has* an optional key set to
 * undefined is rejected with "value is not lossless JSON" and the model sees an
 * error instead of an artifact.
 * @param {Record<string, any>} value result object
 * @returns {Record<string, any>} the same object without undefined members
 */
function defined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, member]) => member !== undefined));
}

/**
 * Lower-case an enum-shaped wire value: `"Chart"` becomes `"chart"`.
 *
 * The model sometimes capitalises a kind or adds a space; rejecting that with
 * "kind must be one of …" costs a turn and teaches nothing, so the tool is
 * forgiving about case and surrounding whitespace on every enum field.
 * @param {unknown} value raw wire value
 * @returns {unknown} normalised value
 */
function enumValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/**
 * The part of a recipe a caller needs, without the pack internals.
 * @param {any} recipe cookbook recipe
 * @param {boolean} [includeCode] include the exact drawing function
 * @returns {any} public recipe
 */
function publicRecipe(recipe, includeCode = false) {
  const view = {
    id: recipe.id,
    name: recipe.name,
    family: recipe.family,
    when: recipe.when,
    steps: recipe.steps,
    combine: recipe.combine,
    hasTest: recipe.hasTest,
    needsGeo: recipe.needsGeo,
  };
  if (includeCode) view.code = recipe.code;
  return view;
}

/**
 * The bytes of a `file` artifact's body.
 * @param {{format?: string, content: string}} artifact artifact
 * @returns {string} file body
 */
function artifactFileBody(artifact) {
  if (artifact.format === 'csv' || artifact.format === 'json' || artifact.format === 'md') return artifact.content;
  if (artifact.format === 'html') return artifact.content;
  return artifact.content;
}

/**
 * Look up an artifact or fail with a message the model can act on.
 * @param {ArtifactStore} store artifact store
 * @param {unknown} id raw id
 * @returns {Promise<any>} record
 */
async function requireRecord(store, id) {
  if (typeof id !== 'string' || !/^art_[a-f0-9]{10}$/u.test(id)) {
    throw new Error('id is required and must look like art_ followed by 10 hex characters');
  }
  const record = await store.get(id);
  if (record === undefined) throw new Error(`artifact ${id} not found; call action:"list" to see the ids`);
  return record;
}

/**
 * Locate `$DSH_HOME`.
 * @returns {string} absolute home directory
 */
export function dshHome() {
  const fromEnv = process.env.DSH_HOME;
  return fromEnv !== undefined && fromEnv.trim() !== '' ? resolve(fromEnv) : join(homedir(), '.dsh');
}

/**
 * The bundled skill: the long-form catalogue and worked examples.
 *
 * Read synchronously on purpose: `apply` runs before the first prompt is
 * assembled, so the skill is registered for the session that is starting.
 * An awaited read left the first turn of every fresh process without it.
 * @returns {{path: string, content: string, description: string}} skill source
 */
function readSkill() {
  const url = new URL('../SKILL.md', import.meta.url);
  const raw = readFileSync(url, 'utf8');
  const end = raw.indexOf('\n---\n', 3);
  const frontmatter = end > 0 ? raw.slice(0, end) : '';
  const quoted = /description:\s*"([^"]+)"/u.exec(frontmatter)?.[1];
  const plain = /description:\s*(.+)/u.exec(frontmatter)?.[1]?.trim();
  return {
    path: fileURLToPath(url),
    content: end > 0 ? raw.slice(end + 5) : raw,
    description: quoted
      ?? plain
      ?? 'Build visual artifacts for DeepSeek Harness: widgets, charts, cards, pages, slides, design canvases, docs and files.',
  };
}

/**
 * Register the prompt section, the tool, the skill and the routes.
 * @param {any} ctx cordis context
 * @param {Config} [config] plugin configuration
 * @returns {void} nothing
 */
export function apply(ctx, config = {}) {
  const directory = typeof config.directory === 'string' && config.directory.length > 0
    ? resolve(config.directory)
    : join(dshHome(), 'artifacts');
  const store = new ArtifactStore(directory);
  const ready = store.init().catch((error) => {
    console.error('[dsh-artifacts] store init failed:', error);
  });
  void ready;

  const order = typeof ctx.systemPrompt?.getSectionOrder === 'function'
    ? ctx.systemPrompt.getSectionOrder('STRUCTURED_OUTPUT')
    : 100;
  ctx.systemPrompt.section({ name: 'artifacts:surface', order, text: PROMPT });

  if (config.tool !== false) {
    ctx.inject(['tools'], (scope) => {
      scope.effect(() => {
        try {
          return scope.tools.register(createArtifactTool(store));
        } catch (error) {
          // A rejected definition must not vanish silently: without this line
          // the model simply never sees the tool and answers a drawing request
          // in prose, which is exactly the failure this plugin exists to avoid.
          console.error('[dsh-artifacts] artifact tool registration failed:', error instanceof Error ? error.message : error);
          throw error;
        }
      }, 'dsh-artifacts: artifact tool');
    });
  }

  ctx.inject(['skills'], (scope) => {
    let skill;
    try {
      skill = readSkill();
    } catch (error) {
      console.warn('[dsh-artifacts] skill unavailable:', error instanceof Error ? error.message : error);
      return;
    }
    scope.effect(() => scope.skills.register({
      name: 'artifacts',
      description: skill.description,
      path: skill.path,
      resourceBase: { kind: 'directory', path: skill.path.replace(/[\\/][^\\/]+$/u, '') },
      content: skill.content,
      source: 'runtime',
      invocation: { modelInvocable: true, userInvocable: false },
    }), 'dsh-artifacts: skill');
  });

  ctx.inject(['webServer'], (scope) => {
    for (const route of createRoutes({ store, pluginId: name })) {
      scope.effect(() => scope.webServer.register(route), `dsh-artifacts: ${route.path}`);
    }
  });

  console.info(`[dsh-artifacts] host active; store=${directory}`);
}

export { ArtifactStore } from './store.js';
export { validate, KINDS, SURFACES, FILE_FORMATS, EXPORT_FORMATS } from './schema.js';
export { renderArtifact, renderExport } from './render.js';
export { BASE } from './routes.js';
