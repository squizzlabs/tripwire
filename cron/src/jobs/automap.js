const GENERIC_SYSTEM_TYPES = [
  'Null-Sec', 'Low-Sec', 'High-Sec',
  'Class-1', 'Class-2', 'Class-3', 'Class-4', 'Class-5', 'Class-6', 'Class-13',
  'Triglavian', 'Unknown', 'Unknown (small)', 'Dangerous',
  'Class-14', 'Class-15', 'Class-16', 'Class-17', 'Class-18',
];
const POD_TYPE_IDS = new Set([33328, 670]);
const NO_MAP_SYSTEMS = new Set([30000142, 30002187]);

function genericTypes(system) {
  if (system.wormholeClass) return [`Class-${system.wormholeClass}`];
  if (Number(system.factionID) === 500026) return ['Triglavian'];
  if (Number(system.security) >= 0.45) return ['High-Sec'];
  if (Number(system.security) > 0) return ['Low-Sec'];
  return ['Null-Sec'];
}

function classesForTypeName(name) {
  if (name?.startsWith('Class-')) return [Number(name.slice(6))];
  if (name === 'Dangerous') return [4, 5];
  if (name === 'Unknown') return [2, 3];
  if (name === 'Unknown (small)') return [1, 2, 3, 13];
  return [];
}

function includesType(value, targetTypes) {
  const values = Array.isArray(value) ? value : [value];
  return values.some((item) => targetTypes.includes(item));
}

function candidateMatches(candidate, targetSystem, wormholeTypes) {
  const targetTypes = genericTypes(targetSystem);
  const targetClass = Number(targetSystem.wormholeClass) || null;
  if (candidate.targetSystemID === null) {
    const wormholeType = wormholeTypes[candidate.wormholeType];
    return !wormholeType || includesType(wormholeType.leadsTo, targetTypes);
  }

  const genericName = GENERIC_SYSTEM_TYPES[Number(candidate.targetSystemID)];
  if (!genericName) return false;
  if (targetTypes.includes(genericName)) return true;
  return targetClass !== null && classesForTypeName(genericName).includes(targetClass);
}

async function insertSignature(connection, { systemId, row, maskId, observedAt }) {
  const [result] = await connection.execute(
    `INSERT INTO signatures
       (signatureID, systemID, type, name, bookmark, lifeTime, lifeLeft,
        lifeLength, createdByID, createdByName, modifiedByID, modifiedByName,
        modifiedTime, maskID)
     VALUES (NULL, ?, 'wormhole', NULL, NULL, ?, DATE_ADD(?, INTERVAL 72 HOUR),
             259200, ?, ?, ?, ?, ?, ?)`,
    [
      systemId,
      observedAt,
      observedAt,
      row.characterID,
      row.characterName,
      row.characterID,
      row.characterName,
      observedAt,
      maskId,
    ],
  );
  return result.insertId;
}

