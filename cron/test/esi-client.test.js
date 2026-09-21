import assert from 'node:assert/strict';
import test from 'node:test';

import { EsiClient, EsiSsoError } from '../src/esi-client.js';

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
      'https://esi.example.test/characters/10/',
      'https://esi.example.test/corporations/100/',
      'https://esi.example.test/alliances/1000/',
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
    'https://esi.example.test/characters/9001/online/',
    'https://esi.example.test/characters/9001/location/',
    'https://esi.example.test/characters/9001/ship/',
  ]);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-token');
  assert.equal(calls[0].options.headers['X-Compatibility-Date'], '2026-09-15');
});

test('refresh errors include the OAuth code without exposing response details', async () => {
  const esi = new EsiClient(
    {
      baseUrl: 'https://esi.example.test',
      timeoutMs: 1000,
      userAgent: 'Tripwire test',
      clientId: 'client',
      clientSecret: 'secret',
    },
    async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'invalid_grant', error_description: 'sensitive detail' }),
    }),
  );

  await assert.rejects(esi.refreshAccessToken('refresh-secret'), (error) => {
    assert.ok(error instanceof EsiSsoError);
    assert.equal(error.status, 400);
    assert.equal(error.code, 'invalid_grant');
    assert.match(error.message, /EVE SSO 400 Bad Request while refreshing token \(invalid_grant\)/);
    assert.doesNotMatch(error.message, /sensitive|refresh-secret|secret/);
    return true;
  });
});

test('refresh errors preserve the status when SSO sends an invalid body', async () => {
  const esi = new EsiClient(
    {
      baseUrl: 'https://esi.example.test',
      timeoutMs: 1000,
      userAgent: 'Tripwire test',
      clientId: 'client',
      clientSecret: 'secret',
    },
    async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => { throw new SyntaxError('Invalid JSON'); },
    }),
  );

  await assert.rejects(esi.refreshAccessToken('refresh-secret'), (error) => {
    assert.ok(error instanceof EsiSsoError);
    assert.equal(error.status, 400);
    assert.equal(error.code, undefined);
    return true;
  });
});
