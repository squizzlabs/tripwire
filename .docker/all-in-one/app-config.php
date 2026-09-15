<?php

date_default_timezone_set(getenv('TRIPWIRE_TIMEZONE') ?: 'UTC');

function tripwireDockerEnv($name, $default = '') {
    $value = getenv($name);
    return $value === false || $value === '' ? $default : $value;
}

function tripwireDockerBool($name, $default = false) {
    $value = getenv($name);
    if ($value === false || $value === '') return $default;
    return filter_var($value, FILTER_VALIDATE_BOOLEAN);
}

$requestHost = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
$forwardedProto = isset($_SERVER['HTTP_X_FORWARDED_PROTO'])
    ? strtolower(trim(explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO'])[0]))
    : '';
$requestScheme = $forwardedProto === 'https' || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    ? 'https'
    : 'http';
$publicHost = tripwireDockerEnv('TRIPWIRE_DOMAIN', tripwireDockerEnv('TRDOMAIN', $requestHost));

define('APP_NAME', tripwireDockerEnv('TRIPWIRE_APP_NAME', 'Tripwire'));
define('BRAND', tripwireDockerEnv('TRIPWIRE_BRAND', 'tripwire'));
define('BRAND_SWITCH', tripwireDockerBool('TRIPWIRE_BRAND_SWITCH', false));
define('CDN_DOMAIN', $publicHost);
define('EVE_DUMP', tripwireDockerEnv('EVE_DUMP', 'eve_dump'));
define('TRIPWIRE_API', tripwireDockerBool('TRIPWIRE_API', true));
define(
    'USER_AGENT',
    tripwireDockerEnv(
        'TRIPWIRE_USER_AGENT',
        'Tripwire Server - ' . tripwireDockerEnv('ADM_EMAIL', 'administrator')
    )
);
define('EVE_SSO_CLIENT', tripwireDockerEnv('EVE_SSO_CLIENT', tripwireDockerEnv('SSO_CLIENT')));
define('EVE_SSO_SECRET', tripwireDockerEnv('EVE_SSO_SECRET', tripwireDockerEnv('SSO_SECRET')));
define(
    'EVE_SSO_REDIRECT',
    tripwireDockerEnv('EVE_SSO_REDIRECT', $requestScheme . '://' . $publicHost . '/index.php?mode=sso')
);
define('ENABLE_SEARCH_SCOPE', tripwireDockerBool('ENABLE_SEARCH_SCOPE', true));
define('ENABLE_ANALYTICS', tripwireDockerBool('ENABLE_ANALYTICS', false));
define('ENABLE_DONATIONS', tripwireDockerBool('ENABLE_DONATIONS', false));
