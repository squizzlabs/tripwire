import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectSystemActivity,
  mergeActivity,
  utcHour,
} from '../src/jobs/system-activity.js';

test('mergeActivity preserves jumps and fills missing kill values with zero', () => {
  const activity = mergeActivity(
    [
      { system_id: 30, ship_jumps: 7 },
      { system_id: 31, ship_jumps: 3 },
    ],
    [
      { system_id: 30, ship_kills: 2, pod_kills: 1, npc_kills: 9 },
      { system_id: 32, ship_kills: 4, pod_kills: 5, npc_kills: 6 },
    ],
  );

  assert.deepEqual(Object.fromEntries(activity), {
    30: { ship_jumps: 7, ship_kills: 2, pod_kills: 1, npc_kills: 9 },
    31: { ship_jumps: 3, ship_kills: 0, pod_kills: 0, npc_kills: 0 },
    32: { ship_jumps: 0, ship_kills: 4, pod_kills: 5, npc_kills: 6 },
  });
});

test('utcHour matches the PHP UTC hour bucket', () => {
  assert.equal(utcHour(new Date('2026-09-14T17:42:59.999Z')), '2026-09-14 17:00:00');
});

test('collectSystemActivity writes one row per merged system', async () => {
  const calls = [];
  const database = {
    execute: async (sql, values) => {
      calls.push({ sql, values });
      return [{ affectedRows: 1 }];
    },
  };
  const esi = {
    getJumps: async () => [{ system_id: 30, ship_jumps: 7 }],
    getKills: async () => [
      { system_id: 30, ship_kills: 2, pod_kills: 1, npc_kills: 9 },
    ],
  };

  const result = await collectSystemActivity({
    database,
    esi,
    now: () => new Date('2026-09-14T17:42:59Z'),
  });

  assert.deepEqual(result, { inserted: 1, time: '2026-09-14 17:00:00' });
  assert.deepEqual(calls[0].values, [30, '2026-09-14 17:00:00', 7, 2, 1, 9]);
  assert.match(calls[0].sql, /INSERT INTO system_activity/);
});
