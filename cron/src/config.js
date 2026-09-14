function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function required(environment, name) {
  const value = environment[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function loadConfig(environment = process.env) {
  return {
    database: {
      host: environment.DB_HOST || 'mysql',
      port: positiveInteger(environment.DB_PORT, 3306, 'DB_PORT'),
      user: required(environment, 'MYSQL_USER'),
      password: required(environment, 'MYSQL_PASSWORD'),
      database: environment.MYSQL_DATABASE || 'tripwire_database',
      timezone: 'Z',
      waitForConnections: true,
      connectionLimit: positiveInteger(
        environment.DB_CONNECTION_LIMIT,
        4,
        'DB_CONNECTION_LIMIT',
      ),
    },
    esi: {
      baseUrl: environment.ESI_BASE_URL || 'https://esi.evetech.net',
      timeoutMs: positiveInteger(
        environment.ESI_TIMEOUT_MS,
        30_000,
        'ESI_TIMEOUT_MS',
      ),
      userAgent:
        environment.CRON_USER_AGENT ||
        `Tripwire Server - ${environment.ADM_EMAIL || 'administrator'}`,
    },
    timezone: environment.CRON_TIMEZONE || 'UTC',
  };
}
