import { Queue } from "bullmq";
import { bullConnection, DEFAULT_JOB_OPTIONS } from "../config/bullmq.js";

export const aadhaarVerificationQueue =
  process.env.NODE_ENV === "test"
    ? { add: async () => ({ id: "mock-id" }) }
    : new Queue("aadhaar-verification", {
        connection: bullConnection,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      });

export const queueAadhaarVerification = async (data) =>
  aadhaarVerificationQueue.add("verify-aadhaar-document", data);
