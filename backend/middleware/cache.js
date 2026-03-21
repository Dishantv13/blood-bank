const cacheStore = new Map();
const pendingResponses = new Map();

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

export const cacheResponse = (ttlSeconds = 60) => (req, res, next) => {
  if (req.method !== 'GET') return next();

  const key = buildCacheKey(req.originalUrl);
  const cached = cacheStore.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    res.set('X-Cache', 'HIT');
    res.set('Cache-Control', `public, max-age=${ttlSeconds}`);
    return res.status(200).json(cached.payload);
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
      cacheStore.set(key, {
        payload: body,
        expiresAt: Date.now() + ttlSeconds * 1000
      });
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

export const clearCacheByPrefix = (prefix) => {
  const keys = [...cacheStore.keys()];
  keys.forEach((key) => {
    if (key.startsWith(prefix)) cacheStore.delete(key);
  });
};

export const clearAllCache = () => {
  cacheStore.clear();
  pendingResponses.clear();
};