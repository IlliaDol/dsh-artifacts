/**
 * Package-shape checks: the things that make a package loadable by dsh but
 * that unit tests cannot see.
 */

import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

assert.equal(pkg.type, 'module', 'the host half is ESM');
assert.equal(pkg.main, 'lib/index.js');
assert.equal(pkg.exports['.'], './lib/index.js');
assert.equal(pkg.exports['./client'], './lib/client.js');
assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
assert.equal(pkg.dsh.client.platform, 'web', 'the client half targets the web shell');
assert.ok(Array.isArray(pkg.dsh.client.inject));

for (const file of ['lib/index.js', 'lib/client.js', 'lib/render.js', 'lib/store.js', 'lib/routes.js', 'lib/schema.js', 'lib/markdown.js', 'lib/ooxml.js', 'lib/zip.js', 'lib/theme.js', 'lib/cookbook.js', 'cookbook/manifest.json', 'cookbook/gallery.html', 'cookbook/viz-kit.js', 'cookbook/viz3d.js', 'SKILL.md', 'cordis.patch.yml', 'LICENSE', 'NOTICE', 'README.md']) {
  const info = await stat(join(root, file));
  assert.ok(info.size > 0, `${file} is empty`);
}

const manifest = JSON.parse(await readFile(join(root, 'cookbook', 'manifest.json'), 'utf8'));
assert.equal(manifest.count, 164, 'the vendored cookbook has 164 recipes');
assert.equal(manifest.recipes.length, 164);
assert.equal(new Set(manifest.recipes.map((recipe) => recipe.id)).size, 164, 'recipe ids are unique');
assert.equal(manifest.recipes.every((recipe) => typeof recipe.code === 'string' && recipe.code.length > 0), true, 'every recipe has code');

const client = await readFile(join(root, 'lib', 'client.js'), 'utf8');
assert.match(client, /window\.__ModuleLoader__\.load\(\{/u, 'client.js uses the module-loader envelope');
assert.match(client, /id: 'dsh-artifacts'/u);
assert.match(client, /exports\.apply/u);
assert.match(client, /exports\.inject = \['slots'\]/u);

const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
assert.match(patch, /name: dsh-artifacts/u);

const skill = await readFile(join(root, 'SKILL.md'), 'utf8');
assert.match(skill, /^---\nname: artifacts\n/u, 'SKILL.md has parseable frontmatter');
assert.match(skill, /description: "/u, 'SKILL.md description is quoted');

assert.equal(pkg.dependencies, undefined, 'no runtime dependencies');
console.log('package shape ok');
