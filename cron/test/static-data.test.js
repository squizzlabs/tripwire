import assert from 'node:assert/strict';
import test from 'node:test';

import { loadStaticData } from '../src/static-data.js';

test('cron loads the same systems, gates, wormholes, and ship names as the browser', () => {
  const data = loadStaticData();

  assert.equal(data.system(30000142).name, 'Jita');
  assert.equal(data.isGate(30000142, 30000144), true);
  assert.equal(typeof data.wormholeTypes.B274, 'object');
  assert.equal(typeof data.shipTypeName(11188), 'string');
});
