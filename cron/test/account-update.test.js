import assert from 'node:assert/strict';
import test from 'node:test';

import { updateAccounts } from '../src/jobs/account-update.js';

test('updateAccounts preserves corporation-change and privilege-reset behavior', async () => {
  const updates = [];
  const database = {
    query: async () => [[{ characterID: 10 }, { characterID: 11 }]],
    execute: async (sql, values) => {
      updates.push({ sql, values });
      return [{ affectedRows: 1 }];
    },
  };
  const esi = {
    getAffiliations: async (ids) => {
      assert.deepEqual(ids, [10, 11]);
      return [
        { character_id: 10, corporation_id: 100 },
        { character_id: 11, corporation_id: 101 },
      ];
    },
    getNames: async (ids) => {
      assert.deepEqual(ids, [100, 101]);
      return [{ id: 100, name: 'Changed Corporation' }];
    },
  };

  const result = await updateAccounts({ database, esi });

  assert.deepEqual(result, { checked: 2, updated: 1 });
  assert.equal(updates.length, 1, 'characters missing an ESI name are skipped');
  assert.deepEqual(updates[0].values, [100, 'Changed Corporation', 10, 100]);
  assert.match(updates[0].sql, /ban = 0, admin = 0/);
  assert.match(updates[0].sql, /corporationID <> \?/);
});

test('updateAccounts does not call ESI when nobody is active', async () => {
  const database = { query: async () => [[]] };
  const esi = {
    getAffiliations: () => assert.fail('ESI should not be called'),
    getNames: () => assert.fail('ESI should not be called'),
  };

  assert.deepEqual(await updateAccounts({ database, esi }), {
    checked: 0,
    updated: 0,
  });
});

test('updateAccounts skips name lookups when corporations are unchanged', async () => {
  const database = {
    query: async () => [[{ characterID: 10, corporationID: 100 }]],
    execute: () => assert.fail('No account update should be written'),
  };
  const esi = {
    getAffiliations: async () => [
      { character_id: 10, corporation_id: 100 },
    ],
    getNames: () => assert.fail('Corporation names are refreshed daily'),
  };

  assert.deepEqual(await updateAccounts({ database, esi }), {
    checked: 1,
    updated: 0,
  });
});

test('updateAccounts resolves a shared corporation only once', async () => {
  const database = {
    query: async () => [[{ characterID: 10 }, { characterID: 11 }]],
    execute: async () => [{ affectedRows: 0 }],
  };
  const esi = {
    getAffiliations: async () => [
      { character_id: 10, corporation_id: 100 },
      { character_id: 11, corporation_id: 100 },
    ],
    getNames: async (ids) => {
      assert.deepEqual(ids, [100]);
      return [{ id: 100, name: 'Shared Corporation' }];
    },
  };

  assert.deepEqual(await updateAccounts({ database, esi }), {
    checked: 2,
    updated: 0,
  });
});

test('updateAccounts batches ESI bulk requests at 1000 IDs', async () => {
  const characterIds = Array.from({ length: 1001 }, (_, index) => index + 1);
  const affiliationBatches = [];
  const nameBatches = [];
  const database = {
    query: async () => [
      characterIds.map((characterID) => ({ characterID })),
    ],
    execute: async () => [{ affectedRows: 0 }],
  };
  const esi = {
    getAffiliations: async (ids) => {
      affiliationBatches.push(ids);
      return ids.map((characterId) => ({
        character_id: characterId,
        corporation_id: characterId + 10_000,
      }));
    },
    getNames: async (ids) => {
      nameBatches.push(ids);
      return ids.map((id) => ({ id, name: `Corporation ${id}` }));
    },
  };

  const result = await updateAccounts({ database, esi });

  assert.deepEqual(result, { checked: 1001, updated: 0 });
  assert.deepEqual(affiliationBatches.map((batch) => batch.length), [1000, 1]);
  assert.deepEqual(nameBatches.map((batch) => batch.length), [1000, 1]);
});
