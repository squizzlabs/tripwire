#!/usr/bin/env bash
set -Eeuo pipefail

log() {
    printf '[tripwire] %s\n' "$*"
}

die() {
    printf '[tripwire] ERROR: %s\n' "$*" >&2
    exit 1
}

export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3306}"
export MYSQL_DATABASE="${MYSQL_DATABASE:-tripwire_database}"
export MYSQL_USER="${MYSQL_USER:-tripwire}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-tripwire}"
export CRON_TIMEZONE="${CRON_TIMEZONE:-UTC}"

# Accept the hostname used by the repository's multi-container .env while
# keeping every client on the database bundled into this container.
if [[ "$DB_HOST" == "mysql" ]]; then
    export DB_HOST=127.0.0.1
fi

# These values are interpolated into bootstrap SQL. Keep their accepted form
# deliberately narrow; the application database is internal to this image.
[[ "$DB_HOST" == "127.0.0.1" || "$DB_HOST" == "localhost" ]] \
    || die 'DB_HOST must be 127.0.0.1 or localhost in the all-in-one image'
[[ "$DB_PORT" == "3306" ]] \
    || die 'DB_PORT must be 3306 in the all-in-one image'
[[ "$MYSQL_DATABASE" =~ ^[A-Za-z0-9_]+$ ]] \
    || die 'MYSQL_DATABASE may contain only letters, numbers, and underscores'
[[ "$MYSQL_USER" =~ ^[A-Za-z0-9_]+$ ]] \
    || die 'MYSQL_USER may contain only letters, numbers, and underscores'
password_bytes=$(LC_ALL=C printf '%s' "$MYSQL_PASSWORD" | wc -c)
(( password_bytes >= 1 && password_bytes <= 128 )) \
    || die 'MYSQL_PASSWORD must contain between 1 and 128 bytes'
password_hex=$(printf '%s' "$MYSQL_PASSWORD" | od -An -v -tx1 | tr -d ' \n')

install -d -m 0755 -o mysql -g mysql /run/mysqld /var/lib/mysql
install -d -m 0755 -o www-data -g www-data /run/php /var/lib/php/sessions /opt/app/cache

if [[ ! -d /var/lib/mysql/mysql ]]; then
    log 'Initializing the bundled MySQL data directory'
    mysqld --initialize-insecure --user=mysql --datadir=/var/lib/mysql
fi

bootstrap_pid=/run/mysqld/tripwire-bootstrap.pid

stop_bootstrap_mysql() {
    if [[ -S /run/mysqld/mysqld.sock ]]; then
        mysqladmin --protocol=socket --user=root shutdown >/dev/null 2>&1 || true
    fi
}
trap stop_bootstrap_mysql EXIT

log 'Starting MySQL for database bootstrap'
mysqld \
    --user=mysql \
    --daemonize \
    --pid-file="$bootstrap_pid" \
    --socket=/run/mysqld/mysqld.sock \
    --bind-address=127.0.0.1 \
    --event-scheduler=ON \
    --log-error=/tmp/tripwire-mysql-bootstrap.log

for attempt in {1..60}; do
    if mysqladmin ping --protocol=socket --user=root --silent; then
        break
    fi
    if [[ "$attempt" == 60 ]]; then
        cat /tmp/tripwire-mysql-bootstrap.log >&2 || true
        die 'MySQL did not become ready'
    fi
    sleep 1
done

mysql --protocol=socket --user=root <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'127.0.0.1';
SET @tripwire_password = CONVERT(UNHEX('${password_hex}') USING utf8mb4);
SET @tripwire_alter_user = CONCAT(
  'ALTER USER ''${MYSQL_USER}''@''127.0.0.1'' IDENTIFIED BY ',
  QUOTE(@tripwire_password)
);
PREPARE tripwire_alter_user_statement FROM @tripwire_alter_user;
EXECUTE tripwire_alter_user_statement;
DEALLOCATE PREPARE tripwire_alter_user_statement;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.*
  TO '${MYSQL_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

if ! mysql --protocol=socket --user=root --database="$MYSQL_DATABASE" \
    --batch --skip-column-names \
    --execute="SHOW TABLES LIKE 'accounts'" | grep -qx accounts; then
    log 'Importing the Tripwire database schema'
    mysql --protocol=socket --user=root --database="$MYSQL_DATABASE" \
        < /opt/app/.docker/mysql/tripwire.sql
fi

# The cumulative migration is safe to repeat and keeps persistent volumes made
# by an older image aligned with the code in the new image.
log 'Applying idempotent database migrations'
mysql --protocol=socket --user=root --database="$MYSQL_DATABASE" \
    < /opt/app/tripwire_update.sql

log 'Database is ready'
mysqladmin --protocol=socket --user=root shutdown
trap - EXIT
rm -f "$bootstrap_pid"

log 'Starting Nginx, PHP-FPM, MySQL, and the scheduler'
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
