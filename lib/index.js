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
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ArtifactStore } from './store.js';
import { validate, KINDS, SURFACES, FILE_FORMATS, EXPORT_FORMATS, MAX_SLIDES, MAX_BOARDS } from './schema.js';
import { renderArtifact, renderExport } from './render.js';
import { createRoutes, BASE } from './routes.js';

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

You can build visual artifacts that live beside the conversation and render natively: inline widgets, charts, cards, published pages, slide decks, a design canvas, documents, and downloadable files. Use them when a visual explains something better than prose, and keep the explanation itself in your reply text.

**One tool: \`artifact\`.** \`action:"create"\` stores and renders; it returns \`id\`, \`viewUrl\` (the rendered document) and \`galleryUrl\`. The card renders inline automatically. Never paste artifact markup into your reply instead of calling the tool.

Kinds and their \`content\`:
- \`widget\` — inline HTML fragment or one \`<svg>\`. No doctype/html/head/body, no \`position:fixed\`. Dynamic: sliders, buttons, small simulations. Start HTML widgets with \`<h2 class="sr-only">\` one-sentence summary. Use the shared tokens — \`--text\`, \`--text-2\`, \`--muted\`, \`--surface\`, \`--surface-2\`, \`--border\`, \`--accent\`, \`--font-serif\`, \`--radius\` — never hardcoded colors. Controls: \`dshArtifact.send("name", {...})\` asks you to react; \`dshArtifact.prompt("...")\` posts a message; use send only when the model must decide — score, sort and toggle locally.
- \`chart\` — JSON \`{"type":"line|bar|scatter|area|donut","labels":[],"series":[{"name":"","values":[]}]}\` (scatter uses \`points:[{x,y}]\`). One y-axis. ≤8 series, ≤2000 points.
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

**Rules**
- Never invent data, statistics, quotes or names. Missing facts become placeholders like \`[YOUR PRICE]\`.
- One artifact per idea; 3–8 artifacts in one answer is already a lot.
- Text belongs in your reply; the artifact carries the visual. No headings or paragraphs of explanation inside the artifact.
- Sentence case; two weights (400/500); headings 22/18/16px, body 16px; no emoji; flat surfaces (no gradients or glow).
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
      'Create, revise, list or export a visual artifact that renders natively in the conversation.',
      'Kinds: widget (inline HTML/SVG), chart (JSON), cards (JSON), page (published HTML), slides (JSON deck), design (JSON artboards), doc (Markdown), file (downloadable).',
      'Returns the artifact id, the rendered view URL and the gallery URL. The card appears inline; keep the explanation in your reply, not in the artifact.',
    ].join(' '),
    parameters: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'list', 'export', 'open', 'delete'],
        description: 'create renders a new artifact. update replaces one by id. list shows recent artifacts. export writes a file. open returns the URL. delete removes it.',
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
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', required: true },
          id: { type: 'string' },
          kind: { type: 'string' },
          title: { type: 'string' },
          surface: { type: 'string' },
          viewUrl: { type: 'string' },
          galleryUrl: { type: 'string' },
          exportPath: { type: 'string' },
          bytes: { type: 'integer' },
          artifacts: { type: 'array', items: { type: 'object' } },
          warnings: { type: 'array', items: { type: 'string' } },
          message: { type: 'string', required: true },
        },
      },
      render: (_args, value) => {
        const blocks = [{ type: 'text', text: value.message }];
        if (typeof value.viewUrl === 'string') blocks.push({ type: 'text', text: `View: ${value.viewUrl}` });
        if (typeof value.exportPath === 'string') blocks.push({ type: 'text', text: `File: ${value.exportPath}` });
        if (Array.isArray(value.warnings) && value.warnings.length > 0) {
          blocks.push({ type: 'text', text: `Notes:\n- ${value.warnings.join('\n- ')}` });
        }
        return blocks;
      },
      presentationMeta: (_args, value) => ({
        kind: 'artifact',
        id: value.id,
        artifactKind: value.kind,
        title: value.title,
        surface: value.surface,
        viewUrl: value.viewUrl,
        galleryUrl: value.galleryUrl,
        summary: value.message,
      }),
    },
    isConcurrencySafe: (args) => args.action === 'create' || args.action === 'list' || args.action === 'open',
    async execute(args) {
      const action = typeof args?.action === 'string' ? args.action : 'create';
      const galleryUrl = `${BASE}/gallery`;

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
          message: `Opened ${record.id} (${record.kind}) — ${record.title}.`,
        };
      }

      if (action === 'delete') {
        const record = await requireRecord(store, args?.id);
        await store.remove(record.id);
        return { action, id: record.id, kind: record.kind, title: record.title, galleryUrl, message: `Deleted ${record.id}.` };
      }

      if (action === 'export') {
        const record = await requireRecord(store, args?.id);
        const format = typeof args?.format === 'string' ? args.format : 'html';
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
          message: `Exported ${record.id} as ${extension} (${bytes.length.toLocaleString('en-US')} bytes).`,
        };
      }

      if (action === 'update') {
        const id = typeof args?.id === 'string' ? args.id : '';
        const record = await requireRecord(store, id);
        const previous = await store.load(record);
        const merged = {
          kind: typeof args?.kind === 'string' ? args.kind : previous.kind,
          title: typeof args?.title === 'string' ? args.title : previous.title,
          surface: typeof args?.surface === 'string' ? args.surface : previous.surface,
          content: typeof args?.content === 'string' ? args.content : previous.content,
          format: typeof args?.format === 'string' ? args.format : previous.format,
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
          warnings: verdict.warnings,
          message: `Updated ${updated.id} — ${updated.title} (${updated.kind}).`,
        };
      }

      // create
      const verdict = validate({
        kind: args?.kind,
        title: args?.title,
        surface: args?.surface,
        content: args?.content,
        format: args?.format,
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
 * @returns {Promise<{path: string, content: string, description: string}>} skill source
 */
async function readSkill() {
  const url = new URL('../SKILL.md', import.meta.url);
  const raw = await readFile(url, 'utf8');
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
      scope.effect(() => scope.tools.register(createArtifactTool(store)), 'dsh-artifacts: artifact tool');
    });
  }

  ctx.inject(['skills'], (scope) => {
    scope.effect(() => {
      let dispose = () => undefined;
      readSkill().then((skill) => {
        dispose = scope.skills.register({
          name: 'artifacts',
          description: skill.description,
          path: skill.path,
          resourceBase: { kind: 'directory', path: skill.path.replace(/[\\/][^\\/]+$/u, '') },
          content: skill.content,
          source: 'runtime',
          invocation: { modelInvocable: true, userInvocable: false },
        });
      }).catch((error) => {
        console.warn('[dsh-artifacts] skill unavailable:', error instanceof Error ? error.message : error);
      });
      return () => dispose();
    }, 'dsh-artifacts: skill');
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
