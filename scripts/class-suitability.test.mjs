import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import suitability from '../data/class-suitability.json' with { type: 'json' };
import classes from '../data/classes.json' with { type: 'json' };
import roster from '../data/class-roster.json' with { type: 'json' };
import gifts from '../data/gifts.json' with { type: 'json' };
import portraits from '../assets/classes/portraits/index.json' with { type: 'json' };
import icons from '../assets/classes/icons/index.json' with { type: 'json' };

test('suitability covers Beginner, Specialty, Advanced, and Master classes once', () => {
  const expected = classes.classes.map(({ id }) => id).sort();
  assert.deepEqual(suitability.classes.map(({ classId }) => classId).sort(), expected);
  assert.deepEqual(new Set(classes.classes.map(({ tier }) => tier)), new Set(['beginner', 'specialty', 'advanced', 'master']));
  assert.equal(classes.classes.find(({ id }) => id === 'war-monk').tier, 'master');
});

test('recommendations have portraits, sources, and consistent visual markers', () => {
  const characters = new Set(roster.characters.map(({ id }) => id));
  const sources = new Set(suitability.sources.map(({ id }) => id));
  for (const entry of suitability.classes) {
    const used = new Set();
    for (const pick of entry.picks) {
      assert.ok(characters.has(pick.characterId), `Missing portrait: ${pick.characterId}`);
      assert.ok(!used.has(pick.characterId), `Duplicate pick in ${entry.classId}`);
      used.add(pick.characterId);
      assert.ok(['S', 'A', 'B', 'C', null].includes(pick.rank));
      assert.equal(typeof pick.experimental, 'boolean');
      assert.ok(['review', 'player', 'theorycraft'].includes(pick.basis));
      assert.ok(pick.reason.trim() && pick.sourceIds.length > 0);
      assert.ok(pick.sourceIds.every((id) => sources.has(id)));
      if (entry.provisional) assert.equal(pick.rank, null, 'Unverified class kits must not get a confident grade');
      if (pick.rank === null) assert.equal(entry.provisional, true);
    }
  }
});

test('the full playable roster has a placement at every class tier', () => {
  const expected = new Set([
    ...gifts.characters.map(({ id }) => id),
    'creek', 'nathan', 'bertrand', 'talimun', 'anatolia', 'orchel', 'centurio', 'aswan', 'tahonia',
  ]);
  assert.deepEqual(new Set(roster.characters.map(({ id }) => id)), expected);
  assert.equal(roster.characters.length, expected.size, 'Duplicate roster entry');
  for (const tier of ['beginner', 'specialty', 'advanced', 'master']) {
    const classIds = new Set(classes.classes.filter((entry) => entry.tier === tier).map(({ id }) => id));
    const tierClasses = suitability.classes.filter(({ classId }) => classIds.has(classId));
    const covered = new Set(tierClasses
      .flatMap(({ picks }) => picks.map(({ characterId }) => characterId)));
    const standard = new Set(tierClasses
      .flatMap(({ picks }) => picks.filter(({ experimental }) => !experimental).map(({ characterId }) => characterId)));
    assert.deepEqual(covered, expected, `Incomplete ${tier} roster`);
    assert.deepEqual(standard, expected, `A character has only experimental ${tier} builds`);
  }
  for (const classId of ['hunter', 'archer']) {
    const leda = suitability.classes.find((entry) => entry.classId === classId).picks.find((pick) => pick.characterId === 'leda');
    assert.ok(leda && !leda.experimental, `Leda belongs in ${classId}`);
  }
});

test('every roster portrait exists and new assets retain their provenance', async () => {
  for (const character of roster.characters) {
    assert.match(character.portrait, /^assets\/(characters|gifts|classes)\/[a-z/-]+\.(jpg|png)$/);
    assert.ok([1, 2, 3].includes(character.part));
    const bytes = await readFile(new URL(`../${character.portrait}`, import.meta.url));
    assert.ok(bytes.length > 0, character.id);
  }
  for (const asset of portraits.assets) {
    const bytes = await readFile(new URL(`../assets/classes/portraits/${asset.file}`, import.meta.url));
    assert.ok(asset.sourceUrl && asset.sourcePage);
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.id);
    assert.equal(bytes.readUInt32BE(16), asset.width);
    assert.equal(bytes.readUInt32BE(20), asset.height);
    assert.equal(roster.characters.find(({ id }) => id === asset.id)?.portrait, `assets/classes/portraits/${asset.file}`);
  }
});

test('class recommendations respect personal restrictions on mounts', () => {
  for (const entry of suitability.classes) {
    const details = classes.classes.find(({ id }) => id === entry.classId);
    if (!details.requirements?.some(({ skill }) => skill === 'riding' || skill === 'flying')) continue;
    assert.ok(!entry.picks.some(({ characterId }) => ['goliath', 'orchel'].includes(characterId)), entry.classId);
  }
});

test('fit order is independent of experimental status', () => {
  const order = { S: 0, A: 1, B: 2, C: 3 };
  for (const entry of suitability.classes) {
    const ranks = entry.picks.map(({ rank }) => order[rank] ?? 4);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), entry.classId);
  }
  assert.ok(suitability.classes.some(({ picks }) => picks.some((pick, i) => pick.experimental && picks.slice(i + 1).some((later) => !later.experimental))));
});

test('ranked Advanced and Master classes include a viable experimental alternative', () => {
  const laterClasses = new Set(classes.classes.filter(({ tier }) => ['advanced', 'master'].includes(tier)).map(({ id }) => id));
  for (const entry of suitability.classes) {
    if (!laterClasses.has(entry.classId) || entry.provisional) continue;
    assert.ok(entry.picks.some(({ experimental, rank }) => experimental && ['S', 'A', 'B'].includes(rank)),
      `${entry.classId} needs an experimental alternative beyond a C-tier challenge build`);
  }
});

test('Dante recommendations use she/her pronouns', () => {
  const notes = suitability.classes.flatMap(({ picks }) => picks).filter(({ characterId }) => characterId === 'dante');
  assert.ok(notes.length > 0);
  for (const { reason } of notes) assert.doesNotMatch(reason, /\b(he|his|him)\b/i);
});

test('class icons match their manifest and missing icons are explicit', async () => {
  const covered = [...icons.assets.map(({ classId }) => classId), ...icons.missing].sort();
  assert.deepEqual(covered, classes.classes.map(({ id }) => id).sort());
  for (const icon of icons.assets) {
    assert.equal(icon.file, `${icon.classId}.png`);
    assert.ok(icon.sourceUrl && icon.sourcePage);
    const bytes = await readFile(new URL(`../assets/classes/icons/${icon.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), icon.sha256, icon.classId);
    assert.equal(bytes.readUInt32BE(16), icon.width);
    assert.equal(bytes.readUInt32BE(20), icon.height);
  }
});
