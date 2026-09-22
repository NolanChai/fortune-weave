import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeQuantity, parseInventory, serializeInventory } from '../src/data/gift-inventory.ts';
import { applyRecipientSelection, compareRecipients, eligibleRecipients, parseRecipientFilters, parseRecipientSort, recipientRenownOrder, selectedRecipients } from '../src/data/gift-recipients.ts';

const data = JSON.parse(await readFile(new URL('../data/gifts.json', import.meta.url), 'utf8'));
const ids = new Set(data.gifts.map(({ id }) => id));
const recruitment = JSON.parse(await readFile(new URL('../data/recruitment.json', import.meta.url), 'utf8'));

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

test('route availability follows recruitment restrictions, including conditional and later recruits', () => {
  const cai = eligibleRecipients('cai', recruitment);
  const dietrich = eligibleRecipients('dietrich', recruitment);
  const theodora = eligibleRecipients('theodora', recruitment);
  const leda = eligibleRecipients('leda', recruitment);
  assert(cai.has('cai') && !cai.has('dietrich'));
  assert(!cai.has('fabio') && !theodora.has('fabio') && dietrich.has('fabio') && leda.has('fabio'));
  assert(cai.has('seteth') && !dietrich.has('seteth'));
  assert(theodora.has('bonaventure') && !leda.has('bonaventure'));
  assert(!cai.has('buccar') && leda.has('buccar'));
  assert(!cai.has('sha-lan') && !theodora.has('sha-lan') && leda.has('sha-lan'));
  assert(cai.has('peppe') && !leda.has('peppe') && !leda.has('ursula'));
  for (const route of [cai, dietrich, theodora, leda]) {
    assert(route.has('tialla') && route.has('peter') && route.has('ultand') && route.has('guzran'));
    assert(!route.has('hong-hua') && !route.has('troy'));
    assert(route.has('eshmel'), 'unverified availability must not silently exclude a character');
  }
  assert.equal(eligibleRecipients('', recruitment).size, data.characters.length);
});

test('recipient URL state rejects invalid values and remains independent of character comparison', () => {
  const params = new URLSearchParams('route=cai&exclude=peter,tialla,peter,missing&characters=guzran,ultand');
  const filters = parseRecipientFilters(params, recruitment);
  assert.equal(filters.route, 'cai');
  assert.deepEqual([...filters.excluded], ['peter', 'tialla']);
  assert.deepEqual(parseRecipientFilters(new URLSearchParams('route=missing&exclude=missing'), recruitment), {
    route: '', excluded: new Set(),
  });
});

test('manual exclusions survive route changes and applying a selection on another route', () => {
  const cai = eligibleRecipients('cai', recruitment);
  const excluded = new Set(['fabio', 'peter']);
  const selected = selectedRecipients(cai, excluded);
  assert(!selected.has('peter') && !selected.has('fabio') && selected.has('tialla'));
  const restoredCai = applyRecipientSelection(excluded, cai, cai);
  assert.deepEqual([...restoredCai], ['fabio']);
  const leda = selectedRecipients(eligibleRecipients('leda', recruitment), restoredCai);
  assert(!leda.has('fabio') && leda.has('peter'));
  const none = applyRecipientSelection(restoredCai, cai, new Set());
  assert.equal(selectedRecipients(cai, none).size, 0, 'clearing recipients must not revert to all');
});

test('Renown sorting uses the selected route without treating unknown gates as zero', () => {
  assert.equal(recipientRenownOrder('ultand', 'theodora', recruitment), 6);
  assert.equal(recipientRenownOrder('ultand', 'leda', recruitment), 8);
  assert.equal(recipientRenownOrder('ultand', 'cai', recruitment), 0, 'automatic joins sort before numeric gates');
  for (const [id, route] of [['ninae', 'leda'], ['halvin', 'cai'], ['eshmel', 'cai'], ['troy', 'cai'], ['cai', 'leda'], ['ultand', '']]) {
    assert.equal(recipientRenownOrder(id, route, recruitment), null);
  }
});

test('Renown sorts both ways, keeps unknowns last, and breaks ties by gift matches', () => {
  const ranked = [
    { id: 'unknown', renown: null, loved: 9, liked: 0 },
    { id: 'high', renown: 8, loved: 0, liked: 1 },
    { id: 'low-b', renown: 3, loved: 0, liked: 1 },
    { id: 'low-best', renown: 3, loved: 1, liked: 0 },
    { id: 'automatic', renown: 0, loved: 0, liked: 1 },
    { id: 'low-a', renown: 3, loved: 0, liked: 1 },
  ];
  const order = (sort) => ranked.toSorted((a, b) => compareRecipients(a, b, sort)).map(({ id }) => id);
  assert.deepEqual(order('renown-asc'), ['automatic', 'low-best', 'low-a', 'low-b', 'high', 'unknown']);
  assert.deepEqual(order('renown-desc'), ['high', 'low-best', 'low-a', 'low-b', 'automatic', 'unknown']);
  assert.deepEqual(order('matches'), ['unknown', 'low-best', 'automatic', 'high', 'low-a', 'low-b']);
});

test('sort URL values require a route and fall back to gift matches', () => {
  for (const sort of ['renown-asc', 'renown-desc']) {
    assert.equal(parseRecipientSort(sort, 'theodora'), sort);
    assert.equal(parseRecipientSort(sort, ''), 'matches');
  }
  for (const sort of [null, '', 'matches', 'invalid']) assert.equal(parseRecipientSort(sort, 'cai'), 'matches');
});
