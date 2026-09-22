import assert from 'node:assert/strict';
import test from 'node:test';
import { giftExports } from './prepare-gifts.mjs';

test('gift exports preserve names, quoted fields, source URLs, and preference tiers', () => {
  const data = {
    checkedAt: '2026-09-21',
    sources: [{ id: 'guide', url: 'https://example.com/gifts' }],
    gifts: [
      { id: 'recipe-book', name: 'Recipes, "Volume II"', aliases: ['Kitchen\nnotes'], sourceIds: ['guide'] },
      { id: 'tea', name: 'Thé', sourceIds: ['guide'] },
    ],
    characters: [{ id: 'peter', name: 'Peter' }],
    preferences: [{ characterId: 'peter', giftId: 'recipe-book', preference: 'really-liked', sourceId: 'guide' }],
  };
  const files = giftExports(data);
  assert.equal(files['gifts.csv'],
    '"gift_id","gift","aliases","source_urls","checked_at"\r\n'
    + '"recipe-book","Recipes, ""Volume II""","Kitchen\nnotes","https://example.com/gifts","2026-09-21"\r\n'
    + '"tea","Thé","","https://example.com/gifts","2026-09-21"\r\n');
  assert.equal(files['gift-preferences.csv'],
    '"character_id","character","gift_id","gift","preference","source_url","checked_at"\r\n'
    + '"peter","Peter","recipe-book","Recipes, ""Volume II""","really-liked","https://example.com/gifts","2026-09-21"\r\n');
});
