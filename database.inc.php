<?php

require_once(__DIR__ . '/environment.inc.php');

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

// Read .env directly for bare-metal installations. Docker and process-manager
// environment values take precedence when they are supplied.
try {
    $dotenv = tripwireLoadDotenv(
        __DIR__ . '/.env',
        array('DB_HOST', 'DB_PORT', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD')
    );
    $host = tripwireEnvironmentValue('DB_HOST', $dotenv, 'mysql');
    $port = tripwireEnvironmentValue('DB_PORT', $dotenv, '3306');
    $database = tripwireEnvironmentValue('MYSQL_DATABASE', $dotenv, 'tripwire_database');
    $username = tripwireEnvironmentValue('MYSQL_USER', $dotenv);
    $password = tripwireEnvironmentValue('MYSQL_PASSWORD', $dotenv);

    if ($username === null || $username === '' || $password === null) {
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

// Cron removes a login character when EVE rejects its authorization. PHP
// sessions live outside MySQL, so reject an existing session as soon as its
// next authenticated request finds no remaining login character.
if (session_status() === PHP_SESSION_ACTIVE && isset($_SESSION['userID'])) {
    $characterCheck = $mysql->prepare(
        'SELECT 1 FROM characters WHERE userID = :userID LIMIT 1'
    );
    $characterCheck->bindValue(':userID', $_SESSION['userID'], PDO::PARAM_INT);
    $characterCheck->execute();
    if (!$characterCheck->fetchColumn()) {
        setcookie('username', '', time() - 3600, '/');
        setcookie('password', '', time() - 3600, '/');
        setcookie('tripwire', '', time() - 3600, '/');
        $_SESSION = array();
        session_regenerate_id(true);
        session_destroy();
        http_response_code(403);
        exit();
    }
}
