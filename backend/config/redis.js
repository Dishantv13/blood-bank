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

    _client.on('ready', async () => {
      console.log('✅ Redis: Connected and ready.');
      _lastErrorLoggedAt = 0;

      // SAFETY CHECK & AUTO-FIX: Verify Eviction Policy for BullMQ
      try {
        const info = await _client.info('memory');
        const match = info.match(/maxmemory_policy:(.+)/);
        let currentPolicy = match ? match[1].trim() : 'unknown';

        if (currentPolicy !== 'noeviction') {
          // Attempt Auto-Fix
          try {
            await _client.configSet('maxmemory-policy', 'noeviction');
            console.log('✨ Redis: Policy auto-fixed to "noeviction"');
            currentPolicy = 'noeviction';
          } catch (fixErr) {
            console.warn('\n⚠️  REDIS ARCHITECTURE WARNING:');
            console.warn(`   Current Policy: "${currentPolicy}"`);
            console.warn('   Required Policy: "noeviction"');
            console.warn('   Status: Auto-fix failed (Permission denied).');
            console.warn('   Fix: Change this in your Redis Cloud Dashboard -> Configuration.\n');
          }
        }

        if (currentPolicy === 'noeviction') {
          console.log(`✅ Redis: Eviction policy verified as "${currentPolicy}"`);
        }
      } catch (err) {
        // Silently fail if INFO command is restricted
      }
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
