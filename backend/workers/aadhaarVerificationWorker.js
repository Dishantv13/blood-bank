import { Worker } from "bullmq";
import { bullConnection } from "../config/bullmq.js";
import { processAadhaarVerificationJob } from "../services/userService.js";

const aadhaarVerificationWorker = new Worker(
  "aadhaar-verification",
  async (job) => processAadhaarVerificationJob(job.data),
  {
    connection: bullConnection,
    concurrency: 1,
  },
);

aadhaarVerificationWorker.on("failed", (job, err) => {
  console.error(
    `[Worker] Aadhaar verification job ${job?.id || "unknown"} failed: ${err.message}`,
  );
});

export default aadhaarVerificationWorker;
