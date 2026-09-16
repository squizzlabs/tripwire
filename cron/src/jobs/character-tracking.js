export const ACTIVE_WINDOW_MS = 4 * 60 * 60 * 1000;
export const ONLINE_INTERVAL_MS = 60 * 1000;
export const LOCATION_INTERVAL_MS = 6 * 1000;
export const AUTOMAP_MAX_GAP_MS = 10 * 1000;
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

function mysqlDate(date) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function due(value, interval, now) {
  return !value || now.getTime() - new Date(value).getTime() >= interval;
}

function parseOptions(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function selectedMask(row, options) {
  return options?.masks?.active || `${row.corporationID}.2`;
}

function trackingName(name, options, characterId) {
  const characterOptions = options?.tracking?.characterOptions?.[characterId];
  if (characterOptions?.show === false) return `${name}|x`;
  if (characterOptions?.showShip === false) return `${name}|p`;
  return `${name}|P`;
}

function automapEnabled(options, characterId) {
  return (
    options?.buttons?.signaturesWidget?.autoMapper === true &&
    String(options?.tracking?.active) === String(characterId)
  );
}

async function claim(database, column, row, cutoff, now) {
  const allowed = new Set(['onlineCheckedAt', 'locationCheckedAt']);
  if (!allowed.has(column)) throw new Error(`Invalid tracking claim column ${column}`);
  const [result] = await database.execute(
    `UPDATE esi
        SET ${column} = ?
      WHERE userID = ? AND characterID = ?
        AND lastActive >= ?
        AND (${column} IS NULL OR ${column} <= ?)`,
    [
      mysqlDate(now),
      row.userID,
      row.characterID,
      mysqlDate(new Date(now.getTime() - ACTIVE_WINDOW_MS)),
      mysqlDate(cutoff),
    ],
  );
  return result.affectedRows === 1;
}

async function accessTokenFor(row, { database, esi, now }) {
  if (new Date(row.tokenExpire).getTime() - now.getTime() > TOKEN_REFRESH_WINDOW_MS) {
    return row.accessToken;
  }

  const refreshed = await esi.refreshAccessToken(row.refreshToken);
  const expires = new Date(now.getTime() + Number(refreshed.expires_in) * 1000);
  await database.execute(
    `UPDATE esi
        SET accessToken = ?, refreshToken = ?, tokenExpire = ?
      WHERE userID = ? AND characterID = ?`,
    [
      refreshed.access_token,
      refreshed.refresh_token || row.refreshToken,
      mysqlDate(expires),
      row.userID,
      row.characterID,
    ],
  );
  row.accessToken = refreshed.access_token;
  row.refreshToken = refreshed.refresh_token || row.refreshToken;
  row.tokenExpire = expires;
  return row.accessToken;
}

async function saveTracking({ database, staticData, row, maskId, options, location, ship, system }) {
  const typeName = staticData.shipTypeName(ship?.ship_type_id);
  await database.execute(
    'DELETE FROM tracking WHERE userID = ? AND characterID = ? AND maskID <> ?',
    [row.userID, row.characterID, maskId],
  );
  await database.execute(
    `INSERT INTO tracking
       (userID, characterID, characterName, systemID, systemName,
        stationID, stationName, shipID, shipName, shipTypeID, shipTypeName, maskID)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       userID = VALUES(userID), characterName = VALUES(characterName),
       systemID = VALUES(systemID), systemName = VALUES(systemName),
       stationID = VALUES(stationID), shipID = VALUES(shipID),
       shipName = VALUES(shipName), shipTypeID = VALUES(shipTypeID),
       shipTypeName = VALUES(shipTypeName)`,
    [
      row.userID,
      row.characterID,
      trackingName(row.characterName, options, row.characterID),
      location.solar_system_id,
      system.name,
      location.station_id || null,
      null,
      ship?.ship_item_id || null,
      ship?.ship_name || null,
      ship?.ship_type_id || null,
      typeName,
      maskId,
    ],
  );
}

export async function trackCharacters({
  database,
  esi,
  staticData,
  automap,
  logger = console,
  now: nowProvider = () => new Date(),
}) {
  if (!staticData) throw new Error('Static application data is required');

  await database.execute(
    `DELETE t FROM tracking t
      INNER JOIN esi e ON e.userID = t.userID AND e.characterID = t.characterID
      WHERE e.lastActive IS NULL
         OR e.lastActive < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)
         OR e.online = 0`,
  );
  const [rows] = await database.query(
    `SELECT e.userID, e.characterID, e.characterName, e.accessToken,
            e.refreshToken, e.tokenExpire, e.online, e.onlineCheckedAt,
            e.locationCheckedAt, e.locationObservedAt,
            e.lastLocationSystemID, c.corporationID, p.options
       FROM esi e
       INNER JOIN characters c ON c.userID = e.userID
       LEFT JOIN preferences p ON p.userID = e.userID
      WHERE e.lastActive >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)`,
  );

  const result = {
    eligible: rows.length,
    onlineChecks: 0,
    locationChecks: 0,
    transitions: 0,
    automapped: 0,
    errors: 0,
  };

  for (const row of rows) {
    try {
      const options = parseOptions(row.options);
      const maskId = selectedMask(row, options);
      let online = Boolean(row.online);
      let token;
      let checkNow = nowProvider();

      if (due(row.onlineCheckedAt, ONLINE_INTERVAL_MS, checkNow)) {
        const cutoff = new Date(checkNow.getTime() - ONLINE_INTERVAL_MS);
        if (await claim(database, 'onlineCheckedAt', row, cutoff, checkNow)) {
          token = await accessTokenFor(row, { database, esi, now: checkNow });
          const status = await esi.getOnline(row.characterID, token);
          online = status.online === true;
          await database.execute(
            'UPDATE esi SET online = ? WHERE userID = ? AND characterID = ?',
            [online ? 1 : 0, row.userID, row.characterID],
          );
          if (!online) {
            await database.execute(
              'DELETE FROM tracking WHERE userID = ? AND characterID = ?',
              [row.userID, row.characterID],
            );
          }
          result.onlineChecks += 1;
        }
      }

      checkNow = nowProvider();
      if (!online || !due(row.locationCheckedAt, LOCATION_INTERVAL_MS, checkNow)) continue;
      const cutoff = new Date(checkNow.getTime() - LOCATION_INTERVAL_MS);
      if (!(await claim(database, 'locationCheckedAt', row, cutoff, checkNow))) continue;

      token ||= await accessTokenFor(row, { database, esi, now: checkNow });
      const [location, ship] = await Promise.all([
        esi.getLocation(row.characterID, token),
        esi.getShip(row.characterID, token),
      ]);
      result.locationChecks += 1;

      const observedAt = nowProvider();
      const previousSystemId = row.lastLocationSystemID
        ? Number(row.lastLocationSystemID)
        : null;
      const gap = row.locationObservedAt
        ? observedAt.getTime() - new Date(row.locationObservedAt).getTime()
        : Infinity;
      const system = staticData.system(location.solar_system_id) || {
        name: String(location.solar_system_id),
      };
      const changed = previousSystemId && previousSystemId !== location.solar_system_id;

      if (changed) {
        result.transitions += 1;
        if (
          gap <= AUTOMAP_MAX_GAP_MS &&
          automapEnabled(options, row.characterID) &&
          typeof automap === 'function'
        ) {
          const mapped = await automap({
            database,
            staticData,
            row,
            maskId,
            fromSystemId: previousSystemId,
            toSystemId: location.solar_system_id,
            stationId: location.station_id || null,
            ship,
            observedAt,
          });
          if (mapped) result.automapped += 1;
        }
      }

      await saveTracking({ database, staticData, row, maskId, options, location, ship, system });
      await database.execute(
        `UPDATE esi
            SET lastLocationSystemID = ?, locationObservedAt = ?
          WHERE userID = ? AND characterID = ?`,
        [
          location.solar_system_id,
          mysqlDate(observedAt),
          row.userID,
          row.characterID,
        ],
      );
    } catch (error) {
      result.errors += 1;
      logger.error(`[character-tracking] ${row.characterID} failed`, error);
    }
  }

  return result;
}
