import { updateAccounts } from './jobs/account-update.js';
import { automapTransition } from './jobs/automap.js';
import { trackCharacters } from './jobs/character-tracking.js';
import { collectSystemActivity } from './jobs/system-activity.js';
import { pruneSystemActivity } from './jobs/system-activity-prune.js';

export const jobs = [
  {
    name: 'character-tracking',
    schedule: '* * * * * *',
    run: (context) => trackCharacters({ ...context, automap: automapTransition }),
  },
  {
    name: 'system-activity',
    schedule: '0 * * * *',
    run: collectSystemActivity,
  },
  {
    name: 'account-update',
    schedule: '*/3 * * * *',
    run: updateAccounts,
  },
  {
    name: 'system-activity-prune',
    schedule: '17 4 * * *',
    run: pruneSystemActivity,
  },
];
