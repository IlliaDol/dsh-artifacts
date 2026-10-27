/**
 * Artifact persistence under `$DSH_HOME/artifacts`.
 *
 * One directory per artifact (`meta.json`, `source.*`, `index.html`) plus a
 * single `index.json` listing. Writes go through a temp file and a rename, and
 * every mutation is serialized through one promise chain, so two concurrent
 * tool calls cannot interleave into a half-written index.
 */

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Artifact ids: prefix + 10 hex characters, and nothing else. */
export const ID_RE = /^art_[a-f0-9]{10}$/u;

/** Where a source lives inside its artifact directory. */
const SOURCE_EXT = { json: 'json', md: 'md', html: 'html' };

/**
 * Filename-safe stem for an artifact title.
 * @param {string} title human title
 * @returns {string} slug
 */
export function slug(title) {
  const base = String(title ?? 'artifact')
    .normalize('NFKD')
    .replace(/[^\w\s-]/gu, '')
    .trim()
    .replace(/\s+/gu, '-')
    .slice(0, 64)
    .replace(/^-+|-+$/gu, '');
  return base.length > 0 ? base.toLowerCase() : 'artifact';
}

export class ArtifactStore {
  /** @param {string} root directory that holds every artifact */
  constructor(root) {
    this.root = root;
    /** @type {Promise<unknown>} */
    this.chain = Promise.resolve();
    /** @type {boolean} */
    this.ready = false;
  }

  /** Create the root and the index if they are missing. */
  async init() {
    if (this.ready) return;
    await mkdir(join(this.root, 'exports'), { recursive: true });
    try {
      await readFile(join(this.root, 'index.json'), 'utf8');
    } catch {
      await this.writeIndex([]);
    }
    this.ready = true;
  }

  /**
   * Serialize one mutation.
   * @template T
   * @param {() => Promise<T>} work mutation
   * @returns {Promise<T>} its result
   */
  mutate(work) {
    const next = this.chain.then(work, work);
    this.chain = next.then(() => undefined, () => undefined);
    return next;
  }

