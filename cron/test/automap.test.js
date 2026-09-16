import assert from 'node:assert/strict';
import test from 'node:test';

import { automapTransition } from '../src/jobs/automap.js';

function connectionWithExistingLink() {
  const calls = [];
  return {
    calls,
    execute: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('FROM wormholes w') && sql.includes('LIMIT 1')) {
        return [[{ id: 55 }]];
      }
      return [[]];
    },
    beginTransaction: async () => { calls.push({ sql: 'BEGIN' }); },
    rollback: async () => { calls.push({ sql: 'ROLLBACK' }); },
    commit: async () => { calls.push({ sql: 'COMMIT' }); },
    release: () => { calls.push({ sql: 'RELEASE CONNECTION' }); },
  };
}

test('automapping rechecks for an existing connection while holding a database lock', async () => {
  const connection = connectionWithExistingLink();
  const mapped = await automapTransition({
    database: { getConnection: async () => connection },
    staticData: {
      system: () => ({ name: 'System', regionID: 11000001, security: -1, wormholeClass: 3 }),
      isGate: () => false,
      wormholeTypes: {},
    },
    row: { userID: 7, characterID: 9001, characterName: 'Airkio' },
    maskId: '42.2',
    fromSystemId: 30000143,
    toSystemId: 31000005,
    stationId: null,
    ship: { ship_type_id: 11188 },
    observedAt: new Date('2026-09-16T12:00:00Z'),
  });

  assert.equal(mapped, false);
  assert.ok(connection.calls.some(({ sql }) => sql.includes('GET_LOCK')));
  assert.ok(connection.calls.some(({ sql }) => sql === 'BEGIN'));
  assert.ok(connection.calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.ok(connection.calls.some(({ sql }) => sql.includes('RELEASE_LOCK')));
  assert.equal(
    connection.calls.some(({ sql }) => sql.includes('INSERT INTO wormholes')),
    false,
  );
});

test('automapping ignores stations and pods before acquiring a lock', async () => {
  const database = {
    getConnection: () => assert.fail('no database lock should be acquired'),
  };
  const base = {
    database,
    staticData: {},
    row: {},
    maskId: '42.2',
    fromSystemId: 30000143,
    toSystemId: 31000005,
    observedAt: new Date(),
  };

  assert.equal(await automapTransition({ ...base, stationId: 60000001 }), false);
  assert.equal(
    await automapTransition({ ...base, stationId: null, ship: { ship_type_id: 670 } }),
    false,
  );
});
