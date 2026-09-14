#!/usr/bin/env php
<?php

// Migrate the standard legacy db.inc.php PDO connection into .env without
// executing the old PHP file or connecting to its database.

$root = dirname(__DIR__);
$source = $root . '/db.inc.php';
$environmentFile = $root . '/.env';

function failMigration($message)
{
    fwrite(STDERR, "Database configuration migration failed: " . $message . PHP_EOL);
    exit(1);
}

function decodeSingleQuotedPhpString($value)
{
    return preg_replace_callback(
        "/\\\\([\\\\'])/",
        function ($match) {
            return $match[1];
        },
        $value
    );
}

function dotenvValue($value)
{
    if (strpos($value, "\n") !== false || strpos($value, "\r") !== false) {
        failMigration('database values containing newlines cannot be written safely');
    }

    // Compose treats single-quoted values literally. Escape only characters
    // that are significant inside that form.
    return "'" . str_replace(array('\\', "'"), array('\\\\', "\\'"), $value) . "'";
}

function setEnvironmentValue($contents, $name, $value)
{
    $line = $name . '=' . dotenvValue($value);
    $pattern = '/^(?:export\s+)?' . preg_quote($name, '/') . '\s*=.*$/m';

    if (preg_match($pattern, $contents)) {
        return preg_replace($pattern, $line, $contents);
    }

    if ($contents !== '' && substr($contents, -1) !== "\n") {
        $contents .= PHP_EOL;
    }
    return $contents . $line . PHP_EOL;
}

if (!is_file($source)) {
    failMigration('db.inc.php was not found; there is nothing to migrate');
}

$legacy = file_get_contents($source);
if ($legacy === false) {
    failMigration('db.inc.php could not be read');
}

$pdoPattern = <<<'REGEX'
~new\s+PDO\s*\(\s*'((?:\\.|[^'\\])*)'\s*,\s*'((?:\\.|[^'\\])*)'\s*,\s*'((?:\\.|[^'\\])*)'~s
REGEX;

if (!preg_match($pdoPattern, $legacy, $matches)) {
    failMigration(
        'the legacy PDO settings are customized and could not be read automatically. ' .
        'Copy DB_HOST, DB_PORT, MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD into ' .
        '.env manually, then move db.inc.php out of the way.'
    );
}

$dsn = decodeSingleQuotedPhpString($matches[1]);
$username = decodeSingleQuotedPhpString($matches[2]);
$password = decodeSingleQuotedPhpString($matches[3]);
$dsnValues = array();

foreach (explode(';', $dsn) as $part) {
    $pair = explode('=', $part, 2);
    if (count($pair) !== 2) {
        continue;
    }
    $key = strtolower($pair[0]);
    if (strpos($key, ':') !== false) {
        $key = substr($key, strrpos($key, ':') + 1);
    }
    $dsnValues[$key] = $pair[1];
}

if (empty($dsnValues['host']) || empty($dsnValues['dbname'])) {
    failMigration('the PDO DSN does not contain both host and dbname');
}

$values = array(
    'DB_HOST' => $dsnValues['host'],
    'DB_PORT' => isset($dsnValues['port']) ? $dsnValues['port'] : '3306',
    'MYSQL_DATABASE' => $dsnValues['dbname'],
    'MYSQL_USER' => $username,
    'MYSQL_PASSWORD' => $password,
);

$environment = is_file($environmentFile) ? file_get_contents($environmentFile) : '';
if ($environment === false) {
    failMigration('.env could not be read');
}

foreach ($values as $name => $value) {
    $environment = setEnvironmentValue($environment, $name, $value);
}

$temporaryFile = $environmentFile . '.migration-' . getmypid();
if (file_put_contents($temporaryFile, $environment, LOCK_EX) === false) {
    failMigration('the updated .env could not be written');
}
chmod($temporaryFile, 0600);

if (!rename($temporaryFile, $environmentFile)) {
    @unlink($temporaryFile);
    failMigration('the updated .env could not be installed');
}

$backup = $root . '/db.inc.php.pre-env-backup';
if (file_exists($backup)) {
    $backup .= '-' . gmdate('Ymd-His');
}
if (!rename($source, $backup)) {
    failMigration('the .env was updated, but db.inc.php could not be moved aside');
}
chmod($backup, 0600);

fwrite(STDOUT, "Database settings were written to .env." . PHP_EOL);
fwrite(STDOUT, "The legacy file was preserved as " . basename($backup) . "." . PHP_EOL);
fwrite(STDOUT, "Rebuild with: docker compose up -d --build" . PHP_EOL);
