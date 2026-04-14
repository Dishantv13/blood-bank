import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';

/**
 * Creates a Production-Grade Redis Store with unique prefix
 * @param {string} prefix 
 */
const createRedisStore = async (prefix) => {
  try {
    const client = await getRedisClient();
    if (!client?.isReady) return undefined;
    
    return new RedisStore({
      sendCommand: (...args) => client.sendCommand(args),
      prefix: `rl:${prefix}:`, // Ensure isolation in Redis
    });
  } catch (err) {
    console.error(`[RateLimiter] Redis store '${prefix}' init failed:`, err.message);
    return undefined;
  }
};

/**
 * Wrapper to handle async Store initialization for express-rate-limit
 */
const createRateLimiter = (name, options) => {
  let middleware;
  
  return async (req, res, next) => {
    if (!middleware) {
      const store = await createRedisStore(name);
      middleware = rateLimit({
        ...options,
        store: store || undefined, // Fallback to memory if store is null
      });
    }
    return middleware(req, res, next);
  };
};

const getClientIpKey = (req) => ipKeyGenerator(req.ip);

// ======================== LIMITER DEFINITIONS ========================

// Global API rate limiter
export const globalApiLimiter = createRateLimiter('global', {
  windowMs: 15 * 60 * 1000, 
  max: 500,
  legacyHeaders: true,
  message: { success: false, message: 'Too many requests from this IP address, please try again later.' },
  standardHeaders: true,
  skip: (req) => req.path === '/' || req.path === '/health' || req.path === '/api/health',
  keyGenerator: (req) => {
    if (req.user?.id) return `user:${req.user.id}`;
    if (req.admin?.id) return `admin:${req.admin.id}`;
    if (req.bloodBank?.id) return `bloodbank:${req.bloodBank.id}`;
    return getClientIpKey(req);
  },
});

export const authLimiter = createRateLimiter('auth', {
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const email = req.body?.email || req.body?.username || '';
    return `${getClientIpKey(req)}:${email}`;
  },
});

export const bloodBankOtpInitiateLimiter = createRateLimiter('bb-otp-init', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many OTP generation attempts. Please try again later.' },
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    return `bb-otp-init:${getClientIpKey(req)}:${email}`;
  },
});

export const bloodBankOtpVerifyLimiter = createRateLimiter('bb-otp-verify', {
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many OTP verification attempts. Please try again later.' },
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const verificationId = String(req.body?.verificationId || '').trim();
    return `bb-otp-verify:${getClientIpKey(req)}:${verificationId}`;
  },
});

export const bloodBankOtpResendLimiter = createRateLimiter('bb-otp-resend', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many OTP resend attempts. Please try again later.' },
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const verificationId = String(req.body?.verificationId || '').trim();
    return `bb-otp-resend:${getClientIpKey(req)}:${verificationId}`;
  },
});

export const passwordResetLimiter = createRateLimiter('pwd-reset', {
  windowMs: 60 * 60 * 1000, 
  max: 3,
  message: { success: false, message: 'Too many password reset attempts. Please try again after 1 hour.' },
  standardHeaders: true,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `password-reset:${getClientIpKey(req)}:${email}`;
  },
});

export const requestCreationLimiter = createRateLimiter('req-create', {
  windowMs: 60 * 60 * 1000, 
  max: 5,
  message: { success: false, message: 'Too many blood requests created. Please try again later.' },
  standardHeaders: true,
  keyGenerator: (req) => req.user?.id || getClientIpKey(req),
});

export const donationCreationLimiter = createRateLimiter('donation-create', {
  windowMs: 24 * 60 * 60 * 1000, 
  max: 1,
  message: { success: false, message: 'Donation request limit reached for today. Please try again tomorrow.' },
  standardHeaders: true,
  keyGenerator: (req) => req.user?.id || getClientIpKey(req),
});

export const adminActionLimiter = createRateLimiter('admin-action', {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many admin requests. Please try again later.' },
  standardHeaders: true,
  keyGenerator: (req) => req.admin?.id || getClientIpKey(req),
});

export const adminExportLimiter = createRateLimiter('admin-export', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many export requests. Please try again after one hour.' },
  standardHeaders: true,
  keyGenerator: (req) => req.admin?.id || getClientIpKey(req),
  skipSuccessfulRequests: false,
});
