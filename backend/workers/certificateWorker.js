import { Worker } from 'bullmq';
import { bullConnection } from '../config/bullmq.js';
import * as certificateService from '../services/certificateService.js';
import donationRepository from '../repositories/DonationRepository.js';

/**
 * Worker to process certificate generation tasks.
 */
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

      // 2. Generate PDF Buffer
      const pdfBuffer = await certificateService.generateDonationCertificate(donation);

      // 3. Mark job as successful with the result (in-memory buffer for now)
      // Note: In production, you would upload this to Cloudinary and return the URL
      console.log(`[Worker] Successfully generated certificate for ${donationId}`);
      
      return { 
        success: true, 
        donationId,
        // pdfBuffer: pdfBuffer.toString('base64') // Optional: send back as base64 if needed immediately
      };
    } catch (error) {
      console.error(`[Worker] Failed for donation ${donationId}:`, error.message);
      throw error; // Rethrow to trigger BullMQ retry logic
    }
  },
  { 
    connection: bullConnection,
    concurrency: 2, // Process only 2 certificates at a time to save CPU
  }
);

certificateWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed. Data cleaned from Redis.`);
});

certificateWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed after retries:`, err.message);
});

export default certificateWorker;
