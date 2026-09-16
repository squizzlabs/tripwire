import { fetchEsiBulkResilient } from './esi-bulk.js';

export function resolveCharacterAffiliations(esi, characterIds) {
  return fetchEsiBulkResilient(
    characterIds,
    (batch) => esi.getAffiliations(batch),
    async (characterId) => {
      const character = await esi.getCharacter(characterId);
      return {
        character_id: characterId,
        corporation_id: character.corporation_id,
      };
    },
  );
}
