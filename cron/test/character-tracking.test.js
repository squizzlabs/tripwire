import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTOMAP_MAX_GAP_MS,
  LOCATION_INTERVAL_MS,
  ONLINE_INTERVAL_MS,
  trackCharacters,
} from '../src/jobs/character-tracking.js';

function row(overrides = {}) {
  return {
    userID: 7,
    characterID: 9001,
    characterName: 'Airkio',
    corporationID: 42,
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenExpire: '2099-01-01 00:00:00',
    online: 1,
    onlineCheckedAt: '2026-09-16T11:59:30.000Z',
    locationCheckedAt: '2026-09-16T11:59:53.000Z',
    locationObservedAt: '2026-09-16T11:59:51.000Z',
    lastLocationSystemID: 30000142,
    options: JSON.stringify({
      masks: { active: '42.2' },
      tracking: { active: '9001', characterOptions: {} },
      buttons: { signaturesWidget: { autoMapper: true } },
    }),
    ...overrides,
  };
}

function databaseFor(rows) {
  const calls = [];
  return {
    calls,
    query: async (sql) => {
      calls.push({ sql, values: [] });
      return [rows];
    },
    execute: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('SET onlineCheckedAt') || sql.includes('SET locationCheckedAt')) {
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
}

const staticData = {
  system: () => ({ name: 'J123456', security: -1, regionID: 11000001, wormholeClass: 3 }),
  shipTypeName: () => 'Buzzard',
};

test('tracking intervals and transition gap constants match the ESI policy', () => {
  assert.equal(ONLINE_INTERVAL_MS, 60_000);
  assert.equal(LOCATION_INTERVAL_MS, 6_000);
  assert.equal(AUTOMAP_MAX_GAP_MS, 10_000);
});

test('online characters are location-polled and a fresh transition is automapped', async () => {
  const database = databaseFor([row()]);
  const automaps = [];
  const esi = {
    getOnline: () => assert.fail('online cache is not due'),
    getLocation: async () => ({ solar_system_id: 31000005 }),
    getShip: async () => ({ ship_item_id: 1, ship_name: 'Probe', ship_type_id: 11188 }),
  };

  const result = await trackCharacters({
    database,
    esi,
    staticData,
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    automap: async (transition) => {
      automaps.push(transition);
      return true;
    },
    logger: { error: assert.fail },
  });

  assert.equal(result.locationChecks, 1);
  assert.equal(result.transitions, 1);
  assert.equal(result.automapped, 1);
  assert.equal(result.errors, 0);
  assert.equal(automaps[0].fromSystemId, 30000142);
  assert.equal(automaps[0].toSystemId, 31000005);
});

test('a transition is not connected when its two observations are over ten seconds apart', async () => {
  const database = databaseFor([
    row({ locationObservedAt: '2026-09-16T11:59:49.999Z' }),
  ]);
  let automapped = false;

  const result = await trackCharacters({
    database,
    staticData,
    esi: {
      getLocation: async () => ({ solar_system_id: 31000005 }),
      getShip: async () => ({}),
    },
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    automap: async () => { automapped = true; },
    logger: { error: assert.fail },
  });

  assert.equal(result.transitions, 1);
  assert.equal(automapped, false);
});

test('an offline result suppresses location and ship polling', async () => {
  const database = databaseFor([
    row({ onlineCheckedAt: '2026-09-16T11:58:00.000Z', online: 1 }),
  ]);
  let locationCalls = 0;

  const result = await trackCharacters({
    database,
    staticData,
    esi: {
      getOnline: async () => ({ online: false }),
      getLocation: async () => { locationCalls += 1; },
      getShip: async () => { locationCalls += 1; },
    },
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    logger: { error: assert.fail },
  });

  assert.equal(result.onlineChecks, 1);
  assert.equal(result.locationChecks, 0);
  assert.equal(locationCalls, 0);
  assert.equal(result.errors, 0);
});

test('per-character failures are visible in the job summary', async () => {
  const database = databaseFor([
    row({ onlineCheckedAt: '2026-09-16T11:58:00.000Z' }),
  ]);
  const logged = [];

  const result = await trackCharacters({
    database,
    staticData,
    esi: {
      getOnline: async () => { throw new Error('ESI unavailable'); },
    },
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    logger: { error: (...values) => logged.push(values) },
  });

  assert.equal(result.errors, 1);
  assert.equal(logged.length, 1);
});
