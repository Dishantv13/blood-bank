import { Queue } from 'bullmq';
import { bullConnection, DEFAULT_JOB_OPTIONS } from '../config/bullmq.js';

/**
 * Queue for certificate generation tasks.
 */
export const certificateQueue = new Queue('certificate-generation', {
  connection: bullConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

/**
 * Helper to add a job to the certificate queue
 */
export const queueCertificateGeneration = async (data) => {
  return await certificateQueue.add('generate-donation-cert', data);
};
