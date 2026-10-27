/**
 * The HTTP surface of an artifact: view, source, export, gallery.
 *
 * Every rendered document is served with a CSP that allows the documented CDN
 * allowlist and nothing else, plus `nosniff`. Artifacts are model-authored, so
 * the frame is also sandboxed on the client side; a page opened in its own tab
 * keeps the same CSP but is otherwise a normal page.
 */

import { ID_RE } from './store.js';
import { renderArtifact, renderExport } from './render.js';
import { EXPORT_FORMATS, KINDS } from './schema.js';
import { escapeHtml } from './markdown.js';
import { TOKENS_CSS, formatNumber } from './theme.js';

/** Prefix every route lives under. */
export const BASE = '/plugins/dsh-artifacts';

/** CSP for a rendered artifact. */
export const ARTIFACT_CSP = [
  "default-src 'none'",
  "img-src data: blob: https:",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src data: https://fonts.gstatic.com",
  "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://esm.sh https://cdn.jsdelivr.net https://unpkg.com",
  "connect-src https://cdn.jsdelivr.net https://esm.sh https://unpkg.com https://cdnjs.cloudflare.com",
  "frame-src data:",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

/**
 * Send one response with the artifact security headers.
 * @param {import('node:http').ServerResponse} res response
 * @param {number} status status code
 * @param {string} contentType content type
 * @param {string|Buffer} body body
 * @param {Record<string,string>} [headers] extra headers
 * @returns {void} nothing
 */
export function send(res, status, contentType, body, headers = {}) {
  res.writeHead(status, {
    'content-type': contentType,
    'content-security-policy': ARTIFACT_CSP,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(body);
}

/**
 * Read the id query parameter and validate its shape.
 * @param {URL} url request URL
 * @returns {string | null} id, or null when absent or malformed
 */
export function idOf(url) {
  const id = url.searchParams.get('id');
  return id !== null && ID_RE.test(id) ? id : null;
}

/**
 * Build the route table.
 * @param {{store: import('./store.js').ArtifactStore, pluginId: string}} options host options
 * @returns {Array<{kind: 'exact', path: string, handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}>} routes
 */
export function createRoutes({ store }) {
  return [
    { kind: 'exact', path: `${BASE}/view`, handler: viewHandler(store) },
    { kind: 'exact', path: `${BASE}/source`, handler: sourceHandler(store) },
    { kind: 'exact', path: `${BASE}/export`, handler: exportHandler(store) },
    { kind: 'exact', path: `${BASE}/gallery`, handler: galleryHandler(store) },
  ];
}

/**
 * GET /view?id= — the rendered document, inline or standalone.
 * @param {import('./store.js').ArtifactStore} store artifact store
 * @returns {(req: any, res: any) => Promise<void>} handler
 */
function viewHandler(store) {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'method not allowed');
    const url = new URL(req.url ?? '/', 'http://localhost');
    const id = idOf(url);
    if (id === null) return send(res, 400, 'text/plain', 'missing or malformed id');
    const record = await store.get(id);
    if (record === undefined) return send(res, 404, 'text/plain', 'artifact not found');
    try {
      const artifact = await store.load(record);
      const { html } = renderArtifact(artifact);
      if (html === null) {
        return send(res, 200, 'text/plain; charset=utf-8', `Artifact ${id} is a downloadable file (${record.format}). Use /export.`);
      }
      return send(res, 200, 'text/html; charset=utf-8', html);
    } catch (error) {
      return send(res, 500, 'text/plain; charset=utf-8', `render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}

/**
 * GET /source?id= — the artifact's own source text.
 * @param {import('./store.js').ArtifactStore} store artifact store
 * @returns {(req: any, res: any) => Promise<void>} handler
 */
function sourceHandler(store) {
  return async (req, res) => {
    if (req.method !== 'GET') return send(res, 405, 'text/plain', 'method not allowed');
    const url = new URL(req.url ?? '/', 'http://localhost');
    const id = idOf(url);
    if (id === null) return send(res, 400, 'text/plain', 'missing or malformed id');
    const record = await store.get(id);
    if (record === undefined) return send(res, 404, 'text/plain', 'artifact not found');
    const artifact = await store.load(record);
    send(res, 200, 'text/plain; charset=utf-8', artifact.content);
    return undefined;
  };
}

/**
 * GET /export?id=&format= — an attachment in the requested format.
 * @param {import('./store.js').ArtifactStore} store artifact store
 * @returns {(req: any, res: any) => Promise<void>} handler
 */
function exportHandler(store) {
  return async (req, res) => {
    if (req.method !== 'GET') return send(res, 405, 'text/plain', 'method not allowed');
    const url = new URL(req.url ?? '/', 'http://localhost');
    const id = idOf(url);
    const format = url.searchParams.get('format') ?? 'html';
    if (id === null) return send(res, 400, 'text/plain', 'missing or malformed id');
    if (!EXPORT_FORMATS.includes(format)) {
      return send(res, 400, 'text/plain', `format must be one of: ${EXPORT_FORMATS.join(', ')}`);
    }
    const record = await store.get(id);
    if (record === undefined) return send(res, 404, 'text/plain', 'artifact not found');
    try {
      const artifact = await store.load(record);
      const { bytes, contentType, extension } = renderExport(artifact, format);
      const name = `${String(record.title).replace(/[^\w-]+/gu, '-').slice(0, 48) || 'artifact'}.${extension}`;
      return send(res, 200, contentType, bytes, { 'content-disposition': `attachment; filename="${name}"` });
    } catch (error) {
      return send(res, 500, 'text/plain; charset=utf-8', `export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}

/**
 * GET /gallery — every artifact, newest first.
 * @param {import('./store.js').ArtifactStore} store artifact store
 * @returns {(req: any, res: any) => Promise<void>} handler
 */
function galleryHandler(store) {
  return async (req, res) => {
    if (req.method !== 'GET') return send(res, 405, 'text/plain', 'method not allowed');
    const records = await store.list(200);
    send(res, 200, 'text/html; charset=utf-8', galleryPage(records));
    return undefined;
  };
}

/**
 * The gallery document.
 * @param {any[]} records artifact records
 * @returns {string} HTML
 */
export function galleryPage(records) {
  const cards = records.map((record) => {
    const view = `${BASE}/view?id=${encodeURIComponent(record.id)}`;
    const exports = EXPORT_FORMATS.filter((format) => format !== 'pdf' || record.kind !== 'file')
      .map((format) => `<a class="chip" href="${BASE}/export?id=${encodeURIComponent(record.id)}&format=${format}">${format}</a>`)
      .join('');
    return `<article class="card">
<div class="card-top"><span class="chip">${escapeHtml(record.kind)}</span><span class="muted mono">${escapeHtml(record.id)}</span></div>
<h2><a href="${view}" target="_blank" rel="noreferrer">${escapeHtml(record.title)}</a></h2>
${record.summary ? `<p class="muted">${escapeHtml(record.summary)}</p>` : ''}
<p class="muted mono">${formatNumber(record.sourceBytes ?? 0)} chars · updated ${escapeHtml(String(record.updatedAt ?? '').slice(0, 16).replace('T', ' '))}</p>
<div class="exports">${exports}</div>
</article>`;
  }).join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Artifacts</title>
<style>${TOKENS_CSS}
body{background:var(--bg)}
header{padding:36px 24px 8px;max-width:1080px;margin:0 auto}
header h1{font-size:34px;margin:0 0 6px}
header p{margin:0;color:var(--text-2)}
main{max-width:1080px;margin:0 auto;padding:20px 24px 64px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:16px 18px}
.card-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
.card h2{font-size:19px;margin:0 0 6px}
.card h2 a{color:var(--text);text-decoration:none}
.card h2 a:hover{text-decoration:underline}
.mono{font-family:var(--font-mono);font-size:11px}
.exports{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.exports .chip{text-decoration:none}
.empty{grid-column:1/-1;text-align:center;color:var(--text-2);padding:48px 0}
main.none{display:block}
</style></head><body>
<header><h1>Artifacts</h1><p>${records.length} artifact${records.length === 1 ? '' : 's'} · ${KINDS.join(' · ')}</p></header>
<main>${cards || '<p class="empty">No artifacts yet. Ask for a chart, a deck, a page or a document.</p>'}</main>
</body></html>`;
}
