import { createClient } from 'redis';

let _client = null;
let _connectionFailed = false;

/**
 * Returns a connected Redis client, or null when Redis is unavailable.
 * Rate limiters and caches use this to decide whether to use Redis or fall
 * back to an in-process store.
 */
export const getRedisClient = async () => {
  if (_client) return _client;
  if (_connectionFailed) return null;

  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Redis] REDIS_URL not set. Rate limiters will use in-memory store (not safe for multi-instance deployments).');
    }
    _connectionFailed = true;
    return null;
  }

  try {
    const client = createClient({
      url,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries >= 3) {
            console.warn('[Redis] Giving up after 3 reconnect attempts. Falling back to in-memory store.');
            _connectionFailed = true;
            return false;
          }
          return Math.min(retries * 200, 1000);
        },
      },
    });

    client.on('error', (err) => {
      console.error('[Redis] Client error:', err.message);
    });

    await client.connect();
    _client = client;
    console.log('[Redis] Connected successfully.');
    return _client;
  } catch (err) {
    console.warn(`[Redis] Failed to connect: ${err.message}. Falling back to in-memory store.`);
    _connectionFailed = true;
    return null;
  }
};

/**
 * Gracefully closes the Redis connection on server shutdown.
 */
export const closeRedisClient = async () => {
  if (_client) {
    try {
      await _client.quit();
    } catch (_err) {
      // Ignore errors during shutdown
    }
    _client = null;
  }
};
