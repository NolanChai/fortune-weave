import assert from 'node:assert/strict';

export function validateRecruitment(data, characterIds) {
  assert.equal(data.schemaVersion, 2, 'Unsupported recruitment schema');
  assert.equal(data.scope, 'part-one', 'Unsupported recruitment scope');
  assert.match(data.checkedAt, /^\d{4}-\d{2}-\d{2}$/, 'Missing recruitment research date');
  const sourceIds = new Set(data.sources.map(({ id }) => id));
  assert(sourceIds.size > 0 && sourceIds.size === data.sources.length, 'Missing or duplicate recruitment source');
  for (const source of data.sources) {
    assert.match(source.id, /^[a-z]+(?:-[a-z]+)*$/, 'Invalid recruitment source ID');
    assert(source.name?.trim(), `Missing recruitment source name: ${source.id}`);
    assert.equal(new URL(source.url).protocol, 'https:');
  }
  const routeIds = new Set(data.routes.map(({ id }) => id));
  assert.equal(routeIds.size, data.routes.length, 'Duplicate recruitment route');
  assert.deepEqual([...routeIds].sort(), ['cai', 'dietrich', 'leda', 'theodora'], 'Unexpected routes');
  for (const route of data.routes) assert(route.name?.trim(), `Missing route name: ${route.id}`);
  const seen = new Set();
  for (const character of data.characters) {
    const label = character.id;
    assert(characterIds.has(label) && !seen.has(label), `Unexpected recruitment character: ${label}`);
    seen.add(label);
    const routes = character.partOneRoutes;
    assert(routes === null || Array.isArray(routes), `Invalid route availability: ${label}`);
    assert(Array.isArray(character.requirements), `Missing route requirements: ${label}`);
    if (routes === null || routes.length === 0) {
      assert(character.note?.trim(), `Missing availability note: ${label}`);
      assert.equal(character.requirements.length, 0, `Unexpected Part I requirements: ${label}`);
      continue;
    }
    assert.equal(new Set(routes).size, routes.length, `Duplicate route: ${label}`);
    for (const id of routes) assert(routeIds.has(id), `Unknown route: ${label}/${id}`);
    assert.equal(character.requirements.length, routeIds.size, `Missing route requirement: ${label}`);
    const seenRoutes = new Set();
    for (const row of character.requirements) {
      const context = `${label}/${row.routeId}`;
      assert(routeIds.has(row.routeId) && !seenRoutes.has(row.routeId), `Unexpected requirement route: ${context}`);
      seenRoutes.add(row.routeId);
      assert(['automatic', 'recruit', 'unavailable'].includes(row.status), `Unknown recruitment status: ${context}`);
      assert.equal(row.status !== 'unavailable', routes.includes(row.routeId), `Availability mismatch: ${context}`);
      assert.equal(typeof row.conditions, 'string', `Missing conditions: ${context}`);
      assert(Array.isArray(row.sourceIds) && row.sourceIds.length > 0, `Missing requirement sources: ${context}`);
      for (const id of row.sourceIds) assert(sourceIds.has(id), `Unknown requirement source: ${context}/${id}`);
      if (row.status !== 'recruit') {
        assert(row.support === null && row.renown === null, `Unexpected numeric gate: ${context}`);
        continue;
      }
      for (const [field, max] of [['support', 3], ['renown', 10]]) {
        const value = row[field];
        assert(value === null || (Number.isInteger(value) && value >= 1 && value <= max), `Invalid ${field}: ${context}`);
        if (value === null) assert(row.note?.trim(), `Unexplained missing ${field}: ${context}`);
      }
    }
  }
  assert.deepEqual(seen, characterIds, 'Missing recruitment character');
}
