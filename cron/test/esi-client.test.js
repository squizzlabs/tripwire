import assert from 'node:assert/strict';
import test from 'node:test';

import { EsiClient } from '../src/esi-client.js';

test('EsiClient uses the same ESI routes and request bodies as the PHP jobs', async () => {
  const calls = [];
  const fetchImplementation = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => [] };
  };
  const esi = new EsiClient(
    {
      baseUrl: 'https://esi.example.test/',
      timeoutMs: 1000,
      userAgent: 'Tripwire test',
    },
    fetchImplementation,
  );

  await esi.getJumps();
  await esi.getKills();
  await esi.getAffiliations([10, 11]);
  await esi.getNames([100, 101]);

  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      'https://esi.example.test/v1/universe/system_jumps/',
      'https://esi.example.test/v2/universe/system_kills/',
      'https://esi.example.test/v2/characters/affiliation/',
      'https://esi.example.test/v3/universe/names',
    ],
  );
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[2].options.method, 'POST');
  assert.equal(calls[2].options.body, '[10,11]');
  assert.equal(calls[2].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[2].options.headers['User-Agent'], 'Tripwire test');
});

test('EsiClient rejects non-success responses', async () => {
  const esi = new EsiClient(
    { baseUrl: 'https://esi.example.test', timeoutMs: 1000, userAgent: 'test' },
    async () => ({ ok: false, status: 503, statusText: 'Unavailable' }),
  );

  await assert.rejects(esi.getJumps(), /ESI 503 Unavailable/);
});
