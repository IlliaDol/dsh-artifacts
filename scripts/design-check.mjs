/**
 * The visual gate: render every example and the whole cookbook in headless
 * Chrome and report what a reviewer would see — horizontal overflow, clipped
 * text, and the ground colour of the document.
 *
 * usage: node scripts/design-check.mjs [--light]
 *
 * Set CHROME_PATH when Chrome is not in its usual place. The script exits 1 on
 * any overflow or clipped text, so it can gate a release.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const theme = process.argv.includes('--light') ? 'light' : 'dark';

/** Locate Chrome; the gate is optional, so a missing browser is a clear skip. */
function chrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter((candidate) => typeof candidate === 'string' && candidate.length > 0);
  return candidates.find((candidate) => existsSync(candidate));
}

const PROBE = `
<script>
setTimeout(function () {
  try { if (window.__cookbook) window.__cookbook.drawAll(); } catch (error) {}
  var vw = window.innerWidth;
  var report = { overflow: [], clipped: [], ground: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() };
  function describe(el) {
    var name = el.tagName.toLowerCase();
    if (el.id) name += '#' + el.id;
    if (el.className && typeof el.className === 'string') name += '.' + el.className.trim().split(/\\s+/).join('.');
    var text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
    return name + (text ? ' "' + text + '"' : '');
  }
  var all = document.querySelectorAll('body *');
  for (var i = 0; i < all.length && (report.overflow.length < 6 || report.clipped.length < 6); i++) {
    var el = all[i];
    if (el.classList && el.classList.contains('sr-only')) continue;
    if (el.ownerSVGElement) continue;
    var rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if ((rect.right > vw + 2 || rect.left < -2) && report.overflow.length < 6) report.overflow.push(describe(el));
    var style = getComputedStyle(el);
    var hides = style.overflow === 'hidden' || style.overflowX === 'hidden';
    if (hides && el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && report.clipped.length < 6) report.clipped.push(describe(el));
  }
  var out = document.createElement('pre');
  out.id = 'design-probe';
  out.textContent = JSON.stringify(report);
  document.body.appendChild(out);
}, 900);
</script>
</body>`;

/**
 * Render one document and read the probe.
 * @param {string} browser Chrome path
 * @param {string} source document path
 * @param {string} work temp directory
 * @returns {{name: string, overflow: string[], clipped: string[], ground: string}} report
 */
function inspect(browser, source, work) {
  const name = source.slice(root.length + 1).replace(/\\/gu, '/');
  const copy = join(work, `${name.replace(/[\\/]/gu, '_')}.html`);
  writeFileSync(copy, readFileSync(source, 'utf8').replace('</body>', PROBE));
  const dom = execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--virtual-time-budget=20000',
    '--window-size=980,900',
    '--dump-dom',
    `file:///${copy.replace(/\\/gu, '/')}?theme=${theme}`,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const match = /<pre id="design-probe">([\s\S]*?)<\/pre>/u.exec(dom);
  if (match === null) return { name, overflow: ['probe missing'], clipped: [], ground: '' };
  const report = JSON.parse(match[1].replace(/&quot;/gu, '"').replace(/&amp;/gu, '&').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>'));
  return { name, ...report };
}

const browser = chrome();
if (browser === undefined) {
  console.log('design-check: no Chrome found; set CHROME_PATH to run the visual gate.');
  process.exit(0);
}

const examples = readdirSync(join(root, 'examples'))
  .filter((file) => file.endsWith('.html'))
  .map((file) => join(root, 'examples', file));
const gallery = join(root, 'cookbook', 'gallery.html');
const work = mkdtempSync(join(tmpdir(), 'dsh-design-'));

let failed = 0;
for (const file of [...examples, gallery]) {
  const report = inspect(browser, file, work);
  const bad = report.overflow.length + report.clipped.length;
  if (bad > 0) failed += 1;
  console.log(`${bad === 0 ? 'ok  ' : 'FAIL'} ${report.name}  ground=${report.ground || '?'}${bad === 0 ? '' : `  overflow=${report.overflow.length} clipped=${report.clipped.length}`}`);
  for (const item of report.overflow) console.log(`     overflow: ${item}`);
  for (const item of report.clipped) console.log(`     clipped:  ${item}`);
}

console.log(failed === 0 ? `design-check: ${theme} — clean` : `design-check: ${failed} document(s) need work`);
process.exit(failed === 0 ? 0 : 1);
