import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve('/Users/amirriahi/Projects/codepilot-ai/.env'),
  override: true,
});

import { Worker } from 'bullmq';
import { runAudit } from './runner';

const queueName = 'analysis';
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

const worker = new Worker(
  queueName,
  async (job) => {
    if (job.name !== 'repository-audit') return;
    await runAudit(String(job.data.auditId));
  },
  {
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      password: redisUrl.password || undefined,
    },
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
  },
);

worker.on('completed', (job) => {
  console.log(`Audit ${job.data.auditId} completed`);
});

worker.on('failed', (job, err) => {
  console.error(
    `Audit ${job?.data?.auditId ?? 'unknown'} failed`,
    err,
  );
});

console.log('CodePilot analysis worker is running');