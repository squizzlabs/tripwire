import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCharacterAffiliations } from '../src/character-affiliations.js';

function esiError(status) {
  return Object.assign(new Error(`ESI ${status}`), { status });
}

test('resolveCharacterAffiliations isolates a deleted character', async () => {
  const bulkCalls = [];
  const singleCalls = [];
  const esi = {
    getAffiliations: async (ids) => {
      bulkCalls.push(ids);
      if (ids.includes(12)) throw esiError(400);
      return ids.map((characterId) => ({
        character_id: characterId,
        corporation_id: characterId + 100,
      }));
    },
    getCharacter: async (id) => {
      singleCalls.push(id);
      throw esiError(404);
    },
  };

  const result = await resolveCharacterAffiliations(esi, [10, 11, 12, 13]);

  assert.deepEqual(result.map(({ character_id }) => character_id), [10, 11, 13]);
  assert.deepEqual(bulkCalls, [
    [10, 11, 12, 13],
    [10, 11],
    [12, 13],
    [12],
    [13],
  ]);
  assert.deepEqual(singleCalls, [12]);
});

test('resolveCharacterAffiliations uses the character endpoint for a valid singleton', async () => {
  const esi = {
    getAffiliations: async () => {
      throw esiError(400);
    },
    getCharacter: async () => ({ corporation_id: 200 }),
  };

  assert.deepEqual(await resolveCharacterAffiliations(esi, [10]), [
    { character_id: 10, corporation_id: 200 },
  ]);
});

test('resolveCharacterAffiliations does not split transient failures', async () => {
  let bulkCalls = 0;
  const esi = {
    getAffiliations: async () => {
      bulkCalls += 1;
      throw esiError(503);
    },
    getCharacter: () => assert.fail('Singleton fallback should not run'),
  };

  await assert.rejects(
    resolveCharacterAffiliations(esi, [10, 11]),
    (error) => error.status === 503,
  );
  assert.equal(bulkCalls, 1);
});
