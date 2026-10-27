import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, parseBlocks, escapeHtml, toPlainText, inline } from '../lib/markdown.js';

test('headings, lists, code and tables parse into blocks', () => {
  const blocks = parseBlocks(`# Title

Intro with **bold** and \`code\`.

## Section

- one
- two

| a | b |
| --- | --- |
| 1 | 2 |

\`\`\`js
const x = 1;
\`\`\`
`);
  assert.deepEqual(blocks.map((block) => block.type), ['heading', 'paragraph', 'heading', 'list', 'table', 'code']);
  assert.equal(blocks[3].ordered, false);
  assert.deepEqual(blocks[4].header, ['a', 'b']);
});

test('raw HTML is escaped, never passed through', () => {
  const html = renderMarkdown('<script>alert(1)</script>');
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('&lt;script&gt;'), true);
});

test('inline markdown escapes first, then decorates', () => {
  assert.equal(inline('**a** & `b`'), '<strong>a</strong> &amp; <code>b</code>');
});

test('links are rendered with target and rel', () => {
  const html = renderMarkdown('[site](https://example.com)');
  assert.match(html, /<a href="https:\/\/example\.com" rel="noreferrer noopener" target="_blank">site<\/a>/u);
});

test('javascript: links are not linkified', () => {
  const html = renderMarkdown('[x](javascript:alert(1))');
  assert.equal(html.includes('href="javascript'), false);
});

test('escapeHtml covers all five characters', () => {
  assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
});

test('plain text keeps reading order', () => {
  const text = toPlainText('# Title\n\n- a\n- b');
  assert.equal(text, 'Title\n\na\nb');
});
