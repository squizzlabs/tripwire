import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

test('legacy database configuration is migrated safely into .env', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'tripwire-db-migration-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'scripts'));
  await cp(
    join(projectRoot, 'scripts/migrate-db-config.php'),
    join(directory, 'scripts/migrate-db-config.php'),
  );
  await writeFile(
    join(directory, 'db.inc.php'),
    `<?php
new PDO(
    'mysql:host=database.internal;port=3307;dbname=tripwire_live;charset=utf8',
    'tripwire-user',
    'p$#ss\\\\word'
);
`,
  );
  await writeFile(join(directory, '.env'), 'ADM_EMAIL=admin@example.com\nMYSQL_USER=old\n');

  const result = spawnSync('php', ['scripts/migrate-db-config.php'], {
    cwd: directory,
    stdio: 'ignore',
  });
  const environment = await readFile(join(directory, '.env'), 'utf8');

  assert.equal(result.status, 0);
  assert.match(environment, /^ADM_EMAIL=admin@example\.com$/m);
  assert.match(environment, /^DB_HOST='database\.internal'$/m);
  assert.match(environment, /^DB_PORT='3307'$/m);
  assert.match(environment, /^MYSQL_DATABASE='tripwire_live'$/m);
  assert.match(environment, /^MYSQL_USER='tripwire-user'$/m);
  assert.match(environment, /^MYSQL_PASSWORD='p\$#ss\\\\word'$/m);
  assert.equal(
    await readFile(join(directory, 'db.inc.php.pre-env-backup'), 'utf8').then(
      () => true,
      () => false,
    ),
    true,
  );
});

test('database bootstrap refuses to load while legacy config remains', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'tripwire-db-guard-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(projectRoot, 'database.inc.php'), join(directory, 'database.inc.php'));
  await cp(join(projectRoot, 'environment.inc.php'), join(directory, 'environment.inc.php'));
  await writeFile(join(directory, 'db.inc.php'), '<?php // legacy');

  const result = spawnSync('php', ['database.inc.php'], {
    cwd: directory,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /php scripts\/migrate-db-config\.php/);
});

test('bare-metal PHP loads database values directly from .env', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'tripwire-dotenv-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(projectRoot, 'environment.inc.php'), join(directory, 'environment.inc.php'));
  await writeFile(
    join(directory, '.env'),
    `# Existing deployment
DB_HOST=database.internal # local database
DB_PORT="3307"
MYSQL_DATABASE=tripwire_live
MYSQL_USER='tripwire user'
MYSQL_PASSWORD='p$#ss\\\\word'
UNRELATED_SECRET=do-not-load
`,
  );
  const php = `
require $argv[1];
$values = tripwireLoadDotenv($argv[2], array(
    'DB_HOST', 'DB_PORT', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'
));
echo json_encode($values);
`;
  const result = spawnSync(
    'php',
    ['-r', php, join(directory, 'environment.inc.php'), join(directory, '.env')],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    DB_HOST: 'database.internal',
    DB_PORT: '3307',
    MYSQL_DATABASE: 'tripwire_live',
    MYSQL_USER: 'tripwire user',
    MYSQL_PASSWORD: 'p$#ss\\word',
  });
});
