import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTOMAP_MAX_GAP_MS,
  CHARACTER_CONCURRENCY,
  LOCATION_INTERVAL_MS,
  ONLINE_INTERVAL_MS,
  trackCharacters,
} from '../src/jobs/character-tracking.js';
import { jobs } from '../src/jobs.js';
import { EsiSsoError } from '../src/esi-client.js';

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
  assert.equal(AUTOMAP_MAX_GAP_MS, 20_000);
  assert.equal(CHARACTER_CONCURRENCY, 4);
});

test('multiple characters are location-polled concurrently', async () => {
  const database = databaseFor([
    row({ characterID: 9001 }),
    row({ characterID: 9002 }),
  ]);
  const pendingLocations = [];
  const esi = {
    getLocation: () => new Promise((resolve) => pendingLocations.push(resolve)),
    getShip: async () => ({}),
  };

  const tracking = trackCharacters({
    database,
    esi,
    staticData,
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    logger: { info() {}, error: assert.fail },
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pendingLocations.length, 2);
  for (const resolve of pendingLocations) {
    resolve({ solar_system_id: 30000142 });
  }

  const result = await tracking;
  assert.equal(result.locationChecks, 2);
  assert.equal(result.errors, 0);
});

test('online characters are location-polled and a fresh transition is automapped', async () => {
  const database = databaseFor([row()]);
  const automaps = [];
  const messages = [];
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
    logger: { info: (message) => messages.push(message), error: assert.fail },
  });

  assert.equal(result.locationChecks, 1);
  assert.equal(result.transitions, 1);
  assert.equal(result.automapped, 1);
  assert.equal(result.errors, 0);
  assert.equal(automaps[0].fromSystemId, 30000142);
  assert.equal(automaps[0].toSystemId, 31000005);
  assert.match(messages[0], /^\[character-tracking\] system changed /);
  assert.match(messages[0], /"fromSystemID":30000142/);
  assert.match(messages[1], /^\[character-tracking\] connection mapped /);
});

test('an unselected linked character is automapped when automapping is enabled', async () => {
  const database = databaseFor([row({
    options: JSON.stringify({
      masks: { active: '42.2' },
      tracking: { active: 'another-character', characterOptions: {} },
      buttons: { signaturesWidget: { autoMapper: true } },
    }),
  })]);
  let automapped = false;

  const result = await trackCharacters({
    database,
    esi: {
      getLocation: async () => ({ solar_system_id: 31000005 }),
      getShip: async () => ({ ship_item_id: 1, ship_name: 'Probe', ship_type_id: 11188 }),
    },
    staticData,
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    automap: async () => {
      automapped = true;
      return true;
    },
    logger: { info: () => {}, error: assert.fail },
  });

  assert.equal(automapped, true);
  assert.equal(result.automapped, 1);
});

test('ship changes are logged with the previous and current ship', async () => {
  const database = databaseFor([row({
    lastLocationSystemID: 31000005,
    trackedCharacterID: 9001,
    trackedShipID: '99',
    trackedShipName: 'Old Ship',
    trackedShipTypeID: 11176,
    trackedShipTypeName: 'Crow',
  })]);
  const messages = [];

  await trackCharacters({
    database,
    staticData,
    esi: {
      getLocation: async () => ({ solar_system_id: 31000005 }),
      getShip: async () => ({ ship_item_id: 100, ship_name: 'New Ship', ship_type_id: 11188 }),
    },
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    logger: { info: (message) => messages.push(message), error: assert.fail },
  });

  assert.equal(messages.length, 1);
  assert.match(messages[0], /^\[character-tracking\] ship changed /);
  assert.match(messages[0], /"fromShipName":"Old Ship"/);
  assert.match(messages[0], /"toShipName":"New Ship"/);
});

