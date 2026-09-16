import { updateAccounts } from './jobs/account-update.js';
import { automapTransition } from './jobs/automap.js';
import { trackCharacters } from './jobs/character-tracking.js';
import { updateCorporationNames } from './jobs/corporation-name-update.js';
import { collectSystemActivity } from './jobs/system-activity.js';
import { pruneSystemActivity } from './jobs/system-activity-prune.js';

export const jobs = [
  {
    name: 'character-tracking',
    schedule: '* * * * * *',
    logStart: false,
    // The job itself logs state changes and per-character errors. Poll counts
    // are operational noise at a one-second schedule.
    shouldLogResult: () => false,
    run: (context) => trackCharacters({ ...context, automap: automapTransition }),
  },
  {
    name: 'system-activity',
    schedule: '0 * * * *',
    logStart: false,
    run: collectSystemActivity,
  },
  {
    name: 'account-update',
    schedule: '*/3 * * * *',
    logStart: false,
    shouldLogResult: (result) => result.updated > 0,
    run: updateAccounts,
  },
  {
    name: 'corporation-name-update',
    schedule: '0 0 * * *',
    logStart: false,
    shouldLogResult: (result) => result.updated > 0,
    run: updateCorporationNames,
  },
  {
    name: 'system-activity-prune',
    schedule: '17 4 * * *',
    logStart: false,
    // The job logs its cutoff, retained-row count, deletion count, and cap
    // status itself. A scheduler completion line would repeat that summary.
    shouldLogResult: () => false,
    run: pruneSystemActivity,
  },
];
