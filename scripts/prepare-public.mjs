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

const cai = JSON.parse(await readFile(resolve(root, 'data/characters/cai.json'), 'utf8'));
assert.equal(cai.id, 'cai', 'Unexpected character profile');
const referenceStats = cai.referenceStats.values;
assert.equal(referenceStats.length, 9, 'Cai must have nine reference stats');
assert.deepEqual(new Set(referenceStats.map(({ name }) => name)),
  new Set(['HP', 'Str', 'Mag', 'Spd', 'Dex', 'Def', 'Res', 'Lck', 'Cha']), 'Invalid Cai stat names');
for (const stat of referenceStats) {
  assert(Number.isInteger(stat.base) && stat.base >= 0, `Invalid starting stat: Cai ${stat.name}`);
  assert(Number.isInteger(stat.growth) && stat.growth >= 0 && stat.growth <= 100,
    `Invalid growth rate: Cai ${stat.name}`);
}

const classData = JSON.parse(await readFile(resolve(root, 'data/classes.json'), 'utf8'));
assert.equal(classData.schemaVersion, 1, 'Unsupported classes schema');
const tierIds = new Set(classData.tiers.map(({ id }) => id));
const sourceIds = new Set(classData.sources.map(({ id }) => id));
const ranks = new Set(['E', 'E+', 'D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S', 'S+']);
const classIds = new Set();
for (const entry of classData.classes) {
  assert.match(entry.id, /^[a-z]+(?:-[a-z]+)*$/, 'Invalid class ID');
  assert(!classIds.has(entry.id), `Duplicate class: ${entry.id}`);
  classIds.add(entry.id);
  assert(tierIds.has(entry.tier), `Unknown tier: ${entry.id}`);
  assert(entry.sources.length > 0, `Missing class sources: ${entry.id}`);
  for (const source of entry.sources) assert(sourceIds.has(source), `Unknown source: ${entry.id}`);
  for (const requirement of entry.requirements ?? []) {
    assert(Object.hasOwn(classData.skills, requirement.skill), `Unknown skill: ${entry.id}`);
    assert(ranks.has(requirement.rank), `Invalid skill rank: ${entry.id}`);
  }
  for (const unlock of entry.unlockRoutes) {
    assert(['Cai', 'Dietrich', 'Leda', 'Theodora'].includes(unlock.route), `Unknown unlock route: ${entry.id}`);
  }
}

const classAssets = JSON.parse(await readFile(resolve(root, 'assets/classes/index.json'), 'utf8'));
assert.equal(classAssets.schemaVersion, 1, 'Unsupported class asset schema');
for (const asset of classAssets.assets) {
  assert.match(asset.file, /^[a-z-]+\.(jpg|png)$/, 'Invalid class asset filename');
  assert(sourceIds.has(asset.sourceId), `Unknown asset source: ${asset.file}`);
  const bytes = await readFile(resolve(root, 'assets/classes', asset.file));
  assert.equal(bytes.length, asset.bytes, `Class asset size changed: ${asset.file}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `Class asset changed: ${asset.file}`);
}

// public/ is generated exclusively from the canonical assets and data directories.
assert.equal(relative(root, publicDirectory), 'public', 'Refusing to clear a directory outside public/');
await rm(publicDirectory, { recursive: true, force: true });
await mkdir(publicDirectory, { recursive: true });
await cp(resolve(root, 'assets'), resolve(publicDirectory, 'assets'), { recursive: true });
await cp(resolve(root, 'data'), resolve(publicDirectory, 'data'), { recursive: true });
console.log(`Prepared ${characterIds.size} portraits, ${entryIds.size} Bird Time entries, and ${classIds.size} classes.`);
