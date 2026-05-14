import cacheManager from "./cacheManager.js";
import { clearCacheByPrefix } from "../middleware/cache.js";

export const CACHE_KEYS = {
  PUBLIC_BANKS: "public_banks",
  ADMIN_STATS: "admin:dashboard_stats",
};

export const invalidateBloodBankCaches = async (bankId) => {
  try {
    const promises = [
      cacheManager.del(CACHE_KEYS.ADMIN_STATS),
    ];

    if (bankId) {
      promises.push(cacheManager.invalidateTags(`bb:${bankId}`));
      promises.push(clearCacheByPrefix(String(bankId)));
    } else {
      promises.push(cacheManager.invalidatePattern(`${CACHE_KEYS.PUBLIC_BANKS}:*`));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error(
      "[CACHE INVALIDATION ERROR] Failed to clear blood bank caches:",
      error.message,
    );
  }
};

export const invalidateGlobalStats = async () => {
  try {
    await cacheManager.del(CACHE_KEYS.ADMIN_STATS);
  } catch (error) {
    console.error("[CACHE INVALIDATION ERROR] Failed to clear global stats:", error.message);
  }
};
