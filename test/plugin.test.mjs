import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply, inject, name, PROMPT } from '../lib/index.js';

/**
 * A fake cordis context: records every registration the plugin makes.
 * @param {string} directory artifact store
 * @returns {{ctx: any, log: any}} context and its log
 */
function fakeContext(directory) {
  const log = { sections: [], tools: [], skills: [], routes: [] };
  const services = {
    tools: { register: (tool) => { log.tools.push(tool); return () => undefined; } },
    skills: { register: (skill) => { log.skills.push(skill); return () => undefined; } },
    webServer: { register: (route) => { log.routes.push(route); return () => undefined; } },
  };
  const ctx = {
    systemPrompt: {
      getSectionOrder: () => 100,
      section: (section) => { log.sections.push(section); },
    },
    inject(names, callback) {
      const scope = {
        get: (key) => services[key],
        effect: (work) => {
          const dispose = work();
          return typeof dispose === 'function' ? dispose : () => undefined;
        },
        ...services,
      };
      if (names.some((entry) => services[entry] !== undefined)) callback(scope);
    },
    effect: (work) => {
      const dispose = work();
      return typeof dispose === 'function' ? dispose : () => undefined;
    },
  };
  return { ctx, log, directory };
}

test('the plugin declares its name, required service and prompt', () => {
  assert.equal(name, 'dsh-artifacts');
  assert.deepEqual(inject, ['systemPrompt']);
  assert.match(PROMPT, /artifact/u);
  assert.match(PROMPT, /dsh-artifact/u);
});

test('apply registers the prompt, one tool, one skill and four routes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-artifacts-plugin-'));
  try {
    const { ctx, log } = fakeContext(directory);
    apply(ctx, { directory });
    await new Promise((resolve) => setTimeout(resolve, 60));

    assert.equal(log.sections.length, 1);
    assert.equal(log.sections[0].name, 'artifacts:surface');
    assert.equal(log.tools.length, 1);
    assert.equal(log.tools[0].name, 'artifact');
    assert.deepEqual(log.routes.map((route) => route.path).sort(), [
      '/plugins/dsh-artifacts/export',
      '/plugins/dsh-artifacts/gallery',
      '/plugins/dsh-artifacts/source',
      '/plugins/dsh-artifacts/view',
    ]);
    assert.equal(log.skills.length, 1);
    assert.equal(log.skills[0].name, 'artifacts');
    assert.match(log.skills[0].content, /# Artifacts/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the tool creates, lists and exports an artifact', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-artifacts-tool-'));
  try {
    const { ctx, log } = fakeContext(directory);
    apply(ctx, { directory });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const tool = log.tools[0];

    const created = await tool.execute({
      action: 'create',
      kind: 'widget',
      title: 'Wobble',
      content: '<h2 class="sr-only">A line</h2><p>5%</p>',
    });
    assert.equal(created.kind, 'widget');
    assert.match(created.id, /^art_[a-f0-9]{10}$/u);
    assert.equal(created.viewUrl, `/plugins/dsh-artifacts/view?id=${created.id}`);
    assert.equal(created.galleryUrl, '/plugins/dsh-artifacts/gallery');

    const listed = await tool.execute({ action: 'list' });
    assert.equal(listed.artifacts.length, 1);
    assert.equal(listed.artifacts[0].id, created.id);

    const exported = await tool.execute({ action: 'export', id: created.id, format: 'html' });
    assert.match(exported.exportPath, /\.html$/u);
    assert.ok(exported.bytes > 100);

    const meta = tool.output.presentationMeta({}, created);
    assert.equal(meta.kind, 'artifact');
    assert.equal(meta.id, created.id);

    const text = tool.output.render({}, created);
    assert.match(text[0].text, /artifact created/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the tool rejects an invalid artifact with every reason at once', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-artifacts-reject-'));
  try {
    const { ctx, log } = fakeContext(directory);
    apply(ctx, { directory });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const tool = log.tools[0];
    await assert.rejects(
      () => tool.execute({ action: 'create', kind: 'chart', title: 'Bad', content: '{"type":"pie"}' }),
      (error) => {
        assert.match(error.message, /chart\.type/u);
        assert.match(error.message, /series/u);
        return true;
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
