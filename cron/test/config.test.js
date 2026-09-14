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
