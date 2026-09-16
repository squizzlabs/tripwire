import cron from 'node-cron';
import mysql from 'mysql2/promise';

import { loadConfig } from './config.js';
import { EsiClient } from './esi-client.js';
import { jobs } from './jobs.js';
import { createScheduler } from './scheduler.js';
import { loadStaticData } from './static-data.js';

const config = loadConfig();
const database = mysql.createPool(config.database);
const esi = new EsiClient(config.esi);
const staticData = loadStaticData();
const context = { database, esi, logger: console, staticData };
const runOnce = process.argv[2] === '--run';
const requestedJob = runOnce ? process.argv[3] : undefined;

if (runOnce) {
  if (!requestedJob) {
    throw new Error(
      `A job name is required. Available jobs: ${jobs.map(({ name }) => name).join(', ')}`,
    );
  }
  const job = jobs.find(({ name }) => name === requestedJob);
  if (!job) {
    throw new Error(
      `Unknown job ${requestedJob}. Available jobs: ${jobs.map(({ name }) => name).join(', ')}`,
    );
  }

  try {
    const result = await job.run({
      ...context,
      dryRun: process.argv.includes('--dry-run'),
    });
    console.info(`[${job.name}] completed`, result);
  } finally {
    await database.end();
  }
} else {
  const scheduler = createScheduler({
    cron,
    jobs,
    context,
    timezone: config.timezone,
  });

  let stopping = false;
  async function stop(signal) {
    if (stopping) return;
    stopping = true;
    console.info(`Received ${signal}; stopping cron scheduler`);
    await scheduler.stop();
    await database.end();
  }

  process.once('SIGTERM', () => stop('SIGTERM'));
  process.once('SIGINT', () => stop('SIGINT'));
}