export async function automapTransition({
  database,
  staticData,
  row,
  maskId,
  fromSystemId,
  toSystemId,
  stationId,
  ship,
  observedAt,
  logger = console,
}) {
  const notMapped = (reason, details = {}) => {
    logger.info?.(`[character-tracking] connection not mapped ${JSON.stringify({
      characterID: Number(row.characterID),
      characterName: row.characterName,
      maskID: maskId,
      fromSystemID: fromSystemId,
      toSystemID: toSystemId,
      reason,
      ...details,
    })}`);
    return false;
  };

  if (stationId) return notMapped('in_station', { stationID: stationId });
  if (POD_TYPE_IDS.has(Number(ship?.ship_type_id))) {
    return notMapped('in_pod', { shipTypeID: Number(ship.ship_type_id) });
  }
  if (NO_MAP_SYSTEMS.has(fromSystemId) || NO_MAP_SYSTEMS.has(toSystemId)) {
    return notMapped('pod_out_system');
  }

  const connection = await database.getConnection();
  const low = Math.min(fromSystemId, toSystemId);
  const high = Math.max(fromSystemId, toSystemId);
  const lockName = `tripwire:automap:${maskId}:${low}:${high}`;
  let locked = false;

  try {
    const [lockRows] = await connection.execute('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
    locked = Number(lockRows[0]?.acquired) === 1;
    if (!locked) return notMapped('lock_timeout');

    const fromSystem = staticData.system(fromSystemId);
    const toSystem = staticData.system(toSystemId);
    if (!fromSystem || !toSystem) return notMapped('unknown_system');
    if (Number(fromSystem.regionID) > 12000000 || Number(toSystem.regionID) > 12000000) {
      return notMapped('special_space');
    }
    if (staticData.isGate(fromSystemId, toSystemId)) return notMapped('stargate');

    await connection.beginTransaction();

    const [existing] = await connection.execute(
      `SELECT w.id
         FROM wormholes w
         INNER JOIN signatures a ON a.id = w.initialID
         INNER JOIN signatures b ON b.id = w.secondaryID
        WHERE w.maskID = ?
          AND ((a.systemID = ? AND b.systemID = ?)
            OR (a.systemID = ? AND b.systemID = ?))
        LIMIT 1`,
      [maskId, fromSystemId, toSystemId, toSystemId, fromSystemId],
    );
    if (existing.length) {
      await connection.rollback();
      return notMapped('connection_exists');
    }

    const [candidateRows] = await connection.execute(
      `SELECT w.id AS wormholeID, w.type AS wormholeType,
              b.id AS targetSignatureID, b.systemID AS targetSystemID
         FROM wormholes w
         INNER JOIN signatures a ON a.id = w.initialID
         INNER JOIN signatures b ON b.id = w.secondaryID
        WHERE w.maskID = ? AND a.systemID = ?`,
      [maskId, fromSystemId],
    );
    const candidates = candidateRows.filter((candidate) =>
      candidateMatches(candidate, toSystem, staticData.wormholeTypes));

    if (candidates.length > 1) {
      // Never leave an observed jump unmapped and never guess which scanned
      // signature it used. Create a safe connection now, then let the browser
      // either keep it or replace it with one of the matching signatures.
      const initialId = await insertSignature(connection, {
        systemId: fromSystemId, row, maskId, observedAt,
      });
      const secondaryId = await insertSignature(connection, {
        systemId: toSystemId, row, maskId, observedAt,
      });
      const [wormholeResult] = await connection.execute(
        `INSERT INTO wormholes
           (initialID, secondaryID, type, parent, life, mass, maskID)
         VALUES (?, ?, NULL, 'initial', 'stable', 'stable', ?)`,
        [initialId, secondaryId, maskId],
      );
      await connection.execute(
        `INSERT INTO statistics (userID, characterID, maskID, wormholes_added)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE wormholes_added = wormholes_added + 1`,
        [row.userID, row.characterID, maskId],
      );
      try {
        await connection.execute(
          `INSERT INTO automap_pending
             (userID, characterID, characterName, maskID, fromSystemID,
              toSystemID, observedAt, createdWormholeID, candidates)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.userID,
            row.characterID,
            row.characterName,
            maskId,
            fromSystemId,
            toSystemId,
            observedAt,
            wormholeResult.insertId,
            JSON.stringify(candidates.map((candidate) => ({
              wormholeID: Number(candidate.wormholeID),
              targetSignatureID: Number(candidate.targetSignatureID),
            }))),
          ],
        );
      } catch (error) {
        logger.error?.(
          '[character-tracking] unable to queue automap signature choice; '
          + 'keeping newly created connection',
          error,
        );
      }
      await connection.commit();
      logger.info?.(`[character-tracking] multiple connection candidates ${JSON.stringify({
        characterID: Number(row.characterID),
        characterName: row.characterName,
        maskID: maskId,
        fromSystemID: fromSystemId,
        toSystemID: toSystemId,
        candidates: candidates.length,
        action: 'awaiting_user_selection',
      })}`);
      return true;
    }

    if (candidates.length === 1) {
      await connection.execute(
        `UPDATE signatures
            SET systemID = ?, modifiedByID = ?, modifiedByName = ?, modifiedTime = ?
          WHERE id = ? AND maskID = ?`,
        [
          toSystemId,
          row.characterID,
          row.characterName,
          observedAt,
          candidates[0].targetSignatureID,
          maskId,
        ],
      );
    } else {
      const initialId = await insertSignature(connection, {
        systemId: fromSystemId, row, maskId, observedAt,
      });
      const secondaryId = await insertSignature(connection, {
        systemId: toSystemId, row, maskId, observedAt,
      });
      await connection.execute(
        `INSERT INTO wormholes
           (initialID, secondaryID, type, parent, life, mass, maskID)
         VALUES (?, ?, NULL, 'initial', 'stable', 'stable', ?)`,
        [initialId, secondaryId, maskId],
      );
      await connection.execute(
        `INSERT INTO statistics (userID, characterID, maskID, wormholes_added)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE wormholes_added = wormholes_added + 1`,
        [row.userID, row.characterID, maskId],
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    try { await connection.rollback(); } catch {}
    throw error;
  } finally {
    if (locked) {
      try { await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]); } catch {}
    }
    connection.release();
  }
}
