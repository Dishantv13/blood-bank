import { Worker } from 'bullmq';
import { bullConnection } from '../config/bullmq.js';
import * as certificateService from '../services/certificateService.js';
import donationRepository from '../repositories/DonationRepository.js';

const certificateWorker = new Worker(
  'certificate-generation',
  async (job) => {
    const { donationId } = job.data;
    
    try {
      // 1. Fetch donation details
      const donation = await donationRepository.findById(donationId, {
        populate: [
          { path: 'donor', select: 'name bloodGroup' },
          { path: 'bloodBank', select: 'name' },
          { path: 'camp', select: 'name' },
        ],
      });

      if (!donation) {
        throw new Error('Donation record not found');
      }

      const pdfBuffer = await certificateService.generateDonationCertificate(donation);

      return { 
        success: true, 
        donationId,
        size: pdfBuffer.length
      };
    } catch (error) {
      console.error(`[Worker] ❌ ERROR in Job ${job.id} (Donation: ${donationId}):`);
      console.error(`[Worker] Message: ${error.message}`);
      throw error; 
    }
  },
  { 
    connection: bullConnection,
    concurrency: 2,
  }
);

certificateWorker.on('completed', (job) => {
  // Silent success
});

certificateWorker.on('failed', (job, err) => {
  console.error(`[Worker] 💥 Job ${job.id} FAILED permanently: ${err.message}`);
});

export default certificateWorker;
