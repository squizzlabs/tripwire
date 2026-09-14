import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATCH_SIZE,
  cutoffAt,
  pruneSystemActivity,
} from '../src/jobs/system-activity-prune.js';

test('cutoffAt keeps the PHP 192-hour UTC-aligned retention boundary', () => {
  assert.equal(cutoffAt(new Date('2026-09-14T17:42:59Z')), '2026-09-06 17:00:00');
});

test('prune refuses a cutoff that would empty the table', async () => {
  const database = { execute: async () => [[{ count: 0 }]] };

  await assert.rejects(
    pruneSystemActivity({ database, logger: console }),
    /would leave the table empty\. Refusing\./,
  );
});

test('dry run reports counts without deleting', async () => {
  const calls = [];
  const database = {
    execute: async (sql) => {
      calls.push(sql);
      return calls.length === 1 ? [[{ count: 900 }]] : [[{ count: 100 }]];
    },
  };
  const logger = { info() {} };

  const result = await pruneSystemActivity({
    database,
    dryRun: true,
    logger,
    now: () => new Date('2026-09-14T17:42:59Z'),
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(result, {
    cutoff: '2026-09-06 17:00:00',
    expired: 100,
    surviving: 900,
    deleted: 0,
    batches: 0,
  });
});

test('prune deletes oldest rows in bounded batches and yields between full batches', async () => {
  const calls = [];
  let pauses = 0;
  const results = [
    [[{ count: 900 }]],
    [[{ count: BATCH_SIZE + 10 }]],
    [{ affectedRows: BATCH_SIZE }],
    [{ affectedRows: 10 }],
  ];
  const database = {
    execute: async (sql) => {
      calls.push(sql);
      return results.shift();
    },
  };

  const result = await pruneSystemActivity({
    database,
    logger: { info() {} },
    pause: async (milliseconds) => {
      assert.equal(milliseconds, 100);
      pauses += 1;
    },
  });

  assert.equal(result.deleted, BATCH_SIZE + 10);
  assert.equal(result.batches, 2);
  assert.equal(pauses, 1);
  assert.match(calls[2], /ORDER BY time LIMIT 5000/);
});
