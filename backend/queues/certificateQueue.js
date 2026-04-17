import { Queue } from 'bullmq';
import { bullConnection, DEFAULT_JOB_OPTIONS } from '../config/bullmq.js';

export const certificateQueue = new Queue('certificate-generation', {
  connection: bullConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const queueCertificateGeneration = async (data) => {
  return await certificateQueue.add('generate-donation-cert', data);
};
