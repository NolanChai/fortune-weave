import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeQuantity, parseInventory, serializeInventory } from '../src/data/gift-inventory.ts';

const data = JSON.parse(await readFile(new URL('../data/gifts.json', import.meta.url), 'utf8'));
const ids = new Set(data.gifts.map(({ id }) => id));

test('inventory restores quantities without retaining removed gifts or invalid values', () => {
  assert.deepEqual(parseInventory(JSON.stringify({ version: 1, quantities: {
    'southern-ghosh': 3, 'kitten-figurine': '2', 'rare-spices': -1,
    'home-recipe-book': 100, 'flexible-fishing-rod': 1.5, 'removed-gift': 2,
  } }), ids), { 'southern-ghosh': 3 });
  const inventory = { 'rare-spices': 2, 'kitten-figurine': 1 };
  assert.deepEqual(parseInventory(serializeInventory(inventory), ids), inventory);
});

test('missing, corrupt, and unsupported saved data starts with an empty inventory', () => {
  for (const raw of [null, '{', 'null', '[]', '{"version":2,"quantities":{}}', '{"version":1,"quantities":[]}']) {
    assert.deepEqual(parseInventory(raw, ids), {});
  }
});

test('quantity input stays within the supported range', () => {
  for (const [input, expected] of [['', 0], ['NaN', 0], ['Infinity', 0], ['-5', 0], ['2.8', 2], ['100', 99], ['12', 12]]) {
    assert.equal(normalizeQuantity(input), expected);
  }
});

test('source tiers and missing preferences survive the data import', () => {
  const reaction = (characterId, giftId) => data.preferences.find((p) => p.characterId === characterId && p.giftId === giftId)?.preference;
  assert.equal(reaction('guzran', 'volcano-ghosh'), 'loved');
  assert.equal(reaction('guzran', 'southern-ghosh'), 'really-liked');
  assert.equal(reaction('peter', 'kitten-figurine'), 'really-liked');
  assert.equal(reaction('tialla', 'home-recipe-book'), 'really-liked');
  assert.equal(reaction('cai', 'flexible-fishing-rod'), undefined);
  assert.equal(data.characters.find((c) => c.id === 'cai').preferenceCoverage, 'not-documented');
});
