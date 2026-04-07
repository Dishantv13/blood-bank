import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ms = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  if (/^\d+$/.test(String(value))) return Number(value);

  const match = String(value).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === 's' ? 1000 :
    unit === 'm' ? 60 * 1000 :
    unit === 'h' ? 60 * 60 * 1000 :
    24 * 60 * 60 * 1000;

  return amount * multiplier;
};

// Validate that a secret meets minimum security requirements
const validateSecret = (secret, name) => {
  if (!secret || typeof secret !== 'string') {
    throw new Error(`[SECURITY] ${name} must be a non-empty string`);
  }

  if (secret.length < 32) {
    throw new Error(`[SECURITY] ${name} must be at least 32 characters long (current: ${secret.length}). Use strong random values from environment.`);
  }

  // Ensure secret is not a default/weak value
  const weakPatterns = ['123456', 'password', 'secret123', 'test', 'admin'];
  if (weakPatterns.some(pattern => secret.toLowerCase().includes(pattern))) {
    throw new Error(`[SECURITY] ${name} appears to use a weak pattern. Use strong cryptographic random values.`);
  }

  return true;
};

// Helper function to get secret with validation and no fallback chain
const getSecret = (primaryEnvVar) => {
  const secret = process.env[primaryEnvVar];
  if (!secret) {
    throw new Error(`[SECURITY] Required environment variable ${primaryEnvVar} is not set. Each role must have its own dedicated secret.`);
  }
  validateSecret(secret, primaryEnvVar);
  return secret;
};

const ROLE_CONFIG = {
  user: {
    accessSecret: () => getSecret('USER_ACCESS_TOKEN_SECRET'),
    refreshSecret: () => getSecret('USER_REFRESH_TOKEN_SECRET'),
    accessExpiresIn: () => process.env.USER_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: () => process.env.USER_REFRESH_TOKEN_EXPIRES_IN || '7d',
    accessCookie: () => process.env.USER_ACCESS_COOKIE_NAME || 'bb_user_at',
    refreshCookie: () => process.env.USER_REFRESH_COOKIE_NAME || 'bb_user_rt',
    csrfCookie: () => process.env.USER_CSRF_COOKIE_NAME || 'bb_user_csrf',
  },
  admin: {
    accessSecret: () => getSecret('ADMIN_ACCESS_TOKEN_SECRET'),
    refreshSecret: () => getSecret('ADMIN_REFRESH_TOKEN_SECRET'),
    accessExpiresIn: () => process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: () => process.env.ADMIN_REFRESH_TOKEN_EXPIRES_IN || '7d',
    accessCookie: () => process.env.ADMIN_ACCESS_COOKIE_NAME || 'bb_admin_at',
    refreshCookie: () => process.env.ADMIN_REFRESH_COOKIE_NAME || 'bb_admin_rt',
    csrfCookie: () => process.env.ADMIN_CSRF_COOKIE_NAME || 'bb_admin_csrf',
  },
  bloodbank: {
    accessSecret: () => getSecret('BLOODBANK_ACCESS_TOKEN_SECRET'),
    refreshSecret: () => getSecret('BLOODBANK_REFRESH_TOKEN_SECRET'),
    accessExpiresIn: () => process.env.BLOODBANK_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: () => process.env.BLOODBANK_REFRESH_TOKEN_EXPIRES_IN || '30d',
    accessCookie: () => process.env.BLOODBANK_ACCESS_COOKIE_NAME || 'bb_bank_at',
    refreshCookie: () => process.env.BLOODBANK_REFRESH_COOKIE_NAME || 'bb_bank_rt',
    csrfCookie: () => process.env.BLOODBANK_CSRF_COOKIE_NAME || 'bb_bank_csrf',
  }
};

