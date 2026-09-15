# syntax=docker/dockerfile:1.7

# Build the browser bundles from source instead of trusting checked-in output.
FROM node:24-bookworm-slim AS assets
WORKDIR /build
COPY package.json package-lock.json gulpfile.js ./
RUN npm ci
COPY app ./app
COPY public ./public
RUN npm run build

# Install the PHP dependency without shipping Composer in the runtime image.
FROM composer:2 AS php-dependencies
WORKDIR /build
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader

# Install only the production dependencies used by the scheduled jobs.
FROM node:24-bookworm-slim AS cron-dependencies
WORKDIR /build/cron
COPY cron/package.json cron/package-lock.json ./
RUN npm ci --omit=dev

# One container, including its database. This deliberately favors a deployment
# that starts with one docker command over the usual one-process-per-container
# model. MySQL is bound to loopback and is not exposed from the image.
FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive

RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d \
 && chmod +x /usr/sbin/policy-rc.d \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      libatomic1 \
      libstdc++6 \
      mysql-client \
      mysql-server \
      nginx \
      php8.3-cli \
      php8.3-curl \
      php8.3-fpm \
      php8.3-gd \
      php8.3-intl \
      php8.3-mbstring \
      php8.3-mysql \
      php8.3-xml \
      supervisor \
 && rm -f /usr/sbin/policy-rc.d \
 && rm -rf /var/lib/apt/lists/* /var/lib/mysql/* /var/www/html/*

WORKDIR /opt/app

COPY . /opt/app
COPY --from=assets /build/public /opt/app/public
COPY --from=php-dependencies /build/vendor /opt/app/vendor
COPY --from=cron-dependencies /build/cron/node_modules /opt/app/cron/node_modules
COPY --from=cron-dependencies /usr/local/bin/node /usr/local/bin/node

COPY .docker/all-in-one/app-config.php /opt/app/config.php
COPY .docker/all-in-one/nginx.conf /etc/nginx/nginx.conf
COPY .docker/all-in-one/site.conf /etc/nginx/sites-enabled/default
COPY .docker/all-in-one/php.ini /etc/php/8.3/fpm/conf.d/99-tripwire.ini
COPY .docker/all-in-one/supervisord.conf /etc/supervisor/conf.d/tripwire.conf
COPY .docker/all-in-one/entrypoint.sh /usr/local/bin/tripwire-entrypoint

RUN chmod 0755 /usr/local/bin/tripwire-entrypoint \
 && install -d -o www-data -g www-data /opt/app/cache /var/lib/php/sessions \
 && chown -R www-data:www-data /opt/app/cache /var/lib/php/sessions \
 && rm -f /etc/nginx/sites-enabled/default.save

ENV DB_HOST=127.0.0.1 \
    DB_PORT=3306 \
    MYSQL_DATABASE=tripwire_database \
    MYSQL_USER=tripwire \
    MYSQL_PASSWORD=tripwire \
    CRON_TIMEZONE=UTC \
    TRIPWIRE_BRAND=tripwire

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
  CMD mysqladmin ping --protocol=socket --silent && curl --fail --silent --show-error http://127.0.0.1/ >/dev/null || exit 1

STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/tripwire-entrypoint"]
