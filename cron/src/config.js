function environmentValue(environment, name) {
  const value = environment[name];
  if (typeof value !== 'string' || value.length < 2) return value;

  const quote = value[0];
  if (value.at(-1) !== quote) return value;

  const inner = value.slice(1, -1);
  if (quote === "'") {
    return inner.replace(/\\([\\'])/g, '$1');
  }
  if (quote === '"') {
    return inner.replace(/\\(n|r|t|v|f|\\|")/g, (_, escape) => {
      const escapes = {
        n: '\n',
        r: '\r',
        t: '\t',
        v: '\v',
        f: '\f',
        '\\': '\\',
        '"': '"',
      };
      return escapes[escape];
    });
  }
  return value;
}

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function required(environment, name) {
  const value = environmentValue(environment, name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function loadConfig(environment = process.env) {
  return {
    database: {
      host: environmentValue(environment, 'DB_HOST') || 'mysql',
      port: positiveInteger(
        environmentValue(environment, 'DB_PORT'),
        3306,
        'DB_PORT',
      ),
      user: required(environment, 'MYSQL_USER'),
      password: required(environment, 'MYSQL_PASSWORD'),
      database:
        environmentValue(environment, 'MYSQL_DATABASE') || 'tripwire_database',
      timezone: 'Z',
      waitForConnections: true,
      connectionLimit: positiveInteger(
        environmentValue(environment, 'DB_CONNECTION_LIMIT'),
        4,
        'DB_CONNECTION_LIMIT',
      ),
    },
    esi: {
      baseUrl:
        environmentValue(environment, 'ESI_BASE_URL') ||
        'https://esi.evetech.net',
      timeoutMs: positiveInteger(
        environmentValue(environment, 'ESI_TIMEOUT_MS'),
        30_000,
        'ESI_TIMEOUT_MS',
      ),
      userAgent:
        environmentValue(environment, 'CRON_USER_AGENT') ||
        `Tripwire Server - ${environmentValue(environment, 'ADM_EMAIL') || 'administrator'}`,
    },
    timezone: environmentValue(environment, 'CRON_TIMEZONE') || 'UTC',
  };
}
