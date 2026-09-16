import { fetchEsiBulkResilient } from './esi-bulk.js';

export function resolveCorporationNames(esi, corporationIds) {
  return fetchEsiBulkResilient(
    corporationIds,
    (batch) => esi.getNames(batch),
    async (corporationId) => {
      const corporation = await esi.getCorporation(corporationId);
      return {
        category: 'corporation',
        id: corporationId,
        name: corporation.name,
      };
    },
  );
}
