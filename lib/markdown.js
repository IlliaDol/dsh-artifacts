/**
 * A small, safe Markdown renderer for `doc` artifacts and exported READMEs.
 *
 * Security posture: the source is escaped first, then a closed set of inline
 * constructs is re-introduced. Raw HTML never passes through, so a doc cannot
 * smuggle a script into the viewer.
 */

/**
 * @typedef {{type: 'heading'|'paragraph'|'code'|'list'|'quote'|'table'|'hr', level?: number, text?: string,
 *   ordered?: boolean, items?: string[], lines?: string[], header?: string[], rows?: string[][], lang?: string}} Block
 */

/**
 * Parse Markdown into blocks. Exported because the DOCX exporter reuses it.
 * @param {string} markdown source
 * @returns {Block[]} blocks in reading order
 */
export function parseBlocks(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/gu, '\n').split('\n');
  /** @type {Block[]} */
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const fence = /^```\s*([\w+-]*)\s*$/u.exec(line);
    if (fence !== null) {
      const body = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/u.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: 'code', lang: fence[1] || undefined, lines: body });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/u.exec(line);
    if (heading !== null) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      index += 1;
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/u.test(line)) {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    if (/^\s*>\s?/u.test(line)) {
      const body = [];
      while (index < lines.length && /^\s*>\s?/u.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/u, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', text: body.join(' ') });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/u.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/u.exec(line);
    if (bullet !== null || numbered !== null) {
      const ordered = numbered !== null;
      const items = [];
      while (index < lines.length) {
        const candidate = ordered ? /^\s*\d+[.)]\s+(.*)$/u.exec(lines[index]) : /^\s*[-*+]\s+(.*)$/u.exec(lines[index]);
        if (candidate === null) break;
        items.push(candidate[1].trim());
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (/^\s*\|.*\|\s*$/u.test(line) && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*\|?\s*$/u.test(lines[index + 1])) {
      const header = splitRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/u.test(lines[index])) {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length
      && lines[index].trim() !== ''
      && !/^(#{1,6}\s|```|>\s?|\s*[-*+]\s+|\s*\d+[.)]\s+)/u.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

/**
 * Split one table row into trimmed cells.
 * @param {string} line row text
 * @returns {string[]} cells
 */
function splitRow(line) {
  return line.trim().replace(/^\|/u, '').replace(/\|$/u, '').split('|').map((cell) => cell.trim());
}

/**
 * Escape the five HTML-significant characters.
 * @param {string} text raw text
 * @returns {string} escaped text
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

/**
 * Render inline Markdown (code, bold, italic, strike, links) on raw text.
 * @param {string} text raw inline text
 * @returns {string} safe HTML
 */
export function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/gu, (_all, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/gu, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/gu, '<del>$1</del>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gu, (_all, label, href) => (
    `<a href="${href}" rel="noreferrer noopener" target="_blank">${label}</a>`
  ));
  return out;
}

/**
 * Render Markdown to HTML.
 * @param {string} markdown source
 * @returns {string} HTML (no document skeleton)
 */
export function renderMarkdown(markdown) {
  const blocks = parseBlocks(markdown);
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading': {
        const level = Math.min(6, Math.max(1, block.level ?? 2));
        return `<h${level}>${inline(block.text ?? '')}</h${level}>`;
      }
      case 'paragraph':
        return `<p>${inline(block.text ?? '')}</p>`;
      case 'code':
        return `<pre><code${block.lang ? ` class="language-${escapeHtml(block.lang)}"` : ''}>${escapeHtml((block.lines ?? []).join('\n'))}</code></pre>`;
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = (block.items ?? []).map((item) => `<li>${inline(item)}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'quote':
        return `<blockquote>${inline(block.text ?? '')}</blockquote>`;
      case 'hr':
        return '<hr>';
      case 'table': {
        const header = (block.header ?? []).map((cell) => `<th>${inline(cell)}</th>`).join('');
        const rows = (block.rows ?? []).map((row) => (
          `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`
        )).join('');
        return `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
      }
      default:
        return '';
    }
  }).join('\n');
}

/**
 * The plain-text projection used by the docx exporter and by copy.
 * @param {string} markdown source
 * @returns {string} plain text, one block per line
 */
export function toPlainText(markdown) {
  return parseBlocks(markdown).map((block) => {
    if (block.type === 'list') return (block.items ?? []).join('\n');
    if (block.type === 'code') return (block.lines ?? []).join('\n');
    if (block.type === 'table') return [block.header, ...(block.rows ?? [])].map((row) => (row ?? []).join(' | ')).join('\n');
    return block.text ?? '';
  }).filter((line) => line.length > 0).join('\n\n');
}
