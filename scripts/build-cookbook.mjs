/**
 * Build the vendored cookbook's manifest and live gallery.
 *
 * The recipes are the source of truth, exactly as written: this script only
 * reads them, records metadata + `fn.toString()` in `manifest.json`, and wraps
 * every pack in its own scope for `gallery.html` so top-level helper names
 * cannot collide.
 *
 * usage: node scripts/build-cookbook.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const COOKBOOK = path.join(ROOT, 'cookbook');
const PACKS = ['recipes.js', 'recipes_b2.js', 'recipes_b3.js', 'recipes_b4.js', 'recipes_b5.js', 'recipes_b6.js', 'recipes_b7.js', 'recipes_b8.js', 'recipes_b9.js'];
const require = createRequire(import.meta.url);
const read = (file) => fs.readFileSync(path.join(COOKBOOK, file), 'utf8');
const guard = (source) => source.replace(/<\/script/gi, '<\\/script');

const K = require(path.join(COOKBOOK, 'viz-kit.js'));
const packSymbols = Object.fromEntries(PACKS.map((pack) => {
  const source = read(pack);
  const symbol = /const\s+(RECIPES\w*)\s*=/u.exec(source)?.[1];
  if (symbol === undefined) throw new Error(`${pack} does not declare a RECIPES array`);
  return [pack, symbol];
}));
const all = PACKS.flatMap((pack) => require(path.join(COOKBOOK, pack)).map((recipe) => ({ ...recipe, pack, symbol: packSymbols[pack] })));

const ids = new Set();
for (const recipe of all) {
  if (ids.has(recipe.id)) throw new Error(`duplicate recipe id: ${recipe.id}`);
  ids.add(recipe.id);
  for (const field of ['id', 'family', 'name', 'when', 'combine']) {
    if (typeof recipe[field] !== 'string' || recipe[field].trim() === '') {
      throw new Error(`${recipe.id || 'recipe'} is missing ${field}`);
    }
  }
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) throw new Error(`${recipe.id} is missing steps`);
  if (typeof recipe.fn !== 'function') throw new Error(`${recipe.id} is missing fn`);
}

const FAMILY_ORDER = ['comparison', 'distribution', 'time', 'relationship', 'parts', 'flow', 'maps', 'stats', 'science', 'diagrams', 'tables', 'interactive', 'ui_art', 'threed', 'combining'];
const seenFamilies = [...new Set(all.map((recipe) => recipe.family))];
const families = FAMILY_ORDER.filter((family) => seenFamilies.includes(family)).concat(seenFamilies.filter((family) => !FAMILY_ORDER.includes(family)));
const counts = Object.fromEntries(families.map((family) => [family, all.filter((recipe) => recipe.family === family).length]));

const records = all.map((recipe) => ({
  id: recipe.id,
  name: recipe.name,
  family: recipe.family,
  when: recipe.when,
  steps: recipe.steps,
  combine: recipe.combine,
  pack: recipe.pack,
  symbol: recipe.symbol,
  hasTest: recipe.test !== undefined,
  needsGeo: recipe.family === 'maps' && recipe.id !== 'tilegrid',
  code: K.codeOf(recipe.fn),
}));

const manifest = {
  version: 1,
  count: records.length,
  families: counts,
  recipes: records,
};
fs.writeFileSync(path.join(COOKBOOK, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const gallery = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Cookbook — ${records.length} live recipes</title>
<style>
:root{
  color-scheme:light dark;
  --text:#141413; --text-2:#52514e; --muted:#8a8782;
  --grid:#e4e0d7; --axis:#cfc9bd; --bg:#faf9f5; --surface:#ffffff; --surface-2:#f4f2ed;
  --card:#f4f2ed; --line:#e4e0d7; --accent:#d97757;
  --font-sans:ui-sans-serif,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --font-mono:ui-monospace,SFMono-Regular,"Cascadia Code",Consolas,monospace;
}
@media (prefers-color-scheme:dark){
  :root{
    --text:#f0efec; --text-2:#c3c2b7; --muted:#8a8782;
    --grid:#33332f; --axis:#484841; --bg:#141413; --surface:#1c1c1a; --surface-2:#232321;
    --card:#232321; --line:#33332f; --accent:#e08a6c;
  }
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-sans);font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-underline-offset:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wrap{max-width:1180px;margin:0 auto;padding:36px 24px 96px}
header h1{font-size:28px;font-weight:500;letter-spacing:-.01em;margin:0 0 6px}
header p{color:var(--text-2);margin:0 0 20px;max-width:70ch}
header .stats{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}
.pill{display:inline-flex;gap:6px;align-items:baseline;border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:12px;color:var(--text-2)}
.pill b{color:var(--text);font-weight:500}
.toolbar{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 0;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid transparent}
.toolbar:focus-within{border-bottom-color:var(--line)}
.search{font:inherit;font-size:13px;padding:7px 13px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--text);min-width:230px}
.chip{font:inherit;font-size:12px;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--text-2);cursor:pointer}
.chip:hover{color:var(--text);border-color:var(--axis)}
.chip[aria-pressed="true"]{background:var(--text);color:var(--bg);border-color:var(--text)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:18px;margin-top:18px}
@media (max-width:560px){.grid{grid-template-columns:1fr}.wrap{padding:24px 14px 64px}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;min-width:0}
.card[hidden]{display:none}
.family{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 2px}
.card h2{font-size:16px;font-weight:500;margin:0 0 4px;letter-spacing:-.005em}
.when{font-size:13px;color:var(--text-2);margin:0 0 10px}
.viz{min-height:44px;margin:0 0 10px;overflow:hidden}
.viz svg{display:block;max-width:100%;height:auto}
.viz canvas{display:block;max-width:100%}
.viz .note{font-size:12px;color:var(--text-2);padding:8px 0}
.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.button{font:inherit;font-size:12px;padding:5px 10px;border-radius:7px;border:1px solid var(--line);background:var(--surface);color:var(--text-2);cursor:pointer}
.button:hover{color:var(--text);border-color:var(--axis)}
.status{font-size:11px;color:var(--muted)}
details{margin-top:8px}
summary{cursor:pointer;font-size:12px;color:var(--text-2)}
pre{font-family:var(--font-mono);font-size:11px;line-height:1.55;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;max-height:340px;margin:8px 0 0}
ol.steps{font-size:12px;color:var(--text-2);padding-left:18px;margin:0 0 8px}
ol.steps li{margin:0 0 3px}
.foot{margin-top:28px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>Cookbook</h1>
  <p>Every recipe is a live drawing, produced by the exact function printed under it. Generated demo data teaches the form; it is not evidence. Maps load D3 and world-atlas from a CDN.</p>
  <div class="stats">
    <span class="pill"><b>${records.length}</b> recipes</span>
    <span class="pill"><b>${families.length}</b> families</span>
    <span class="pill"><b id="drawn">0</b> mounted</span>
    <span class="pill"><b id="failed">0</b> failed</span>
    <a class="pill" href="/plugins/dsh-artifacts/gallery">Artifacts</a>
  </div>
</header>
<div class="toolbar">
  <label class="sr-only" for="search">Search recipes</label>
  <input class="search" id="search" type="search" placeholder="Search name, id, family, use…" autocomplete="off">
  <span id="families" style="display:flex;gap:6px;flex-wrap:wrap"></span>
</div>
<main class="grid" id="grid"></main>
<div class="foot">Vendored from the 165-recipe visualization cookbook. The plugin also exposes these as <code>kind:"recipe"</code> artifacts and through the <code>artifact</code> tool's <code>action:"cookbook"</code> lookup.</div>
</div>
<script>${guard(read('viz-kit.js'))}</script>
<script>${guard(read('viz3d.js'))}</script>
${PACKS.map((pack) => `<script>(function(){\n${guard(read(pack))}\n})();</script>`).join('\n')}
<script>
(function(){
  'use strict';
  var ALL = [].concat(window.RECIPES || [], window.RECIPES_B2 || [], window.RECIPES_B3 || [], window.RECIPES_B4 || [], window.RECIPES_B5 || [], window.RECIPES_B6 || [], window.RECIPES_B7 || [], window.RECIPES_B8 || [], window.RECIPES_B9 || []);
  var FAMILIES = ${JSON.stringify(families)};
  var COUNTS = ${JSON.stringify(counts)};
  var grid = document.getElementById('grid');
  var search = document.getElementById('search');
  var familyBar = document.getElementById('families');
  var drawn = document.getElementById('drawn');
  var failed = document.getElementById('failed');
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function(entries){
    entries.forEach(function(entry){ if (entry.isIntersecting) { draw(entry.target); observer.unobserve(entry.target); } });
  }, { rootMargin: '320px' }) : null;
  var family = 'all';
  var total = 0, bad = 0;
  var geoQueue = [];

  function note(text){ var p = document.createElement('p'); p.className = 'note'; p.textContent = text; return p; }

  function draw(host){
    if (host.dataset.drawn) return;
    host.dataset.drawn = '1';
    var recipe = host.__recipe;
    try {
      var cleanup = recipe.fn(host, window.Kit);
      if (typeof cleanup === 'function') host.__cleanup = cleanup;
      total += 1; drawn.textContent = total;
    } catch (error) {
      bad += 1; failed.textContent = bad;
      host.appendChild(note('Could not draw: ' + (error && error.message ? error.message : String(error))));
    }
  }

  function card(recipe){
    var article = document.createElement('article');
    article.className = 'card';
    article.dataset.family = recipe.family;
    article.dataset.search = [recipe.name, recipe.id, recipe.family, recipe.when, recipe.combine].join(' ').toLowerCase();
    var fam = document.createElement('p'); fam.className = 'family'; fam.textContent = recipe.family; article.appendChild(fam);
    var title = document.createElement('h2'); title.textContent = recipe.name; article.appendChild(title);
    var when = document.createElement('p'); when.className = 'when'; when.textContent = recipe.when; article.appendChild(when);
    var viz = document.createElement('div'); viz.className = 'viz'; viz.__recipe = recipe; article.appendChild(viz);
    var steps = document.createElement('ol'); steps.className = 'steps';
    recipe.steps.forEach(function(step){ var li = document.createElement('li'); li.textContent = step; steps.appendChild(li); });
    article.appendChild(steps);
    var actions = document.createElement('div'); actions.className = 'actions';
    var toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'button'; toggle.textContent = 'Show code'; toggle.setAttribute('aria-expanded', 'false');
    var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'button'; copy.textContent = 'Copy';
    var status = document.createElement('span'); status.className = 'status';
    actions.append(toggle, copy, status); article.appendChild(actions);
    var details = document.createElement('details');
    var summary = document.createElement('summary'); summary.textContent = 'Code that draws it'; details.appendChild(summary);
    var pre = document.createElement('pre'); pre.textContent = Kit.codeOf(recipe.fn); details.appendChild(pre);
    article.appendChild(details);
    toggle.addEventListener('click', function(){ details.open = !details.open; toggle.textContent = details.open ? 'Hide code' : 'Show code'; toggle.setAttribute('aria-expanded', String(details.open)); });
    copy.addEventListener('click', function(){
      navigator.clipboard.writeText(pre.textContent || '').then(function(){ status.textContent = 'Copied'; }, function(){ status.textContent = 'Select the code and copy'; });
      setTimeout(function(){ status.textContent = ''; }, 1800);
    });
    return { article: article, viz: viz };
  }

  function paint(){
    var needle = search.value.trim().toLowerCase();
    var cards = grid.children;
    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      card.hidden = !((family === 'all' || card.dataset.family === family) && (needle === '' || card.dataset.search.indexOf(needle) >= 0));
    }
    var shown = 0;
    for (var j = 0; j < cards.length; j += 1) if (!cards[j].hidden) shown += 1;
    search.setAttribute('aria-label', shown + ' recipes shown');
    requestAnimationFrame(function(){
      for (var k = 0; k < cards.length; k += 1) {
        if (cards[k].hidden) continue;
        var viz = cards[k].querySelector('.viz');
        if (observer) observer.observe(viz); else draw(viz);
      }
    });
  }

  function buildFilters(){
    var chips = [{ id: 'all', label: 'All ' + ALL.length }].concat(FAMILIES.map(function(f){ return { id: f, label: f + ' ' + COUNTS[f] }; }));
    chips.forEach(function(chip){
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'chip'; button.textContent = chip.label;
      button.setAttribute('aria-pressed', String(chip.id === family));
      button.addEventListener('click', function(){
        family = chip.id;
        Array.prototype.forEach.call(familyBar.children, function(other){ other.setAttribute('aria-pressed', String(other === button)); });
        paint();
      });
      familyBar.appendChild(button);
    });
  }

  function loadScript(url){
    return new Promise(function(resolve, reject){
      var script = document.createElement('script');
      script.src = url; script.onload = resolve; script.onerror = function(){ reject(new Error('failed to load ' + url)); };
      document.head.appendChild(script);
    });
  }

  function mountGeo(){
    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js')
    ]).then(function(){
      return fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(function(response){ return response.json(); });
    }).then(function(world){
      Kit.geo = { d3: window.d3, topojson: window.topojson, world: world };
      geoQueue.forEach(function(host){ draw(host); });
    }).catch(function(){
      geoQueue.forEach(function(host){ host.dataset.drawn = '1'; host.appendChild(note('Needs an internet connection to load D3 and world-atlas.')); });
    });
  }

  var built = ALL.map(card);
  built.forEach(function(entry){
    grid.appendChild(entry.article);
    if (entry.viz.__recipe.family === 'maps' && entry.viz.__recipe.id !== 'tilegrid') geoQueue.push(entry.viz);
  });
  buildFilters();
  paint();
  if (geoQueue.length) mountGeo();
  /* A verification hook: lets a real-browser check mount every recipe without
     scrolling through 165 cards. It is inert unless called. */
  window.__cookbook = {
    count: ALL.length,
    recipes: ALL,
    drawAll: function(){ built.forEach(function(entry){ draw(entry.viz); }); return { mounted: total, failed: bad }; }
  };
})();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(COOKBOOK, 'gallery.html'), gallery);

