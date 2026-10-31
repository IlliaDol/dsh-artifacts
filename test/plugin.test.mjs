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

test('apply registers the prompt, one tool, one skill and five routes', async () => {
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
      '/plugins/dsh-artifacts/cookbook',
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

test('the skill is registered before the first prompt is assembled', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-artifacts-skill-'));
  try {
    const { ctx, log } = fakeContext(directory);
    apply(ctx, { directory });
    assert.equal(log.sections.length, 1);
    assert.equal(log.skills.length, 1);
    assert.match(log.skills[0].content, /# Artifacts/u);
    // The store opens in the background; let it settle so cleanup cannot race it.
    await new Promise((resolve) => setTimeout(resolve, 60));
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

    const exact = await tool.execute({ action: 'cookbook', recipe: 'qq' });
    assert.equal(exact.recipe.id, 'qq');
    assert.match(exact.recipe.code, /function draw\(host, K\)/u);
    assert.match(tool.output.render({}, exact).at(-1).text, /function draw/u);
    assert.equal(tool.output.presentationMeta({}, exact), undefined);

    const listedRecipes = await tool.execute({ action: 'cookbook', family: 'distribution', limit: 3 });
    assert.equal(listedRecipes.recipes.length, 3);
    assert.equal(listedRecipes.recipes.every((entry) => entry.family === 'distribution'), true);

    const recipe = await tool.execute({ action: 'create', kind: 'recipe', title: 'Q-Q', content: 'qq' });
    assert.equal(recipe.kind, 'recipe');
    assert.match(recipe.viewUrl, /\/view\?id=/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the tool output schema is strict JSON Schema, so the registry accepts it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-artifacts-schema-'));
  try {
    const { ctx, log } = fakeContext(directory);
    apply(ctx, { directory });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const tool = log.tools[0];

    // dsh validates output.schema with assertSupportedJsonSchema (a JSON Schema
    // subset): `required` is an array of property names at the object level.
    // A `required: true` on a property throws at registration, the tool is
    // never offered to the model, and every drawing request degrades to prose.
    assertStrictJsonSchema(tool.output.schema, 'output.schema');
    assert.deepEqual(tool.output.schema.required.sort(), ['action', 'message']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

/**
 * The subset of JSON Schema that dsh's tool registry accepts, checked the way
 * it checks it: `required` is an array of declared property names, never a
 * boolean on a property.
 * @param {any} schema schema to check
 * @param {string} path location for the failure message
 * @returns {void} nothing
 */
function assertStrictJsonSchema(schema, path) {
  assert.equal(typeof schema, 'object', `${path} must be a schema object`);
  assert.ok(schema !== null && !Array.isArray(schema), `${path} must be a schema object`);
  if (Object.hasOwn(schema, 'required')) {
    assert.ok(Array.isArray(schema.required), `${path}.required must be an array of property names`);
    for (const name of schema.required) {
      assert.ok(Object.hasOwn(schema.properties ?? {}, name), `${path}.required names "${name}", which is not in properties`);
    }
  }
  if (Object.hasOwn(schema, 'additionalProperties')) {
    assert.equal(typeof schema.additionalProperties, 'boolean', `${path}.additionalProperties must be a boolean`);
  }
  for (const [key, value] of Object.entries(schema.properties ?? {})) {
    const here = `${path}.properties.${key}`;
    assert.notEqual(value.required, true, `${here}.required must not be a boolean (use the parent required array)`);
    assert.ok(typeof value.type === 'string' || Array.isArray(value.oneOf), `${here} needs a type or oneOf`);
    if (value.type === 'object') assertStrictJsonSchema(value, here);
    if (value.type === 'array' && value.items !== undefined) assertStrictJsonSchema(value.items, `${here}.items`);
  }
}

test('the tool rejects an invalid artifact with every reason it can report', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-artifacts-reject-'));
  try {
    const { ctx, log } = fakeContext(directory);
    apply(ctx, { directory });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const tool = log.tools[0];
    const content = JSON.stringify({
      type: 'bar',
      labels: ['a'],
      series: [{ name: 'S', values: [1, 2] }, { name: 'T' }],
    });
    await assert.rejects(
      () => tool.execute({ action: 'create', kind: 'chart', title: 'Bad', content }),
      (error) => {
        assert.match(error.message, /one label per value/u);
        assert.match(error.message, /series\[1\] needs values/u);
        return true;
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