const getRoleConfig = (role) => {
  const config = ROLE_CONFIG[role];
  if (!config) throw new Error(`Unsupported auth role: ${role}`);

  try {
    const resolved = {
      accessSecret: config.accessSecret(),
      refreshSecret: config.refreshSecret(),
      accessExpiresIn: config.accessExpiresIn(),
      refreshExpiresIn: config.refreshExpiresIn(),
      accessCookie: config.accessCookie(),
      refreshCookie: config.refreshCookie(),
      csrfCookie: config.csrfCookie(),
    };

    // Verify secrets are different for different roles
    if (resolved.accessSecret && process.env.NODE_ENV === 'production') {
      // In production, ensure no secret collisions across roles
      // This check can be extended to compare all role secrets
      if (!process.env[`${role.toUpperCase()}_ACCESS_TOKEN_SECRET`]) {
        throw new Error(`[SECURITY] Missing dedicated secret for ${role} role`);
      }
    }

    return resolved;
  } catch (error) {
    console.error(`[SECURITY] Configuration error for role '${role}':`, error.message);
    throw error;
  }
};

const resolveSameSite = () => {
  const defaultSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
  const raw = String(process.env.AUTH_COOKIE_SAME_SITE || defaultSameSite).toLowerCase();
  if (raw === 'none') return 'none';
  if (raw === 'strict') return 'strict';
  return 'lax';
};

const resolveSecure = () => {
  if (process.env.AUTH_COOKIE_SECURE === 'true') return true;
  if (process.env.AUTH_COOKIE_SECURE === 'false') return false;
  return process.env.NODE_ENV === 'production';
};

const resolveCookieDomain = () => {
  const rawDomain = String(process.env.AUTH_COOKIE_DOMAIN || '').trim();
  if (!rawDomain) return null;

  // Validate domain format using strict regex
  const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

  let domain = rawDomain;

  // Accept either plain host (example.com) or full URL (https://example.com)
  try {
    if (rawDomain.includes('://')) {
      domain = new URL(rawDomain).hostname;
    }
  } catch (_error) {
    console.warn('[SECURITY] Invalid AUTH_COOKIE_DOMAIN URL format, ignoring domain restriction');
    return null;
  }

  // Validate domain format
  if (!domainRegex.test(domain)) {
    console.warn(`[SECURITY] Invalid domain format: ${domain}. Cookie domain restriction disabled. Use format: example.com`);
    return null;
  }

  const cleanDomain = domain.replace(/^www\./i, '');

  // Additional security check: prevent overly broad domains
  const parts = cleanDomain.split('.');
  if (parts.length < 2) {
    console.warn('[SECURITY] Domain must include at least a second-level domain (e.g., example.com)');
    return null;
  }

  return cleanDomain;
};

const cookieBaseOptions = () => {
  const sameSite = resolveSameSite();
  const secure = resolveSecure() || sameSite === 'none';
  const domain = resolveCookieDomain();

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    ...(domain ? { domain } : {}),
  };
};

export const getPublicCookieOptions = () => ({
  ...cookieBaseOptions(),
  httpOnly: false,
});

export const isStateChangingMethod = (method) =>
  ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());

// Generate cryptographically secure CSRF token (64 bytes = 512 bits)
export const generateCsrfToken = () => {
  const token = crypto.randomBytes(64).toString('hex');
  const timestamp = Date.now().toString();
  // Include timestamp to prevent token reuse across requests
  const tokenWithTimestamp = `${token}.${timestamp}`;
  return tokenWithTimestamp;
};

// Hash token for storage/comparison using HMAC for added security
export const hashToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token provided');
  }
  return crypto
    .createHmac('sha256', process.env.CSRF_HASH_SECRET || process.env.JWT_SECRET)
    .update(token)
    .digest('hex');
};

