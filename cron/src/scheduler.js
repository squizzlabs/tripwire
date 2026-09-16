export function createScheduler({ cron, jobs, context, timezone, logger = console }) {
  const running = new Set();
  const runningJobs = new Set();

  async function run(job, options = {}) {
    const started = Date.now();
    if (job.logStart !== false) logger.info(`[${job.name}] started`);

    try {
      const result = await job.run({ ...context, ...options });
      if (!job.shouldLogResult || job.shouldLogResult(result)) {
        logger.info(
          `[${job.name}] completed in ${Date.now() - started}ms ${JSON.stringify(result)}`,
        );
      }
      return result;
    } catch (error) {
      logger.error(`[${job.name}] failed in ${Date.now() - started}ms`, error);
      throw error;
    }
  }

  const tasks = jobs.map((job) => {
    if (!cron.validate(job.schedule)) {
      throw new Error(`Invalid schedule for ${job.name}: ${job.schedule}`);
    }

    const task = cron.schedule(
      job.schedule,
      () => {
        // node-cron's built-in noOverlap guard writes one warning for every
        // blocked tick. Character tracking deliberately ticks once a second,
        // so a normal multi-second sweep otherwise floods production logs.
        // Keep the same single-flight behavior without logging skipped ticks.
        if (runningJobs.has(job.name)) return undefined;

        runningJobs.add(job.name);
        const execution = run(job).catch(() => undefined);
        running.add(execution);
        execution.finally(() => {
          running.delete(execution);
          runningJobs.delete(job.name);
        });
        return execution;
      },
      { name: job.name, timezone },
    );
    logger.info(`[${job.name}] scheduled: ${job.schedule} (${timezone})`);
    return task;
  });

  return {
    run,
    async stop() {
      for (const task of tasks) task.stop();
      await Promise.allSettled(running);
      for (const task of tasks) await task.destroy();
    },
  };
}
