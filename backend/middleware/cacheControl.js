export const cacheControl = (req, res, next) => {
  if (req.method !== "GET") {
    res.set("Cache-Control", "no-store"); // Don't cache state-changing requests
    return next();
  }

  const path = req.path;

  if (path.startsWith("/uploads") || path.includes("logo")) {
    res.set("Cache-Control", "public, max-age=86400"); // 24 hours
    return next();
  }

  if (path.includes("stats") || path.includes("dashboard")) {
    res.set("Cache-Control", "private, no-cache, must-revalidate");
    return next();
  }

  // 3. Default for other GET APIs
  res.set("Cache-Control", "private, no-cache");

  next();
};
