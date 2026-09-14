<?php

if (is_file(__DIR__ . '/db.inc.php')) {
    $message = 'Tripwire database configuration migration required: an obsolete ' .
        'db.inc.php still exists. Run "php scripts/migrate-db-config.php" from ' .
        'the Tripwire directory, then restart the containers. See README.md for details.';
    error_log($message);
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
    http_response_code(503);
    exit($message);
}

// Docker Compose reads .env and supplies these values to PHP-FPM. Bare-metal
// deployments should expose the same variables through their web server or
// process manager. No database credentials belong in this tracked file.
try {
    $host = getenv('DB_HOST') ?: 'mysql';
    $port = getenv('DB_PORT') ?: '3306';
    $database = getenv('MYSQL_DATABASE') ?: 'tripwire_database';
    $username = getenv('MYSQL_USER');
    $password = getenv('MYSQL_PASSWORD');

    if ($username === false || $username === '' || $password === false) {
        throw new RuntimeException('Database credentials are not configured');
    }

    $mysql = new PDO(
        'mysql:host=' . $host . ';port=' . $port . ';dbname=' . $database . ';charset=utf8',
        $username,
        $password,
        Array(
            PDO::ATTR_PERSISTENT     => true,
            // Fail loudly. Without this a failed query returns false and the
            // app carries on with no data, which reads as "empty" rather than
            // "broken" -- a dead database looks like a quiet one.
            PDO::ATTR_ERRMODE        => PDO::ERRMODE_EXCEPTION
            // NOTE: do not set PDO::ATTR_EMULATE_PREPARES => false here.
            // Fifteen queries in this codebase bind one named placeholder that
            // appears twice in the statement (login.php:80, refresh.php:135
            // and :228, lib.inc.php:42, masks.inc.php:23 among others).
            // Client-side emulation tolerates that; native prepares reject it
            // with "Invalid parameter number", which breaks login and the
            // refresh poll. Those queries must be rewritten first.
        )
    );
} catch (Exception $error) {
    // Do not continue with an unset $mysql: every later query would fatal with
    // a confusing error a long way from the actual cause.
    error_log('Tripwire: database connection failed: ' . $error->getMessage());
    http_response_code(503);
    exit('Database unavailable');
}