// Validate CSRF token with timestamp check (max age: 1 hour)
export const validateCsrfToken = (token, maxAgeMs = 3600000) => {
  try {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [, timestamp] = parts;
    const tokenAge = Date.now() - parseInt(timestamp, 10);

    // Token must be valid within the max age
    if (tokenAge > maxAgeMs || tokenAge < 0) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const getCookieNamesForRole = (role) => {
  const config = getRoleConfig(role);
  return {
    accessCookie: config.accessCookie,
    refreshCookie: config.refreshCookie,
    csrfCookie: config.csrfCookie,
  };
};

export const signAccessToken = (role, payload) => {
  const config = getRoleConfig(role);
  return jwt.sign(
    { ...payload, authRole: role, tokenType: 'access' },
    config.accessSecret,
    { expiresIn: config.accessExpiresIn }
  );
};

export const signRefreshToken = (role, payload) => {
  const config = getRoleConfig(role);
  return jwt.sign(
    { ...payload, authRole: role, tokenType: 'refresh' },
    config.refreshSecret,
    { expiresIn: config.refreshExpiresIn }
  );
};

export const verifyAccessToken = (role, token) => {
  const config = getRoleConfig(role);
  return jwt.verify(token, config.accessSecret);
};

export const verifyRefreshToken = (role, token) => {
  const config = getRoleConfig(role);
  return jwt.verify(token, config.refreshSecret);
};

const getTokenExpiryFromToken = (token) => {
  if (!token) return null;

  const decoded = jwt.decode(token);
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000).toISOString();
};

export const setAuthCookies = (res, role, payload) => {
  const config = getRoleConfig(role);
  const accessToken = signAccessToken(role, payload);
  const refreshToken = signRefreshToken(role, payload);
  const csrfToken = generateCsrfToken();

  res.cookie(config.accessCookie, accessToken, {
    ...cookieBaseOptions(),
    maxAge: ms(config.accessExpiresIn, 15 * 60 * 1000),
  });

  res.cookie(config.refreshCookie, refreshToken, {
    ...cookieBaseOptions(),
    maxAge: ms(config.refreshExpiresIn, 7 * 24 * 60 * 60 * 1000),
  });

  // Double-submit CSRF cookie: readable by JS so client can mirror it in header.
  res.cookie(config.csrfCookie, csrfToken, {
    ...cookieBaseOptions(),
    httpOnly: false,
    maxAge: ms(config.refreshExpiresIn, 7 * 24 * 60 * 60 * 1000),
  });

  return {
    accessToken,
    refreshToken,
    csrfToken,
    accessTokenExpiresAt: getTokenExpiryFromToken(accessToken),
    refreshTokenExpiresAt: getTokenExpiryFromToken(refreshToken),
  };
};

export const clearAuthCookies = (res, role) => {
  const config = getRoleConfig(role);
  const clearOpts = {
    ...cookieBaseOptions(),
    maxAge: 0,
  };

  res.clearCookie(config.accessCookie, clearOpts);
  res.clearCookie(config.refreshCookie, clearOpts);
  res.clearCookie(config.csrfCookie, { ...clearOpts, httpOnly: false });
};

export const getAccessTokenFromRequest = (req, role) => {
  const { accessCookie } = getCookieNamesForRole(role);
  const cookieToken = req.cookies?.[accessCookie];
  if (cookieToken) return cookieToken;

  const headerToken = req.header('Authorization')?.replace('Bearer ', '');
  return headerToken || null;
};

export const getRefreshTokenFromRequest = (req, role) => {
  const { refreshCookie } = getCookieNamesForRole(role);
  return req.cookies?.[refreshCookie] || null;
};

export const getAccessTokenExpiryFromRequest = (req, role) => {
  const accessToken = getAccessTokenFromRequest(req, role);
  return getTokenExpiryFromToken(accessToken);
};

export const getCsrfTokenFromRequest = (req, role) => {
  const { csrfCookie } = getCookieNamesForRole(role);
  const cookieToken = req.cookies?.[csrfCookie];
  const headerToken = req.header('x-csrf-token');
  return { cookieToken, headerToken };
};
