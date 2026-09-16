import { readFileSync } from 'node:fs';

export function loadStaticData(
  source = new URL('../../public/js/combine.js', import.meta.url),
) {
  const javascript = readFileSync(source, 'utf8');
  const prefix = 'var appData = ';
  if (!javascript.startsWith(prefix)) {
    throw new Error('public/js/combine.js does not contain the expected appData payload');
  }
  const data = JSON.parse(javascript.slice(prefix.length));

  return {
    wormholeTypes: data.wormholes,
    system(systemId) {
      const system = data.systems[systemId];
      return system
        ? { ...system, wormholeClass: system.class }
        : undefined;
    },
    isGate(fromSystemId, toSystemId) {
      const from = data.map.shortest[fromSystemId - 30000000];
      return Boolean(from && from[toSystemId - 30000000] !== undefined);
    },
    shipTypeName(typeId) {
      return data.mass[typeId]?.typeName || null;
    },
  };
}
