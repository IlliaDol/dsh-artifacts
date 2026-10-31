/**
 * dsh-artifacts, browser half.
 *
 * Served by the harness at /plugins/dsh-artifacts/client.js. It is written as
 * the module-loader CJS envelope by hand, so the package needs no bundler:
 *
 *   window.__ModuleLoader__.load({ id, factory: (require) => exports })
 *
 * Two channels:
 *   1. the `artifact` toolview — an iframe card under the tool call, sized by
 *      the frame's own height messages;
 *   2. a DOM channel for ```dsh-artifact fences that name an existing id, so a
 *      reply can place an artifact exactly where the prose needs it.
 *
 * Card actions (buttons, prompts) arrive by postMessage and are relayed into
 * the owning session's conversation, where they become the model's next turn.
 */
window.__ModuleLoader__.load({
  id: 'dsh-artifacts',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');

    const h = React.createElement;
    const VIEW = '/plugins/dsh-artifacts/view';
    const GALLERY = '/plugins/dsh-artifacts/gallery';
    /** Frames we own, so a postMessage can be attributed to a session. */
    const frames = new Map();
    /** Sessions service, when the host mounts one. */
    let sessions = null;

    /* ------------------------------------------------------------ styles */

    const CSS = `
.dsh-art{margin:6px auto 2px;min-width:0;max-width:980px}
.dsh-art.dsh-art-wide{max-width:1200px}
.dsh-art-head{display:flex;align-items:baseline;gap:8px;margin:0 0 6px;font-size:12px;color:var(--text-secondary,#8a8782);min-width:0}
.dsh-art-title{font-weight:500;color:var(--text-primary,#141413);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-art-kind{flex:none;text-transform:uppercase;letter-spacing:.06em;font-size:10px;border:1px solid var(--border,#e4e0d7);border-radius:999px;padding:1px 6px}
.dsh-art-links{margin-left:auto;flex:none;display:flex;gap:10px}
.dsh-art-links a{color:inherit;text-decoration:none;border-bottom:1px dotted currentColor}
.dsh-art-frame{width:100%;border:1px solid var(--border,#e4e0d7);border-radius:12px;background:transparent;display:block;overflow:hidden}
.dsh-art-fence{margin:8px 0}
`;

    /**
     * Install the card stylesheet once.
     * @returns {void}
     */
    function installStyles() {
      if (typeof document === 'undefined' || document.getElementById('dsh-artifacts-css') !== null) return;
      const style = document.createElement('style');
      style.id = 'dsh-artifacts-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    /* ------------------------------------------------------------- meta */

    /**
     * Find the artifact meta in the toolview props. The owner shape has moved
     * between host releases, so this walks the plausible carriers instead of
     * pinning one; a miss degrades to the generic tool row, never a throw.
     * @param {any} props toolview props
     * @returns {any | undefined} meta
     */
    function readMeta(props) {
      if (props === null || typeof props !== 'object') return undefined;
      const carriers = [
        props.meta,
        props.result && props.result.meta,
        props.call && props.call.meta,
        props.block && props.block.meta,
        props.block && props.block.result && props.block.result.meta,
        props.record && props.record.meta,
        props.view && props.view.meta,
        props.settled && props.settled.meta,
        props.owner && props.owner.meta,
      ];
      for (const carrier of carriers) {
        if (carrier !== null && typeof carrier === 'object' && carrier.kind === 'artifact') return carrier;
      }
      return undefined;
    }

    /**
     * Find the session id the props carry.
     * @param {any} props toolview props
     * @returns {string | undefined} session id
     */
    function readSessionId(props) {
      if (props === null || typeof props !== 'object') return undefined;
      const direct = props.sessionId || (props.owner && props.owner.sessionId) || (props.session && props.session.id);
      return typeof direct === 'string' ? direct : undefined;
    }

    /* ------------------------------------------------------------ bridge */

    /**
     * Send a message into a session's conversation.
     * @param {string | undefined} sessionId owning session
     * @param {string} text message text
     * @returns {boolean} whether a conversation accepted it
     */
    function sendToSession(sessionId, text) {
      if (sessions === null || typeof sessionId !== 'string' || sessionId.length === 0) return false;
      try {
        const scoped = sessions.scope(sessionId);
        const conversation = scoped && scoped.get('conversation');
        if (conversation === null || conversation === undefined || typeof conversation.send !== 'function') return false;
        Promise.resolve(conversation.send(text)).catch((error) => {
          console.warn('[dsh-artifacts] action send failed:', error && error.message ? error.message : error);
        });
        return true;
      } catch (error) {
        console.warn('[dsh-artifacts] action relay unavailable:', error && error.message ? error.message : error);
        return false;
      }
    }

    /**
     * The message a card action becomes. Kept explicit so the model can see
     * which artifact and which control produced it.
     * @param {any} meta artifact meta
     * @param {string} action action name
     * @param {any} payload action payload
     * @returns {string} message
     */
    function actionText(meta, action, payload) {
      const body = payload && Object.keys(payload).length > 0 ? ` ${JSON.stringify(payload)}` : '';
      return `[artifact-action] ${action}${body}\n`
        + `Artifact: ${meta && meta.id ? meta.id : 'unknown'} (${meta && meta.title ? meta.title : 'untitled'}).\n`
        + 'The artifact stays rendered; update it with action:"update" and the same id if the action changes its content.';
    }

    /**
     * Tell every card to follow a theme flip.
     * @param {'light' | 'dark'} theme theme name
     * @returns {void}
     */
    function broadcastTheme(theme) {
      for (const entry of frames.keys()) {
        try {
          entry.postMessage({ type: 'dsh-artifact:theme', theme }, '*');
        } catch {
          // A detached frame needs no theme.
        }
      }
    }

    /**
     * The host's own theme attribute, when it sets one.
     * @returns {'light' | 'dark' | undefined} theme
     */
    function currentTheme() {
      if (typeof document === 'undefined') return undefined;
      const root = document.documentElement;
      const mode = root.dataset.mode || root.dataset.theme || root.dataset.colorScheme;
      if (mode === 'dark' || mode === 'light') return mode;
      if (root.classList.contains('dark')) return 'dark';
      if (root.classList.contains('light')) return 'light';
      try {
        const stored = localStorage.getItem('dsh-theme');
        if (stored === 'dark' || stored === 'light') return stored;
      } catch {
        /* storage can be blocked */
      }
      try {
        if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      } catch {
        /* no matchMedia */
      }
      return undefined;
    }

    /**
     * Install the one global message listener that attributes frame messages.
     * @returns {void}
     */
    function installBridge() {
      if (typeof window === 'undefined' || window.__dshArtifactsBridge === true) return;
      window.__dshArtifactsBridge = true;
      window.addEventListener('message', (event) => {
        const entry = frames.get(event.source);
        if (entry === undefined) return;
        const data = event.data;
        if (data === null || typeof data !== 'object') return;
        if (data.type === 'dsh-artifact:height' && typeof data.height === 'number') {
          entry.onHeight(data.height);
          return;
        }
        if (data.type === 'dsh-artifact:action') {
          sendToSession(entry.sessionId, actionText(entry.meta, String(data.action), data.payload));
          return;
        }
        if (data.type === 'dsh-artifact:prompt' && typeof data.text === 'string' && data.text.trim().length > 0) {
          sendToSession(entry.sessionId, data.text.trim().slice(0, 4000));
          return;
        }
        if (data.type === 'dsh-artifact:open' && typeof data.url === 'string' && /^https?:\/\//u.test(data.url)) {
          window.open(data.url, '_blank', 'noopener,noreferrer');
        }
      });
      const observer = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(() => {
        const theme = currentTheme();
        if (theme !== undefined) broadcastTheme(theme);
      });
      observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme', 'data-color-scheme', 'class'] });
    }

    /* ------------------------------------------------------------- card */

    /**
     * The toolview card: title row plus the sandboxed frame.
     * @param {any} props toolview props
     * @returns {any} React element or null
     */
    function ArtifactCard(props) {
      const meta = readMeta(props);
      const sessionId = readSessionId(props);
      const frameRef = React.useRef(null);
      const [height, setHeight] = React.useState(360);

      React.useEffect(() => {
        const node = frameRef.current;
        if (node === null || meta === undefined) return undefined;
        const entry = {
          sessionId,
          meta,
          onHeight: (value) => setHeight(Math.max(80, Math.min(960, Math.round(value)))),
        };
        frames.set(node.contentWindow, entry);
        return () => {
          frames.delete(node.contentWindow);
        };
      }, [meta, sessionId]);

      if (meta === undefined || typeof meta.viewUrl !== 'string') return null;

      const surface = meta.surface || 'inline';
      const theme = currentTheme();
      const src = `${meta.viewUrl}${meta.viewUrl.includes('?') ? '&' : '?'}inline=1${theme ? `&theme=${theme}` : ''}`;
      const cap = surface === 'wide' ? 1200 : 900;

      return h('div', { className: surface === 'wide' ? 'dsh-art dsh-art-wide' : 'dsh-art' },
        h('div', { className: 'dsh-art-head' },
          h('span', { className: 'dsh-art-title' }, meta.title || 'Artifact'),
          h('span', { className: 'dsh-art-kind' }, meta.artifactKind || 'artifact'),
          h('span', { className: 'dsh-art-links' },
            h('a', { href: meta.viewUrl, target: '_blank', rel: 'noreferrer' }, 'Open'),
            h('a', { href: GALLERY, target: '_blank', rel: 'noreferrer' }, 'Gallery'),
          ),
        ),
        h('iframe', {
          ref: frameRef,
          className: 'dsh-art-frame',
          src,
          title: meta.title || 'Artifact',
          sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox',
          style: { height: Math.min(height, cap) },
          loading: 'lazy',
        }),
      );
    }

    /* ------------------------------------------------------------- fence */

    /** A fence body is `{"id":"art_1a2b3c4d5e"}` and nothing else. */
    const FENCE_RE = /^art_[a-f0-9]{10}$/u;

    /**
     * Read the artifact id out of a fence body.
     * @param {string} text fence text
     * @returns {string | undefined} id
     */
    function fenceId(text) {
      try {
        const parsed = JSON.parse(text);
        const id = parsed && parsed.id;
        return typeof id === 'string' && FENCE_RE.test(id) ? id : undefined;
      } catch {
        return undefined;
      }
    }

    /**
     * Mount one fence's frame next to its code block.
     * @param {HTMLElement} block the code block surface
     * @param {string} id artifact id
     * @returns {void}
     */
    function mountFence(block, id) {
      if (block.dataset.dshArtifactMounted === id) return;
      block.dataset.dshArtifactMounted = id;
      const existing = block.previousElementSibling;
      if (existing !== null && existing.dataset && existing.dataset.dshArtifactFrame === id) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'dsh-art-fence';
      wrapper.dataset.dshArtifactFrame = id;
      const frame = document.createElement('iframe');
      frame.src = `${VIEW}?id=${id}&inline=1`;
      frame.title = 'Artifact';
      frame.loading = 'lazy';
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox');
      frame.style.cssText = 'width:100%;height:320px;border:1px solid var(--border,#e4e0d7);border-radius:12px;display:block;background:transparent';
      wrapper.appendChild(frame);
      block.parentElement.insertBefore(wrapper, block);
      block.style.display = 'none';
      frames.set(frame.contentWindow, {
        sessionId: undefined,
        meta: { id, title: 'Artifact' },
        onHeight: (value) => {
          frame.style.height = `${Math.max(80, Math.min(900, Math.round(value)))}px`;
        },
      });
    }

    /**
     * Scan the conversation DOM for ```dsh-artifact fences.
     * @returns {void}
     */
    function scanFences() {
      if (typeof document === 'undefined') return;
      const blocks = document.querySelectorAll('pre > code');
      for (const code of blocks) {
        const className = code.className || '';
        if (!/(?:^|\s)language-dsh-artifact(?:\s|$)/u.test(className)) continue;
        const id = fenceId(code.textContent || '');
        if (id === undefined) continue;
        const surface = code.closest('.md-code-block') || code.closest('pre');
        if (surface === null || surface.parentElement === null) continue;
        mountFence(surface, id);
      }
    }

    /**
     * Observe the transcript for new fences and re-renders.
     * @returns {() => void} disposer
     */
    function installFenceChannel() {
      if (typeof document === 'undefined') return () => undefined;
      let timer = 0;
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            scanFences();
          } catch (error) {
            console.warn('[dsh-artifacts] fence scan failed:', error && error.message ? error.message : error);
          }
        }, 120);
      };
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      schedule();
      return () => {
        observer.disconnect();
        clearTimeout(timer);
      };
    }

    /* -------------------------------------------------------------- apply */

    exports.name = 'dsh-artifacts';
    exports.inject = ['slots'];

    /**
     * Client entry.
     * @param {any} ctx cordis client context
     * @returns {() => void} disposer
     */
    exports.apply = (ctx) => {
      installStyles();
      installBridge();

      // Optional: the conversation send behind card actions. Declared through
      // ctx.inject so a host without the service still renders cards.
      ctx.inject(['sessions'], (scope) => {
        sessions = scope.get('sessions') || null;
      });

      const disposers = [];
      if (ctx.slots && typeof ctx.slots.inject === 'function') {
        disposers.push(ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
          name: 'tool.call.toolview',
          key: 'artifact',
        }, ArtifactCard)));
      }
      disposers.push(installFenceChannel());

      console.info('[dsh-artifacts] client active; channels=toolview+fence');
      return () => {
        for (const dispose of disposers) {
          try {
            dispose();
          } catch {
            // A torn-down slot is already gone.
          }
        }
      };
    };

    exports.ArtifactCard = ArtifactCard;
    return module.exports;
  },
});
