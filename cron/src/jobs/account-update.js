import { resolveCharacterAffiliations } from '../character-affiliations.js';
import { resolveCorporationNames } from '../corporation-names.js';

export async function updateAccounts({ database, esi }) {
  const [rows] = await database.query(`
    SELECT c.characterID, c.corporationID
    FROM active a
    INNER JOIN characters c ON a.userID = c.userID
  `);
  const characterIds = [...new Set(rows.map((row) => row.characterID))];
  const currentCorporationByCharacter = new Map(
    rows.map((row) => [row.characterID, row.corporationID]),
  );

  if (characterIds.length === 0) return { checked: 0, updated: 0 };

  const affiliations = await resolveCharacterAffiliations(esi, characterIds);
  const affiliationByCharacter = new Map(
    affiliations.map((affiliation) => [affiliation.character_id, affiliation]),
  );

  const changedAffiliations = affiliations.filter(
    (affiliation) =>
      currentCorporationByCharacter.get(affiliation.character_id) !==
      affiliation.corporation_id,
  );
  const corporationIds = [
    ...new Set(
      changedAffiliations.map((affiliation) => affiliation.corporation_id),
    ),
  ];
  const names = await resolveCorporationNames(esi, corporationIds);
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