  /**
   * Read the index.
   * @returns {Promise<{v: number, artifacts: any[]}>} index
   */
  async readIndex() {
    try {
      const raw = await readFile(join(this.root, 'index.json'), 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.artifacts)) return { v: 1, artifacts: parsed.artifacts };
    } catch {
      // A missing or corrupt index is rebuilt from the directory listing.
    }
    const artifacts = await this.rebuildIndex();
    await this.writeIndex(artifacts);
    return { v: 1, artifacts };
  }

  /**
   * Rebuild the listing from per-artifact `meta.json` files.
   * @returns {Promise<any[]>} records, newest first
   */
  async rebuildIndex() {
    let names = [];
    try {
      names = await readdir(this.root, { withFileTypes: true });
    } catch {
      return [];
    }
    const records = [];
    for (const entry of names) {
      if (!entry.isDirectory() || !ID_RE.test(entry.name)) continue;
      try {
        const meta = JSON.parse(await readFile(join(this.root, entry.name, 'meta.json'), 'utf8'));
        if (ID_RE.test(meta?.id ?? '')) records.push(meta);
      } catch {
        // An unreadable artifact directory is skipped, not fatal.
      }
    }
    return records.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
  }

  /**
   * Write the index atomically.
   * @param {any[]} artifacts records
   * @returns {Promise<void>} completion
   */
  async writeIndex(artifacts) {
    const target = join(this.root, 'index.json');
    const temp = `${target}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(temp, JSON.stringify({ v: 1, artifacts }, null, 2), 'utf8');
    await rename(temp, target);
  }

  /**
   * Store a new artifact.
   * @param {{kind: string, title: string, surface: string, content: string, format?: string, summary?: string}} artifact normalized artifact
   * @param {string} html rendered document, or '' for file artifacts
   * @returns {Promise<any>} the stored record
   */
  async create(artifact, html) {
    await this.init();
    return this.mutate(async () => {
      const index = await this.readIndex();
      const id = `art_${randomBytes(5).toString('hex')}`;
      const now = new Date().toISOString();
      const record = {
        id,
        kind: artifact.kind,
        title: artifact.title,
        surface: artifact.surface,
        format: artifact.format,
        summary: artifact.summary,
        createdAt: now,
        updatedAt: now,
        sourceBytes: Buffer.byteLength(artifact.content, 'utf8'),
      };
      const directory = join(this.root, id);
      await mkdir(directory, { recursive: true });
      const extension = SOURCE_EXT[artifact.kind === 'doc' ? 'md' : artifact.kind === 'widget' || artifact.kind === 'page' ? 'html' : 'json'];
      await writeFile(join(directory, `source.${extension}`), artifact.content, 'utf8');
      await writeFile(join(directory, 'meta.json'), JSON.stringify(record, null, 2), 'utf8');
      if (html) await writeFile(join(directory, 'index.html'), html, 'utf8');
      await this.writeIndex([record, ...index.artifacts]);
      return record;
    });
  }

  /**
   * Replace an artifact's source and metadata, keeping its id.
   * @param {string} id artifact id
   * @param {{kind: string, title: string, surface: string, content: string, format?: string, summary?: string}} artifact normalized artifact
   * @param {string} html rendered document
   * @returns {Promise<any>} the updated record
   */
  async update(id, artifact, html) {
    await this.init();
    return this.mutate(async () => {
      const index = await this.readIndex();
      const existing = index.artifacts.find((entry) => entry.id === id);
      if (existing === undefined) throw new Error(`artifact ${id} not found`);
      const directory = join(this.root, id);
      const files = await readdir(directory).catch(() => []);
      for (const file of files) {
        if (file.startsWith('source.')) await rm(join(directory, file), { force: true });
      }
      const record = {
        ...existing,
        kind: artifact.kind,
        title: artifact.title,
        surface: artifact.surface,
        format: artifact.format,
        summary: artifact.summary,
        updatedAt: new Date().toISOString(),
        sourceBytes: Buffer.byteLength(artifact.content, 'utf8'),
      };
      const extension = SOURCE_EXT[artifact.kind === 'doc' ? 'md' : artifact.kind === 'widget' || artifact.kind === 'page' ? 'html' : 'json'];
      await writeFile(join(directory, `source.${extension}`), artifact.content, 'utf8');
      await writeFile(join(directory, 'meta.json'), JSON.stringify(record, null, 2), 'utf8');
      await writeFile(join(directory, 'index.html'), html, 'utf8');
      const artifacts = index.artifacts.map((entry) => (entry.id === id ? record : entry));
      await this.writeIndex(artifacts);
      return record;
    });
  }

  /**
   * One record.
   * @param {string} id artifact id
   * @returns {Promise<any | undefined>} record
   */
  async get(id) {
    if (!ID_RE.test(id)) return undefined;
    const index = await this.readIndex();
    return index.artifacts.find((entry) => entry.id === id);
  }

  /**
   * Recent records.
   * @param {number} [limit] how many
   * @returns {Promise<any[]>} records, newest first
   */
  async list(limit = 20) {
    await this.init();
    const index = await this.readIndex();
    return index.artifacts.slice(0, limit);
  }

  /**
   * Reconstruct the envelope for an existing artifact.
   * @param {any} record stored record
   * @returns {Promise<{kind: string, title: string, surface: string, content: string, format?: string, summary?: string}>} artifact
   */
  async load(record) {
    const directory = join(this.root, record.id);
    const files = await readdir(directory);
    const source = files.find((file) => file.startsWith('source.'));
    if (source === undefined) throw new Error(`artifact ${record.id} has no source`);
    const content = await readFile(join(directory, source), 'utf8');
    return {
      kind: record.kind,
      title: record.title,
      surface: record.surface,
      content,
      format: record.format,
      summary: record.summary,
    };
  }

  /**
   * Write an export next to the store and return its absolute path.
   * @param {string} id artifact id
   * @param {string} extension file extension
   * @param {Buffer} bytes file bytes
   * @returns {Promise<string>} absolute path
   */
  async exportFile(id, extension, bytes) {
    await this.init();
    const record = await this.get(id);
    const name = `${slug(record?.title ?? id)}-${id.slice(4)}.${extension}`;
    const target = join(this.root, 'exports', name);
    await writeFile(target, bytes);
    return target;
  }

  /**
   * Remove an artifact and its directory.
   * @param {string} id artifact id
   * @returns {Promise<boolean>} whether it existed
   */
  async remove(id) {
    if (!ID_RE.test(id)) return false;
    await this.init();
    return this.mutate(async () => {
      const index = await this.readIndex();
      if (!index.artifacts.some((entry) => entry.id === id)) return false;
      await rm(join(this.root, id), { recursive: true, force: true });
      await this.writeIndex(index.artifacts.filter((entry) => entry.id !== id));
      return true;
    });
  }
}
