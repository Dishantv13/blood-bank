import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';

/**
 * Creates a rate-limit store backed by Redis when a Redis client is available,
 * falling back to the default in-process memory store otherwise.
 *
 * Using Redis makes rate limiting safe across multiple Node.js instances or
 * containers. Without it, each instance maintains independent counters and the
 * effective limit becomes max * instance-count.
 */
const makeStore = async () => {
  const client = await getRedisClient();
  if (!client) return undefined; // use express-rate-limit default (in-memory)
  return new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  });
};

// Lazily initialised stores – resolved once per limiter on first use
const storeCache = new Map();

const getStore = async (key) => {
  if (storeCache.has(key)) return storeCache.get(key);
  const store = await makeStore();
  storeCache.set(key, store);
  return store;
};

const getClientIpKey = (req) => ipKeyGenerator(req.ip);

const asyncRateLimit = (key, options) =>
  async (req, res, next) => {
    const store = await getStore(key);
    const limiter = rateLimit({ ...options, store });
    return limiter(req, res, next);
  };

// Global API rate limiter - stricter for unauthenticated requests
export const globalApiLimiter = asyncRateLimit('global', {
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 500,
  legacyHeaders: true,
  message: 'Too many requests from this IP address, please try again later.',
  standardHeaders: true,
  skip: (req) => req.path === '/' || req.path === '/api/health',
  keyGenerator: (req) => {
    if (req.user?.id) return `user:${req.user.id}`;
    if (req.admin?.id) return `admin:${req.admin.id}`;
    if (req.bloodBank?.id) return `bloodbank:${req.bloodBank.id}`;
    return getClientIpKey(req);
  },
});

// Authentication rate limiter - very restrictive for login attempts
export const authLimiter = asyncRateLimit('auth', {
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const email = req.body?.email || req.body?.username || '';
    return `${getClientIpKey(req)}:${email}`;
  },
});

export const bloodBankOtpInitiateLimiter = asyncRateLimit('bb-otp-init', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many OTP generation attempts. Please try again later.',
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    return `bb-otp-init:${getClientIpKey(req)}:${email}`;
  },
});

export const bloodBankOtpVerifyLimiter = asyncRateLimit('bb-otp-verify', {
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many OTP verification attempts. Please try again later.',
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const verificationId = String(req.body?.verificationId || '').trim();
    return `bb-otp-verify:${getClientIpKey(req)}:${verificationId}`;
  },
});

export const bloodBankOtpResendLimiter = asyncRateLimit('bb-otp-resend', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many OTP resend attempts. Please try again later.',
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const verificationId = String(req.body?.verificationId || '').trim();
    return `bb-otp-resend:${getClientIpKey(req)}:${verificationId}`;
  },
});

// Password reset rate limiter - prevent password reset abuse
export const passwordResetLimiter = asyncRateLimit('pwd-reset', {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts. Please try again after 1 hour.',
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `password-reset:${getClientIpKey(req)}:${email}`;
  },
});

// Stricter limiter for request creation
export const requestCreationLimiter = asyncRateLimit('req-create', {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many blood requests created. Please try again later.',
  standardHeaders: true,
  keyGenerator: (req) => req.user?.id || getClientIpKey(req),
});

// Donation rate limiter - one per 24 hours
export const donationCreationLimiter = asyncRateLimit('donation-create', {
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1,
  message: 'Donation request limit reached for today. Please try again tomorrow.',
  standardHeaders: true,
  keyGenerator: (req) => req.user?.id || getClientIpKey(req),
});

// Admin action rate limiter - allow more for admins but still rate limit
export const adminActionLimiter = asyncRateLimit('admin-action', {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many admin requests. Please try again later.',
  standardHeaders: true,
  keyGenerator: (req) => req.admin?.id || getClientIpKey(req),
});

// Admin export rate limiter - prevent data scraping
export const adminExportLimiter = asyncRateLimit('admin-export', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many export requests. Please try again after one hour.',
  standardHeaders: true,
  keyGenerator: (req) => req.admin?.id || getClientIpKey(req),
  skipSuccessfulRequests: false,
});