const titles = {
  comparison: 'Comparison and magnitude',
  distribution: 'Distribution',
  time: 'Time series',
  relationship: 'Relationships and correlation',
  parts: 'Part-to-whole and hierarchy',
  flow: 'Flow and networks',
  maps: 'Maps',
  stats: 'Statistics and machine learning',
  science: 'Math and science',
  diagrams: 'Software and process diagrams',
  tables: 'Tables, text and KPI parts',
  interactive: 'Interactive explainers',
  ui_art: 'UI mockups and art',
  threed: '3D and animation',
  combining: 'Combining chart types',
};
const index = [
  '# The recipe index',
  '',
  `${records.length} recipes in ${families.length} families. Each row is a real drawing function in \`cookbook/\`; the id is what \`kind:"recipe"\` takes.`,
  '',
  'The live gallery is at `/plugins/dsh-artifacts/cookbook`; the searchable tool action is `artifact` with `action:"cookbook"`.',
  '',
  '| Family | Recipes |',
  '| --- | --- |',
  ...families.map((family) => `| ${titles[family] ?? family} | ${counts[family]} |`),
  '',
];
for (const family of families) {
  index.push(`## ${titles[family] ?? family}`, '', '| Id | Recipe | Use it when | Combines with |', '| --- | --- | --- | --- |');
  for (const recipe of records.filter((entry) => entry.family === family)) {
    index.push(`| \`${recipe.id}\` | ${recipe.name.replace(/\|/gu, '\\|')} | ${recipe.when.replace(/\|/gu, '\\|')} | ${recipe.combine.replace(/\|/gu, '\\|')} |`);
  }
  index.push('');
}
fs.writeFileSync(path.join(ROOT, 'docs', 'RECIPES.md'), `${index.join('\n')}\n`);

console.log(`wrote cookbook/manifest.json (${records.length} recipes), cookbook/gallery.html and docs/RECIPES.md`);
console.log(families.map((family) => `${family}: ${counts[family]}`).join(' · '));
