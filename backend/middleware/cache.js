import { getRedisClient } from '../config/redis.js';

const pendingResponses = new Map();
const memoryCacheStore = new Map();
const CACHE_PREFIX = 'api-cache:';

const normalizeQueryParams = (searchParams) => {
  const entries = [];
  for (const [key, value] of searchParams.entries()) {
    if (value === '' || value == null) continue;
    entries.push([key, value]);
  }

  entries.sort((a, b) => {
    const keyCompare = a[0].localeCompare(b[0]);
    if (keyCompare !== 0) return keyCompare;
    return String(a[1]).localeCompare(String(b[1]));
  });

  const normalized = new URLSearchParams();
  entries.forEach(([key, value]) => normalized.append(key, value));
  return normalized.toString();
};

const buildCacheKey = (originalUrl = '') => {
  const [rawPath = '/', rawQuery = ''] = originalUrl.split('?');
  // Canonicalize aliases so /api/bloodbanks and /api/blood-banks share one cache entry.
  const normalizedPath = rawPath.replace('/api/blood-banks', '/api/bloodbanks');
  const normalizedQuery = normalizeQueryParams(new URLSearchParams(rawQuery));
  return normalizedQuery ? `${normalizedPath}?${normalizedQuery}` : normalizedPath;
};

const toRedisKey = (key) => `${CACHE_PREFIX}${key}`;

const getMemoryCache = (key) => {
  const cached = memoryCacheStore.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    memoryCacheStore.delete(key);
    return null;
  }
  return cached.payload;
};

const setMemoryCache = (key, payload, ttlSeconds) => {
  memoryCacheStore.set(key, {
    payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const deleteKeysByPrefix = async (prefix) => {
  const client = await getRedisClient();
  if (!client) return;

  const normalizedPrefix = buildCacheKey(prefix || '/');
  let cursor = '0';
  do {
    const result = await client.scan(cursor, {
      MATCH: `${toRedisKey(normalizedPrefix)}*`,
      COUNT: 100,
    });
    cursor = result.cursor;
    if (result.keys.length) {
      await client.del(...result.keys);
    }
  } while (cursor !== '0');
};

export const cacheResponse = (ttlSeconds = 60) => (req, res, next) => {
  if (req.method !== 'GET') return next();

  const key = buildCacheKey(req.originalUrl);

  const run = async () => {
    const client = await getRedisClient();
    const usingRedis = Boolean(client);

    const cached = usingRedis
      ? await client.get(toRedisKey(key)).then((value) => (value ? JSON.parse(value) : null))
      : getMemoryCache(key);

    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${ttlSeconds}`);
      return res.status(200).json(cached);
    }

    const pending = pendingResponses.get(key);
    if (pending) {
      return pending
        .then((payload) => {
          if (payload !== undefined) {
            res.set('X-Cache', 'HIT-DEDUPED');
            res.set('Cache-Control', `public, max-age=${ttlSeconds}`);
            return res.status(200).json(payload);
          }
          return next();
        })
        .catch(() => next());
    }

    let resolvePending;
    let rejectPending;
    const requestPromise = new Promise((resolve, reject) => {
      resolvePending = resolve;
      rejectPending = reject;
    });
    pendingResponses.set(key, requestPromise);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (usingRedis) {
          client
            .setEx(toRedisKey(key), ttlSeconds, JSON.stringify(body))
            .catch((error) => {
              console.warn('Redis cache write failed:', error.message);
            });
        } else {
          setMemoryCache(key, body, ttlSeconds);
        }

        res.set('X-Cache', 'MISS');
        res.set('Cache-Control', `public, max-age=${ttlSeconds}`);
        resolvePending(body);
      } else {
        rejectPending(new Error('Non-cacheable response status'));
      }

      pendingResponses.delete(key);
      return originalJson(body);
    };

    res.on('close', () => {
      if (pendingResponses.has(key)) {
        pendingResponses.delete(key);
        rejectPending(new Error('Response closed before cache was populated'));
      }
    });

    return next();
  };

  run().catch((error) => {
    console.warn('Redis cache middleware fallback:', error.message);
    res.set('X-Cache', 'BYPASS');
    next();
  });
};

export const clearCacheByPrefix = (prefix) => {
  const normalizedPrefix = buildCacheKey(prefix || '/');
  for (const key of memoryCacheStore.keys()) {
    if (key.startsWith(normalizedPrefix)) {
      memoryCacheStore.delete(key);
    }
  }

  deleteKeysByPrefix(prefix).catch((error) => {
    console.warn('Redis cache clear by prefix failed:', error.message);
  });
};

export const clearAllCache = () => {
  memoryCacheStore.clear();
  deleteKeysByPrefix('/').catch((error) => {
    console.warn('Redis cache clear all failed:', error.message);
  });
  pendingResponses.clear();
};