/**
 * Dependency-free OOXML writers: Word (.docx), PowerPoint (.pptx) and Excel
 * (.xlsx).
 *
 * Each writer emits the minimum part set Office and LibreOffice accept, using
 * the stored ZIP from ./zip.js. Text-only by design: an artifact's words are
 * the payload, its styling stays in the HTML viewer.
 */

import { buildZip } from './zip.js';
import { parseBlocks } from './markdown.js';

/** XML declaration shared by every part. */
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/**
 * Escape text for XML content and attributes.
 * @param {string} text raw text
 * @returns {string} escaped text
 */
export function xmlEscape(text) {
  return String(text)
    // Control characters are illegal in XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;');
}

/**
 * Build one WordprocessingML paragraph.
 * @param {string} text paragraph text
 * @param {{style?: string, bold?: boolean, size?: number, bullet?: boolean}} [options] run options
 * @returns {string} paragraph XML
 */
function docxParagraph(text, options = {}) {
  const properties = [];
  if (options.style) properties.push(`<w:pStyle w:val="${options.style}"/>`);
  if (options.bullet) properties.push('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
  const pPr = properties.length > 0 ? `<w:pPr>${properties.join('')}</w:pPr>` : '';
  const runProps = [
    options.bold ? '<w:b/>' : '',
    options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : '',
  ].join('');
  const rPr = runProps.length > 0 ? `<w:rPr>${runProps}</w:rPr>` : '';
  const runs = text.split('\n').map((line, index) => (
    `${index > 0 ? '<w:r><w:br/></w:r>' : ''}<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`
  )).join('');
  return `<w:p>${pPr}${runs}</w:p>`;
}

/**
 * Word numbering + styles parts, written once per document.
 * @returns {{styles: string, numbering: string}} part XML
 */
function docxStyles() {
  const heading = (id, size, color) => (
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${id}"/>`
    + '<w:basedOn w:val="Normal"/><w:next w:val="Normal"/>'
    + `<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr>`
    + `<w:rPr><w:b/><w:sz w:val="${size}"/><w:color w:val="${color}"/></w:rPr></w:style>`
  );
  const styles = `${XML_HEAD}
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Georgia"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${heading('Heading1', 40, '141413')}
${heading('Heading2', 32, '141413')}
${heading('Heading3', 28, '5F5E5A')}
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>
<w:pPr><w:ind w:left="720"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="D97757"/></w:pBdr></w:pPr>
<w:rPr><w:i/><w:color w:val="5F5E5A"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/>
<w:pPr><w:shd w:val="clear" w:fill="F4F2ED"/><w:spacing w:before="80" w:after="80"/></w:pPr>
<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="D9D5CC"/><w:bottom w:val="single" w:sz="4" w:color="D9D5CC"/>
<w:left w:val="single" w:sz="4" w:color="D9D5CC"/><w:right w:val="single" w:sz="4" w:color="D9D5CC"/>
<w:insideH w:val="single" w:sz="4" w:color="D9D5CC"/><w:insideV w:val="single" w:sz="4" w:color="D9D5CC"/>
</w:tblBorders></w:tblPr></w:style>
</w:styles>`;
  const numbering = `${XML_HEAD}
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;
  return { styles, numbering };
}

/**
 * Build a DOCX from Markdown.
 * @param {{title: string, markdown: string}} input document source
 * @returns {Buffer} the .docx bytes
 */
export function buildDocx({ title, markdown }) {
  const body = [docxParagraph(title, { style: 'Heading1', size: 48 })];
  for (const block of parseBlocks(markdown)) {
    switch (block.type) {
      case 'heading':
        body.push(docxParagraph(block.text ?? '', { style: `Heading${Math.min(3, block.level ?? 2)}` }));
        break;
      case 'paragraph':
        body.push(docxParagraph(block.text ?? ''));
        break;
      case 'list':
        for (const item of block.items ?? []) body.push(docxParagraph(item, { bullet: true }));
        break;
      case 'quote':
        body.push(docxParagraph(block.text ?? '', { style: 'Quote' }));
        break;
      case 'code':
        body.push(docxParagraph((block.lines ?? []).join('\n'), { style: 'Code' }));
        break;
      case 'table':
        body.push(docxTable(block.header ?? [], block.rows ?? []));
        break;
      default:
        break;
    }
  }
  const document = `${XML_HEAD}
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body.join('')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;
  const { styles, numbering } = docxStyles();

  return buildZip([
    { name: '[Content_Types].xml', data: `${XML_HEAD}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>` },
    { name: '_rels/.rels', data: `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>` },
    { name: 'word/_rels/document.xml.rels', data: `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>` },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/numbering.xml', data: numbering },
  ]);
}

/**
 * Build one Word table.
 * @param {string[]} header header cells
 * @param {string[][]} rows body rows
 * @returns {string} table XML
 */
function docxTable(header, rows) {
  const cell = (text, isHeader) => (
    `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>`
    + docxParagraph(text, { bold: isHeader, size: isHeader ? 22 : 22 })
    + '</w:tc>'
  );
  const body = [
    `<w:tr>${header.map((value) => cell(value, true)).join('')}</w:tr>`,
    ...rows.map((row) => `<w:tr>${row.map((value) => cell(value, false)).join('')}</w:tr>`),
  ].join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr>${body}</w:tbl>`;
}

/**
 * Build one PowerPoint text box.
 * @param {string} text box text, one paragraph per line
 * @param {{x: number, y: number, cx: number, cy: number, size?: number, bold?: boolean, color?: string}} box geometry in EMU
 * @returns {string} shape XML
 */
function pptxTextBox(text, box) {
  const paragraphs = String(text).split('\n').map((line) => (
    '<a:p><a:r>'
    + `<a:rPr lang="en-US" sz="${box.size ?? 1800}" b="${box.bold ? 1 : 0}" dirty="0">`
    + `<a:solidFill><a:srgbClr val="${box.color ?? '141413'}"/></a:solidFill>`
    + '<a:latin typeface="Georgia"/></a:rPr>'
    + `<a:t>${xmlEscape(line)}</a:t></a:r></a:p>`
  )).join('');
  return `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>`
    + '<p:spPr>'
    + `<a:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.cx}" cy="${box.cy}"/></a:xfrm>`
    + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`
    + '</p:spPr>'
    + `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}

