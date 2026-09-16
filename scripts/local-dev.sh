#!/usr/bin/env bash
set -Eeuo pipefail

root_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
app_container=tripwire
assets_container=tripwire-assets
app_image=tripwire-local:latest
assets_image=tripwire-local-assets:latest
db_volume=tripwire-local-db

docker_cmd=(sudo docker)

exists() {
    "${docker_cmd[@]}" container inspect "$1" >/dev/null 2>&1
}

managed_database() {
    [[ "$("${docker_cmd[@]}" inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}' "$app_container")" == "$db_volume" ]]
}

build() {
    cd "$root_dir"
    "${docker_cmd[@]}" build --target assets --tag "$assets_image" .
    "${docker_cmd[@]}" build --tag "$app_image" .
}

up() {
    cd "$root_dir"
    if ! "${docker_cmd[@]}" image inspect "$app_image" >/dev/null 2>&1 ||
       ! "${docker_cmd[@]}" image inspect "$assets_image" >/dev/null 2>&1; then
        printf 'Local images are missing. Run: scripts/local-dev.sh build\n' >&2
        exit 1
    fi

    if exists "$app_container"; then
        if ! managed_database; then
            printf '%s\n' \
                'The existing tripwire container stores MySQL inside the container.' \
                'It was left untouched. Follow "Keep the database from an existing' \
                'all-in-one container" in README.md before starting local development.' >&2
            exit 1
        fi
        "${docker_cmd[@]}" rm --force "$app_container" >/dev/null
    fi
    if exists "$assets_container"; then
        "${docker_cmd[@]}" rm --force "$assets_container" >/dev/null
    fi

    "${docker_cmd[@]}" volume create "$db_volume" >/dev/null
    "${docker_cmd[@]}" volume create tripwire-local-vendor >/dev/null
    "${docker_cmd[@]}" volume create tripwire-local-cron-modules >/dev/null
    "${docker_cmd[@]}" volume create tripwire-local-cache >/dev/null

    env_args=()
    if [[ -f "$root_dir/.env" ]]; then
        env_args=(--env-file "$root_dir/.env")
    fi

    "${docker_cmd[@]}" run --detach \
        --name "$app_container" \
        --init \
        --restart unless-stopped \
        "${env_args[@]}" \
        --publish 8080:80 \
        --mount type=volume,src="$db_volume",dst=/var/lib/mysql \
        --mount type=bind,src="$root_dir",dst=/opt/app \
        --mount type=bind,src="$root_dir/.docker/all-in-one/app-config.php",dst=/opt/app/config.php,readonly \
        --mount type=volume,src=tripwire-local-vendor,dst=/opt/app/vendor \
        --mount type=volume,src=tripwire-local-cron-modules,dst=/opt/app/cron/node_modules \
        --mount type=volume,src=tripwire-local-cache,dst=/opt/app/cache \
        "$app_image" >/dev/null

    "${docker_cmd[@]}" run --detach \
        --name "$assets_container" \
        --init \
        --restart unless-stopped \
        --user "$(id -u):$(id -g)" \
        --workdir /build \
        --mount type=bind,src="$root_dir/app",dst=/build/app,readonly \
        --mount type=bind,src="$root_dir/public",dst=/build/public \
        "$assets_image" npm run dev >/dev/null

    printf 'Tripwire is running at http://localhost:8080\n'
    printf 'Database volume: %s (preserved by down/up and rebuilds)\n' "$db_volume"
}

down() {
    for container in "$assets_container" "$app_container"; do
        if exists "$container"; then
            "${docker_cmd[@]}" rm --force "$container" >/dev/null
        fi
    done
    printf 'Local containers removed; database volume %s was preserved.\n' "$db_volume"
}

status() {
    "${docker_cmd[@]}" ps --all \
        --filter "name=^/${app_container}$" \
        --filter "name=^/${assets_container}$"
}

diagnose() {
    local attempt container_state tracking_query
    if ! exists "$app_container"; then
        printf 'The %s container does not exist. Run: scripts/local-dev.sh up\n' "$app_container" >&2
        exit 1
    fi

    tracking_query='SELECT characterID, characterName, lastActive, TIMESTAMPDIFF(MINUTE, lastActive, UTC_TIMESTAMP()) AS leaseAgeMinutes, online, onlineCheckedAt, locationCheckedAt, locationObservedAt, lastLocationSystemID FROM esi ORDER BY userID, characterID; SELECT userID, characterID, characterName, systemID, systemName, maskID FROM tracking ORDER BY userID, characterID;'

    # A fresh container initializes/migrates MySQL before supervisord starts.
    # Make `restart && diagnose` reliable instead of racing that bootstrap.
    for attempt in {1..60}; do
        container_state=$("${docker_cmd[@]}" inspect --format '{{.State.Status}}' "$app_container")
        if [[ "$container_state" != "running" ]]; then
            printf 'The %s container stopped during initialization (state: %s).\n' \
                "$app_container" "$container_state" >&2
            "${docker_cmd[@]}" logs --tail 150 "$app_container" >&2
            exit 1
        fi
        if "${docker_cmd[@]}" exec "$app_container" test -S /var/run/supervisor.sock 2>/dev/null; then
            break
        fi
        if [[ "$attempt" == 1 ]]; then
            printf '%s\n' 'Waiting for database initialization and supervised services...'
        fi
        sleep 1
    done

    if ! "${docker_cmd[@]}" exec "$app_container" test -S /var/run/supervisor.sock 2>/dev/null; then
        printf 'Supervisor did not start within 60 seconds. Recent container logs:\n' >&2
        "${docker_cmd[@]}" logs --tail 150 "$app_container" >&2
        exit 1
    fi

    printf '%s\n' '=== Container and supervised services ==='
    "${docker_cmd[@]}" ps --all --filter "name=^/${app_container}$"
    "${docker_cmd[@]}" exec "$app_container" supervisorctl status

    printf '%s\n' '=== Tracking configuration ==='
    "${docker_cmd[@]}" exec "$app_container" /bin/sh -c '
        if [ -n "$SSO_CLIENT" ] && [ -n "$SSO_SECRET" ]; then
            echo "SSO_CLIENT/SSO_SECRET: configured"
        else
            echo "SSO_CLIENT/SSO_SECRET: MISSING"
        fi
    '

    printf '%s\n' '=== Linked-character polling state (no tokens shown) ==='
    "${docker_cmd[@]}" exec "$app_container" /bin/sh -c \
        'mysql --protocol=socket --user=root --database="$MYSQL_DATABASE" --table --execute="$1"' \
        tripwire-diagnose "$tracking_query"

    printf '%s\n' '=== Recent scheduler messages ==='
    "${docker_cmd[@]}" logs --tail 250 "$app_container" 2>&1 \
        | grep -E '\[character-tracking\]|tripwire-cron|scheduler' \
        | tail -80 || true
}

case "${1:-}" in
    build) build ;;
    up) up ;;
    down) down ;;
    restart) down; up ;;
    status) status ;;
    diagnose) diagnose ;;
    *)
        printf 'Usage: %s {build|up|down|restart|status|diagnose}\n' "$0" >&2
        exit 2
        ;;
esac
