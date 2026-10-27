import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArtifactStore, slug, ID_RE } from '../lib/store.js';

/**
 * A fresh store in a temp directory.
 * @returns {Promise<{store: ArtifactStore, root: string, cleanup: () => Promise<void>}>} fixture
 */
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-artifacts-'));
  const store = new ArtifactStore(root);
  await store.init();
  return { store, root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

const doc = { kind: 'doc', title: 'Quarterly notes', surface: 'page', content: '# Notes' };

test('create writes meta, source and the rendered document', async () => {
  const { store, root, cleanup } = await fixture();
  try {
    const record = await store.create(doc, '<html></html>');
    assert.match(record.id, ID_RE);
    const directory = join(root, record.id);
    const files = await readdir(directory);
    assert.deepEqual(files.sort(), ['index.html', 'meta.json', 'source.md']);
    assert.equal(await readFile(join(directory, 'source.md'), 'utf8'), '# Notes');
    assert.equal((await store.get(record.id)).title, 'Quarterly notes');
  } finally {
    await cleanup();
  }
});

test('list is newest-first and update keeps the id', async () => {
  const { store, cleanup } = await fixture();
  try {
    const first = await store.create(doc, '<html></html>');
    const second = await store.create({ ...doc, title: 'Second' }, '<html></html>');
    const listed = await store.list();
    assert.equal(listed.length, 2);
    assert.equal(listed[0].id, second.id);

    const updated = await store.update(first.id, { ...doc, title: 'Renamed', content: '# New' }, '<html></html>');
    assert.equal(updated.id, first.id);
    assert.equal(updated.title, 'Renamed');
    assert.equal((await store.load(updated)).content, '# New');
    assert.equal((await store.list())[1].title, 'Renamed');
  } finally {
    await cleanup();
  }
});

test('concurrent creates do not lose index entries', async () => {
  const { store, cleanup } = await fixture();
  try {
    await Promise.all(Array.from({ length: 8 }, (_value, index) => (
      store.create({ ...doc, title: `Doc ${index}` }, '<html></html>')
    )));
    const index = JSON.parse(await readFile(join(store.root, 'index.json'), 'utf8'));
    assert.equal(index.artifacts.length, 8);
    assert.equal(new Set(index.artifacts.map((entry) => entry.id)).size, 8);
  } finally {
    await cleanup();
  }
});

test('remove deletes the directory and the index entry', async () => {
  const { store, root, cleanup } = await fixture();
  try {
    const record = await store.create(doc, '<html></html>');
    assert.equal(await store.remove(record.id), true);
    assert.equal(await store.get(record.id), undefined);
    assert.deepEqual(await readdir(root).then((names) => names.filter((name) => name.startsWith('art_'))), []);
  } finally {
    await cleanup();
  }
});

test('a malformed or traversing id is refused', async () => {
  const { store, cleanup } = await fixture();
  try {
    assert.equal(await store.get('../../etc/passwd'), undefined);
    assert.equal(await store.get('art_zzzz'), undefined);
    assert.equal(await store.remove('../x'), false);
  } finally {
    await cleanup();
  }
});

test('a corrupt index is rebuilt from metadata', async () => {
  const { store, root, cleanup } = await fixture();
  try {
    const record = await store.create(doc, '<html></html>');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(root, 'index.json'), '{not json', 'utf8');
    const listed = await store.list();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, record.id);
  } finally {
    await cleanup();
  }
});

test('exportFile writes under exports and slugs the title', async () => {
  const { store, root, cleanup } = await fixture();
  try {
    const record = await store.create(doc, '<html></html>');
    const path = await store.exportFile(record.id, 'md', Buffer.from('# x'));
    assert.equal(path.startsWith(join(root, 'exports')), true);
    assert.match(path, /quarterly-notes-[a-f0-9]{10}\.md$/u);
  } finally {
    await cleanup();
  }
});

test('slug is filename-safe and never empty', () => {
  assert.equal(slug('Quarterly Notes: Q3'), 'quarterly-notes-q3');
  assert.equal(slug('   ***   '), 'artifact');
  assert.equal(slug('Ünïcode / path\\name'), 'unicode-pathname');
});
