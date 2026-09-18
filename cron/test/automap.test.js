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
    logger: { info: () => {} },
  };

  assert.equal(await automapTransition({ ...base, stationId: 60000001 }), false);
  assert.equal(
    await automapTransition({ ...base, stationId: null, ship: { ship_type_id: 670 } }),
    false,
  );
});

test('automapping creates a real loop when both systems already appear in the chain', async () => {
  const calls = [];
  let nextSignatureId = 100;
  const connection = {
    execute: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('FROM wormholes w') && sql.includes('LIMIT 1')) return [[]];
      if (sql.includes('FROM wormholes w')) return [[]];
      if (sql.includes('INSERT INTO signatures')) return [{ insertId: nextSignatureId++ }];
      return [{ affectedRows: 1 }];
    },
    beginTransaction: async () => { calls.push({ sql: 'BEGIN' }); },
    rollback: async () => { calls.push({ sql: 'ROLLBACK' }); },
    commit: async () => { calls.push({ sql: 'COMMIT' }); },
    release: () => { calls.push({ sql: 'RELEASE CONNECTION' }); },
  };

  const mapped = await automapTransition({
    database: { getConnection: async () => connection },
    staticData: {
      system: (id) => ({ name: String(id), regionID: 11000001, security: -1, wormholeClass: 3 }),
      isGate: () => false,
      wormholeTypes: {},
    },
    row: { userID: 7, characterID: 9001, characterName: 'Airkio' },
    maskId: '42.2',
    fromSystemId: 31000005,
    toSystemId: 30000143,
    stationId: null,
    ship: { ship_type_id: 11188 },
    observedAt: new Date('2026-09-16T12:00:00Z'),
    logger: { info: () => {} },
  });

  assert.equal(mapped, true);
  assert.equal(
    calls.some(({ sql }) => sql.includes('COUNT(DISTINCT systemID)')),
    false,
  );
  assert.ok(calls.some(({ sql }) => sql.includes('INSERT INTO wormholes')));
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
});

test('automapping asks the user instead of guessing among multiple candidates', async () => {
  const calls = [];
  const messages = [];
  let nextSignatureId = 400;
  const connection = {
    execute: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('FROM wormholes w') && sql.includes('LIMIT 1')) return [[]];
      if (sql.includes('FROM wormholes w')) {
        return [[
          { wormholeID: 30, wormholeType: null, targetSignatureID: 300, targetSystemID: null },
          { wormholeID: 10, wormholeType: null, targetSignatureID: 100, targetSystemID: null },
          { wormholeID: 20, wormholeType: null, targetSignatureID: 200, targetSystemID: null },
        ]];
      }
      if (sql.includes('INSERT INTO signatures')) return [{ insertId: nextSignatureId++ }];
      if (sql.includes('INSERT INTO wormholes')) return [{ insertId: 500 }];
      return [{ affectedRows: 1 }];
    },
    beginTransaction: async () => { calls.push({ sql: 'BEGIN' }); },
    rollback: async () => { calls.push({ sql: 'ROLLBACK' }); },
    commit: async () => { calls.push({ sql: 'COMMIT' }); },
    release: () => { calls.push({ sql: 'RELEASE CONNECTION' }); },
  };

  const mapped = await automapTransition({
    database: { getConnection: async () => connection },
    staticData: {
      system: (id) => ({ name: String(id), regionID: 11000001, security: -1, wormholeClass: 3 }),
      isGate: () => false,
      wormholeTypes: {},
    },
    row: { userID: 7, characterID: 9001, characterName: 'Airkio' },
    maskId: '42.2',
    fromSystemId: 31000005,
    toSystemId: 31000006,
    stationId: null,
    ship: { ship_type_id: 11188 },
    observedAt: new Date('2026-09-16T12:00:00Z'),
    logger: { info: (message) => messages.push(message) },
  });

  assert.equal(mapped, true);
  assert.equal(calls.some(({ sql }) => sql.includes('UPDATE signatures')), false);
  assert.equal(calls.filter(({ sql }) => sql.includes('INSERT INTO signatures')).length, 2);
  assert.equal(calls.filter(({ sql }) => sql.includes('INSERT INTO wormholes')).length, 1);
  const pending = calls.find(({ sql }) => sql.includes('INSERT INTO automap_pending'));
  assert.equal(pending.values[7], 500);
  assert.deepEqual(JSON.parse(pending.values[8]), [
    { wormholeID: 30, targetSignatureID: 300 },
    { wormholeID: 10, targetSignatureID: 100 },
    { wormholeID: 20, targetSignatureID: 200 },
  ]);
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
  assert.equal(calls.some(({ sql }) => sql === 'ROLLBACK'), false);
  assert.match(messages[0], /^\[character-tracking\] multiple connection candidates /);
  assert.match(messages[0], /"action":"awaiting_user_selection"/);
});
