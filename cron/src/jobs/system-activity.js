const KEYS = ['ship_jumps', 'ship_kills', 'pod_kills', 'npc_kills'];

function emptyActivity() {
  return Object.fromEntries(KEYS.map((key) => [key, 0]));
}

export function mergeActivity(jumps, kills) {
  const activity = new Map();

  for (const system of jumps) {
    activity.set(system.system_id, {
      ...emptyActivity(),
      ship_jumps: system.ship_jumps,
    });
  }

  for (const system of kills) {
    const current = activity.get(system.system_id) || emptyActivity();
    current.ship_kills = system.ship_kills;
    current.pod_kills = system.pod_kills;
    current.npc_kills = system.npc_kills;
    activity.set(system.system_id, current);
  }

  return activity;
}

export function utcHour(date = new Date()) {
  return date.toISOString().slice(0, 13).replace('T', ' ') + ':00:00';
}

export async function collectSystemActivity({ database, esi, now = () => new Date() }) {
  // Take the bucket before either network request, exactly as the legacy job
  // did, so a slow ESI response across the hour boundary cannot shift the row.
  const time = utcHour(now());

  // Keep the PHP job's ordering: jumps establish the rows, then kills fill in
  // matching rows or create zero-jump rows of their own.
  const jumps = await esi.getJumps();
  const kills = await esi.getKills();
  const activity = mergeActivity(jumps, kills);

  const sql = `
    INSERT INTO system_activity
      (systemID, time, shipJumps, shipKills, podKills, npcKills)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  for (const [systemId, data] of activity) {
    await database.execute(sql, [
      systemId,
      time,
      data.ship_jumps,
      data.ship_kills,
      data.pod_kills,
      data.npc_kills,
    ]);
  }

  return { inserted: activity.size, time };
}
