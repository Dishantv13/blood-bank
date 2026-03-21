export const requestLogger = (slowMs = 1000) => (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration >= slowMs) {
      console.warn(
        `[SLOW_REQUEST] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
      );
    }
  });

  next();
};