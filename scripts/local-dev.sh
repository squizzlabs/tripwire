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

case "${1:-}" in
    build) build ;;
    up) up ;;
    down) down ;;
    restart) down; up ;;
    status) status ;;
    *)
        printf 'Usage: %s {build|up|down|restart|status}\n' "$0" >&2
        exit 2
        ;;
esac
