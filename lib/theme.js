/**
 * The shared look: design tokens, the document shell, and the inline frame
 * runtime (height reporting + the action/state bridge).
 *
 * Every artifact is a self-contained HTML document. Inline artifacts are
 * transparent so they sit on the conversation surface; published ones paint
 * their own ground.
 */

import { escapeHtml } from './markdown.js';

/** Palette slots in fixed order — never cycled past the eighth. */
export const SERIES = [
  { light: '#2a78d6', dark: '#3987e5' },
  { light: '#eb6834', dark: '#d95926' },
  { light: '#1baf7a', dark: '#199e70' },
  { light: '#eda100', dark: '#c98500' },
  { light: '#e87ba4', dark: '#d55181' },
  { light: '#008300', dark: '#008300' },
  { light: '#6250d6', dark: '#9085e9' },
  { light: '#e34948', dark: '#e66767' },
];

/** The token sheet. Light is the default; dark follows the OS or `data-theme`. */
export const TOKENS_CSS = `
:root{
  color-scheme: light dark;
  --bg:#faf9f5; --surface:#ffffff; --surface-2:#f4f2ed; --surface-3:#ece8df;
  --text:#141413; --text-2:#52514e; --muted:#8a8782; --border:#e4e0d7; --border-strong:#cfc9bd;
  --accent:#d97757; --accent-ink:#8a3b22; --accent-wash:#f7e6df;
  --ok:#1baf7a; --warn:#eda100; --danger:#d03b3b;
  --radius:8px; --radius-card:12px; --radius-lg:16px;
  --font-sans:ui-sans-serif,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --font-serif:"Source Serif 4",Georgia,"Times New Roman",serif;
  --font-mono:ui-monospace,SFMono-Regular,"Cascadia Code",Consolas,monospace;
  --shadow:0 1px 2px rgba(20,20,19,.04),0 8px 24px rgba(20,20,19,.05);
  --maxw:720px;
}
@media (prefers-color-scheme: dark){
  :root{
    --bg:#141413; --surface:#1c1c1a; --surface-2:#232321; --surface-3:#2c2c29;
    --text:#f0efec; --text-2:#c3c2b7; --muted:#8a8782; --border:#33332f; --border-strong:#484841;
    --accent:#e08a6c; --accent-ink:#f3c6b4; --accent-wash:#3a241d;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.35);
  }
}
:root[data-theme="dark"]{
  --bg:#141413; --surface:#1c1c1a; --surface-2:#232321; --surface-3:#2c2c29;
  --text:#f0efec; --text-2:#c3c2b7; --muted:#8a8782; --border:#33332f; --border-strong:#484841;
  --accent:#e08a6c; --accent-ink:#f3c6b4; --accent-wash:#3a241d;
}
:root[data-theme="light"]{
  --bg:#faf9f5; --surface:#ffffff; --surface-2:#f4f2ed; --surface-3:#ece8df;
  --text:#141413; --text-2:#52514e; --muted:#8a8782; --border:#e4e0d7; --border-strong:#cfc9bd;
  --accent:#d97757; --accent-ink:#8a3b22; --accent-wash:#f7e6df;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:transparent; color:var(--text);
  font-family:var(--font-sans); font-size:16px; line-height:1.7;
  -webkit-font-smoothing:antialiased;
}
h1,h2,h3,h4{font-family:var(--font-serif); font-weight:600; line-height:1.15; letter-spacing:-.01em; margin:0 0 .5em}
h1{font-size:30px} h2{font-size:23px} h3{font-size:18px} h4{font-size:16px; font-family:var(--font-sans); font-weight:600}
p{margin:0 0 1em}
a{color:var(--accent-ink); text-underline-offset:2px}
code{font-family:var(--font-mono); font-size:.88em; background:var(--surface-2); padding:.15em .4em; border-radius:4px}
pre{font-family:var(--font-mono); font-size:13px; line-height:1.6; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius); padding:14px 16px; overflow:auto}
pre code{background:none; padding:0}
hr{border:0; border-top:1px solid var(--border); margin:24px 0}
table{border-collapse:collapse; width:100%; font-size:14px; margin:0 0 1.2em}
th,td{text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:top}
th{font-weight:600; color:var(--text-2); font-size:12px; letter-spacing:.04em; text-transform:uppercase}
blockquote{margin:0 0 1.2em; padding:2px 0 2px 16px; border-left:2px solid var(--accent); color:var(--text-2)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wrap{max-width:var(--maxw); margin:0 auto; padding:24px 20px 32px}
.muted{color:var(--text-2)} small{color:var(--muted)}
.card{background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-card); padding:16px 18px; box-shadow:var(--shadow)}
.card + .card{margin-top:12px}
.chip{display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:500; padding:3px 9px; border-radius:999px; background:var(--surface-2); color:var(--text-2); border:1px solid var(--border)}
.grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px}
.metric{background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-card); padding:14px 16px}
.metric .label{font-size:12px; color:var(--text-2); margin:0 0 4px}
.metric .value{font-size:26px; font-weight:600; line-height:1.1; margin:0; font-variant-numeric:tabular-nums; letter-spacing:-.02em}
.legend{display:flex; flex-wrap:wrap; gap:14px; font-size:12px; color:var(--text-2); margin:0 0 10px}
.legend span{display:inline-flex; align-items:center; gap:6px}
.swatch{width:10px; height:10px; border-radius:2px; display:inline-block}
.chart-wrap{position:relative; width:100%; height:300px}
details.data{margin-top:10px; font-size:12px; color:var(--text-2)}
details.data summary{cursor:pointer; color:var(--text-2)}
button{font:inherit; font-size:14px; border:1px solid var(--border-strong); background:var(--surface); color:var(--text); border-radius:var(--radius); padding:7px 12px; cursor:pointer}
button:hover{background:var(--surface-2)}
button.primary{background:var(--text); color:var(--bg); border-color:var(--text)}
input,select,textarea{font:inherit; font-size:14px; color:var(--text); background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--radius); padding:7px 10px}
input[type=range]{padding:0; accent-color:var(--accent)}
`;

