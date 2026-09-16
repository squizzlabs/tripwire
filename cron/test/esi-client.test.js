import assert from 'node:assert/strict';
import test from 'node:test';

import { EsiClient } from '../src/esi-client.js';

test('EsiClient uses the expected ESI routes and request bodies', async () => {
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
  await esi.getCharacter(10);
  await esi.getCorporation(100);
  await esi.getAlliance(1000);

  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      'https://esi.example.test/v1/universe/system_jumps/',
      'https://esi.example.test/v2/universe/system_kills/',
      'https://esi.example.test/v2/characters/affiliation/',
      'https://esi.example.test/v3/universe/names',
      'https://esi.example.test/latest/characters/10/',
      'https://esi.example.test/latest/corporations/100/',
      'https://esi.example.test/latest/alliances/1000/',
    ],
  );
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[2].options.method, 'POST');
  assert.equal(calls[2].options.body, '[10,11]');
  assert.equal(calls[2].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[2].options.headers['User-Agent'], 'Tripwire test');
  assert.equal(calls[4].options.method, 'GET');
});

test('EsiClient rejects non-success responses with the response status', async () => {
  const esi = new EsiClient(
    { baseUrl: 'https://esi.example.test', timeoutMs: 1000, userAgent: 'test' },
    async () => ({ ok: false, status: 503, statusText: 'Unavailable' }),
  );

  await assert.rejects(esi.getJumps(), (error) => {
    assert.match(error.message, /ESI 503 Unavailable/);
    assert.equal(error.status, 503);
    return true;
  });
});

test('EsiClient authenticates character tracking requests with bearer tokens', async () => {
  const calls = [];
  const esi = new EsiClient(
    {
      baseUrl: 'https://esi.example.test',
      timeoutMs: 1000,
      userAgent: 'Tripwire test',
      compatibilityDate: '2026-09-15',
    },
    async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ online: true }) };
    },
  );

  await esi.getOnline(9001, 'secret-token');
  await esi.getLocation(9001, 'secret-token');
  await esi.getShip(9001, 'secret-token');

  assert.deepEqual(calls.map(({ url }) => url), [
    'https://esi.example.test/latest/characters/9001/online/',
    'https://esi.example.test/latest/characters/9001/location/',
    'https://esi.example.test/latest/characters/9001/ship/',
  ]);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-token');
  assert.equal(calls[0].options.headers['X-Compatibility-Date'], '2026-09-15');
});
