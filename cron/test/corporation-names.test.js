import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCorporationNames } from '../src/corporation-names.js';

function esiError(status) {
  return Object.assign(new Error(`ESI ${status}`), { status });
}

test('resolveCorporationNames isolates a deleted ID and keeps valid names', async () => {
  const bulkCalls = [];
  const singleCalls = [];
  const names = new Map([
    [100, 'One'],
    [101, 'Two'],
    [103, 'Four'],
  ]);
  const esi = {
    getNames: async (ids) => {
      bulkCalls.push(ids);
      if (ids.includes(102)) throw esiError(400);
      return ids.map((id) => ({ category: 'corporation', id, name: names.get(id) }));
    },
    getCorporation: async (id) => {
      singleCalls.push(id);
      throw esiError(404);
    },
  };

  const result = await resolveCorporationNames(esi, [100, 101, 102, 103]);

  assert.deepEqual(result.map(({ id }) => id), [100, 101, 103]);
  assert.deepEqual(bulkCalls, [
    [100, 101, 102, 103],
    [100, 101],
    [102, 103],
    [102],
    [103],
  ]);
  assert.deepEqual(singleCalls, [102]);
});

test('resolveCorporationNames uses the corporation endpoint for a valid singleton', async () => {
  const esi = {
    getNames: async () => {
      throw esiError(404);
    },
    getCorporation: async (id) => ({ name: `Corporation ${id}` }),
  };

  assert.deepEqual(await resolveCorporationNames(esi, [100]), [
    { category: 'corporation', id: 100, name: 'Corporation 100' },
  ]);
});

test('resolveCorporationNames does not split transient ESI failures', async () => {
  let bulkCalls = 0;
  const esi = {
    getNames: async () => {
      bulkCalls += 1;
      throw esiError(503);
    },
    getCorporation: () => assert.fail('Singleton fallback should not run'),
  };

  await assert.rejects(
    resolveCorporationNames(esi, [100, 101]),
    (error) => error.status === 503,
  );
  assert.equal(bulkCalls, 1);
});
