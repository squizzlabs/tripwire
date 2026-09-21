import assert from 'node:assert/strict';
import test from 'node:test';

import { removeInvalidCharacter } from '../src/jobs/remove-invalid-character.js';

function databaseFor({ storedToken = 'old-token', remaining = [] } = {}) {
  const calls = [];
  const connection = {
    beginTransaction: async () => { calls.push('begin'); },
    commit: async () => { calls.push('commit'); },
    rollback: async () => { calls.push('rollback'); },
    release: () => { calls.push('release'); },
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('SELECT refreshToken')) return [[{ refreshToken: storedToken }]];
      if (sql.includes('information_schema.COLUMNS')) return [[
        { tableName: 'characters', hasUserID: 1 },
        { tableName: 'tracking', hasUserID: 1 },
        { tableName: 'jumps', hasUserID: 0 },
        { tableName: 'esi', hasUserID: 1 },
      ]];
      if (sql.includes('SELECT characterID FROM characters')) return [remaining];
      throw new Error(`Unexpected query: ${sql}`);
    },
    execute: async (sql, values) => {
      calls.push({ sql, values });
      return [{ affectedRows: 1 }];
    },
  };
  return { calls, getConnection: async () => connection };
}

test('invalid character cleanup removes character rows and revokes the last login', async () => {
  const database = databaseFor();
  const removed = await removeInvalidCharacter(database, {
    userID: 7, characterID: 9001, refreshToken: 'old-token',
  });

  assert.equal(removed, true);
  const deletions = database.calls.filter((call) => call.sql?.startsWith('DELETE'));
  assert.deepEqual(deletions.map((call) => call.sql.match(/DELETE FROM (\S+)/)[1]), [
    '`tracking`', '`jumps`', '`esi`', '`characters`', 'tokens', 'active',
  ]);
  assert.deepEqual(deletions[0].values, [9001, 7]);
  assert.deepEqual(deletions[1].values, [9001]);
  assert.ok(database.calls.includes('commit'));
});

test('invalid character cleanup keeps login tokens when another identity remains', async () => {
  const database = databaseFor({ remaining: [{ characterID: 9002 }] });
  await removeInvalidCharacter(database, {
    userID: 7, characterID: 9001, refreshToken: 'old-token',
  });

  assert.equal(database.calls.some((call) => call.sql?.includes('DELETE FROM tokens')), false);
  assert.equal(database.calls.some((call) => call.sql?.includes('DELETE FROM active')), false);
});

test('invalid character cleanup leaves a newly authorized character intact', async () => {
  const database = databaseFor({ storedToken: 'new-token' });
  const removed = await removeInvalidCharacter(database, {
    userID: 7, characterID: 9001, refreshToken: 'old-token',
  });

  assert.equal(removed, false);
  assert.equal(database.calls.some((call) => call.sql?.startsWith('DELETE')), false);
  assert.ok(database.calls.includes('rollback'));
  assert.ok(database.calls.includes('release'));
});
