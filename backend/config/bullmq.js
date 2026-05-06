import { redisConfig } from "./redis.js";

export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: true,
  removeOnFail: 10,
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
};

export const bullConnection = {
  host: redisConfig.socket.host,
  port: redisConfig.socket.port,
  password: redisConfig.password,
  username: redisConfig.username,
  tls: redisConfig.socket.tls ? {} : undefined,
};
