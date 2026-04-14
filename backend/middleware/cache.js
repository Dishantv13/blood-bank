// In-Memory API Response Cache.
// Removed Redis and pino dependency for infrastructure simplification.
// Uses native Map with LRU eviction and deduping logic.

const pendingResponses = new Map();
const memoryCacheStore = new Map();
const MAX_MEMORY_CACHE_SIZE = 500; // Prevent OOM in memory-only mode

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
  const normalizedPath = rawPath.replace('/api/blood-banks', '/api/bloodbanks');
  const normalizedQuery = normalizeQueryParams(new URLSearchParams(rawQuery));
  return normalizedQuery ? `${normalizedPath}?${normalizedQuery}` : normalizedPath;
};

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
  if (memoryCacheStore.size >= MAX_MEMORY_CACHE_SIZE) {
    const firstKey = memoryCacheStore.keys().next().value;
    memoryCacheStore.delete(firstKey);
  }

  memoryCacheStore.set(key, {
    payload,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const cacheResponse = (ttlSeconds = 60) => (req, res, next) => {
  if (req.method !== 'GET') return next();

  const key = buildCacheKey(req.originalUrl);

  const run = async () => {
    const cached = getMemoryCache(key);

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
        setMemoryCache(key, body, ttlSeconds);
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
    console.error(`[Cache] Middleware error for ${req.originalUrl}:`, error);
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
};

export const clearAllCache = () => {
  memoryCacheStore.clear();
  pendingResponses.clear();
};