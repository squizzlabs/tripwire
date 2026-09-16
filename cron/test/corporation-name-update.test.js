import assert from 'node:assert/strict';
import test from 'node:test';

import { updateCorporationNames } from '../src/jobs/corporation-name-update.js';

test('updateCorporationNames saves renamed corporations', async () => {
  const updates = [];
  const database = {
    query: async () => [[{ corporationID: 100 }, { corporationID: 101 }]],
    execute: async (sql, values) => {
      updates.push({ sql, values });
      return [{ affectedRows: values[1] === 100 ? 2 : 0 }];
    },
  };
  const esi = {
    getNames: async (ids) => {
      assert.deepEqual(ids, [100, 101]);
      return [
        { id: 100, name: 'Renamed Corporation' },
        { id: 101, name: 'Unchanged Corporation' },
      ];
    },
  };

  const result = await updateCorporationNames({ database, esi });

  assert.deepEqual(result, { checked: 2, updated: 2 });
  assert.deepEqual(updates[0].values, [
    'Renamed Corporation',
    100,
    'Renamed Corporation',
  ]);
  assert.match(updates[0].sql, /corporationName <> \?/);
});

test('updateCorporationNames does not call ESI without corporations', async () => {
  const database = { query: async () => [[]] };
  const esi = { getNames: () => assert.fail('ESI should not be called') };

  assert.deepEqual(await updateCorporationNames({ database, esi }), {
    checked: 0,
    updated: 0,
  });
});

test('updateCorporationNames batches ESI requests at 1000 IDs', async () => {
  const corporationIds = Array.from({ length: 1001 }, (_, index) => index + 1);
  const batches = [];
  const database = {
    query: async () => [
      corporationIds.map((corporationID) => ({ corporationID })),
    ],
    execute: async () => [{ affectedRows: 0 }],
  };
  const esi = {
    getNames: async (ids) => {
      batches.push(ids);
      return [];
    },
  };

  const result = await updateCorporationNames({ database, esi });

  assert.deepEqual(result, { checked: 1001, updated: 0 });
  assert.deepEqual(batches.map((batch) => batch.length), [1000, 1]);
});