/**
 * The minimum theme part PowerPoint expects.
 * @returns {string} theme1.xml
 */
function pptxTheme() {
  return `${XML_HEAD}
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="dsh-artifacts">
<a:themeElements>
<a:clrScheme name="dsh"><a:dk1><a:srgbClr val="141413"/></a:dk1><a:lt1><a:srgbClr val="FAF9F5"/></a:lt1>
<a:dk2><a:srgbClr val="3D3D3A"/></a:dk2><a:lt2><a:srgbClr val="F4F2ED"/></a:lt2>
<a:accent1><a:srgbClr val="D97757"/></a:accent1><a:accent2><a:srgbClr val="2A78D6"/></a:accent2>
<a:accent3><a:srgbClr val="1BAF7A"/></a:accent3><a:accent4><a:srgbClr val="EDA100"/></a:accent4>
<a:accent5><a:srgbClr val="E87BA4"/></a:accent5><a:accent6><a:srgbClr val="6250D6"/></a:accent6>
<a:hlink><a:srgbClr val="2A78D6"/></a:hlink><a:folHlink><a:srgbClr val="6250D6"/></a:folHlink></a:clrScheme>
<a:fontScheme name="dsh"><a:majorFont><a:latin typeface="Georgia"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Georgia"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>
<a:fmtScheme name="dsh"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
</a:themeElements></a:theme>`;
}

