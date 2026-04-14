import { createClient } from 'redis';
export const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    tls: process.env.REDIS_TLS === 'true',
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 500, 30000);
      return delay;
    }
  },
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USERNAME || undefined,
};  

let _client = null;
let _isConnecting = false;
let _lastErrorLoggedAt = 0;
const ERROR_LOG_INTERVAL = 60000; // Log error at most once per minute

// Returns a singleton Redis client.
export const getRedisClient = async () => {
  if (_client?.isReady) return _client;
  
  if (!_client) {
    _client = createClient(redisConfig);

    _client.on('error', (err) => {
      const now = Date.now();
      if (now - _lastErrorLoggedAt > ERROR_LOG_INTERVAL) {
        console.warn(`[Redis] Connectivity issue: ${err.message}. System is using local memory fallback.`);
        _lastErrorLoggedAt = now;
      }
    });

    _client.on('ready', () => {
      console.log('✅ Redis: Connected and ready.');
      _lastErrorLoggedAt = 0; // Reset logging timer
    });

    _client.on('reconnecting', () => {
      // Quiet reconnecting logs
    });
  }

  if (!_isConnecting && !_client.isOpen) {
    _isConnecting = true;
    try {
      await _client.connect();
    } catch (err) {
      // Errors handled by the .on('error') listener
    } finally {
      _isConnecting = false;
    }
  }

  return _client;
};

// Gracefully closes the Redis connection.
export const closeRedisClient = async () => {
  if (_client) {
    console.log('Redis: Closing connection...');
    try {
      if (_client.isOpen) await _client.quit();
    } catch (err) {
      // Ignore
    }
    _client = null;
  }
};
