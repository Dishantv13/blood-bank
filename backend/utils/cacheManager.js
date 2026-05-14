import { getRedisClient } from "../config/redis.js";

const CACHE_PREFIX = "bb_cache:";

class CacheManager {
  constructor() {
    this.prefix = CACHE_PREFIX;
    this.localCache = new Map();
    this.localMaxItems = 1000;
  }

  _buildKey(key) {
    return `${this.prefix}${key}`;
  }

  // Simple LRU eviction for local memory.
  _evictLocal() {
    if (this.localCache.size > this.localMaxItems) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }
  }

  async get(key) {
    try {
      const client = await getRedisClient();

      // Try Redis first
      if (client?.isReady) {
        const value = await client.get(this._buildKey(key));
        if (value) return JSON.parse(value);
      }

      // Fallback to local memory if Redis is down or key is missing
      const local = this.localCache.get(key);
      if (local && local.expires > Date.now()) {
        return local.value;
      }

      return null;
    } catch (err) {
      console.error(`Cache Get Error [${key}]:`, err.message);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600, tags = []) {
    try {
      const client = await getRedisClient();

      this._evictLocal();
      this.localCache.set(key, {
        value,
        expires: Date.now() + ttlSeconds * 1000,
        tags,
      });

      // Try setting in Redis for distribution
      if (client?.isReady) {
        const fullKey = this._buildKey(key);
        await client.set(fullKey, JSON.stringify(value), {
          EX: ttlSeconds,
        });

        // Store tags in a Redis set
        for (const tag of tags) {
          await client.sAdd(this._buildKey(`tag:${tag}`), fullKey);
          await client.expire(this._buildKey(`tag:${tag}`), 86400); // 1 day cleanup
        }
      }

      return true;
    } catch (err) {
      console.error(`Cache Set Error [${key}]:`, err.message);
      return false;
    }
  }

  // Deletes a specific key from cache.
  async del(key) {
    try {
      const client = await getRedisClient();
      this.localCache.delete(key);
      if (client?.isReady) {
        await client.del(this._buildKey(key));
      }
      return true;
    } catch (err) {
      console.error(`Cache Delete Error [${key}]:`, err.message);
      return false;
    }
  }

  async invalidateTags(tags) {
    if (!Array.isArray(tags)) tags = [tags];
    try {
      const client = await getRedisClient();

      // Clear local memory
      for (const [key, entry] of this.localCache.entries()) {
        if (entry.tags?.some((t) => tags.includes(t))) {
          this.localCache.delete(key);
        }
      }

      // Clear Redis
      if (client?.isReady) {
        for (const tag of tags) {
          const tagKey = this._buildKey(`tag:${tag}`);
          const keys = await client.sMembers(tagKey);
          if (keys.length > 0) {
            await client.del(keys);
          }
          await client.del(tagKey);
        }
      }
      return true;
    } catch (err) {
      console.error(`Cache Invalidate Tags Error [${tags}]:`, err.message);
      return false;
    }
  }

  // Invalidate multiple items using a glob pattern.
  async invalidatePattern(pattern) {
    try {
      const client = await getRedisClient();

      // Clear local memory matching pattern
      const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
      for (const key of this.localCache.keys()) {
        if (regex.test(key)) this.localCache.delete(key);
      }

      // Clear Redis if available
      if (client?.isReady) {
        const keys = await client.keys(`${this.prefix}${pattern}`);
        if (keys.length > 0) {
          await client.del(keys);
        }
      }
      return true;
    } catch (err) {
      console.error(`Cache Invalidate Error [${pattern}]:`, err.message);
      return false;
    }
  }
}

export default new CacheManager();