test('online state changes are logged, but routine job summaries are suppressed', async () => {
  const database = databaseFor([
    row({ onlineCheckedAt: '2026-09-16T11:58:00.000Z', online: 0 }),
  ]);
  const messages = [];

  await trackCharacters({
    database,
    staticData,
    esi: {
      getOnline: async () => ({ online: true }),
      getLocation: async () => ({ solar_system_id: 30000142 }),
      getShip: async () => ({}),
    },
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    logger: { info: (message) => messages.push(message), error: assert.fail },
  });

  assert.match(messages[0], /^\[character-tracking\] character online /);
  const trackingJob = jobs.find((job) => job.name === 'character-tracking');
  assert.equal(trackingJob.shouldLogResult({ errors: 1, transitions: 1 }), false);
});

test('a transition is not connected when its two observations are over twenty seconds apart', async () => {
  const database = databaseFor([
    row({ locationObservedAt: '2026-09-16T11:59:39.999Z' }),
  ]);
  let automapped = false;
  const messages = [];

  const result = await trackCharacters({
    database,
    staticData,
    esi: {
      getLocation: async () => ({ solar_system_id: 31000005 }),
      getShip: async () => ({}),
    },
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    automap: async () => { automapped = true; },
    logger: { info: (message) => messages.push(message), error: assert.fail },
  });

  assert.equal(result.transitions, 1);
  assert.equal(automapped, false);
  assert.match(messages[1], /^\[character-tracking\] connection not mapped /);
  assert.match(messages[1], /"reason":"stale_observation"/);
});

test('browser-active characters are location-polled even when reported offline', async () => {
  const database = databaseFor([
    row({ onlineCheckedAt: '2026-09-16T11:58:00.000Z', online: 1 }),
  ]);
  let locationCalls = 0;

  const result = await trackCharacters({
    database,
    staticData,
    esi: {
      getOnline: async () => ({ online: false }),
      getLocation: async () => {
        locationCalls += 1;
        return { solar_system_id: 30000142 };
      },
      getShip: async () => {
        locationCalls += 1;
        return {};
      },
    },
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    logger: { error: assert.fail },
  });

  assert.equal(result.onlineChecks, 1);
  assert.equal(result.locationChecks, 1);
  assert.equal(locationCalls, 2);
  assert.equal(result.errors, 0);
  assert.equal(
    database.calls.some(({ sql }) => sql.includes('OR e.online = 0')),
    false,
  );
  assert.equal(
    database.calls.some(({ sql }) => sql.includes('INSERT INTO tracking')),
    true,
  );
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

test('invalid grants remove the affected character and stop repeated refreshes', async () => {
  const database = databaseFor([row({
    tokenExpire: '2026-09-16T11:00:00.000Z',
    onlineCheckedAt: '2026-09-16T11:58:00.000Z',
  })]);
  const statements = [];
  database.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql) => {
      if (sql.includes('SELECT refreshToken')) return [[{ refreshToken: 'refresh' }]];
      if (sql.includes('information_schema.COLUMNS')) return [[
        { tableName: 'esi', hasUserID: 1 },
        { tableName: 'characters', hasUserID: 1 },
      ]];
      if (sql.includes('SELECT characterID FROM characters')) return [[]];
      throw new Error(`Unexpected query ${sql}`);
    },
    execute: async (sql) => { statements.push(sql); return [{ affectedRows: 1 }]; },
  });
  const messages = [];
  const result = await trackCharacters({
    database,
    staticData,
    esi: {
      refreshAccessToken: async () => {
        throw new EsiSsoError({ status: 400, statusText: 'Bad Request' }, 'invalid_grant');
      },
    },
    now: () => new Date('2026-09-16T12:00:00.000Z'),
    logger: { info: (message) => messages.push(message), error: assert.fail },
  });

  assert.equal(result.errors, 1);
  assert.equal(statements.some((sql) => sql.includes('DELETE FROM `esi`')), true);
  assert.match(messages[0], /removed invalid character/);
});
