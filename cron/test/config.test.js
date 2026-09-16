import assert from 'node:assert/strict';
import test from 'node:test';

import { loadConfig } from '../src/config.js';

test('loadConfig builds Docker defaults and a useful ESI user agent', () => {
  const config = loadConfig({
    MYSQL_USER: 'tripwire',
    MYSQL_PASSWORD: 'secret',
    ADM_EMAIL: 'admin@example.com',
  });

  assert.equal(config.database.host, 'mysql');
  assert.equal(config.database.port, 3306);
  assert.equal(config.database.database, 'tripwire_database');
  assert.equal(config.esi.userAgent, 'Tripwire Server - admin@example.com');
  assert.equal(config.timezone, 'UTC');
});

test('loadConfig requires database credentials', () => {
  assert.throws(() => loadConfig({}), /MYSQL_USER is required/);
});

test('loadConfig decodes dotenv quoting passed literally by docker run', () => {
  const config = loadConfig({
    DB_HOST: "'database.internal'",
    DB_PORT: "'3307'",
    MYSQL_DATABASE: "'tripwire_live'",
    MYSQL_USER: "'tripwire-user'",
    MYSQL_PASSWORD: "'p$#ss\\\\word'",
    DB_CONNECTION_LIMIT: "'6'",
    ESI_TIMEOUT_MS: '"45000"',
    CRON_TIMEZONE: "'America/New_York'",
  });

  assert.deepEqual(config.database, {
    host: 'database.internal',
    port: 3307,
    user: 'tripwire-user',
    password: 'p$#ss\\word',
    database: 'tripwire_live',
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: 6,
  });
  assert.equal(config.esi.timeoutMs, 45_000);
  assert.equal(config.timezone, 'America/New_York');
});

test('loadConfig accepts the all-in-one EVE SSO environment names', () => {
  const config = loadConfig({
    MYSQL_USER: 'tripwire',
    MYSQL_PASSWORD: 'secret',
    EVE_SSO_CLIENT: 'client-id',
    EVE_SSO_SECRET: 'client-secret',
  });

  assert.equal(config.esi.clientId, 'client-id');
  assert.equal(config.esi.clientSecret, 'client-secret');
});
