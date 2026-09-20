import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDirectory = resolve(root, 'public');
const characterDirectory = resolve(root, 'assets/characters');
const index = JSON.parse(await readFile(resolve(characterDirectory, 'index.json'), 'utf8'));
const birdTime = JSON.parse(await readFile(resolve(root, 'data/bird-time.json'), 'utf8'));
const characterIds = new Set();
const entryIds = new Set();

assert.equal(index.schemaVersion, 1, 'Unsupported character index schema');
assert.equal(birdTime.schemaVersion, 1, 'Unsupported Bird Time schema');

for (const character of index.characters) {
  assert.match(character.id, /^[a-z]+(?:-[a-z]+)*$/, 'Invalid character ID');
  assert.equal(character.icon, `${character.id}/icon.jpg`, `Invalid icon path: ${character.id}`);
  assert(!characterIds.has(character.id), `Duplicate character: ${character.id}`);
  characterIds.add(character.id);
  const image = await readFile(resolve(characterDirectory, character.icon));
  assert.equal(image.length, character.bytes, `Icon size changed: ${character.id}`);
  assert.equal(createHash('sha256').update(image).digest('hex'), character.sha256,
    `Icon checksum changed: ${character.id}`);
}

const birdTimeIds = new Set();
for (const character of birdTime.characters) {
  assert(characterIds.has(character.id), `Missing portrait: ${character.id}`);
  assert(!birdTimeIds.has(character.id), `Duplicate Bird Time character: ${character.id}`);
  birdTimeIds.add(character.id);
  assert(character.entries.length > 0, `No topics for ${character.id}`);
  for (const entry of character.entries) {
    assert(!entryIds.has(entry.id), `Duplicate entry: ${entry.id}`);
    entryIds.add(entry.id);
    assert(typeof entry.topic === 'string' && entry.topic.trim(), `Missing topic: ${entry.id}`);
    assert(entry.answer === null || (typeof entry.answer === 'string' && entry.answer.trim()),
      `Invalid answer: ${entry.id}`);
  }
}

assert.deepEqual(birdTimeIds, characterIds, 'Character and Bird Time records must match');

// public/ is generated exclusively from the canonical assets and data directories.
assert.equal(relative(root, publicDirectory), 'public', 'Refusing to clear a directory outside public/');
await rm(publicDirectory, { recursive: true, force: true });
await mkdir(publicDirectory, { recursive: true });
await cp(resolve(root, 'assets'), resolve(publicDirectory, 'assets'), { recursive: true });
await cp(resolve(root, 'data'), resolve(publicDirectory, 'data'), { recursive: true });
console.log(`Prepared ${characterIds.size} portraits and ${entryIds.size} Bird Time entries.`);
