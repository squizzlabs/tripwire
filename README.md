# Tripwire, refit

<img src="docs/cormorantfell-portrait.jpeg" width="72" align="right">

> [Cormorant Fell](https://evewho.com/character/93594488) — WiNGSPAN boomerang and, on balance, more of a wormhole enthusiast than a wormhole survivor — refit this. The map underneath is the one you already trust. It has simply stopped dressing like 2015.

### EVE Online wormhole mapping — a fork of Tripwire
- MIT licence (see `LICENSE`); upstream is [daimian/tripwire](https://bitbucket.org/daimian/tripwire)

**It looks new because it is.** The same app on three packs, dark and light
rooms, the edit dialog and Settings: the neutral default, the template, and
an illustrative third -- the Ministry, the identity of
[observance.app](https://observance.app), a collection of EVE Online apps.
It is not a corp; it is there to show a pack with its own face. A pack is
one folder; the packs shown are not in this repo, only the walk-throughs.

<table><tr>
<th width="33%">The default</th><th width="33%">The template pack</th><th width="33%">Illustrative: <a href="https://observance.app">observance.app</a></th>
</tr><tr>
<td><img src="docs/demo-tripwire.gif" width="100%" alt="Tripwire on the neutral default pack"></td>
<td><img src="docs/demo-example.gif" width="100%" alt="Tripwire on the template corp pack"></td>
<td><img src="docs/demo-ministry.gif" width="100%" alt="Tripwire on the observance.app pack"></td>
</tr></table>

It works at phone width too, editing included, and installs to the home screen.

<p>
<img src="docs/phone-tripwire.png" width="230" alt="Tripwire on a phone, neutral default">&nbsp;
<img src="docs/phone-example.png" width="230" alt="Tripwire on a phone, template pack">&nbsp;
<img src="docs/phone-ministry.png" width="230" alt="Tripwire on a phone, observance.app pack">
</p>

Same Tripwire underneath: same data, same sync, same chain. This fork rebuilds
how it reads and how fast you can work it, and makes the look a **brand
pack** so any corp can run it as their own (see *Brand packs* below). Light
and dark rooms with a toggle; installs on a phone; end-to-end tests.

What the refit changes, in one screen:

- **Chain map** on the original's layout, denser: a security or class capsule
  on each box's corner, name and sig inside, statics hanging off the bottom
  edge, activity dots on the edge, pilots on the top-right. Flares breathe.
  The wheel pans, Ctrl-wheel zooms, Reset zoom is always there when needed.
- **Signatures**: paste a scan anywhere (Ctrl-V, or the Paste-scan button),
  re-paste to update, type an id as `ABC-123`, click Life or Mass on a row to
  change it in place, undo. Columns line up. On phones a row is two lines.
- **A layout that holds still**: panels do not resize when you change
  systems; the System panel fits without scrolling; three columns from 960px.
- **Command palette** (`/` or Ctrl-K): jump to a system, a chain tab or a
  mask; set life or mass on the selection; show or hide panels.
- **Settings** in tabs: characters, map, signatures, panels, statistics.
- Fixed upstream: the TQ counter flicker after the tab sits in the
  background, and the background poll that had stopped polling.

### Updating an existing installation

Database connections now use the tracked `database.inc.php`. The old
`db.inc.php` name remains ignored so it cannot block `git pull`, but Tripwire
will return a migration-required error while that legacy file exists. Pull the
update and run the migration helper:

```bash
git pull
composer install --no-dev --prefer-dist --optimize-autoloader
php scripts/migrate-db-config.php
```

Composer dependencies are generated from the committed `composer.lock`; the
`vendor/` directory is deliberately not stored in Git. Use `composer install`
after each pull that changes `composer.lock`. Do not run `composer update` on a
production checkout.

After migrating, rebuild whichever environment is actually in use: follow
**Production: standalone cron container** for the production scheduler, or
**Local testing: complete Docker environment** for the local all-in-one image.

The helper reads the standard legacy PDO configuration without executing it,
writes these settings into `.env`, and preserves the old file as
`db.inc.php.pre-env-backup`:

```dotenv
DB_HOST=mysql
DB_PORT=3306
MYSQL_DATABASE=tripwire_database
MYSQL_USER=your-current-username
MYSQL_PASSWORD=your-current-password
```

If a customized legacy file cannot be read automatically, copy those five
values into `.env` manually and move `db.inc.php` aside. If its PDO connection
has no port, use `3306`. Keep the ignored backup until the site and
`tripwire-cron` have both connected successfully.

### Production web application setup on Linux

**Requirements:**  

- PHP 8.0 or newer
- Composer 2
- php-mbstring must be installed
- MySQL (or some flavor of MySQL - needed because database EVENTS)
- A my.cnf MySQL config file example is located in `.docker/mysql/my.cnf`
- The `sql_mode` and `event_scheduler` my.cnf lines are important, make sure you have them in your my.cnf file & reboot MySQL
- Docker for the production cron container (or Node.js 24 if running it without
  Docker)

**Web application setup (bare metal)**

- Create a `tripwire` database using the export located in `.docker/mysql/tripwire.sql`
- For development: create an EVE dump database, define it's name later in `config.php`. Download from: https://www.fuzzwork.co.uk/dump/ To download the latest use the following link: https://www.fuzzwork.co.uk/dump/mysql-latest.tar.bz2. You do not need a copy of the SDE to run Tripwire (since 1.21).
- Clone the Tripwire repo to where you are going to serve to the public OR manually download repo and copy files yourself
- Install the locked PHP dependencies with
  `composer install --no-dev --prefer-dist --optimize-autoloader`. Composer
  creates the ignored `vendor/` directory; it is not part of the repository.
- Copy `.env.example` to `.env` and set `DB_HOST`, `DB_PORT`,
  `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD`. Process-manager
  environment variables can override the file when needed.
- Copy `config.example.php` to `config.php` - modify file per your setup
- Create an EVE developer application via https://developers.eveonline.com/applications
- EVE SSO `Callback URL` should be: `https://your-domain.com/index.php?mode=sso`
- Use the following scopes:
  esi-location.read_location.v1
  esi-location.read_ship_type.v1
  esi-ui.open_window.v1
  esi-ui.write_waypoint.v1
  esi-characters.read_corporation_roles.v1
  esi-location.read_online.v1
  esi-characters.read_titles.v1
  esi-search.search_structures.v1
- Settings go in the `config.php` file
- Modify your web server to serve Tripwire from the `tripwire/public` folder so files such as `config.php` and `database.inc.php` are not accessible via URL
- Set up the production scheduler using **Production: standalone cron
  container** below.
- If you are using SELinux: Tripwire needs access to the 'cache' directory inside the deployment directory, usually /var/www/tripwire. You need to make this a write-access directory via SELinux labelling: `semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/tripwire/cache(/.*)?"` - then relabel the directory `restorecon -R -v /var/www/tripwire`

### Production: standalone cron container

Production keeps the existing web server, PHP, and MySQL installation. Only the
Node scheduler runs in Docker, using `cron/Dockerfile`. These commands
do not use Docker Compose and do not start another web server or database.

Take a database backup first, then run these from the Tripwire checkout
containing `cron/` and `.env`:

```sh
cd /var/www/tw.whpd.space
mysql --database=tripwire_database < tripwire_update.sql
docker build --file cron/Dockerfile --tag tripwire-cron:local .
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

Host networking allows the container to reach the production MySQL server on
the host. The explicit `DB_HOST` overrides `DB_HOST=mysql` if it remains in
`.env`. The database must already be initialized, and `.env` must contain the
correct `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `DB_PORT`,
`SSO_CLIENT`, and `SSO_SECRET` values.

Verify that the scheduler is running and connected:

```sh
docker ps --filter name=tripwire-cron
docker logs --follow tripwire-cron
```

Run a job manually:

```sh
docker exec tripwire-cron npm run job -- system-activity
docker exec tripwire-cron npm run job -- account-update
docker exec tripwire-cron npm run job -- character-tracking
docker exec tripwire-cron npm run job -- system-activity-prune --dry-run
```

The scheduler checks linked characters with a session in the last four hours,
polling online state at most once per minute and locations for online pilots at
most once every six seconds. It also runs `system-activity` hourly,
`account-update` every three minutes, and `system-activity-prune` daily at
04:17 UTC. See
[cron/README.md](cron/README.md) for updates and troubleshooting.

OAuth access and refresh tokens remain server-side. Authenticated ESI search,
waypoint, and information-window requests are proxied through `public/esi.php`;
browser refresh responses contain only character identity and tracking state.

### Local testing: complete Docker environment

The root `Dockerfile` is a complete local environment: Nginx, PHP-FPM, MySQL,
the schema/migrations, Composer packages, compiled browser assets, and the Node
scheduler are all included. It is separate from the production cron container.

For day-to-day development, use `scripts/local-dev.sh`. The database lives in
the named volume `tripwire-local-db`, so removing or rebuilding the application
container does not remove its data. The checkout is mounted into the container:
PHP/template changes appear on refresh, while a second container automatically
rebuilds the browser JavaScript and CSS after a source file is saved. The script
uses `sudo docker`; it never removes the database volume.

The first start builds the images:

```bash
scripts/local-dev.sh build
scripts/local-dev.sh up
```

After that, start and stop it without rebuilding:

```bash
scripts/local-dev.sh up
scripts/local-dev.sh down
```

Open `http://localhost:8080`. Check both containers or follow their logs with:

```bash
scripts/local-dev.sh status
scripts/local-dev.sh diagnose
sudo docker logs --follow tripwire
sudo docker logs --follow tripwire-assets
```

`diagnose` is safe to run while Tripwire is active. It reports the scheduler
process, whether backend SSO credentials are present, linked-character polling
timestamps, current tracking rows, and recent character-tracking messages. It
does not print access or refresh tokens. Immediately after a restart it waits
up to 60 seconds for database initialization and migrations to finish.

A rebuild is only needed after changing `Dockerfile`, `composer.lock`, either
`package-lock.json`, or `scripts/local-dev.sh`:

```bash
scripts/local-dev.sh build
scripts/local-dev.sh restart
```

Both `down` and `restart` preserve the database. To deliberately reset it, stop
the environment and explicitly remove `tripwire-local-db`; that destructive
operation is intentionally not part of the helper.

#### Keep the database from an existing all-in-one container

If a container named `tripwire` already contains data you want, make a logical
backup before switching. The helper refuses to replace a container whose
database is not already on `tripwire-local-db`.

```bash
sudo docker exec tripwire \
  mysqldump --protocol=socket --user=root --single-transaction \
  --routines --events --triggers tripwire_database \
  > /tmp/tripwire-local-backup.sql
sudo docker stop tripwire
sudo docker rename tripwire tripwire-before-local-dev
scripts/local-dev.sh build
scripts/local-dev.sh up
until sudo docker exec tripwire mysqladmin --protocol=socket --user=root --silent ping; do sleep 1; done
sudo docker exec --interactive tripwire \
  mysql --protocol=socket --user=root tripwire_database \
  < /tmp/tripwire-local-backup.sql
```

Once the new instance has started and its data is present, the renamed old
container is only a backup and can be removed when no longer needed.

For EVE registration and sign-in, put the credentials and callback registered
at EVE Developers in `.env`. The helper passes that file at runtime; `.env` is
excluded from image builds so secrets are never baked into an image:

```dotenv
EVE_SSO_CLIENT=your-client-id
EVE_SSO_SECRET=your-secret
EVE_SSO_REDIRECT=http://localhost:8080/index.php?mode=sso
TRIPWIRE_DOMAIN=localhost:8080
```

Optional settings include `TRIPWIRE_BRAND`, `TRIPWIRE_APP_NAME`,
`TRIPWIRE_USER_AGENT`, and `MYSQL_PASSWORD`. The defaults are usable as-is
because MySQL is not exposed outside the container. The existing `TRDOMAIN`,
`SSO_CLIENT`, `SSO_SECRET`, and `ADM_EMAIL` names are accepted too, so the
repository's existing `.env` format continues to work.

### Multi-container Docker Compose deployment

This is an alternative full deployment using separate containers and automatic
TLS through Traefik. It is not required for either the all-in-one local test
container or the standalone production cron container.

- Install Docker for your environment: https://www.docker.com/
- Setup Developer application on Eve developers
- Configure your domain registrar with a record pointed to the vm you are using -- ensure port 80/443 are open (80 can be closed after traefik setup)
- Clone repo and change directory into it

**EVE SSO**
```
  - Create an EVE developer application via https://developers.eveonline.com/applications
  - EVE SSO `Callback URL` should be: `https://your-domain.com/index.php?mode=sso`
  - Use the following scopes:
    - esi-location.read_location.v1
    - esi-location.read_ship_type.v1
    - esi-ui.open_window.v1
    - esi-ui.write_waypoint.v1
    - esi-characters.read_corporation_roles.v1
    - esi-location.read_online.v1
    - esi-characters.read_titles.v1
    - esi-search.search_structures.v1
```
 
### QUICK SETUP

A setup script is provided `./scripts/setup.sh`
This script will request all needed information and modify settings, then offer the option to start the build  
Once complete, your tripwire instance will be up and running.

### Manual Docker Setup

- Copy config.example.php to config.php
`cp config.example.php config.php`
- Docker Compose installs the locked PHP dependencies into the ignored
  `vendor/` directory before starting PHP-FPM.
- Configure database and deployment values in `.env`, and application settings in `config.php`
- Prep traefik acme file


Required changes for setup:

**docker-compose.yml**
Copy the provided environment template:
`cp .env.example .env`

Edit `.env`, replacing the blank secrets and example domain/email values.
`MYSQL_DATABASE`, `DB_HOST`, and `DB_PORT` already have Docker-ready defaults.

**database.inc.php**

This file is tracked and contains no credentials. It reads `DB_HOST`, `DB_PORT`,
`MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` directly from `.env` for
bare-metal installations. Values supplied by Docker Compose, a web server, or
a process manager take precedence over the file.

**config.php**
```
  - `EVE_DUMP` matches SDE_DB in docker-compose
  - `CDN_DOMAIN` this should match the domain name in your docker-compose
  - `EVE_SSO_CLIENT`, `EVE_SSO_SECRET`, and `EVE_SSO_REDIRECT` should be updated to match the EVE SSO application
```

**Traefik Acme**
```
mkdir -p traefik-data
touch traefik-data/acme.json
chmod 600 traefik-data/acme.json
```

**COMPOSE BUILD**

To start the stack run `docker compose up -d --build`
To view logs in real time run `docker compose logs -f`

If you see that the .env file is not being loaded, run the stack with 
`docker-compose --env-file .env up -d --build`


### Contribution guidelines
- Base off of production or development
- Create PRs into development
- Look over issues, branches or get with me to ensure it isn't already being worked on

### Who do I talk to?
- Astriania / Kariyo Astrien (Main contributor/maintainer)
- Tripwire Public in-game channel
- Discord: https://discord.gg/xjFkJAx
- Josh Glassmaker AKA Daimian Mercer (Creator)
- Cormorant Fell (this fork: the refit and brand packs)

## End-to-end tests

`npm run e2e` drives a real browser (Playwright) against a running Tripwire
-- by default `http://localhost:8080`, the OrbStack preview through the SSH
tunnel -- and exercises the ways signatures get in: typed into the dialog and
saved with Enter or the Add button, pasted with Ctrl-V, pasted with the
Paste-scan button, re-pasted (update, not duplicate), and undone. It also
covers the traps a person hits: Tab after the id auto-advances, a whole
`ABC-123` typed into the first field, and Ctrl-V while the search box has
focus. Each test creates and removes its own `ZZQ-*` signatures.

    E2E_BASE_URL=https://host:port E2E_USER=... E2E_PASS=... npm run e2e
    npm run e2e:headed          # watch it

The suite signs in once (Tripwire rate-limits logins to one per IP per 30s)
and keeps the session in `e2e/.auth/`, which is git-ignored.

## Brand packs

Everything a corp changes about the look lives in one directory:

```
public/brands/<slug>/
  brand.json          names, tagline, palette, accent, fonts, logo, icons
  <logo files>        the logo for each room, or none (see "logo")
  mark.png            a square PNG with transparency; icons are built from it
  icon-192.png  icon-512.png  icon-maskable-512.png  apple-touch-icon.png  favicon-32.png
  landing-bg.jpg      optional backdrop for the sign-in page
```

Pick the pack in `config.php`:

```php
define('BRAND', 'example');        // a directory under public/brands/
define('BRAND_SWITCH', false);     // true lets a browser pick a pack with ?brand=<slug> (demos)
```

`tripwire` is the neutral default (cool greys, a blue accent, a text logo).
`example` is the template: a complete pack for "Your Corp" with placeholder
logo images for both rooms and a mark. Copy it, rename the directory, edit
`brand.json`, replace the two logos and the mark, then build the icons:

```bash
cp -r public/brands/example public/brands/mycorp
python3 scripts/brand-icons.py mycorp
```

Nothing else in the app knows a corp's name. The loader (`brand.inc.php`)
merges your `brand.json` over the neutral pack's, so you only need the keys
you change, and emits the palette as the CSS custom properties the
stylesheets already read, in a `<style>` after the app stylesheet. A pack
overrides token *values* and never restyles a component, so it survives
upstream merges. The manifest (`manifest.php`), the head tags for fonts,
theme colour and iOS install, the letterhead and the sign-in page all come
from the pack.

### brand.json

| Key | What it drives |
|---|---|
| `corp` | The corp's name: the manifest's long name, image alt text, the sign-in page. Empty for the neutral pack. |
| `short` | Short uppercase form, for places that need one. |
| `tagline` | The small line above the product name on the sign-in page (`Chain desk`). |
| `description` | The manifest description and the sign-in page's meta description. |
| `logo.dark`, `logo.light` | Logo image file for each room (PNG or SVG, any aspect; drawn 64px tall in the header, 360px wide on the sign-in page). `light` falls back to `dark`. Both `null` → see `lockup`, else the product name is set as text. |
| `logo.lockup` | A typographic letterhead instead of an image, set in the page's own fonts: `above` (small line), `main` (the name, in `fonts.brand` and the accent), `below` (small line), `flourish` (rules either side of the name). |
| `mark` | Square PNG with transparency. `scripts/brand-icons.py` builds the icon set from it on the dark background colour. |
| `mark_rotate` | Degrees to tilt the mark on the sign-in page and in the icons (negative is counter-clockwise). A stamp lands at `-15`. |
| `landing_mark` | Image for the sign-in page; defaults to `logo.dark`. Use it when the letterhead is a lockup but the sign-in page should show a seal or mark. |
| `landing_bg` | Optional backdrop image for the sign-in page; `null` for none. |
| `icons.192`, `icons.512`, `icons.maskable`, `icons.apple`, `icons.favicon` | The icon files, normally the script's output. `maskable` keeps the mark inside the centre 80% for Android. |
| `fonts.google` | A Google Fonts stylesheet URL, or `null` to load none. |
| `fonts.ui`, `fonts.mono`, `fonts.display`, `fonts.brand` | CSS `font-family` stacks: running text; labels, ids and counts; headings; the lockup's name (defaults to `display`). |
| `accent.dark`, `accent.light` | The one accent colour per room: primary buttons, the current range, focus rings, the letterhead name. |
| `accent.on-dark`, `accent.on-light` | Text colour on the accent in each room. |
| `palette.dark`, `palette.light` | The surface tokens per room, below. |

### Palette tokens

Each of `palette.dark` and `palette.light` is a map of token → colour. Any
CSS colour works; the neutral pack shows the expected relationships.

| Token | Where it paints |
|---|---|
| `background` | The page ground and the manifest's theme colour (dark). |
| `foreground` | Headings, names, values. |
| `card`, `card-foreground` | Panels and the signature dialog. |
| `popover`, `popover-foreground` | Menus, dropdowns, tooltips. |
| `muted`, `muted-foreground` | Hover grounds; labels and secondary text. |
| `text-body` | Running text (notes, descriptions). |
| `accent-surface` | Tinted grounds behind selected rows and chips. |
| `border`, `border-soft`, `border-strong` | Rules and edges at three weights. |
| `input` | Field grounds. |
| `glow` | The faint highlight inside raised cards. |
| `destructive` | Delete, and the missing-field mark. |
| `node-surface`, `node-edge` | Chain map cards. |
| `chart-gridline`, `chart-axis-text` | The activity graph. |

Not brandable, on purpose: the `--data-*` colours for wormhole class,
security band, mass and life. They encode meaning on the map and stay the
same for every corp.

### Keeping your pack private

`public/brands/` is git-ignored except for `tripwire` and `example`. Keep
your corp's pack in a private repository beside this one and copy it in at
deploy time:

```bash
scripts/brands-sync.sh ../my-private-brands     # rsyncs every <slug>/ with a brand.json
```

### Demo switching

The README's GIF is built with `node scripts/demo-gif.js <frames>` (a signed-in
Playwright walk on the template pack and the default) and
`python3 scripts/demo-gif.py <frames> docs/demo-<pack>.gif`, one pack per run (`DEMO_PACKS=<slug>`);
the phone shots with `node scripts/demo-phone.js docs <packs>`.

With `BRAND_SWITCH` on, `?brand=<slug>` puts that browser on that pack (a
cookie) and `?brand=` clears it. Nothing on the server changes, so two tabs
can show two corps at once. Leave it off on a corp's own instance.

---

— [Cormorant Fell](https://evewho.com/character/93594488), somewhere down the chain, probably not where the map says
