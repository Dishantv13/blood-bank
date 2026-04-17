import { getRedisClient } from '../config/redis.js';
const redisClient = {
  get isReady() {
    return false; 
  },

  async client() {
    return await getRedisClient();
  },

  async get(key) {
    try {
      const c = await getRedisClient();
      if (!c?.isReady) return null;
      return await c.get(key);
    } catch (err) {
      console.error(`Redis GET Error [${key}]:`, err.message);
      return null;
    }
  },

  async set(key, value, EX = 3600) {
    try {
      const c = await getRedisClient();
      if (!c?.isReady) return false;
      await c.set(key, value, { EX });
      return true;
    } catch (err) {
      console.error(`Redis SET Error [${key}]:`, err.message);
      return false;
    }
  },

  async del(key) {
    try {
      const c = await getRedisClient();
      if (!c?.isReady) return false;
      await c.del(key);
      return true;
    } catch (err) {
      console.error(`Redis DEL Error [${key}]:`, err.message);
      return false;
    }
  }
};

export default redisClient;
