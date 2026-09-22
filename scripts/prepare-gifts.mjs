import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function prepareGifts(root, publicDirectory) {
  const data = JSON.parse(await readFile(resolve(root, 'data/gifts.json'), 'utf8'));
  assert.equal(data.schemaVersion, 1, 'Unsupported gifts schema');
  assert.match(data.checkedAt, /^\d{4}-\d{2}-\d{2}$/, 'Missing gift research date');
  const sourceIds = new Set(data.sources.map(({ id }) => id));
  assert.equal(sourceIds.size, data.sources.length, 'Duplicate gift source');
  for (const source of data.sources) assert.equal(new URL(source.url).protocol, 'https:');
  const ids = (records, label) => {
    const result = new Set();
    for (const record of records) {
      assert.match(record.id, /^[a-z]+(?:-[a-z]+)*$/, `Invalid ${label} ID`);
      assert(record.name?.trim(), `Missing ${label} name: ${record.id}`);
      assert(!result.has(record.id), `Duplicate ${label}: ${record.id}`);
      result.add(record.id);
    }
    return result;
  };
  const giftIds = ids(data.gifts, 'gift');
  const characterIds = ids(data.characters, 'gift character');
  const portraits = JSON.parse(await readFile(resolve(root, 'assets/characters/index.json'), 'utf8'));
  const giftPortraits = JSON.parse(await readFile(resolve(root, 'assets/gifts/index.json'), 'utf8'));
  assert.equal(giftPortraits.schemaVersion, 1, 'Unsupported gift portrait schema');
  const portraitIds = new Set(portraits.characters.map(({ id }) => id));
  for (const asset of giftPortraits.assets) {
    assert(characterIds.has(asset.id) && !portraitIds.has(asset.id), `Unexpected gift portrait: ${asset.id}`);
    assert.equal(asset.file, `characters/${asset.id}.png`, `Invalid gift portrait path: ${asset.id}`);
    const bytes = await readFile(resolve(root, 'assets/gifts', asset.file));
    assert.equal(bytes.length, asset.bytes, `Gift portrait size changed: ${asset.id}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `Gift portrait checksum changed: ${asset.id}`);
    portraitIds.add(asset.id);
  }
  for (const id of characterIds) assert(portraitIds.has(id), `Missing gift character portrait: ${id}`);
  for (const gift of data.gifts) {
    assert(gift.sourceIds.length > 0, `Missing source: ${gift.id}`);
    for (const id of gift.sourceIds) assert(sourceIds.has(id), `Unknown gift source: ${id}`);
  }
  const pairs = new Set();
  const documented = new Set();
  for (const preference of data.preferences) {
    assert(giftIds.has(preference.giftId), `Unknown gift: ${preference.giftId}`);
    assert(characterIds.has(preference.characterId), `Unknown gift character: ${preference.characterId}`);
    assert(sourceIds.has(preference.sourceId), `Unknown preference source: ${preference.sourceId}`);
    assert(['loved', 'really-liked'].includes(preference.preference), 'Unknown gift preference tier');
    const pair = `${preference.characterId}/${preference.giftId}`;
    assert(!pairs.has(pair), `Duplicate or conflicting preference: ${pair}`);
    pairs.add(pair);
    documented.add(preference.characterId);
  }
  for (const character of data.characters) {
    assert(sourceIds.has(character.sourceId), `Unknown character source: ${character.id}`);
    assert.equal(character.preferenceCoverage, documented.has(character.id) ? 'partial' : 'not-documented',
      `Incorrect preference coverage: ${character.id}`);
  }
  // Exports are derived from the canonical JSON so edits cannot leave the CSV stale.
  if (publicDirectory) {
    const csv = (rows) => rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
    const sources = new Map(data.sources.map((s) => [s.id, s.url]));
    const gifts = new Map(data.gifts.map((g) => [g.id, g.name]));
    const characters = new Map(data.characters.map((c) => [c.id, c.name]));
    await writeFile(resolve(publicDirectory, 'data/gifts.csv'), csv([
      ['gift_id', 'gift', 'aliases', 'source_urls', 'checked_at'],
      ...data.gifts.map((g) => [g.id, g.name, (g.aliases ?? []).join('; '), g.sourceIds.map((id) => sources.get(id)).join('; '), data.checkedAt]),
    ]));
    await writeFile(resolve(publicDirectory, 'data/gift-preferences.csv'), csv([
      ['character_id', 'character', 'gift_id', 'gift', 'preference', 'source_url', 'checked_at'],
      ...data.preferences.map((p) => [p.characterId, characters.get(p.characterId), p.giftId, gifts.get(p.giftId), p.preference, sources.get(p.sourceId), data.checkedAt]),
    ]));
  }
  return data;
}
