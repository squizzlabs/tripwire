#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(dirname -- "$script_dir")
container_name=tripwire-cron
image_name=tripwire-cron:local

cd "$repo_root"

if [ ! -f .env ]; then
    printf '%s\n' 'Missing .env in the Tripwire repository root.' >&2
    exit 1
fi

# Build successfully before interrupting the running scheduler.
docker build --file cron/Dockerfile --tag "$image_name" .

if docker container inspect "$container_name" >/dev/null 2>&1; then
    docker stop "$container_name"
    docker rm "$container_name"
fi

docker run --detach \
    --name "$container_name" \
    --init \
    --restart unless-stopped \
    --network host \
    --env-file .env \
    -e DB_HOST=127.0.0.1 \
    -e CRON_TIMEZONE=UTC \
    "$image_name"

docker ps --filter "name=^/${container_name}$"
docker logs --tail 30 "$container_name"
