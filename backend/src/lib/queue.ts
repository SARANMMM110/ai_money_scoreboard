import { Queue, Worker } from 'bullmq';
import { config } from '../config.js';
import { runVisibilityJob } from '../visibility/service.js';
import { processDueSchedules } from '../visibility/scheduler.js';

let visibilityQueue: Queue | null = null;
let scheduleInterval: ReturnType<typeof setInterval> | null = null;

function queueConnection() {
  if (!config.redisUrl) return null;
  return { url: config.redisUrl, maxRetriesPerRequest: null } as const;
}

export function initQueues(): void {
  const connection = queueConnection();
  if (connection) {
    visibilityQueue = new Queue('visibility-runs', { connection });
    new Worker(
      'visibility-runs',
      async (job) => {
        if (job.name === 'run') await runVisibilityJob(job.data.runId as string);
        if (job.name === 'schedules') await processDueSchedules();
      },
      { connection, concurrency: config.visibilityConcurrency },
    );
    scheduleInterval = setInterval(() => {
      visibilityQueue?.add('schedules', {}, { removeOnComplete: true }).catch(console.error);
    }, 60_000);
    console.log('[Queue] BullMQ connected — visibility runs queued via Redis');
    return;
  }

  console.warn('[Queue] REDIS_URL not set — visibility runs use in-process fallback');
}

export async function enqueueVisibilityRun(runId: string): Promise<void> {
  if (visibilityQueue) {
    await visibilityQueue.add('run', { runId }, { attempts: 2, removeOnComplete: 100 });
    return;
  }
  setImmediate(() => runVisibilityJob(runId).catch(console.error));
}
