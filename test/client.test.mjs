import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');

/**
 * A fake React: enough of the surface the card touches.
 */
const React = {
  createElement(type, props, ...children) {
    return { type, props: { ...(props ?? {}), children } };
  },
  useRef(value) {
    return { current: value };
  },
  useState(value) {
    return [value, () => undefined];
  },
  useEffect() {
    return undefined;
  },
};

/**
 * Load client.js as the shell would: through the module-loader envelope.
 * @returns {any} the module exports
 */
function loadClient() {
  let exported;
  const window = {
    __ModuleLoader__: {
      load({ id, factory }) {
        assert.equal(id, 'dsh-artifacts');
        exported = factory((name) => {
          assert.equal(name, 'react');
          return React;
        });
      },
    },
    addEventListener() {},
    open() {},
  };
  // The bundle is a classic script that reads `window`; evaluate it with the
  // stub in scope and keep the exports it hands the loader.
  new Function('window', 'document', 'MutationObserver', source)(window, undefined, undefined);
  return { exported, window };
}

test('the bundle exports the plugin face the shell expects', () => {
  const { exported } = loadClient();
  assert.equal(exported.name, 'dsh-artifacts');
  assert.deepEqual(exported.inject, ['slots']);
  assert.equal(typeof exported.apply, 'function');
});

test('apply registers the keyed toolview and returns a disposer', () => {
  const { exported } = loadClient();
  const registrations = [];
  const ctx = {
    inject(_names, callback) {
      callback({ get: () => null });
    },
    slots: {
      inject(name, factory) {
        assert.equal(name, 'tool.call.toolview');
        return factory();
      },
      register(options, component) {
        registrations.push({ options, component });
        return () => undefined;
      },
    },
  };
  const dispose = exported.apply(ctx);
  assert.equal(typeof dispose, 'function');
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].options.key, 'artifact');
  assert.equal(registrations[0].component, exported.ArtifactCard);
});

test('the card renders nothing when the host carries no meta', () => {
  const { exported } = loadClient();
  assert.equal(exported.ArtifactCard({}), null);
  assert.equal(exported.ArtifactCard({ meta: { kind: 'something-else' } }), null);
});

test('the card builds a sandboxed frame from meta it finds nested', () => {
  const { exported } = loadClient();
  const element = exported.ArtifactCard({
    result: { meta: { kind: 'artifact', id: 'art_0123456789', artifactKind: 'chart', title: 'Revenue', viewUrl: '/plugins/dsh-artifacts/view?id=art_0123456789', surface: 'inline' } },
  });
  assert.equal(element.type, 'div');
  const frame = element.props.children.find((child) => child && child.type === 'iframe');
  assert.ok(frame, 'an iframe is rendered');
  assert.equal(frame.props.src.startsWith('/plugins/dsh-artifacts/view?id=art_0123456789'), true);
  assert.match(frame.props.sandbox, /allow-scripts/u);
  assert.equal(frame.props.title, 'Revenue');
});
