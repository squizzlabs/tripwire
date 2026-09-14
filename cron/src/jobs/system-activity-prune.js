export const RETENTION_HOURS = 192;
export const BATCH_SIZE = 5_000;
export const MAX_BATCHES = 500;
const GRAPH_REACH_HOURS = 169;

function formatNumber(number) {
  return new Intl.NumberFormat('en-US').format(number);
}

export function cutoffAt(date = new Date()) {
  const cutoff = new Date(date);
  cutoff.setUTCMinutes(0, 0, 0);
  cutoff.setUTCHours(cutoff.getUTCHours() - RETENTION_HOURS);
  return cutoff.toISOString().slice(0, 19).replace('T', ' ');
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function pruneSystemActivity({
  database,
  dryRun = false,
  now = () => new Date(),
  logger = console,
  pause = delay,
}) {
  const label = dryRun ? 'prune (dry run)' : 'prune';

  if (RETENTION_HOURS < GRAPH_REACH_HOURS) {
    throw new Error(
      `${label}: RETENTION_HOURS is ${RETENTION_HOURS}, below the ` +
        `${GRAPH_REACH_HOURS} hours the graph can request. Refusing.`,
    );
  }

  const cutoff = cutoffAt(now());
  const [survivingRows] = await database.execute(
    'SELECT COUNT(*) AS count FROM system_activity WHERE time >= ?',
    [cutoff],
  );
  const surviving = Number(survivingRows[0].count);

  if (surviving === 0) {
    throw new Error(`${label}: cutoff ${cutoff} would leave the table empty. Refusing.`);
  }

  const [expiredRows] = await database.execute(
    'SELECT COUNT(*) AS count FROM system_activity WHERE time < ?',
    [cutoff],
  );
  const expired = Number(expiredRows[0].count);
  logger.info(
    `${label}: cutoff ${cutoff} UTC, ${formatNumber(expired)} rows older, ` +
      `${formatNumber(surviving)} to keep`,
  );

  if (dryRun || expired === 0) {
    return { cutoff, expired, surviving, deleted: 0, batches: 0 };
  }

  let deleted = 0;
  let batches = 0;

  for (let index = 0; index < MAX_BATCHES; index += 1) {
    const [result] = await database.execute(
      `DELETE FROM system_activity WHERE time < ? ORDER BY time LIMIT ${BATCH_SIZE}`,
      [cutoff],
    );
    deleted += result.affectedRows;
    batches += 1;

    if (result.affectedRows < BATCH_SIZE) break;
    await pause(100);
  }

  logger.info(
    `${label}: deleted ${formatNumber(deleted)} rows in ${batches} ` +
      `batch${batches === 1 ? '' : 'es'}`,
  );
  if (deleted >= MAX_BATCHES * BATCH_SIZE) {
    logger.info(
      `${label}: hit the per-run cap, ${formatNumber(expired - deleted)} ` +
        'rows still expired. Run again.',
    );
  }

  return { cutoff, expired, surviving, deleted, batches };
}
