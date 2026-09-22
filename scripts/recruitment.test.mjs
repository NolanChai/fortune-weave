import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { validateRecruitment } from './prepare-recruitment.mjs';

const data = JSON.parse(await readFile(new URL('../data/recruitment.json', import.meta.url), 'utf8'));
const gifts = JSON.parse(await readFile(new URL('../data/gifts.json', import.meta.url), 'utf8'));
const ids = new Set(gifts.characters.map(({ id }) => id));
const requirement = (character, route, source = data) => source.characters.find(({ id }) => id === character)
  .requirements.find(({ routeId }) => routeId === route);

test('recruitment gates retain route-specific levels and automatic joins', () => {
  validateRecruitment(data, ids);
  assert.equal(requirement('ultand', 'cai').status, 'automatic');
  assert.equal(requirement('ultand', 'cai').renown, null);
  assert.equal(requirement('ultand', 'cai').conditions, 'Chapter 6');
  for (const [route, renown] of [['dietrich', 5], ['theodora', 6], ['leda', 8]]) {
    const row = requirement('ultand', route);
    assert.equal(row.support, 3);
    assert.equal(row.renown, renown);
  }
  assert.equal(requirement('guzran', 'leda').support, 1);
  assert.equal(requirement('guzran', 'leda').renown, 3);
  assert.equal(requirement('cai', 'leda').status, 'unavailable');
  assert.match(requirement('tialla', 'dietrich').conditions, /Cai's paralogue; 3,000G/);
});

test('conflicting requirements remain unknown with their source disagreement', () => {
  for (const [character, route] of [['ninae', 'leda'], ['halvin', 'cai']]) {
    const row = requirement(character, route);
    assert.equal(row.renown, null);
    assert.match(row.note, /RPG Site lists \d; KeenGamer lists \d/);
  }
  const invalid = structuredClone(data);
  delete requirement('ninae', 'leda', invalid).note;
  assert.throws(() => validateRecruitment(invalid, ids), /Unexplained missing renown: ninae\/leda/);
});

test('invalid gates, inconsistent availability, and uncited rows fail validation', () => {
  for (const [field, value, error] of [
    ['support', 0, /Invalid support/], ['renown', 11, /Invalid renown/],
    ['status', 'unavailable', /Availability mismatch/], ['sourceIds', ['missing'], /Unknown requirement source/],
  ]) {
    const invalid = structuredClone(data);
    requirement('ultand', 'leda', invalid)[field] = value;
    assert.throws(() => validateRecruitment(invalid, ids), error);
  }
  const invalid = structuredClone(data);
  invalid.characters.find(({ id }) => id === 'ultand').requirements.pop();
  assert.throws(() => validateRecruitment(invalid, ids), /Missing route requirement: ultand/);
});
