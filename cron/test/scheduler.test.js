import assert from 'node:assert/strict';
import test from 'node:test';

import { createScheduler } from '../src/scheduler.js';

test('createScheduler applies UTC scheduling and silent overlap protection', async () => {
  const scheduled = [];
  const cron = {
    validate: () => true,
    schedule: (expression, callback, options) => {
      const task = {
        stopCalled: false,
        destroyCalled: false,
        stop() {
          this.stopCalled = true;
        },
        destroy() {
          this.destroyCalled = true;
        },
      };
      scheduled.push({ expression, callback, options, task });
      return task;
    },
  };
  const messages = [];
  const logger = { info: (...values) => messages.push(values), error() {} };
  const jobs = [
    { name: 'example', schedule: '*/3 * * * *', run: async () => ({ ok: true }) },
  ];

  const scheduler = createScheduler({
    cron,
    jobs,
    context: {},
    timezone: 'UTC',
    logger,
  });

  assert.equal(scheduled[0].expression, '*/3 * * * *');
  assert.deepEqual(scheduled[0].options, {
    name: 'example',
    timezone: 'UTC',
  });
  await scheduled[0].callback();
  await scheduler.stop();
  assert.equal(scheduled[0].task.stopCalled, true);
  assert.equal(scheduled[0].task.destroyCalled, true);
  assert.match(messages.at(-1)[0], /\{"ok":true\}$/);
  assert.equal(messages.at(-1).length, 1);
});

test('createScheduler silently skips a tick while the same job is running', async () => {
  const scheduled = [];
  const cron = {
    validate: () => true,
    schedule: (expression, callback) => {
      scheduled.push({ expression, callback });
      return { stop() {}, async destroy() {} };
    },
  };
  let finish;
  let runs = 0;
  const pending = new Promise((resolve) => { finish = resolve; });
  const jobs = [{
    name: 'slow-job',
    schedule: '* * * * * *',
    run: async () => {
      runs += 1;
      await pending;
      return { ok: true };
    },
  }];
  const scheduler = createScheduler({
    cron,
    jobs,
    context: {},
    timezone: 'UTC',
    logger: { info() {}, error() {} },
  });

  const first = scheduled[0].callback();
  const skipped = scheduled[0].callback();
  assert.equal(skipped, undefined);
  assert.equal(runs, 1);

  finish();
  await first;
  await scheduler.stop();
});

test('createScheduler can suppress start and idle-result messages', async () => {
  const callbacks = [];
  const cron = {
    validate: () => true,
    schedule: (expression, callback) => {
      callbacks.push(callback);
      return { stop() {}, async destroy() {} };
    },
  };
  const messages = [];
  let active = false;
  const scheduler = createScheduler({
    cron,
    jobs: [{
      name: 'quiet-job',
      schedule: '* * * * * *',
      logStart: false,
      shouldLogResult: (result) => result.actions > 0,
      run: async () => ({ actions: active ? 1 : 0 }),
    }],
    context: {},
    timezone: 'UTC',
    logger: { info: (...values) => messages.push(values), error() {} },
  });

  await callbacks[0]();
  assert.equal(messages.length, 1, 'only the scheduled message is logged while idle');

  active = true;
  await callbacks[0]();
  assert.equal(messages.length, 2);
  assert.match(messages[1][0], /completed.*\{"actions":1\}$/);

  await scheduler.stop();
});

test('scheduled jobs avoid redundant start and no-op messages', async () => {
  const { jobs } = await import('../src/jobs.js');
  const accountUpdate = jobs.find((job) => job.name === 'account-update');
  const characterTracking = jobs.find((job) => job.name === 'character-tracking');
  const corporationNames = jobs.find(
    (job) => job.name === 'corporation-name-update',
  );
  const systemActivity = jobs.find((job) => job.name === 'system-activity');
  const activityPrune = jobs.find(
    (job) => job.name === 'system-activity-prune',
  );

  assert.equal(characterTracking.logStart, false);
  assert.equal(characterTracking.shouldLogResult({}), false);

  assert.equal(systemActivity.logStart, false);
  assert.equal(systemActivity.shouldLogResult, undefined);

  assert.equal(accountUpdate.logStart, false);
  assert.equal(accountUpdate.shouldLogResult({ checked: 3, updated: 0 }), false);
  assert.equal(accountUpdate.shouldLogResult({ checked: 3, updated: 1 }), true);

  assert.equal(corporationNames.logStart, false);
  assert.equal(corporationNames.shouldLogResult({ checked: 3, updated: 0 }), false);
  assert.equal(corporationNames.shouldLogResult({ checked: 3, updated: 1 }), true);

  assert.equal(activityPrune.logStart, false);
  assert.equal(activityPrune.shouldLogResult({ deleted: 10 }), false);
});
