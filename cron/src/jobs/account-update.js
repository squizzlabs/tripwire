export async function updateAccounts({ database, esi }) {
  const [rows] = await database.query(`
    SELECT c.characterID
    FROM active a
    INNER JOIN characters c ON a.userID = c.userID
  `);
  const characterIds = rows.map((row) => row.characterID);

  if (characterIds.length === 0) return { checked: 0, updated: 0 };

  const affiliations = await esi.getAffiliations(characterIds);
  const affiliationByCharacter = new Map(
    affiliations.map((affiliation) => [affiliation.character_id, affiliation]),
  );

  // Preserve the old job's request shape, including duplicate corporation IDs.
  const corporationIds = affiliations.map(
    (affiliation) => affiliation.corporation_id,
  );
  const names = await esi.getNames(corporationIds);
  const nameById = new Map(names.map((name) => [name.id, name]));

  const sql = `
    UPDATE characters
    SET corporationID = ?, corporationName = ?, ban = 0, admin = 0
    WHERE characterID = ? AND corporationID <> ?
  `;
  let updated = 0;

  for (const characterId of characterIds) {
    const affiliation = affiliationByCharacter.get(characterId);
    const corporation = affiliation
      ? nameById.get(affiliation.corporation_id)
      : undefined;

    if (!affiliation || !corporation) continue;

    const [result] = await database.execute(sql, [
      affiliation.corporation_id,
      corporation.name,
      characterId,
      affiliation.corporation_id,
    ]);
    updated += result.affectedRows;
  }

  return { checked: characterIds.length, updated };
}
