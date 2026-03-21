# Cache and Request Logger Guide

This document explains the purpose and usage of the in-memory cache middleware and slow request logger middleware used in the backend API.

## 1) Cache Middleware

File: middleware/cache.js

### What it does
- Caches GET responses in memory using a Map.
- Uses request URL (req.originalUrl) as the cache key.
- Returns cached JSON response if it is still valid.
- Stores fresh response after controller calls res.json(...).

### Why it is useful
- Reduces repeated DB/API load for frequently requested public endpoints.
- Improves response time for repeated reads.
- Helps absorb burst traffic for read-heavy routes.

### How it works
- cacheResponse(ttlSeconds) returns middleware.
- Only GET requests are cached.
- Cache entry format:
  - payload: response body
  - expiresAt: Date.now() + ttlSeconds * 1000
- If cached entry exists and is not expired, middleware returns 200 with cached payload.
- Otherwise request continues, and the response body is saved when res.json runs.

### Current helper utilities
- clearCacheByPrefix(prefix): clears all cache entries whose keys start with a prefix.
- clearAllCache(): clears the full cache map.

### Example usage
- router.get('/', cacheResponse(120), getAllBloodBanks)
- router.get('/:id', cacheResponse(120), getBloodBankById)

### Best practices
- Use cache only on safe read endpoints (GET).
- Keep short TTL for data that changes often.
- Avoid caching personalized data unless cache key includes user context.
- Invalidate cache with clearCacheByPrefix/clearAllCache after write operations that affect cached reads.

### Limitations
- In-memory cache is process-local.
- Cache is lost on server restart.
- Not shared across multiple backend instances.

For production multi-instance setups, move to Redis or another shared cache.

## 2) Request Logger Middleware

File: middleware/requestLogger.js

### What it does
- Measures request duration for every request.
- Logs only slow requests (default threshold: 1000ms).
- Log format:
  - [SLOW_REQUEST] METHOD URL STATUS DURATIONms

### Why it is useful
- Quickly identifies slow routes.
- Helps detect performance regressions.
- Gives low-noise operational visibility (only slow requests are logged).

### How it works
- requestLogger(slowMs) returns middleware.
- Records start time before request handling.
- Uses res.on('finish') to log once response is completed.
- Logs only when duration >= slowMs.

### Current app wiring
- In app.js:
  - app.use(requestLogger(1000));

This means all routes are monitored and only requests slower than 1 second are logged.

### Best practices
- Keep threshold practical (for example 500-1500ms).
- Use logs to prioritize optimization on high-impact endpoints.
- Combine with request IDs in future if deeper tracing is needed.

## 3) Quick Summary

- Cache middleware improves read performance by reusing recent GET responses.
- Request logger improves observability by surfacing slow requests.
- Together they improve speed and help diagnose bottlenecks with minimal code overhead.
