# Production cron container

This image adds the Node scheduler to an existing production Tripwire
installation. It does not contain or start Tripwire's web server, PHP runtime,
or MySQL database. The complete local test environment uses the root
`Dockerfile` and is documented separately in the main README.

The scheduler runs the activity collector hourly, account refresh every three
minutes, and the activity retention sweep daily at 04:17 UTC.

## Build

Docker Compose is not required. Run every build command from the Tripwire
repository root. The production image is self-contained in `cron/`; use that
directory as the Docker build context.

```sh
cd /var/www/tw.whpd.space
docker build --file cron/Dockerfile --tag tripwire-cron:local cron
```

## Run in production

The production MySQL database must already be initialized. Confirm that `.env`
exists in the repository root and contains the correct `MYSQL_USER`,
`MYSQL_PASSWORD`, `MYSQL_DATABASE`, and `DB_PORT` values, then run:

```sh
docker run --detach \
  --name tripwire-cron \
  --init \
  --restart unless-stopped \
  --network host \
  --env-file .env \
  -e DB_HOST=127.0.0.1 \
  -e CRON_TIMEZONE=UTC \
  tripwire-cron:local
```

`--network host` lets cron reach MySQL on the production server.
`DB_HOST=127.0.0.1` deliberately overrides the `DB_HOST=mysql` value used by
the old multi-container Compose environment.

Check startup and database connectivity:

```sh
docker ps --filter name=tripwire-cron
docker logs -f tripwire-cron
```

## Run one job manually

```sh
docker exec tripwire-cron npm run job -- system-activity
docker exec tripwire-cron npm run job -- account-update
docker exec tripwire-cron npm run job -- system-activity-prune --dry-run
```

Remove `--dry-run` only when you want the retention job to delete expired
activity records.

## Update the container

Build the new image before stopping the current scheduler:

```sh
cd /var/www/tw.whpd.space
docker build --file cron/Dockerfile --tag tripwire-cron:local cron
docker stop tripwire-cron
docker rm tripwire-cron
```

Run the production `docker run` command above again. The image build and run
commands never use `docker compose`; a `docker-compose.yml` file is not needed.
