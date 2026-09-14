import assert from 'node:assert/strict';
import test from 'node:test';

import { createScheduler } from '../src/scheduler.js';

test('createScheduler applies UTC scheduling and overlap protection', async () => {
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
  const logger = { info() {}, error() {} };
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
    noOverlap: true,
  });
  await scheduled[0].callback();
  await scheduler.stop();
  assert.equal(scheduled[0].task.stopCalled, true);
  assert.equal(scheduled[0].task.destroyCalled, true);
});
