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
