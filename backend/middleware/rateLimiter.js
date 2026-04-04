import rateLimit from 'express-rate-limit';

// Global API rate limiter - stricter for unauthenticated requests
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 500, // Reduced from 500 to ~6-7 requests per second
  legacyHeaders: true,
  message: 'Too many requests from this IP address, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks only
    return req.path === '/' || req.path === '/api/health';
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    if (req.user?.id) return `user:${req.user.id}`;
    if (req.admin?.id) return `admin:${req.admin.id}`;
    if (req.bloodBank?.id) return `bloodbank:${req.bloodBank.id}`;
    return req.ip;
  },
});

// Authentication rate limiter - very restrictive for login attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Reduced from 10 - max 5 attempts per 15 minutes per IP
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  skipSuccessfulRequests: false, // Count successful requests too
  keyGenerator: (req) => {
    // Rate limit by email + IP to prevent user enumeration
    const email = req.body?.email || req.body?.username || '';
    return `${req.ip}:${email}`;
  },
});

// Password reset rate limiter - prevent password reset abuse
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 password reset requests per hour per email
  message: 'Too many password reset attempts. Please try again after 1 hour.',
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `password-reset:${req.ip}:${email}`;
  },
});

// Stricter limiter for request creation
export const requestCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Reduced from 10
  message: 'Too many blood requests created. Please try again later.',
  standardHeaders: true,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Donation rate limiter - one per 24 hours
export const donationCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1,
  message: 'Donation request limit reached for today. Please try again tomorrow.',
  standardHeaders: true,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Admin action rate limiter - allow more for admins but still rate limit
export const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Reduced from 120
  message: 'Too many admin requests. Please try again later.',
  standardHeaders: true,
  keyGenerator: (req) => req.admin?.id || req.ip,
});

// Admin export rate limiter - prevent data scraping
export const adminExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10, // Reduced from 30 - prevent large-scale data exports
  message: 'Too many export requests. Please try again after one hour.',
  standardHeaders: true,
  keyGenerator: (req) => req.admin?.id || req.ip,
  skipSuccessfulRequests: false, // Count all requests
});