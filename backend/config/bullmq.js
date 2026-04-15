import { redisConfig } from './redis.js';

/**
 * Base configuration for BullMQ to optimize Redis storage.
 * removeOnComplete: true - Immediately deletes the job from Redis once done.
 * removeOnFail: 10 - Keeps ONLY the last 10 failed jobs for debugging (saves space).
 */
export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: true,
  removeOnFail: 10,
  attempts: 3, // Retry up to 3 times if it fails
  backoff: {
    type: 'exponential',
    delay: 5000, // Wait 5s, then 10s, then 20s before retrying
  },
};

export const bullConnection = {
  host: redisConfig.socket.host,
  port: redisConfig.socket.port,
  password: redisConfig.password,
  username: redisConfig.username,
  // Use TLS if enabled in your .env
  tls: redisConfig.socket.tls ? {} : undefined,
};
