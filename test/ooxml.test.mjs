import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildZip, crc32 } from '../lib/zip.js';
import { buildDocx, buildPptx, buildXlsx, columnName, xmlEscape } from '../lib/ooxml.js';

/**
 * Read a stored ZIP back: local headers only, which is all these writers emit.
 * @param {Buffer} buffer archive
 * @returns {Map<string, Buffer>} entries by name
 */
function unzip(buffer) {
  const entries = new Map();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034B50) {
    const method = buffer.readUInt16LE(offset + 8);
    assert.equal(method, 0, 'entries are stored, not deflated');
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const start = offset + 30 + nameLength + extraLength;
    const data = buffer.subarray(start, start + size);
    const expected = buffer.readUInt32LE(offset + 14);
    assert.equal(crc32(data), expected, `crc for ${name}`);
    entries.set(name, data);
    offset = start + size;
  }
  return entries;
}

test('zip round-trips, sorts, and computes CRCs', () => {
  const buffer = buildZip([
    { name: 'a.txt', data: 'hello' },
    { name: 'dir/b.xml', data: '<x/>' },
  ]);
  const entries = unzip(buffer);
  assert.equal(entries.get('a.txt').toString(), 'hello');
  assert.equal(entries.get('dir/b.xml').toString(), '<x/>');
});

test('docx has the required parts and a body', () => {
  const entries = unzip(buildDocx({ title: 'Report', markdown: '# H\n\nText\n\n- one\n\n| a | b |\n| --- | --- |\n| 1 | 2 |' }));
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/numbering.xml', 'word/_rels/document.xml.rels']) {
    assert.equal(entries.has(name), true, `missing ${name}`);
  }
  const document = entries.get('word/document.xml').toString('utf8');
  assert.match(document, /<w:document/u);
  assert.match(document, /Report/u);
  assert.match(document, /<w:tbl>/u);
});

test('pptx declares one slide part per slide and a master', () => {
  const entries = unzip(buildPptx({ title: 'Deck', slides: [{ title: 'Cover' }, { title: 'Two', bullets: ['a', 'b'] }] }));
  for (const name of [
    'ppt/presentation.xml',
    'ppt/slideMasters/slideMaster1.xml',
    'ppt/slideLayouts/slideLayout1.xml',
    'ppt/theme/theme1.xml',
    'ppt/slides/slide1.xml',
    'ppt/slides/slide2.xml',
    'ppt/_rels/presentation.xml.rels',
  ]) {
    assert.equal(entries.has(name), true, `missing ${name}`);
  }
  const presentation = entries.get('ppt/presentation.xml').toString('utf8');
  assert.match(presentation, /<p:sldIdLst><p:sldId id="256" r:id="rId2"\/><p:sldId id="257" r:id="rId3"\/><\/p:sldIdLst>/u);
  const slide = entries.get('ppt/slides/slide2.xml').toString('utf8');
  assert.match(slide, /• a/u);
});

test('xlsx writes a header row and inline strings', () => {
  const entries = unzip(buildXlsx({ title: 'Data', rows: [['label', 'value'], ['a', 1]] }));
  const sheet = entries.get('xl/worksheets/sheet1.xml').toString('utf8');
  assert.match(sheet, /<c r="A1" t="inlineStr">/u);
  assert.match(sheet, /<c r="B2"><v>1<\/v><\/c>/u);
  assert.match(entries.get('xl/workbook.xml').toString('utf8'), /name="Data"/u);
});

test('column names run A..Z, AA..', () => {
  assert.equal(columnName(0), 'A');
  assert.equal(columnName(25), 'Z');
  assert.equal(columnName(26), 'AA');
  assert.equal(columnName(51), 'AZ');
  assert.equal(columnName(52), 'BA');
});

test('xmlEscape strips control characters and escapes markup', () => {
  assert.equal(xmlEscape('a\u0000b<&>'), 'ab&lt;&amp;&gt;');
});