/**
 * Wrap a body in a complete document.
 * @param {object} options shell options
 * @param {string} options.title document title
 * @param {string} options.body inner HTML
 * @param {string} [options.css] extra CSS
 * @param {string} [options.scripts] HTML injected before </body>
 * @param {boolean} [options.inline] transparent ground (inline artifact) vs painted page
 * @param {boolean} [options.fonts] load Source Serif 4 from Google Fonts
 * @returns {string} complete HTML document
 */
export function shell({ title, body, css = '', scripts = '', inline = false, fonts = true }) {
  const fontLinks = fonts
    ? '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
      + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">'
    : '';
  return `<!doctype html>
<html lang="en" data-artifact="${escapeHtml(title)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)}</title>
${fontLinks}
<style>${TOKENS_CSS}
${inline ? 'body{background:transparent}' : 'body{background:var(--bg)}'}
${css}
</style>
</head>
<body>
${body}
${scripts}
${BRIDGE_SCRIPT}
</body>
</html>`;
}

/**
 * The frame runtime: reports content height, relays actions, keeps state.
 * Deliberately dependency-free and inert when the artifact is opened as a
 * standalone page (no `parent` message partner).
 */
export const BRIDGE_SCRIPT = `<script>
(function(){
  var root = document.documentElement;
  function post(message){ try { if (parent !== window) parent.postMessage(message, '*'); } catch (e) {} }
  function theme(){ try { var t = new URLSearchParams(location.search).get('theme'); if (t) root.dataset.theme = t; } catch (e) {} }
  theme();
  addEventListener('message', function(event){
    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'dsh-artifact:theme' && (data.theme === 'light' || data.theme === 'dark')) root.dataset.theme = data.theme;
  });
  function height(){
    var body = document.body;
    if (!body) return;
    // Report the content, not the viewport: root.scrollHeight is at least the
    // iframe's own height, so using it made every short artifact open with a
    // large empty area under it.
    var value = Math.max(body.scrollHeight, body.offsetHeight);
    post({ type: 'dsh-artifact:height', height: value });
  }
  if ('ResizeObserver' in window) new ResizeObserver(height).observe(document.body);
  addEventListener('load', height);
  setTimeout(height, 60); setTimeout(height, 300);
  var api = {
    send: function(action, payload){ post({ type: 'dsh-artifact:action', action: String(action), payload: payload || {} }); },
    prompt: function(text){ post({ type: 'dsh-artifact:prompt', text: String(text) }); },
    open: function(url){ post({ type: 'dsh-artifact:open', url: String(url) }); },
    state: {
      get: function(key){ try { return JSON.parse(localStorage.getItem('dsh-artifact:' + key) || 'null'); } catch (e) { return null; } },
      set: function(key, value){ try { localStorage.setItem('dsh-artifact:' + key, JSON.stringify(value)); } catch (e) {} }
    }
  };
  window.dshArtifact = api;
  window.dsh = api;
})();
</script>`;

/**
 * Chart chrome: formatting helpers reused by the chart renderer.
 * @param {number|string} value raw value
 * @returns {string} formatted number
 */
export function formatNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '');
  if (Number.isInteger(value)) return value.toLocaleString('en-US');
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
