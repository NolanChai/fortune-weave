import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import suitability from '../data/class-suitability.json' with { type: 'json' };
import classes from '../data/classes.json' with { type: 'json' };
import portraits from '../assets/characters/index.json' with { type: 'json' };
import icons from '../assets/classes/icons/index.json' with { type: 'json' };

test('suitability covers Beginner, Specialty, Advanced, and Master classes once', () => {
  const expected = classes.classes.map(({ id }) => id).sort();
  assert.deepEqual(suitability.classes.map(({ classId }) => classId).sort(), expected);
  assert.deepEqual(new Set(classes.classes.map(({ tier }) => tier)), new Set(['beginner', 'specialty', 'advanced', 'master']));
  assert.equal(classes.classes.find(({ id }) => id === 'war-monk').tier, 'master');
});

test('recommendations have portraits, sources, and consistent visual markers', () => {
  const characters = new Set(portraits.characters.map(({ id }) => id));
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

test('fit order is independent of experimental status', () => {
  const order = { S: 0, A: 1, B: 2, C: 3 };
  for (const entry of suitability.classes) {
    const ranks = entry.picks.map(({ rank }) => order[rank] ?? 4);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), entry.classId);
  }
  assert.ok(suitability.classes.some(({ picks }) => picks.some((pick, i) => pick.experimental && picks.slice(i + 1).some((later) => !later.experimental))));
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
