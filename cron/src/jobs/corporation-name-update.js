import { resolveCorporationNames } from '../corporation-names.js';

export async function updateCorporationNames({ database, esi }) {
  const [rows] = await database.query(`
    SELECT DISTINCT corporationID
    FROM characters
  `);
  const corporationIds = rows.map((row) => row.corporationID);

  if (corporationIds.length === 0) return { checked: 0, updated: 0 };

  const names = await resolveCorporationNames(esi, corporationIds);
  const sql = `
    UPDATE characters
    SET corporationName = ?
    WHERE corporationID = ? AND corporationName <> ?
  `;
  let updated = 0;

  for (const corporation of names) {
    const [result] = await database.execute(sql, [
      corporation.name,
      corporation.id,
      corporation.name,
    ]);
    updated += result.affectedRows;
  }

  return { checked: corporationIds.length, updated };
}
