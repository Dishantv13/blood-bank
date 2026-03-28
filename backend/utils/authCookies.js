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

const ROLE_CONFIG = {
  user: {
    accessSecret: () => process.env.USER_ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
    refreshSecret: () => process.env.USER_REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    accessExpiresIn: () => process.env.USER_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: () => process.env.USER_REFRESH_TOKEN_EXPIRES_IN || '7d',
    accessCookie: () => process.env.USER_ACCESS_COOKIE_NAME || 'bb_user_at',
    refreshCookie: () => process.env.USER_REFRESH_COOKIE_NAME || 'bb_user_rt',
    csrfCookie: () => process.env.USER_CSRF_COOKIE_NAME || 'bb_user_csrf',
  },
  admin: {
    accessSecret: () => process.env.ADMIN_ACCESS_TOKEN_SECRET || process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
    refreshSecret: () => process.env.ADMIN_REFRESH_TOKEN_SECRET || process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
    accessExpiresIn: () => process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN || process.env.ADMIN_JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: () => process.env.ADMIN_REFRESH_TOKEN_EXPIRES_IN || '7d',
    accessCookie: () => process.env.ADMIN_ACCESS_COOKIE_NAME || 'bb_admin_at',
    refreshCookie: () => process.env.ADMIN_REFRESH_COOKIE_NAME || 'bb_admin_rt',
    csrfCookie: () => process.env.ADMIN_CSRF_COOKIE_NAME || 'bb_admin_csrf',
  },
  bloodbank: {
    accessSecret: () => process.env.BLOODBANK_ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
    refreshSecret: () => process.env.BLOODBANK_REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
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

  const resolved = {
    accessSecret: config.accessSecret(),
    refreshSecret: config.refreshSecret(),
    accessExpiresIn: config.accessExpiresIn(),
    refreshExpiresIn: config.refreshExpiresIn(),
    accessCookie: config.accessCookie(),
    refreshCookie: config.refreshCookie(),
    csrfCookie: config.csrfCookie(),
  };

  if (!resolved.accessSecret || !resolved.refreshSecret) {
    throw new Error(`Missing token secrets for auth role: ${role}`);
  }

  return resolved;
};

const cookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
});

export const isStateChangingMethod = (method) =>
  ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

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

  return { csrfToken };
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

export const getCsrfTokenFromRequest = (req, role) => {
  const { csrfCookie } = getCookieNamesForRole(role);
  const cookieToken = req.cookies?.[csrfCookie];
  const headerToken = req.header('x-csrf-token');
  return { cookieToken, headerToken };
};
