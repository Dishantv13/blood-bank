import redisClient from "../utils/redisClient.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const pendingResponses = new Map();
const memoryCacheStore = new Map();
const MAX_MEMORY_CACHE_SIZE = 500;

// Helper to get ID from token without DB hit
const getIdentityFromToken = (req) => {
  try {
    const token =
      req.cookies?.["bb_bank_at"] ||
      req.cookies?.["bb_user_at"] ||
      req.cookies?.["bb_admin_at"] ||
      req.headers.authorization?.split(" ")[1];
    if (!token) return "public";
    const decoded = jwt.decode(token);
    return decoded?.bloodBankId || decoded?.userId || decoded?.id || "public";
  } catch {
    return "public";
  }
};

const normalizeQueryParams = (searchParams) => {
  const entries = [];
  for (const [key, value] of searchParams.entries()) {
    if (value === "" || value == null) continue;
    entries.push([key, value]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const normalized = new URLSearchParams();
  entries.forEach(([key, value]) => normalized.append(key, value));
  return normalized.toString();
};

const buildCacheKey = (req) => {
  const identity = getIdentityFromToken(req);
  const [rawPath = "/", rawQuery = ""] = req.originalUrl.split("?");
  const normalizedPath = rawPath.replace(
    "/api/v1/blood-banks",
    "/api/v1/bloodbanks",
  );
  const normalizedQuery = normalizeQueryParams(new URLSearchParams(rawQuery));
  const fullPath = normalizedQuery
    ? `${normalizedPath}?${normalizedQuery}`
    : normalizedPath;
  return `cache:${identity}:${fullPath}`;
};

const getMemoryCache = (key) => {
  const cached = memoryCacheStore.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    if (cached) memoryCacheStore.delete(key);
    return null;
  }
  return cached;
};

const setMemoryCache = (key, payload, ttlSeconds) => {
  if (memoryCacheStore.size >= MAX_MEMORY_CACHE_SIZE) {
    memoryCacheStore.delete(memoryCacheStore.keys().next().value);
  }

  // Generate ETag for browser optimization
  const etag = crypto
    .createHash("md5")
    .update(JSON.stringify(payload))
    .digest("hex");

  memoryCacheStore.set(key, {
    payload,
    etag,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return etag;
};

export const cacheResponse =
  (ttlSeconds = 60) =>
  async (req, res, next) => {
    const start = performance.now();
    if (req.method !== "GET") return next();

    const key = buildCacheKey(req);
    const clientEtag = req.headers["if-none-match"];

    try {
      // 1. Check Memory L1
      const memoryCached = getMemoryCache(key);
      if (memoryCached) {
        const took = (performance.now() - start).toFixed(2);
        if (
          clientEtag === `W/"${memoryCached.etag}"` ||
          clientEtag === memoryCached.etag
        ) {
          res.set("X-Cache", "HIT-MEMORY-304");
          res.set("X-Server-Time", `${took}ms`);
          return res.status(304).end();
        }
        res.set("X-Cache", "HIT-MEMORY");
        res.set("X-Server-Time", `${took}ms`);
        res.set("ETag", `W/"${memoryCached.etag}"`);
        res.set("Cache-Control", "no-cache");
        return res.json(memoryCached.payload);
      }

      // 2. Check Redis L2
      const redisCached = await redisClient.get(key);
      if (redisCached) {
        try {
          const payload = JSON.parse(redisCached);
          const etag = setMemoryCache(key, payload, ttlSeconds);
          const took = (performance.now() - start).toFixed(2);

          if (clientEtag === `W/"${etag}"` || clientEtag === etag) {
            res.set("X-Cache", "HIT-REDIS-304");
            res.set("X-Server-Time", `${took}ms`);
            return res.status(304).end();
          }

          res.set("X-Cache", "HIT-REDIS");
          res.set("X-Server-Time", `${took}ms`);
          res.set("ETag", `W/"${etag}"`);
          res.set("Cache-Control", "no-cache");
          return res.json(payload);
        } catch (e) {
          console.error("[Cache] Redis parse error:", e);
        }
      }

      // 3. Handle Thundering Herd
      const pending = pendingResponses.get(key);
      if (pending) {
        const data = await pending;
        if (data) {
          const took = (performance.now() - start).toFixed(2);
          res.set("X-Cache", "HIT-DEDUPED");
          res.set("X-Server-Time", `${took}ms`);
          res.set("Cache-Control", "no-cache");
          return res.json(data);
        }
      }

      // 4. Intercept DB Response
      let resolvePending;
      const requestPromise = new Promise((resolve) => {
        resolvePending = resolve;
      });
      pendingResponses.set(key, requestPromise);

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        const took = (performance.now() - start).toFixed(2);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const etag = setMemoryCache(key, body, ttlSeconds);
          redisClient
            .set(key, JSON.stringify(body), ttlSeconds)
            .catch(() => {});

          res.set("X-Cache", "MISS-DATABASE");
          res.set("X-Server-Time", `${took}ms`);
          res.set("ETag", `W/"${etag}"`);
          res.set("Cache-Control", "no-cache");
          resolvePending(body);
        } else {
          resolvePending(null);
        }
        pendingResponses.delete(key);
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error(`[Cache] Middleware error:`, error);
      res.set("X-Cache", "BYPASS");
      next();
    }
  };

export const clearCacheByPrefix = async (prefix) => {
  if (!prefix) return;
  const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;

  // 1. Clear Memory Cache
  let clearedCount = 0;
  for (const key of memoryCacheStore.keys()) {
    if (
      key === normalizedPrefix ||
      key.startsWith(normalizedPrefix + "/") ||
      key.startsWith(normalizedPrefix + "?") ||
      key.includes(normalizedPrefix)
    ) {
      memoryCacheStore.delete(key);
      clearedCount++;
    }
  }

  // 2. Clear Redis Cache (Distributed)
  try {
    const client = await redisClient.getRawClient?.();
    if (client?.isReady) {
      // Use SCAN to find keys with the prefix safely in production
      let cursor = "0";
      const pattern = `*${normalizedPrefix}*`;
      do {
        const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        const keys = reply.keys;
        if (keys.length > 0) {
          await client.del(keys);
          clearedCount += keys.length;
        }
      } while (cursor !== "0");
    }
  } catch (error) {
    console.error("[Cache] Redis clear error:", error);
  }

  if (clearedCount > 0) {
    console.log(
      `[Cache] Purged ${clearedCount} entries related to: ${normalizedPrefix}`,
    );
  }
};

export const clearAllCache = () => {
  memoryCacheStore.clear();
  pendingResponses.clear();
};