/**
 * Build a 16:9 PPTX from a deck description.
 * @param {{title: string, slides: Array<{title: string, bullets?: string[], body?: string, quote?: string, notes?: string}>}} deck deck source
 * @returns {Buffer} the .pptx bytes
 */
export function buildPptx(deck) {
  const slides = Array.isArray(deck.slides) ? deck.slides : [];
  const slideParts = slides.map((slide) => {
    const shapes = [];
    const isCover = slides.indexOf(slide) === 0;
    if (isCover) {
      shapes.push(pptxTextBox(slide.title ?? deck.title, { x: 914400, y: 2286000, cx: 10363200, cy: 1371600, size: 4000, bold: true }));
      if (deck.title && deck.title !== slide.title) {
        shapes.push(pptxTextBox(deck.title, { x: 914400, y: 3749040, cx: 10363200, cy: 800100, size: 1800, color: '5F5E5A' }));
      }
    } else {
      shapes.push(pptxTextBox(slide.title ?? '', { x: 914400, y: 685800, cx: 10363200, cy: 914400, size: 3200, bold: true }));
      const body = slide.quote ?? slide.body ?? (slide.bullets ?? []).map((bullet) => `• ${bullet}`).join('\n');
      if (body) shapes.push(pptxTextBox(body, { x: 914400, y: 1828800, cx: 10363200, cy: 4114800, size: 2000 }));
    }
    return `${XML_HEAD}
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
${shapes.join('')}
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  });

  const slideIds = slides.map((_slide, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join('');
  const presentation = `${XML_HEAD}
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${slideIds}</p:sldIdLst>
<p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

  const presentationRels = `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slides.map((_slide, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join('\n')}
</Relationships>`;

  const extent = '<a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm>';
  const master = `${XML_HEAD}
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FAF9F5"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr>${extent}</p:grpSpPr></p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;

  const layout = `${XML_HEAD}
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr>${extent}</p:grpSpPr></p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

  const parts = [
    {
      name: '[Content_Types].xml',
      data: `${XML_HEAD}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${slides.map((_slide, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n')}
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
    },
    { name: 'ppt/presentation.xml', data: presentation },
    { name: 'ppt/_rels/presentation.xml.rels', data: presentationRels },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: master },
    {
      name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      data: `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,
    },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: layout },
    {
      name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      data: `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,
    },
    { name: 'ppt/theme/theme1.xml', data: pptxTheme() },
    ...slideParts.map((xml, index) => ({ name: `ppt/slides/slide${index + 1}.xml`, data: xml })),
    ...slideParts.map((_xml, index) => ({
      name: `ppt/slides/_rels/slide${index + 1}.xml.rels`,
      data: `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,
    })),
  ];

  return buildZip(parts);
}

/**
 * Build an XLSX workbook from rows. The first row is the header row.
 * @param {{title: string, rows: Array<Array<string|number>>, sheet?: string}} input table source
 * @returns {Buffer} the .xlsx bytes
 */
export function buildXlsx({ title, rows, sheet }) {
  const sheetName = (sheet ?? title ?? 'Sheet1').replace(/[\\/*?:[\]]/gu, ' ').slice(0, 31) || 'Sheet1';
  const cell = (value, rowIndex, columnIndex) => {
    const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<c r="${ref}"><v>${value}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(value ?? ''))}</t></is></c>`;
  };
  const sheetXml = `${XML_HEAD}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => cell(value, rowIndex, columnIndex)).join('')}</row>`).join('')}</sheetData>
</worksheet>`;
  const workbook = `${XML_HEAD}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  return buildZip([
    {
      name: '[Content_Types].xml',
      data: `${XML_HEAD}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    { name: 'xl/workbook.xml', data: workbook },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      data: `${XML_HEAD}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml },
  ]);
}

/**
 * Spreadsheet column name for a zero-based index (0 → A, 26 → AA).
 * @param {number} index zero-based column
 * @returns {string} column letters
 */
export function columnName(index) {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}
