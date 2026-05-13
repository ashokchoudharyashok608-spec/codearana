import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { redis } from './redis';
import { logger } from './logger';
import { processSubmissionJob } from '../../submissions/submissions.worker';

// ── Queues ────────────────────────────────────────────────────────────────────
export const submissionQueue = new Queue('submissions', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const emailQueue = new Queue('emails', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 50 },
  },
});

// ── Workers ───────────────────────────────────────────────────────────────────
let submissionWorker: Worker | null = null;

export async function initQueues() {
  // Submission worker
  submissionWorker = new Worker(
    'submissions',
    async (job: Job) => {
      return processSubmissionJob(job);
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    },
  );

  submissionWorker.on('completed', (job) => {
    logger.info(`Submission job ${job.id} completed`);
  });

  submissionWorker.on('failed', (job, err) => {
    logger.error(`Submission job ${job?.id} failed:`, err);
  });

  // Email worker
  const emailWorker = new Worker(
    'emails',
    async (job: Job) => {
      const { processEmailJob } = await import('../../shared/utils/email');
      return processEmailJob(job);
    },
    { connection: redis, concurrency: 3 },
  );

  emailWorker.on('failed', (job, err) => {
    logger.error(`Email job ${job?.id} failed:`, err);
  });

  // Queue events for monitoring
  const queueEvents = new QueueEvents('submissions', { connection: redis });
  queueEvents.on('stalled', ({ jobId }) => {
    logger.warn(`Submission job ${jobId} stalled`);
  });

  logger.info('📬 BullMQ workers initialized');
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    submissionQueue.getWaitingCount(),
    submissionQueue.getActiveCount(),
    submissionQueue.getCompletedCount(),
    submissionQueue.getFailedCount(),
    submissionQueue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}
