import { Worker } from 'bullmq';
import { bullConnection } from '../config/bullmq.js';
import * as certificateService from '../services/certificateService.js';
import donationRepository from '../repositories/DonationRepository.js';

const certificateWorker = new Worker(
  'certificate-generation',
  async (job) => {
    const { donationId } = job.data;
    console.log(`[Worker] Generating certificate for donation: ${donationId}`);

    try {
      // 1. Fetch donation details
      const donation = await donationRepository.findById(donationId, {
        populate: [
          { path: 'donor', select: 'name bloodGroup' },
          { path: 'bloodBank', select: 'name' },
          { path: 'camp', select: 'name' },
        ],
      });

      if (!donation) throw new Error('Donation record not found');

      const pdfBuffer = await certificateService.generateDonationCertificate(donation);

      console.log(`[Worker] Successfully generated certificate for ${donationId}`);
      
      return { 
        success: true, 
        donationId,
      };
    } catch (error) {
      console.error(`[Worker] Failed for donation ${donationId}:`, error.message);
      throw error; 
    }
  },
  { 
    connection: bullConnection,
    concurrency: 2,
  }
);

certificateWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed. Data cleaned from Redis.`);
});

certificateWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed after retries:`, err.message);
});

export default certificateWorker;
